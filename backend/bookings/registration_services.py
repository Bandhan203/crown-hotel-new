"""Registration persistence — single source of truth for check-in data."""
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from accounts.models import GuestProfile
from rooms.models import RoomType

from .models import Booking, Registration
from .services import (
    apply_registration_data,
    check_availability,
    perform_check_in,
)

User = get_user_model()

REGISTRATION_WRITABLE = [
    'guest_email', 'guest_phone', 'first_name', 'last_name', 'designation',
    'date_of_birth', 'gender', 'nationality', 'country', 'address', 'occupation',
    'place_of_issue', 'visa_no', 'id_type', 'id_number', 'contact_person',
    'check_in_date', 'check_out_date', 'arrival_time',
    'adults', 'children', 'infants', 'extra_bed',
    'guest_type', 'purpose_of_visit', 'coming_from', 'company_name', 'booking_source',
    'special_requests', 'rack_rate', 'offer_rate', 'discount_amount', 'deposit_amount',
    'billing_type',
]


def _registration_status_from_booking(booking):
    if booking.status == 'CHECKED_IN':
        return Registration.Status.CHECKED_IN
    if booking.status in ('PENDING', 'CONFIRMED'):
        return Registration.Status.REGISTERED
    return Registration.Status.REGISTERED


def sync_registration_from_booking(booking, registration=None):
    """Copy booking + guest profile fields onto Registration record."""
    profile, _ = GuestProfile.objects.get_or_create(user=booking.guest)
    if registration is None:
        registration, _ = Registration.objects.get_or_create(
            booking=booking,
            defaults={
                'guest': booking.guest,
                'mode': Registration.Mode.ADVANCE,
                'status': _registration_status_from_booking(booking),
            },
        )
    registration.guest = booking.guest
    registration.guest_email = booking.guest.email
    registration.guest_phone = booking.guest.phone or ''
    registration.first_name = profile.first_name or ''
    registration.last_name = profile.last_name or ''
    registration.designation = profile.designation or ''
    registration.date_of_birth = profile.date_of_birth
    registration.gender = profile.gender or ''
    registration.nationality = profile.nationality or ''
    registration.country = profile.country or ''
    registration.address = profile.address_line1 or ''
    registration.occupation = profile.occupation or ''
    registration.place_of_issue = profile.place_of_issue or ''
    registration.visa_no = profile.visa_no or ''
    registration.id_type = booking.id_type or ''
    registration.id_number = booking.id_number or ''
    registration.contact_person = booking.contact_person or ''
    registration.room_type = booking.room_type
    registration.room = booking.room
    registration.check_in_date = booking.check_in_date
    registration.check_out_date = booking.check_out_date
    registration.arrival_time = booking.arrival_time
    registration.adults = booking.adults
    registration.children = booking.children
    registration.infants = booking.infants
    registration.extra_bed = booking.extra_bed
    registration.guest_type = booking.guest_type or ''
    registration.purpose_of_visit = booking.purpose_of_visit or ''
    registration.coming_from = booking.coming_from or ''
    registration.company_name = booking.company_name or ''
    registration.booking_source = booking.booking_source or 'PHONE'
    registration.special_requests = booking.special_requests or ''
    registration.rack_rate = booking.rack_rate or booking.room_type.price_per_night
    registration.offer_rate = booking.offer_rate or registration.rack_rate
    registration.discount_amount = booking.discount_amount or 0
    registration.deposit_amount = booking.deposit_amount or 0
    registration.billing_type = booking.billing_type or 'GUEST'
    registration.mode = Registration.Mode.ADVANCE
    registration.status = _registration_status_from_booking(booking)
    registration.save()
    return registration


def get_or_create_registration_for_booking(booking):
    if hasattr(booking, 'registration_record') and booking.registration_record:
        return sync_registration_from_booking(booking, booking.registration_record)
    return sync_registration_from_booking(booking)


def create_walk_in_registration():
    from dashboard.models import HotelConfig

    today = HotelConfig.load().business_date
    tomorrow = date.fromordinal(today.toordinal() + 1)
    return Registration.objects.create(
        mode=Registration.Mode.WALK_IN,
        status=Registration.Status.DRAFT,
        check_in_date=today,
        check_out_date=tomorrow,
        booking_source='WALK_IN',
    )


def _advance_payment_source(transaction_id: str) -> str:
    tid = (transaction_id or '').upper()
    if tid == 'RESERVATION':
        return 'RESERVATION'
    if tid == 'CHECK_IN':
        return 'CHECK_IN'
    return 'OTHER'


def _serialize_advance_payments(booking):
    if not booking:
        return []
    from bookings.models import Payment

    rows = Payment.objects.filter(
        booking=booking,
        status=Payment.Status.COMPLETED,
        is_refund=False,
    ).order_by('paid_at', 'id')
    labels = {
        'RESERVATION': 'Reservation advance',
        'CHECK_IN': 'Check-in advance',
        'OTHER': 'Advance payment',
    }
    result = []
    for payment in rows:
        source = _advance_payment_source(payment.transaction_id)
        result.append({
            'id': payment.id,
            'amount': str(payment.amount),
            'payment_method': payment.payment_method,
            'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
            'source': source,
            'label': labels.get(source, 'Advance payment'),
            'booking_ref': booking.booking_ref,
        })
    return result


def registration_to_api(registration, request=None):
    """Serialize registration for frontend hydration."""
    booking = registration.booking
    room_type_name = registration.room_type.name if registration.room_type else ''
    room_number = registration.room.room_number if registration.room else ''
    total_price = str(registration.offer_rate or registration.rack_rate or 0)
    grand_total = total_price
    currency = 'BDT'
    registration_card = None
    booking_status = registration.status

    advance_paid = 0.0
    advance_payments = []
    balance_due = 0.0
    from dashboard.models import HotelConfig
    business_date = HotelConfig.load().business_date.isoformat()

    if booking:
        room_type_name = booking.room_type.name if booking.room_type else room_type_name
        room_number = booking.room.room_number if booking.room else room_number
        total_price = str(booking.total_price)
        grand_total = str(booking.grand_total)
        currency = booking.currency or 'BDT'
        booking_status = booking.status
        if booking.registration_card and request:
            registration_card = request.build_absolute_uri(booking.registration_card.url)
        from bookings.checkout_services import get_payment_breakdown
        advance_paid = get_payment_breakdown(booking)['receipts']
        advance_payments = _serialize_advance_payments(booking)
        balance_due = max(0.0, float(booking.grand_total or booking.total_price or 0) - advance_paid)
    else:
        advance_paid = 0.0
        advance_payments = []
        balance_due = 0.0

    return {
        'id': registration.id,
        'registration_id': registration.id,
        'registration_ref': registration.registration_ref,
        'mode': registration.mode,
        'status': booking_status,
        'registration_status': registration.status,
        'booking_id': booking.id if booking else None,
        'booking_ref': booking.booking_ref if booking else '',
        'guest_id': registration.guest_id,
        'guest_email': registration.guest_email,
        'guest_phone': registration.guest_phone,
        'first_name': registration.first_name,
        'last_name': registration.last_name,
        'designation': registration.designation,
        'date_of_birth': registration.date_of_birth,
        'gender': registration.gender,
        'nationality': registration.nationality,
        'country': registration.country,
        'address': registration.address,
        'occupation': registration.occupation,
        'place_of_issue': registration.place_of_issue,
        'visa_no': registration.visa_no,
        'id_type': registration.id_type,
        'id_number': registration.id_number,
        'contact_person': registration.contact_person,
        'room_type_id': registration.room_type_id,
        'room_type_name': room_type_name,
        'room_id': registration.room_id,
        'room_number': room_number,
        'check_in_date': registration.check_in_date,
        'check_out_date': registration.check_out_date,
        'arrival_time': registration.arrival_time,
        'nights': registration.nights,
        'adults': registration.adults,
        'children': registration.children,
        'infants': registration.infants,
        'extra_bed': registration.extra_bed,
        'guest_type': registration.guest_type,
        'purpose_of_visit': registration.purpose_of_visit,
        'coming_from': registration.coming_from,
        'company_name': registration.company_name,
        'booking_source': registration.booking_source,
        'special_requests': registration.special_requests,
        'rack_rate': str(registration.rack_rate),
        'offer_rate': str(registration.offer_rate),
        'discount_amount': str(registration.discount_amount),
        'deposit_amount': str(registration.deposit_amount),
        'advance_paid': str(advance_paid),
        'advance_payments': advance_payments,
        'balance_due': str(balance_due),
        'payment_amount': '0',
        'payment_method': 'CASH',
        'total_price': total_price,
        'grand_total': grand_total,
        'currency': currency,
        'billing_type': registration.billing_type or 'GUEST',
        'business_date': business_date,
        'registration_card': registration_card,
    }


def apply_registration_payload(registration, data):
    """Persist form data on Registration and sync linked booking/profile."""
    data = dict(data)
    room_type_id = data.pop('room_type', None) or data.pop('room_type_id', None)
    room_id = data.pop('room_id', None)

    for field in REGISTRATION_WRITABLE:
        if field in data:
            setattr(registration, field, data[field])

    if room_type_id:
        try:
            registration.room_type = RoomType.objects.get(pk=room_type_id)
        except RoomType.DoesNotExist:
            pass
    room_was_set = room_id is not None
    if room_id is not None:
        registration.room_id = room_id

    guest_email = data.get('guest_email') or registration.guest_email
    if guest_email:
        registration.guest_email = guest_email.strip()
        first_name = data.get('first_name', registration.first_name) or ''
        last_name = data.get('last_name', registration.last_name) or ''
        full_name = f"{first_name} {last_name}".strip() or 'Guest'
        guest, created = User.objects.get_or_create(
            email=registration.guest_email,
            defaults={'full_name': full_name, 'phone': registration.guest_phone, 'role': 'GUEST'},
        )
        if created:
            guest.set_unusable_password()
            guest.save()
        else:
            guest.full_name = full_name
            if registration.guest_phone:
                guest.phone = registration.guest_phone
            guest.save(update_fields=['full_name', 'phone'])
        registration.guest = guest

    if registration.status == Registration.Status.DRAFT and registration.guest_email:
        registration.status = Registration.Status.REGISTERED

    registration.save()

    if registration.booking_id:
        booking = registration.booking
        profile, _ = GuestProfile.objects.get_or_create(user=registration.guest)
        sync_payload = {
            **data,
            'address': registration.address,
            'guest_phone': registration.guest_phone,
        }
        apply_registration_data(booking, profile, sync_payload)

        if (
            room_was_set
            and registration.room_id
            and registration.check_in_date
            and registration.check_out_date
        ):
            from bookings.services import check_availability, release_room_if_unassigned

            avail = check_availability(
                booking.room_type_id or registration.room_type_id,
                registration.check_in_date,
                registration.check_out_date,
                exclude_booking_id=booking.id,
            ).filter(pk=registration.room_id).first()
            if avail:
                old_room = booking.room
                booking.room = avail
                booking.save(update_fields=['room', 'updated_at'])
                registration.room = avail
                registration.save(update_fields=['room', 'updated_at'])
                release_room_if_unassigned(old_room, exclude_booking_id=booking.id)
                if booking.status in ('PENDING', 'CONFIRMED'):
                    avail.status = 'RESERVED'
                    avail.save(update_fields=['status'])
            else:
                registration.room = booking.room
                registration.save(update_fields=['room', 'updated_at'])
        else:
            sync_registration_from_booking(booking, registration)

    return registration


def _ensure_booking_for_walk_in(registration, user):
    """Create booking from walk-in registration when checking in."""
    if registration.booking_id:
        return registration.booking

    if not registration.room_type_id:
        raise ValueError('Room type is required.')
    if not registration.check_in_date or not registration.check_out_date:
        raise ValueError('Check-in and check-out dates are required.')
    if not registration.guest_id:
        raise ValueError('Guest email and name are required.')

    room_type = registration.room_type
    nights = registration.nights
    if nights <= 0:
        raise ValueError('Check-out must be after check-in.')

    from bookings.services import money
    from decimal import Decimal

    offer = money(registration.offer_rate or registration.rack_rate or room_type.price_per_night)
    rack = money(registration.rack_rate or offer)
    disc = money(registration.discount_amount or 0)
    line_total = offer * nights
    total_price = money(max(Decimal('0'), line_total - disc))
    if total_price <= 0:
        total_price = money(rack * nights)
    svc_pct = money(getattr(registration, 'service_charge_pct', 0) or 0)
    vat_pct = money(getattr(registration, 'vat_pct', 0) or 0)
    service_charge = money(total_price * svc_pct / Decimal('100'))
    vat_amount = money(total_price * vat_pct / Decimal('100'))
    grand = money(total_price + service_charge + vat_amount)

    room = None
    if registration.room_id:
        room = check_availability(
            room_type.id, registration.check_in_date, registration.check_out_date,
        ).filter(pk=registration.room_id).first()
        if not room:
            raise ValueError('Selected room is not available for these dates.')

    booking = Booking.objects.create(
        guest=registration.guest,
        room=room,
        room_type=room_type,
        check_in_date=registration.check_in_date,
        check_out_date=registration.check_out_date,
        arrival_time=registration.arrival_time,
        adults=registration.adults,
        children=registration.children,
        infants=registration.infants,
        extra_bed=registration.extra_bed,
        total_price=total_price,
        grand_total=grand,
        rack_rate=rack,
        offer_rate=offer,
        discount_amount=disc,
        tax_amount=money(service_charge + vat_amount),
        deposit_amount=registration.deposit_amount,
        status='CONFIRMED',
        booking_source=registration.booking_source or 'WALK_IN',
        id_type=registration.id_type,
        id_number=registration.id_number,
        company_name=registration.company_name,
        contact_person=registration.contact_person,
        guest_type=registration.guest_type,
        purpose_of_visit=registration.purpose_of_visit,
        coming_from=registration.coming_from,
        special_requests=registration.special_requests,
        billing_type=registration.billing_type or 'GUEST',
    )
    registration.booking = booking
    registration.save(update_fields=['booking', 'updated_at'])

    profile, _ = GuestProfile.objects.get_or_create(user=registration.guest)
    profile.first_name = registration.first_name
    profile.last_name = registration.last_name
    profile.designation = registration.designation or ''
    if registration.date_of_birth:
        profile.date_of_birth = registration.date_of_birth
    profile.gender = registration.gender or ''
    profile.nationality = registration.nationality or ''
    profile.country = registration.country or ''
    profile.address_line1 = registration.address or ''
    profile.occupation = registration.occupation or ''
    profile.place_of_issue = registration.place_of_issue or ''
    profile.visa_no = registration.visa_no or ''
    profile.save()

    return booking


def _recalculate_booking_stay_pricing(booking):
    """Recompute room charges after check-in / check-out date changes."""
    from decimal import Decimal

    from bookings.services import MAX_BOOKING_AMOUNT, money

    nights = (booking.check_out_date - booking.check_in_date).days
    if nights <= 0:
        raise ValueError('Check-out must be after check-in.')

    num_rooms = booking.num_rooms or 1
    offer = money(booking.offer_rate or booking.rack_rate or booking.room_type.price_per_night)
    rack = money(booking.rack_rate or offer)
    discount = money(booking.discount_amount or 0)
    line_total = offer * nights * num_rooms
    total_price = money(max(Decimal('0'), line_total - discount))
    if total_price <= 0:
        total_price = money(rack * nights * num_rooms)

    svc_pct = money(booking.service_charge_pct or 0)
    vat_pct = money(booking.vat_pct or 0)
    service_charge = money(total_price * svc_pct / Decimal('100'))
    vat = money(total_price * vat_pct / Decimal('100'))
    grand = money(total_price + service_charge + vat)
    if grand > MAX_BOOKING_AMOUNT:
        raise ValueError(
            'Recalculated total exceeds system limit. '
            'Please verify dates, rooms, and rates before early check-in.'
        )

    booking.total_price = total_price
    booking.grand_total = grand
    booking.tax_amount = money(service_charge + vat)
    return nights


def _resolve_arrival_for_check_in(booking, registration, business_date, early_check_in=False):
    """Align scheduled arrival with hotel business date when checking in early."""
    if booking.check_in_date <= business_date:
        return False

    if not early_check_in:
        raise ValueError(
            f'Arrival date is {booking.check_in_date}. Business date is {business_date}. '
            'Cannot check in before arrival date. Use early check-in to move arrival to today.'
        )

    booking.check_in_date = business_date
    if registration:
        registration.check_in_date = business_date

    _recalculate_booking_stay_pricing(booking)
    booking.save(update_fields=[
        'check_in_date', 'total_price', 'grand_total', 'tax_amount', 'updated_at',
    ])
    if registration:
        registration.save(update_fields=['check_in_date', 'updated_at'])
    return True


def check_in_registration(registration, data, user):
    """Unified check-in: update registration, ensure booking, perform check-in."""
    from dashboard.models import HotelConfig

    apply_registration_payload(registration, dict(data))

    booking = _ensure_booking_for_walk_in(registration, user)
    business_date = HotelConfig.load().business_date
    _resolve_arrival_for_check_in(
        booking,
        registration,
        business_date,
        early_check_in=bool(data.get('early_check_in')),
    )

    if booking.status not in ('PENDING', 'CONFIRMED'):
        raise ValueError(f'Cannot check in a booking with status {booking.status}.')

    profile, _ = GuestProfile.objects.get_or_create(user=booking.guest)
    checkin_data = {
        'room_id': data.get('room_id') or registration.room_id,
        'billing_type': data.get('billing_type', registration.billing_type),
        'id_type': registration.id_type,
        'id_number': registration.id_number,
        'deposit_amount': registration.deposit_amount,
        'guest_type': registration.guest_type,
        'purpose_of_visit': registration.purpose_of_visit,
        'coming_from': registration.coming_from,
        'extra_bed': registration.extra_bed,
        'notes_internal': data.get('notes_internal', ''),
    }

    with transaction.atomic():
        apply_registration_data(booking, profile, {
            'first_name': registration.first_name,
            'last_name': registration.last_name,
            'designation': registration.designation,
            'date_of_birth': registration.date_of_birth,
            'gender': registration.gender,
            'nationality': registration.nationality,
            'country': registration.country,
            'address': registration.address,
            'occupation': registration.occupation,
            'place_of_issue': registration.place_of_issue,
            'visa_no': registration.visa_no,
            'guest_phone': registration.guest_phone,
            'billing_type': checkin_data['billing_type'],
            **{k: v for k, v in checkin_data.items() if k in (
                'guest_type', 'purpose_of_visit', 'coming_from', 'extra_bed', 'deposit_amount',
            )},
        })
        perform_check_in(booking, checkin_data, user)

        payment_amount = float(data.get('payment_amount') or 0)
        if payment_amount > 0:
            from bookings.models import Payment
            from bookings.checkout_services import get_business_date, get_business_datetime
            from bookings.services import sync_booking_payment_status

            existing = 0.0
            if booking.pk:
                from bookings.checkout_services import get_payment_breakdown
                existing = get_payment_breakdown(booking)['receipts']
            grand = float(booking.grand_total or booking.total_price or 0)
            if existing + payment_amount > grand + 0.01:
                raise ValueError(
                    f'Advance BDT {payment_amount:,.2f} exceeds balance due '
                    f'(BDT {max(0, grand - existing):,.2f}).'
                )
            Payment.objects.create(
                booking=booking,
                amount=payment_amount,
                payment_method=data.get('payment_method', Payment.Method.CASH),
                currency=booking.currency or 'BDT',
                status=Payment.Status.COMPLETED,
                transaction_id='CHECK_IN',
                paid_at=get_business_datetime(),
                business_date=get_business_date(),
                posted_by=user,
            )
            sync_booking_payment_status(booking)

        registration.status = Registration.Status.CHECKED_IN
        registration.billing_type = checkin_data['billing_type']
        registration.room = booking.room
        registration.save()

    booking.refresh_from_db()
    return booking, registration
