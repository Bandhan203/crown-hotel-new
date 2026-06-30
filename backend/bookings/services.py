from decimal import Decimal

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from rooms.models import Room

MAX_EXTRA_BEDS = 3


def assert_guest_bookable(user):
    """Reject inactive or blacklisted guests for new reservations."""
    if not user.is_active:
        raise ValidationError({'guest': 'Guest account is deactivated.'})
    from accounts.models import GuestProfile
    profile, _ = GuestProfile.objects.get_or_create(user=user)
    if profile.blacklisted:
        raise ValidationError({'guest': 'Guest is blacklisted and cannot be booked.'})


def validate_guest_capacity(room_type, adults, children=0, infants=0, num_rooms=1, extra_bed=0):
    """
    Return an error message when guest count exceeds base capacity + extra beds.
    Each extra bed adds one guest to the base capacity (max_guests × num_rooms).
    """
    rooms = max(1, int(num_rooms or 1))
    total = int(adults) + int(children or 0) + int(infants or 0)
    base = room_type.max_guests * rooms
    extra = max(0, int(extra_bed or 0))
    effective = base + extra

    if total <= effective:
        return None

    extra_required = max(0, total - base)
    short = total - effective
    msg = (
        f'Total guests ({total}) exceeds capacity for {room_type.name} '
        f'({room_type.max_guests} per room × {rooms} room{"s" if rooms != 1 else ""} = {base} base). '
        f'Add at least {extra_required} extra bed{"s" if extra_required != 1 else ""}'
    )
    if short > 0:
        msg += f' — {short} more needed with current {extra} extra bed{"s" if extra != 1 else ""}'
    msg += '.'
    if extra_required > MAX_EXTRA_BEDS:
        msg += f' Maximum {MAX_EXTRA_BEDS} extra beds allowed; book more room(s) or reduce PAX.'
    return msg


def check_availability(room_type_id, check_in, check_out, exclude_booking_id=None):
    """Return rooms free for the date range (by booking overlap, not current room status)."""
    from datetime import date as date_cls
    from bookings.models import Booking

    if isinstance(check_in, str):
        check_in = date_cls.fromisoformat(check_in)
    if isinstance(check_out, str):
        check_out = date_cls.fromisoformat(check_out)

    if check_in >= check_out:
        return Room.objects.none()

    booked_qs = Booking.objects.filter(
        room__isnull=False,
        room_type_id=room_type_id,
        check_in_date__lt=check_out,
        check_out_date__gt=check_in,
        status__in=['PENDING', 'CONFIRMED', 'CHECKED_IN'],
    )
    if exclude_booking_id:
        booked_qs = booked_qs.exclude(pk=exclude_booking_id)
    booked_room_ids = booked_qs.values_list('room_id', flat=True)

    # Use booking overlap only — a room may be OCCUPIED today but free for future dates.
    return (
        Room.objects.filter(room_type_id=room_type_id)
        .exclude(status='MAINTENANCE')
        .exclude(housekeeping_status__in=['VD', 'OD', 'CO'])
        .exclude(id__in=booked_room_ids)
        .order_by('room_number')
    )


def assign_room(room_type_id, check_in, check_out, exclude_booking_id=None):
    """Assign the first available room for a booking."""
    available = check_availability(room_type_id, check_in, check_out, exclude_booking_id)
    return available.first()


def sync_booking_payment_status(booking):
    """Set payment_status from completed net payments vs total_price."""
    from bookings.models import Booking, Payment
    from django.db.models import Case, F, Sum, When

    paid = Payment.objects.filter(
        booking=booking, status='COMPLETED',
    ).aggregate(
        net=Sum(
            Case(
                When(is_refund=True, then=-F('amount')),
                default=F('amount'),
            )
        )
    )['net'] or 0
    paid = float(paid)
    total = float(booking.total_price)

    if paid <= 0:
        booking.payment_status = Booking.PaymentStatus.UNPAID
    elif paid >= total:
        booking.payment_status = Booking.PaymentStatus.PAID
    else:
        booking.payment_status = Booking.PaymentStatus.PARTIAL
    booking.save(update_fields=['payment_status', 'updated_at'])


def calculate_rate_plan_price(base_price_per_night, nights, rate_plan=None):
    """
    Calculate final price applying a rate plan discount.
    Returns (discounted_total, discount_amount).
    """
    base_total = Decimal(str(base_price_per_night)) * nights

    if not rate_plan:
        return base_total, Decimal('0.00')

    if rate_plan.discount_type == 'PERCENTAGE':
        discount = base_total * (Decimal(str(rate_plan.discount_value)) / Decimal('100'))
    else:  # FIXED — per night
        discount = Decimal(str(rate_plan.discount_value)) * nights

    discount = min(discount, base_total)  # never more than total
    return base_total - discount, discount


def get_applicable_rate_plans(room_type_id, check_in_date, check_out_date):
    """Return active rate plans that apply to a room type and date range."""
    from django.db.models import Count

    from bookings.models import RatePlan

    nights = (check_out_date - check_in_date).days
    if nights <= 0:
        return RatePlan.objects.none()

    qs = (
        RatePlan.objects.filter(is_active=True, min_nights__lte=nights)
        .annotate(room_type_count=Count('room_types'))
        .filter(
            Q(room_type_count=0) | Q(room_types=room_type_id),
            Q(valid_from__isnull=True) | Q(valid_from__lte=check_in_date),
            Q(valid_to__isnull=True) | Q(valid_to__gte=check_out_date),
            Q(max_nights__isnull=True) | Q(max_nights__gte=nights),
        )
        .distinct()
    )
    return qs


def assert_rate_plan_applicable(rate_plan_id, room_type_id, check_in_date, check_out_date):
    """Validate rate plan exists, is active, and applies to the stay. Returns RatePlan or None."""
    if not rate_plan_id:
        return None
    from bookings.models import RatePlan

    try:
        plan = RatePlan.objects.get(pk=rate_plan_id)
    except RatePlan.DoesNotExist:
        raise ValidationError({'rate_plan': 'Rate plan not found.'})
    if not plan.is_active:
        raise ValidationError({'rate_plan': 'Rate plan is inactive.'})
    if not get_applicable_rate_plans(room_type_id, check_in_date, check_out_date).filter(pk=plan.pk).exists():
        raise ValidationError({'rate_plan': 'Rate plan does not apply to this room type and stay dates.'})
    return plan


def apply_registration_data(booking, profile, data):
    """Apply registration form payload to booking + guest profile."""
    booking_fields = [
        'guest_type', 'purpose_of_visit', 'coming_from', 'extra_bed',
        'rack_rate', 'offer_rate', 'discount_pct', 'discount_amount',
        'service_charge_pct', 'vat_pct',
        'special_requests', 'profile_note',
        'company_name', 'booking_source', 'arrival_time', 'id_type', 'id_number',
        'contact_person', 'infants', 'deposit_amount', 'num_rooms',
        'dnm', 'no_post', 'is_travel_agency', 'non_smoking',
        'pickup_required', 'flight_pickup_no', 'flight_eta',
        'drop_required', 'flight_drop_no', 'flight_etd', 'billing_type',
    ]
    for field in booking_fields:
        if field in data:
            setattr(booking, field, data[field])

    if any(k in data for k in (
        'rack_rate', 'offer_rate', 'discount_pct', 'discount_amount',
        'service_charge_pct', 'vat_pct',
    )):
        nights = booking.nights
        num_rooms = max(1, int(booking.num_rooms or 1))
        offer = float(booking.offer_rate or booking.rack_rate or booking.room_type.price_per_night)
        disc = float(booking.discount_amount or 0)
        subtotal = max(0, offer * nights * num_rooms - disc)
        svc = subtotal * float(booking.service_charge_pct or 0) / 100
        vat = subtotal * float(booking.vat_pct or 0) / 100
        booking.total_price = subtotal
        booking.tax_amount = round(svc + vat, 2)
        booking.grand_total = round(subtotal + svc + vat, 2)

    profile_map = {
        'first_name': 'first_name',
        'last_name': 'last_name',
        'designation': 'designation',
        'date_of_birth': 'date_of_birth',
        'gender': 'gender',
        'nationality': 'nationality',
        'country': 'country',
        'address': 'address_line1',
        'occupation': 'occupation',
        'place_of_issue': 'place_of_issue',
        'visa_no': 'visa_no',
    }
    for src, dst in profile_map.items():
        if src in data:
            setattr(profile, dst, data[src])

    # Bidirectional id_type/id_number sync: write whichever side is filled
    if 'id_type' in data and data['id_type']:
        profile.id_type = data['id_type']
    if 'id_number' in data and data['id_number']:
        profile.id_number = data['id_number']
    # Back-fill booking from profile if booking fields are empty
    if not booking.id_type and profile.id_type:
        booking.id_type = profile.id_type
    if not booking.id_number and profile.id_number:
        booking.id_number = profile.id_number

    if 'guest_phone' in data:
        booking.guest.phone = data['guest_phone']

    if 'first_name' in data or 'last_name' in data:
        fn = data.get('first_name', profile.first_name)
        ln = data.get('last_name', profile.last_name)
        booking.guest.full_name = f"{fn} {ln}".strip() or fn or booking.guest.full_name

    booking.save()
    profile.save()
    if 'guest_phone' in data or 'first_name' in data or 'last_name' in data:
        booking.guest.save(update_fields=['phone', 'full_name'])


def default_folio_window(booking) -> int:
    """Route company-billed charges to the corporate folio window when applicable."""
    if booking.billing_type == 'COMPANY':
        account = getattr(booking, 'corporate_account', None)
        if account_id := getattr(booking, 'corporate_account_id', None):
            from corporate.models import CorporateAccount
            account = account or CorporateAccount.objects.filter(pk=account_id).first()
        if account:
            return max(1, min(8, int(account.default_folio_window or 2)))
        return 2
    return 1


def ensure_folio_windows(booking):
    """Provision relational FolioWindow rows (1–8) tied to booking FK."""
    from dashboard.models import FolioWindow

    if FolioWindow.objects.filter(booking=booking).exists():
        return
    FolioWindow.objects.create(booking=booking, window_number=1, label='Main Folio')
    if booking.billing_type == 'COMPANY':
        FolioWindow.objects.create(booking=booking, window_number=2, label='Company Folio')


def ensure_folio_window_slot(booking, window_number: int, label: str = ''):
    """Ensure FolioWindow metadata exists for a charge target slot (1–8)."""
    from dashboard.models import FolioWindow

    FolioWindow.objects.get_or_create(
        booking=booking,
        window_number=window_number,
        defaults={'label': label or f'Window {window_number}'},
    )


def open_guest_folio(booking, posted_by):
    """Create opening folio entries when a guest checks in."""
    from bookings.models import FolioCharge

    ensure_folio_windows(booking)

    # Auto-populate company_name on all folio entries for company-billed stays
    company = booking.company_name if booking.billing_type == 'COMPANY' else ''
    charge_window = default_folio_window(booking)

    if booking.deposit_amount > 0 and not FolioCharge.objects.filter(
        booking=booking, charge_type='DEPOSIT', is_void=False,
    ).exists():
        FolioCharge.objects.create(
            booking=booking,
            folio_window=charge_window,
            charge_type='DEPOSIT',
            description='Security deposit',
            amount=-booking.deposit_amount,
            quantity=1,
            total=-booking.deposit_amount,
            charge_date=booking.check_in_date,
            posted_by=posted_by,
            reference=company,
        )

    nightly_rate = booking.total_price / max(booking.nights, 1)
    if not FolioCharge.objects.filter(
        booking=booking,
        charge_type='ROOM',
        charge_date=booking.check_in_date,
        is_void=False,
    ).exists():
        FolioCharge.objects.create(
            booking=booking,
            folio_window=charge_window,
            charge_type='ROOM',
            description=f'Room charge — {booking.check_in_date}',
            amount=nightly_rate,
            quantity=1,
            total=nightly_rate,
            charge_date=booking.check_in_date,
            posted_by=posted_by,
            reference=company,
        )


def perform_check_in(booking, data, user):
    """
    Assign room, mark booking CHECKED_IN, set room OCCUPIED, open folio.
    `data` is validated check-in payload (room_id, billing_type, etc.).
    """
    from django.utils import timezone
    from bookings.models import Booking

    room_id = data.get('room_id')
    if room_id:
        room = check_availability(
            booking.room_type_id,
            booking.check_in_date,
            booking.check_out_date,
            exclude_booking_id=booking.id,
        ).filter(pk=room_id).first()
        if not room:
            raise ValueError('Selected room is not available for these dates.')
        booking.room = room
    elif not booking.room:
        room = assign_room(
            booking.room_type_id,
            booking.check_in_date,
            booking.check_out_date,
            exclude_booking_id=booking.id,
        )
        if not room:
            raise ValueError('No rooms available for auto-assignment.')
        booking.room = room
    else:
        still_ok = check_availability(
            booking.room_type_id,
            booking.check_in_date,
            booking.check_out_date,
            exclude_booking_id=booking.id,
        ).filter(pk=booking.room_id).exists()
        if not still_ok:
            raise ValueError('Pre-assigned room is no longer available.')

    if data.get('billing_type'):
        booking.billing_type = data['billing_type']
    if data.get('id_type'):
        booking.id_type = data['id_type']
    if data.get('id_number'):
        booking.id_number = data['id_number']
    if data.get('deposit_amount') is not None:
        booking.deposit_amount = data['deposit_amount']
    if data.get('notes_internal'):
        booking.notes_internal = data['notes_internal']
    if data.get('guest_type'):
        booking.guest_type = data['guest_type']
    if data.get('purpose_of_visit'):
        booking.purpose_of_visit = data['purpose_of_visit']
    if data.get('coming_from'):
        booking.coming_from = data['coming_from']
    if data.get('extra_bed') is not None:
        booking.extra_bed = data['extra_bed']

    if not booking.rack_rate:
        booking.rack_rate = booking.room_type.price_per_night
    if not booking.offer_rate:
        booking.offer_rate = booking.rack_rate or booking.room_type.price_per_night

    booking.status = Booking.Status.CHECKED_IN
    booking.actual_check_in = timezone.now()
    booking.checked_in_by = user
    booking.save()

    booking.room.status = 'OCCUPIED'
    booking.room.save(update_fields=['status'])
    open_guest_folio(booking, user)
    sync_booking_payment_status(booking)
    return booking
