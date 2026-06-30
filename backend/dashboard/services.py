from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, F
from django.utils import timezone

from bookings.models import Booking, FolioCharge
from rooms.models import Room

User = get_user_model()


def get_admin_dashboard_stats():
    """Aggregate stats for the admin dashboard."""
    from .models import HotelConfig
    today = HotelConfig.load().business_date
    month_start = today.replace(day=1)

    total_rooms = Room.objects.count()
    occupied_rooms = Room.objects.filter(status='OCCUPIED').count()
    occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms else 0

    bookings_today = Booking.objects.filter(created_at__date=today).count()

    revenue_month = Booking.objects.filter(
        status__in=['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'],
        created_at__date__gte=month_start,
    ).aggregate(total=Sum('total_price'))['total'] or 0

    total_guests = User.objects.filter(role='GUEST').count()

    pending_checkouts = Booking.objects.filter(
        status='CHECKED_IN',
        check_out_date=today,
    ).count()

    # New: arrivals today, departures today, in-house count
    arrivals_today = Booking.objects.filter(
        check_in_date=today,
        status__in=['PENDING', 'CONFIRMED'],
    ).count()

    departures_today = Booking.objects.filter(
        check_out_date=today,
        status='CHECKED_IN',
    ).count()

    in_house_count = Booking.objects.filter(status='CHECKED_IN').count()

    # Room status breakdown
    room_status = {
        'clean': Room.objects.filter(housekeeping_status__in=['OC', 'VC', 'ARR']).count(),
        'dirty': Room.objects.filter(housekeeping_status__in=['OD', 'VD', 'CO']).count(),
        'inspected': Room.objects.filter(housekeeping_status='ARR').count(),
        'out_of_order': Room.objects.filter(status='MAINTENANCE').count(),
    }

    recent_bookings = Booking.objects.select_related('guest', 'room_type').order_by('-created_at')[:5]

    # Revenue over last 7 days for chart
    revenue_chart = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_revenue = Booking.objects.filter(
            status__in=['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'],
            created_at__date=day,
        ).aggregate(total=Sum('total_price'))['total'] or 0
        revenue_chart.append({'date': day.isoformat(), 'revenue': float(day_revenue)})

    return {
        'total_rooms': total_rooms,
        'occupied_rooms': occupied_rooms,
        'occupancy_rate': round(occupancy_rate, 1),
        'bookings_today': bookings_today,
        'revenue_month': float(revenue_month),
        'total_guests': total_guests,
        'pending_checkouts_today': pending_checkouts,
        'arrivals_today': arrivals_today,
        'departures_today': departures_today,
        'in_house_count': in_house_count,
        'room_status': room_status,
        'recent_bookings': [
            {
                'id': b.id,
                'booking_ref': b.booking_ref,
                'guest_name': b.guest.full_name,
                'room_type': b.room_type.name,
                'check_in': b.check_in_date.isoformat(),
                'check_out': b.check_out_date.isoformat(),
                'status': b.status,
                'total_price': float(b.total_price),
            }
            for b in recent_bookings
        ],
        'revenue_chart': revenue_chart,
    }


def get_room_grid_data():
    """Get all rooms and public areas as lightweight primitives."""
    rooms = Room.objects.all().order_by('floor', 'room_number')
    
    grid_data = {
        'rooms': [],
        'public_areas': []
    }

    # Fetch active bookings mapped by room_id for O(1) lookup
    active_bookings = {
        b.room_id: b for b in Booking.objects.filter(status='CHECKED_IN').select_related('guest')
    }

    from .models import HotelConfig
    business_date = HotelConfig.load().business_date

    reserved_bookings = {
        b.room_id: b for b in Booking.objects.filter(
            room_id__isnull=False,
            status__in=['PENDING', 'CONFIRMED'],
            check_out_date__gt=business_date,
        ).select_related('guest')
    }

    for room in rooms:
        booking = active_bookings.get(room.id) or reserved_bookings.get(room.id)
        nights_remaining = 0
        display_status = room.status
        if booking:
            nights_remaining = (booking.check_out_date - business_date).days
            if room.status != 'OCCUPIED' and booking.status in ('PENDING', 'CONFIRMED'):
                display_status = 'RESERVED'

        room_data = {
            'id': room.id,
            'room_number': room.room_number,
            'floor': room.floor,
            'status': display_status,
            'housekeeping_status': room.housekeeping_status,
            'is_public_area': room.is_public_area,
            'area_type': room.area_type,
            'guest_name': booking.guest.full_name if booking else None,
            'nights_remaining': max(0, nights_remaining) if booking else None,
            'expected_arrival': (
                booking is not None
                and booking.status in ('PENDING', 'CONFIRMED')
                and booking.check_in_date >= business_date
            ),
        }
        if room.is_public_area:
            grid_data['public_areas'].append(room_data)
        else:
            grid_data['rooms'].append(room_data)

    return grid_data


# ──────────────────────────────────────────────
# Night Audit (delegated to night_audit_services)
# ──────────────────────────────────────────────

from .night_audit_services import get_night_audit_preview, run_night_audit  # noqa: F401


# ──────────────────────────────────────────────
# Reports
# ──────────────────────────────────────────────

def get_occupancy_report(start_date, end_date):
    """Daily occupancy breakdown for a date range."""
    rows = []
    total_rooms = Room.objects.count()
    current = start_date
    while current <= end_date:
        sold = Booking.objects.filter(
            status__in=['CHECKED_IN', 'CHECKED_OUT'],
            check_in_date__lte=current,
            check_out_date__gt=current,
        ).count()
        rate = (sold / total_rooms * 100) if total_rooms else 0
        rows.append({
            'date': current.isoformat(),
            'total_rooms': total_rooms,
            'rooms_sold': sold,
            'rooms_available': total_rooms - sold,
            'occupancy_rate': round(rate, 1),
        })
        current += timedelta(days=1)
    return rows


def get_revenue_report(start_date, end_date):
    """Revenue breakdown by type for a date range."""
    folio_qs = FolioCharge.objects.filter(
        charge_date__gte=start_date,
        charge_date__lte=end_date,
        is_void=False,
    ).exclude(charge_type__in=['DEPOSIT', 'REFUND', 'DISCOUNT'])

    by_type = folio_qs.values('charge_type').annotate(total=Sum('total')).order_by('charge_type')

    daily = []
    current = start_date
    while current <= end_date:
        day_total = FolioCharge.objects.filter(
            charge_date=current, is_void=False,
        ).exclude(charge_type__in=['DEPOSIT', 'REFUND', 'DISCOUNT']).aggregate(
            total=Sum('total')
        )['total'] or 0
        daily.append({'date': current.isoformat(), 'revenue': float(day_total)})
        current += timedelta(days=1)

    grand_total = float(folio_qs.aggregate(total=Sum('total'))['total'] or 0)

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'by_type': [{'charge_type': r['charge_type'], 'total': float(r['total'])} for r in by_type],
        'daily': daily,
        'grand_total': grand_total,
    }


def get_arrivals_departures_report(report_date):
    """Arrivals and departures for a specific date."""
    arrivals = Booking.objects.filter(
        check_in_date=report_date,
    ).select_related('guest', 'room_type', 'room').exclude(status='CANCELLED')

    departures = Booking.objects.filter(
        check_out_date=report_date,
    ).select_related('guest', 'room_type', 'room').exclude(status='CANCELLED')

    def serialize_booking(b):
        return {
            'id': b.id,
            'booking_ref': b.booking_ref,
            'guest_name': b.guest.full_name,
            'room_type': b.room_type.name,
            'room_number': b.room.room_number if b.room else None,
            'status': b.status,
            'total_price': float(b.total_price),
        }

    return {
        'date': report_date.isoformat(),
        'arrivals': [serialize_booking(b) for b in arrivals],
        'departures': [serialize_booking(b) for b in departures],
        'arrival_count': arrivals.count(),
        'departure_count': departures.count(),
    }


def get_no_show_report(start_date, end_date):
    """No-shows in a date range."""
    no_shows = Booking.objects.filter(
        no_show=True,
        check_in_date__gte=start_date,
        check_in_date__lte=end_date,
    ).select_related('guest', 'room_type')

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'count': no_shows.count(),
        'bookings': [
            {
                'id': b.id,
                'booking_ref': b.booking_ref,
                'guest_name': b.guest.full_name,
                'room_type': b.room_type.name,
                'check_in_date': b.check_in_date.isoformat(),
                'total_price': float(b.total_price),
            }
            for b in no_shows
        ],
    }


def get_cancellation_report(start_date, end_date):
    """Cancellations in a date range."""
    cancellations = Booking.objects.filter(
        status='CANCELLED',
        no_show=False,
        cancelled_at__date__gte=start_date,
        cancelled_at__date__lte=end_date,
    ).select_related('guest', 'room_type')

    # Also include those without cancelled_at but status == CANCELLED and created_at in range
    if not cancellations.exists():
        cancellations = Booking.objects.filter(
            status='CANCELLED',
            no_show=False,
            updated_at__date__gte=start_date,
            updated_at__date__lte=end_date,
        ).select_related('guest', 'room_type')

    return {
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'count': cancellations.count(),
        'bookings': [
            {
                'id': b.id,
                'booking_ref': b.booking_ref,
                'guest_name': b.guest.full_name,
                'room_type': b.room_type.name,
                'check_in_date': b.check_in_date.isoformat(),
                'check_out_date': b.check_out_date.isoformat(),
                'total_price': float(b.total_price),
                'cancellation_reason': b.cancellation_reason,
            }
            for b in cancellations
        ],
    }


def get_guest_ledger_report():
    """Outstanding guest balances for checked-in guests."""
    in_house = Booking.objects.filter(status='CHECKED_IN').select_related('guest', 'room', 'room_type')

    rows = []
    for b in in_house:
        charges = FolioCharge.objects.filter(booking=b, is_void=False).aggregate(total=Sum('total'))['total'] or Decimal('0')
        from bookings.models import Payment
        payments = Payment.objects.filter(booking=b, status='COMPLETED').aggregate(total=Sum('amount'))['total'] or Decimal('0')
        balance = charges - payments
        rows.append({
            'booking_id': b.id,
            'booking_ref': b.booking_ref,
            'guest_name': b.guest.full_name,
            'room_number': b.room.room_number if b.room else '—',
            'room_type': b.room_type.name,
            'check_in_date': b.check_in_date.isoformat(),
            'check_out_date': b.check_out_date.isoformat(),
            'total_charges': float(charges),
            'total_payments': float(payments),
            'balance': float(balance),
        })

    return {
        'count': len(rows),
        'total_outstanding': sum(r['balance'] for r in rows if r['balance'] > 0),
        'guests': rows,
    }


# ──────────────────────────────────────────────
# Reservation Control Chart (Room Forecast Matrix)
# ──────────────────────────────────────────────

COMMITTED_BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN']
DEFAULT_WEEKEND_WEEKDAYS = [4, 5]  # Fri–Sat (configurable later via HotelConfig)
OVERBOOKING_PCT = 10  # extra sellable rooms when include_overbooking=true


def _room_is_ooo(room):
    return room.status == 'MAINTENANCE'


def _offer_rate_for_night(room_type, day):
    """Best applicable offer rate for a single night stay starting on `day`."""
    from bookings.services import calculate_rate_plan_price, get_applicable_rate_plans

    next_day = day + timedelta(days=1)
    rack = float(room_type.price_per_night)
    plans = list(get_applicable_rate_plans(room_type.id, day, next_day))
    if not plans:
        return rack
    best = rack
    for plan in plans:
        total, _ = calculate_rate_plan_price(rack, 1, plan)
        per_night = float(total)
        if per_night < best:
            best = per_night
    return round(best, 2)


def get_reservation_control_report(start_date=None, end_date=None, include_overbooking=False):
    """
    Build room-type × date availability matrix anchored on HotelConfig.business_date.
    Available = Physical - OOO - Committed (PENDING + CONFIRMED + CHECKED_IN).
    """
    from collections import defaultdict
    from rooms.models import RoomType
    from .models import HotelConfig

    config = HotelConfig.load()
    business_date = config.business_date

    if start_date is None:
        start_date = business_date
    if end_date is None:
        end_date = start_date + timedelta(days=13)

    if end_date < start_date:
        end_date = start_date

    max_days = 30
    if (end_date - start_date).days > max_days:
        end_date = start_date + timedelta(days=max_days)

    dates = []
    d = start_date
    while d <= end_date:
        dates.append(d)
        d += timedelta(days=1)

    physical_qs = Room.objects.filter(is_public_area=False, room_type__isnull=False)
    physical_by_type = dict(
        physical_qs.values('room_type_id').annotate(c=Count('id')).values_list('room_type_id', 'c')
    )
    ooo_by_type = dict(
        physical_qs.filter(
            Q(status='MAINTENANCE')
        ).values('room_type_id').annotate(c=Count('id')).values_list('room_type_id', 'c')
    )

    bookings = list(
        Booking.objects.filter(
            status__in=COMMITTED_BOOKING_STATUSES,
            check_in_date__lte=end_date,
            check_out_date__gt=start_date,
        ).select_related('guest', 'room_type').prefetch_related('guest__guest_profile')
    )

    committed = defaultdict(lambda: defaultdict(int))
    for b in bookings:
        rooms_count = b.num_rooms or 1
        day = max(b.check_in_date, start_date)
        while day < b.check_out_date and day <= end_date:
            committed[b.room_type_id][day.isoformat()] += rooms_count
            day += timedelta(days=1)

    total_physical_all = sum(physical_by_type.values())
    total_ooo_all = sum(ooo_by_type.values())

    daily_summary = {}
    for day in dates:
        day_str = day.isoformat()
        day_committed = sum(committed[rt_id][day_str] for rt_id in physical_by_type)
        sellable = total_physical_all - total_ooo_all
        if include_overbooking:
            sellable += int(total_physical_all * OVERBOOKING_PCT / 100)

        arrivals = sum(
            (b.num_rooms or 1) for b in bookings
            if b.check_in_date == day
        )
        departures = sum(
            (b.num_rooms or 1) for b in bookings
            if b.check_out_date == day and b.status == 'CHECKED_IN'
        )
        stayovers = sum(
            (b.num_rooms or 1) for b in bookings
            if b.check_in_date < day < b.check_out_date and b.status == 'CHECKED_IN'
        )
        vip_count = sum(
            (b.num_rooms or 1) for b in bookings
            if b.check_in_date <= day < b.check_out_date and b.guest_type == 'VIP'
        )
        vvip_count = sum(
            (b.num_rooms or 1) for b in bookings
            if b.check_in_date <= day < b.check_out_date
            and hasattr(b.guest, 'guest_profile')
            and getattr(b.guest.guest_profile, 'vip', False)
        )

        occupancy = (day_committed / sellable * 100) if sellable else 0.0
        daily_summary[day_str] = {
            'occupancy_pct': round(occupancy, 1),
            'arrivals': arrivals,
            'departures': departures,
            'stayovers': stayovers,
            'vip_count': vip_count,
            'vvip_count': vvip_count,
            'rooms_sold': day_committed,
            'physical_rooms': total_physical_all,
        }

    room_types_out = []
    for rt in RoomType.objects.all().order_by('name'):
        rt_id = rt.id
        physical = physical_by_type.get(rt_id, 0)
        ooo = ooo_by_type.get(rt_id, 0)
        sellable = physical - ooo
        if include_overbooking and physical > 0:
            sellable += int(physical * OVERBOOKING_PCT / 100)

        cells = []
        for day in dates:
            day_str = day.isoformat()
            committed_count = committed[rt_id][day_str]
            available = sellable - committed_count
            if available < 0:
                status = 'overbooked'
            elif available == 0:
                status = 'sold_out'
            else:
                status = 'available'

            cells.append({
                'date': day_str,
                'physical': physical,
                'ooo': ooo,
                'committed': committed_count,
                'available': available,
                'status': status,
                'offer_rate': _offer_rate_for_night(rt, day),
                'is_weekend': day.weekday() in DEFAULT_WEEKEND_WEEKDAYS,
            })

        room_types_out.append({
            'room_type_id': rt_id,
            'room_type_name': rt.name,
            'rack_rate': float(rt.price_per_night),
            'physical_rooms': physical,
            'ooo_rooms': ooo,
            'sellable_rooms': sellable,
            'cells': cells,
        })

    return {
        'business_date': business_date.isoformat(),
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'dates': [x.isoformat() for x in dates],
        'weekend_weekdays': DEFAULT_WEEKEND_WEEKDAYS,
        'include_overbooking': include_overbooking,
        'overbooking_pct': OVERBOOKING_PCT,
        'room_types': room_types_out,
        'daily_summary': daily_summary,
    }
