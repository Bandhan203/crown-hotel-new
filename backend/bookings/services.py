from decimal import Decimal

from django.db.models import Q

from rooms.models import Room

MAX_EXTRA_BEDS = 3


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
        .exclude(housekeeping_status='OUT_OF_ORDER')
        .exclude(id__in=booked_room_ids)
        .order_by('room_number')
    )


def assign_room(room_type_id, check_in, check_out, exclude_booking_id=None):
    """Assign the first available room for a booking."""
    available = check_availability(room_type_id, check_in, check_out, exclude_booking_id)
    return available.first()


def sync_booking_payment_status(booking):
    """Set payment_status from completed payments vs total_price."""
    from bookings.models import Booking, Payment
    from django.db.models import Sum

    paid = Payment.objects.filter(
        booking=booking, status='COMPLETED'
    ).aggregate(total=Sum('amount'))['total'] or 0
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
