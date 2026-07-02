"""
Production-grade Night Audit engine.

Safety guarantees:
- PIN + optional manager override before any mutation
- Overdue checkout block (bypass only with manager_override_pin)
- Entire run wrapped in transaction.atomic() — any failure rolls back ALL changes
- Posted folio lines for the audit date are marked is_locked=True
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from bookings.models import Booking, FolioCharge
from rooms.models import Room

from .models import HotelConfig, NightAuditLog

TWOPLACES = Decimal('0.01')


@dataclass
class NightAuditError(Exception):
    """Structured audit failure for API mapping."""
    message: str
    code: str = 'AUDIT_BLOCKED'
    status_code: int = 400
    details: dict | list | None = None

    def __str__(self):
        return self.message


def _money(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def verify_night_audit_pin(pin: str | None, config: HotelConfig) -> None:
    """Reject immediately if PIN missing or wrong — no side effects."""
    if not pin or str(pin).strip() != str(config.night_audit_pin).strip():
        raise NightAuditError(
            'Invalid night audit PIN.',
            code='INVALID_PIN',
            status_code=403,
        )


def verify_manager_override(pin: str | None, config: HotelConfig) -> bool:
    if not pin:
        return False
    override = getattr(config, 'manager_override_pin', None) or config.night_audit_pin
    return str(pin).strip() == str(override).strip()


def get_overdue_checkouts(audit_date):
    """In-house guests whose departure date is on or before the business/audit date."""
    qs = Booking.objects.filter(
        status=Booking.Status.CHECKED_IN,
        check_out_date__lte=audit_date,
    ).select_related('guest', 'room')
    return [
        {
            'booking_id': b.id,
            'booking_ref': b.booking_ref,
            'guest_name': b.guest.full_name,
            'room_number': b.room.room_number if b.room else None,
            'room_id': b.room_id,
            'check_out_date': b.check_out_date.isoformat(),
        }
        for b in qs
    ]


def compute_nightly_charge_breakdown(booking: Booking, charge_date) -> dict:
    """
    Per-night financial breakdown for one calendar night — NOT total_price / nights.

    Priority:
    1. Rate plan discount applied to rack for a 1-night window (if rate_plan set)
    2. Else booking.offer_rate (fall back rack_rate / room type rack)
    3. Pro-rate booking.discount_amount across stay nights
    4. Apply service_charge_pct and vat_pct on the net room subtotal for that night
    """
    from bookings.services import calculate_rate_plan_price

    nights = booking.nights
    if nights <= 0:
        raise NightAuditError(f'Booking {booking.booking_ref} has invalid stay length.', code='INVALID_STAY')

    night_index = (charge_date - booking.check_in_date).days
    if night_index < 0 or night_index >= nights:
        raise NightAuditError(
            f'Charge date {charge_date} is outside stay for {booking.booking_ref}.',
            code='INVALID_CHARGE_DATE',
        )

    num_rooms = max(1, int(booking.num_rooms or 1))
    rack = _money(booking.rack_rate or booking.room_type.price_per_night)

    if booking.rate_plan_id:
        # Rate plan priced for this specific night (1-night slice of the stay)
        per_night_room, _ = calculate_rate_plan_price(rack, 1, booking.rate_plan)
        room_subtotal = _money(per_night_room) * num_rooms
    else:
        offer = _money(booking.offer_rate or rack)
        room_subtotal = offer * num_rooms
        if booking.discount_amount and nights:
            nightly_discount = _money(booking.discount_amount) / nights
            room_subtotal = max(Decimal('0'), room_subtotal - nightly_discount)

    svc_pct = _money(booking.service_charge_pct)
    vat_pct = _money(booking.vat_pct)
    service_charge = _money(room_subtotal * svc_pct / Decimal('100'))
    tax = _money(room_subtotal * vat_pct / Decimal('100'))
    total = _money(room_subtotal + service_charge + tax)

    return {
        'room': room_subtotal,
        'service_charge': service_charge,
        'tax': tax,
        'total': total,
        'night_index': night_index,
    }


def _in_house_for_date(audit_date):
    return Booking.objects.filter(
        status=Booking.Status.CHECKED_IN,
        check_in_date__lte=audit_date,
        check_out_date__gt=audit_date,
    ).select_related('guest', 'room', 'room_type', 'rate_plan')


def _revenue_aggregate(audit_date) -> dict:
    folio_agg = FolioCharge.objects.filter(
        charge_date=audit_date,
        is_void=False,
    ).aggregate(
        room=Sum('total', filter=Q(charge_type='ROOM')),
        fnb=Sum('total', filter=Q(charge_type__in=['FOOD', 'BEVERAGE'])),
        tax=Sum('total', filter=Q(charge_type='TAX')),
        service=Sum('total', filter=Q(charge_type='SERVICE')),
        other=Sum(
            'total',
            filter=~Q(charge_type__in=['ROOM', 'FOOD', 'BEVERAGE', 'DEPOSIT', 'REFUND', 'TAX', 'DISCOUNT', 'SERVICE']),
        ),
    )
    room = _money(folio_agg['room'])
    fnb = _money(folio_agg['fnb'])
    tax = _money(folio_agg['tax'])
    service = _money(folio_agg['service'])
    other = _money(folio_agg['other'])
    return {
        'room': float(room),
        'fnb': float(fnb),
        'tax': float(tax),
        'service_charge': float(service),
        'other': float(other),
        'total': float(_money(room + fnb + tax + service + other)),
    }


def get_night_audit_preview(audit_date=None) -> dict:
    """Read-only preview — no mutations."""
    config = HotelConfig.load()
    if audit_date is None:
        audit_date = config.business_date

    already_run = NightAuditLog.objects.filter(audit_date=audit_date).exists()
    total_rooms = Room.objects.filter(is_public_area=False).count() or Room.objects.count()
    in_house = list(_in_house_for_date(audit_date))
    rooms_sold = len(in_house)
    occupancy_rate = round((rooms_sold / total_rooms * 100), 1) if total_rooms else 0.0

    room_charges = []
    projected_room = projected_tax = projected_svc = Decimal('0')

    for booking in in_house:
        if booking.no_post:
            continue
        breakdown = compute_nightly_charge_breakdown(booking, audit_date)
        existing = FolioCharge.objects.filter(
            booking=booking,
            charge_type=FolioCharge.ChargeType.ROOM,
            charge_date=audit_date,
            is_void=False,
        ).exists()
        room_charges.append({
            'booking_id': booking.id,
            'booking_ref': booking.booking_ref,
            'guest_name': booking.guest.full_name,
            'room_number': booking.room.room_number if booking.room else '—',
            'room_amount': float(breakdown['room']),
            'service_charge': float(breakdown['service_charge']),
            'tax': float(breakdown['tax']),
            'nightly_total': float(breakdown['total']),
            'rate_plan': booking.rate_plan.code if booking.rate_plan else None,
            'already_posted': existing,
        })
        if not existing:
            projected_room += breakdown['room']
            projected_tax += breakdown['tax']
            projected_svc += breakdown['service_charge']

    no_shows = Booking.objects.filter(
        check_in_date=audit_date,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
        no_show=False,
    ).select_related('guest', 'room_type', 'room')

    overdue = get_overdue_checkouts(audit_date)
    revenue_preview = _revenue_aggregate(audit_date)

    return {
        'business_date': config.business_date.isoformat(),
        'audit_date': audit_date.isoformat(),
        'already_run': already_run,
        'pin_required': True,
        'can_run': not already_run and len(overdue) == 0,
        'blocked_by_overdue': len(overdue) > 0,
        'total_rooms': total_rooms,
        'rooms_sold': rooms_sold,
        'occupancy_rate': occupancy_rate,
        'room_charges': room_charges,
        'projected_charges': {
            'room': float(_money(projected_room)),
            'tax': float(_money(projected_tax)),
            'service_charge': float(_money(projected_svc)),
            'total': float(_money(projected_room + projected_tax + projected_svc)),
        },
        'no_shows': [
            {
                'booking_id': b.id,
                'booking_ref': b.booking_ref,
                'guest_name': b.guest.full_name,
                'room_type': b.room_type.name,
                'room_number': b.room.room_number if b.room else None,
            }
            for b in no_shows
        ],
        'overdue_checkouts': overdue,
        'revenue_preview': revenue_preview,
    }


def _guests_to_charge(audit_date):
    """In-house + overdue guests who owe a room night for audit_date."""
    standard = list(_in_house_for_date(audit_date))
    overdue = list(
        Booking.objects.filter(
            status=Booking.Status.CHECKED_IN,
            check_in_date__lte=audit_date,
            check_out_date__lte=audit_date,
        ).select_related('guest', 'room', 'room_type', 'rate_plan')
    )
    seen = {b.id for b in standard}
    combined = standard + [b for b in overdue if b.id not in seen]
    return combined


def _post_nightly_charges(booking: Booking, audit_date, performed_by) -> list[FolioCharge]:
    """Post room + tax + service folio lines for one night; return created rows."""
    from bookings.services import post_folio_night_lines

    return post_folio_night_lines(booking, audit_date, performed_by, lock_charges=True)


def _process_no_shows(audit_date, now):
    """Mark no-shows, cancel, release rooms back to inventory."""
    no_shows = Booking.objects.filter(
        check_in_date=audit_date,
        status__in=[Booking.Status.PENDING, Booking.Status.CONFIRMED],
        no_show=False,
    ).select_related('room')

    count = 0
    for booking in no_shows:
        room = booking.room
        booking.no_show = True
        booking.status = Booking.Status.CANCELLED
        booking.cancelled_at = now
        booking.cancellation_reason = booking.cancellation_reason or 'Auto: Night audit no-show'
        booking.room = None
        booking.save(update_fields=[
            'no_show', 'status', 'cancelled_at', 'cancellation_reason', 'room', 'updated_at',
        ])
        if room:
            room.status = Room.Status.AVAILABLE
            room.save(update_fields=['status'])
        count += 1
    return count


@transaction.atomic
def run_night_audit(audit_date, performed_by, *, night_audit_pin: str, manager_override_pin: str | None = None, notes: str = ''):
    """
    Master atomic night audit. Rolls back entirely on any unhandled error.
    """
    config = HotelConfig.load()

    # ── Guardrails (no DB mutations before PIN / block checks pass) ──
    verify_night_audit_pin(night_audit_pin, config)

    if NightAuditLog.objects.filter(audit_date=audit_date).exists():
        raise NightAuditError(
            f'Night audit already run for {audit_date}.',
            code='ALREADY_RUN',
            status_code=400,
        )

    overdue = get_overdue_checkouts(audit_date)
    if overdue and not verify_manager_override(manager_override_pin, config):
        raise NightAuditError(
            'Night audit blocked: overdue checkouts must be settled first, or provide a valid manager override PIN.',
            code='OVERDUE_CHECKOUTS',
            status_code=400,
            details=overdue,
        )

    total_rooms = Room.objects.filter(is_public_area=False).count() or Room.objects.count()
    now = timezone.now()

    in_house = list(_in_house_for_date(audit_date))
    chargeable = _guests_to_charge(audit_date)
    rooms_sold = len(in_house)

    # ── 1. Post locked folio charges (in-house + overdue extension nights) ──
    for booking in chargeable:
        _post_nightly_charges(booking, audit_date, performed_by)

    # Lock any pre-existing room lines for this date (e.g. check-in night posted at registration)
    FolioCharge.objects.filter(
        charge_date=audit_date,
        charge_type=FolioCharge.ChargeType.ROOM,
        is_void=False,
        is_locked=False,
    ).update(is_locked=True)

    # ── 2. No-shows + room release ──
    no_show_count = _process_no_shows(audit_date, now)

    # ── 3. Revenue snapshot from folio ──
    folio_agg = FolioCharge.objects.filter(
        charge_date=audit_date,
        is_void=False,
    ).aggregate(
        room=Sum('total', filter=Q(charge_type='ROOM')),
        fnb=Sum('total', filter=Q(charge_type__in=['FOOD', 'BEVERAGE'])),
        tax=Sum('total', filter=Q(charge_type='TAX')),
        service=Sum('total', filter=Q(charge_type='SERVICE')),
        other=Sum(
            'total',
            filter=~Q(charge_type__in=['ROOM', 'FOOD', 'BEVERAGE', 'DEPOSIT', 'REFUND', 'TAX', 'DISCOUNT', 'SERVICE']),
        ),
    )
    room_revenue = _money(folio_agg['room'])
    fnb_revenue = _money(folio_agg['fnb'])
    tax_revenue = _money(folio_agg['tax'])
    service_revenue = _money(folio_agg['service'])
    other_revenue = _money(folio_agg['other'])
    total_revenue = _money(room_revenue + fnb_revenue + tax_revenue + service_revenue + other_revenue)

    occupancy_rate = _money((Decimal(rooms_sold) / Decimal(total_rooms) * 100) if total_rooms else 0)
    new_bookings = Booking.objects.filter(created_at__date=audit_date).count()
    check_ins = Booking.objects.filter(actual_check_in__date=audit_date).count()
    check_outs = Booking.objects.filter(actual_check_out__date=audit_date).count()

    # ── 4. Persist audit log (occupancy snapshots) ──
    log = NightAuditLog.objects.create(
        audit_date=audit_date,
        total_rooms_sold=rooms_sold,
        total_rooms_available=total_rooms,
        occupancy_rate=occupancy_rate,
        room_revenue=room_revenue,
        fnb_revenue=fnb_revenue,
        tax_revenue=tax_revenue,
        service_charge_revenue=service_revenue,
        other_revenue=other_revenue,
        total_revenue=total_revenue,
        no_show_count=no_show_count,
        new_bookings=new_bookings,
        check_ins=check_ins,
        check_outs=check_outs,
        am_occupied=rooms_sold,
        pm_occupied=rooms_sold,
        evening_occupied=rooms_sold,
        performed_by=performed_by,
        notes=notes or '',
    )

    # ── 5. Advance business date LAST (only if everything above succeeded) ──
    config.business_date = audit_date + timedelta(days=1)
    config.save(update_fields=['business_date', 'updated_at'])

    return log
