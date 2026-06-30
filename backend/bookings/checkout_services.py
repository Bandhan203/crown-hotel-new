"""Checkout / Revenue Guard — financial integrity for guest departure."""
from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, F, Sum, When
from django.utils import timezone

from dashboard.models import HotelConfig
from rooms.models import Room

from .models import Booking, FolioCharge, Payment

User = get_user_model()
SETTLEMENT_TOLERANCE = Decimal('0.01')


def get_business_datetime():
    """Current hotel business timestamp (date from config, time from wall clock in hotel TZ context)."""
    config = HotelConfig.load()
    now = timezone.localtime(timezone.now())
    return timezone.make_aware(
        datetime.combine(config.business_date, now.time()),
        timezone.get_current_timezone(),
    )


def get_net_payments_total(booking) -> Decimal:
    """
    Net settlement on the guest ledger.
    Receipts increase payments; refunds decrease them.
    """
    total = Payment.objects.filter(
        booking=booking, status='COMPLETED',
    ).aggregate(
        net=Sum(
            Case(
                When(is_refund=True, then=-F('amount')),
                default=F('amount'),
            )
        )
    )['net']
    return Decimal(str(total or 0))


def get_payment_breakdown(booking) -> dict:
    """Receipts and refunds for display."""
    rows = Payment.objects.filter(booking=booking, status='COMPLETED')
    receipts = rows.filter(is_refund=False).aggregate(t=Sum('amount'))['t'] or 0
    refunds = rows.filter(is_refund=True).aggregate(t=Sum('amount'))['t'] or 0
    return {
        'receipts': float(receipts),
        'refunds': float(refunds),
        'net': float(get_net_payments_total(booking)),
    }


def compute_folio_balance(booking):
    """
    Revenue Guard balance across all 8 folio windows.

    Architecture:
      FolioCharge rows = posted charges/credits (room, F&B, deposit credit, etc.)
      Payment rows     = cash/card/credit settlements (is_refund=True for payouts)
      balance          = folio_total - net_payments
    """
    charges_qs = FolioCharge.objects.filter(booking=booking, is_void=False)
    has_folio_lines = charges_qs.exists()

    window_rows = (
        charges_qs
        .values('folio_window')
        .annotate(window_total=Sum('total'))
        .order_by('folio_window')
    )
    windows = []
    folio_total = Decimal('0')
    for row in window_rows:
        wt = Decimal(str(row['window_total'] or 0))
        folio_total += wt
        windows.append({
            'window_number': row['folio_window'],
            'total': float(wt),
        })

    existing = {w['window_number']: w for w in windows}
    windows = [
        existing.get(n, {'window_number': n, 'total': 0.0})
        for n in range(1, 9)
    ]

    # Legacy: no folio lines yet — use booking room rate as single charge
    if not has_folio_lines and booking.total_price:
        folio_total = Decimal(str(booking.total_price))
        if windows and windows[0]['total'] == 0:
            windows[0]['total'] = float(folio_total)

    payments_total = get_net_payments_total(booking)
    payment_breakdown = get_payment_breakdown(booking)
    balance = folio_total - payments_total
    bal_f = float(balance)

    charge_breakdown = (
        charges_qs
        .values('charge_type')
        .annotate(subtotal=Sum('total'))
    )
    by_type = {row['charge_type']: float(row['subtotal'] or 0) for row in charge_breakdown}

    settled = abs(balance) <= SETTLEMENT_TOLERANCE
    if balance > SETTLEMENT_TOLERANCE:
        settlement_direction = 'payment_due'
    elif balance < -SETTLEMENT_TOLERANCE:
        settlement_direction = 'refund_due'
    else:
        settlement_direction = 'settled'

    return {
        'folio_total': float(folio_total),
        'payments_total': float(payments_total),
        'payments_received': payment_breakdown['receipts'],
        'payments_refunded': payment_breakdown['refunds'],
        'balance': bal_f,
        'is_settled': settled,
        'settlement_direction': settlement_direction,
        'windows': windows,
        'charges_by_type': by_type,
    }


def lookup_in_house_booking(
    *,
    booking_id=None,
    guest_id=None,
    room_number=None,
    booking_ref=None,
):
    """
    Resolve an active CHECKED_IN booking by relational keys.
    Priority: booking_id → guest_id → booking_ref → room_number.
    """
    base_qs = Booking.objects.filter(status='CHECKED_IN').select_related(
        'guest', 'room_type', 'room', 'registration_record',
    )

    if booking_id:
        booking = base_qs.filter(pk=booking_id).first()
        if not booking:
            raise ValueError(f'No in-house booking found for id {booking_id}.')
        if not booking.room:
            raise ValueError('Booking has no room assigned.')
        return booking.room, booking

    if guest_id:
        booking = base_qs.filter(guest_id=guest_id).order_by('-actual_check_in').first()
        if not booking:
            raise ValueError(f'No in-house stay found for guest id {guest_id}.')
        if not booking.room:
            raise ValueError('Guest booking has no room assigned.')
        return booking.room, booking

    ref = (booking_ref or '').strip()
    if ref:
        booking = base_qs.filter(booking_ref__iexact=ref).first()
        if not booking:
            raise ValueError(f'No in-house booking found for ref {ref}.')
        if not booking.room:
            raise ValueError('Booking has no room assigned.')
        return booking.room, booking

    if room_number:
        return lookup_room_for_checkout(room_number)

    raise ValueError('Provide room_number, booking_id, guest_id, or booking_ref.')


def lookup_room_for_checkout(room_number: str):
    """Find occupied in-house booking by room number."""
    room_number = str(room_number).strip()
    if not room_number:
        raise ValueError('Room number is required.')

    try:
        room = Room.objects.select_related('room_type').get(room_number=room_number)
    except Room.DoesNotExist:
        raise ValueError(f'Room {room_number} not found.')

    if room.status != 'OCCUPIED':
        if room.status == 'AVAILABLE' and room.housekeeping_status in ('DIRTY', 'VD', 'OD', 'CO'):
            raise ValueError(f'Room {room_number} is already checked out (Dirty).')
        raise ValueError(f'Room {room_number} is not occupied (status: {room.status}).')

    booking = (
        Booking.objects.filter(room=room, status='CHECKED_IN')
        .select_related('guest', 'room_type', 'room', 'registration_record')
        .order_by('-actual_check_in')
        .first()
    )
    if not booking:
        raise ValueError(f'No active in-house guest found for room {room_number}.')

    return room, booking


def _is_checkout_phrase(auth: str) -> bool:
    """Accept CHECK OUT, CHECKOUT, check-out, etc."""
    if not auth:
        return False
    normalized = ''.join(
        auth.strip().upper().replace('-', ' ').replace('_', ' ').split()
    )
    return normalized == 'CHECKOUT'


def verify_checkout_credentials(user, password: str = '', phrase: str = '') -> tuple[bool, str]:
    """
    Authorize checkout execution.
    Accepts: login password OR checkout phrase (CHECK OUT / CHECKOUT).
    Returns (ok, error_message).
    """
    auth = (phrase or password or '').strip()
    if _is_checkout_phrase(auth):
        return True, ''

    if not auth:
        return False, 'Enter your login password or type CHECKOUT to authorize.'

    if not user.has_usable_password():
        return False, 'Your account has no password. Type CHECKOUT in the authorization field.'

    if user.check_password(auth):
        return True, ''

    return False, 'Invalid password. Use your login password or type CHECKOUT.'


def _create_settlement_payment(booking, *, amount, method, user, is_refund, company_name='', reference=''):
    """Persist a normalized payment/refund row against business date."""
    config = HotelConfig.load()
    paid_at = get_business_datetime()
    payment = Payment.objects.create(
        booking=booking,
        amount=amount,
        payment_method=method,
        transaction_id=reference,
        company_name=company_name if method == 'COMPANY_CREDIT' else '',
        status='COMPLETED',
        paid_at=paid_at,
        business_date=config.business_date,
        posted_by=user,
        is_refund=is_refund,
        currency=booking.currency or 'BDT',
    )
    from .services import sync_booking_payment_status
    sync_booking_payment_status(booking)
    return payment


def receive_checkout_payment(booking, data, user):
    """Post payment (guest pays) or refund (hotel pays guest) to zero the folio."""
    amount = Decimal(str(data['amount']))
    if amount <= 0:
        raise ValueError('Amount must be greater than zero.')

    balance_info = compute_folio_balance(booking)
    balance = Decimal(str(balance_info['balance']))
    method = data.get('payment_method', 'CASH')
    reference = data.get('pos_reference', '') or data.get('transaction_id', '')

    with transaction.atomic():
        if balance < -SETTLEMENT_TOLERANCE:
            if method == 'COMPANY_CREDIT':
                raise ValueError('Company Credit cannot be used for guest refunds. Use Cash or Card.')
            if amount > abs(balance) + SETTLEMENT_TOLERANCE:
                raise ValueError(
                    f'Refund amount BDT {amount:.2f} exceeds guest credit BDT {abs(balance):.2f}.'
                )
            payment = _create_settlement_payment(
                booking,
                amount=amount,
                method=method,
                user=user,
                is_refund=True,
                reference=reference,
            )
            return {
                'type': 'refund',
                'payment_id': payment.id,
                'amount': float(payment.amount),
                'payment_method': payment.payment_method,
                'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
            }, compute_folio_balance(booking)

        if abs(balance) <= SETTLEMENT_TOLERANCE:
            raise ValueError('Folio is already settled.')

        if amount > balance + SETTLEMENT_TOLERANCE:
            raise ValueError(
                f'Payment BDT {amount:.2f} exceeds balance due BDT {balance:.2f}.'
            )

        company_name = data.get('company_name', '')
        if method == 'COMPANY_CREDIT' and not company_name:
            raise ValueError('Company is required for Company Credit payments.')

        from corporate.services import assert_corporate_credit_available
        assert_corporate_credit_available(company_name, Decimal(str(amount)))

        payment = _create_settlement_payment(
            booking,
            amount=amount,
            method=method,
            user=user,
            is_refund=False,
            company_name=company_name,
            reference=reference,
        )
        return {
            'type': 'payment',
            'payment_id': payment.id,
            'amount': float(payment.amount),
            'payment_method': payment.payment_method,
            'paid_at': payment.paid_at.isoformat() if payment.paid_at else None,
        }, compute_folio_balance(booking)


def execute_checkout(booking, user, data):
    """Revenue Guard checkout — folio must be zero within tolerance."""
    password = data.get('password', '') or data.get('authorization', '')
    phrase = data.get('checkout_phrase', '')

    ok, auth_error = verify_checkout_credentials(user, password, phrase)
    if not ok:
        raise ValueError(auth_error)

    if booking.status != Booking.Status.CHECKED_IN:
        raise ValueError(f'Booking is not in-house (status: {booking.status}).')

    balance_info = compute_folio_balance(booking)
    bal = Decimal(str(balance_info['balance']))
    if abs(bal) > SETTLEMENT_TOLERANCE:
        if bal > 0:
            detail = f'Guest owes BDT {bal:.2f}. Collect full payment before checkout.'
        else:
            detail = f'Guest credit BDT {abs(bal):.2f}. Issue refund before checkout.'
        raise ValueError(f'Revenue Guard: checkout blocked. {detail}')

    business_dt = get_business_datetime()
    config = HotelConfig.load()

    with transaction.atomic():
        booking.status = Booking.Status.CHECKED_OUT
        booking.actual_check_out = business_dt
        booking.checked_out_by = user
        note = data.get('notes_internal', '')
        if note:
            booking.notes_internal = (booking.notes_internal + '\n' + note).strip()
        booking.save()

        if booking.room:
            if booking.room.status != 'OCCUPIED':
                raise ValueError(f'Room {booking.room.room_number} is not occupied.')
            from rooms.housekeeping_services import on_checkout_room
            on_checkout_room(booking.room, booking)

    booking.refresh_from_db()

    from common.email import send_checkout_invoice
    try:
        send_checkout_invoice(booking)
    except Exception:
        pass

    return booking, balance_info, config.business_date.isoformat()


def get_authorized_companies():
    """Active CRM accounts merged with legacy booking company names."""
    from corporate.services import get_checkout_company_names
    return get_checkout_company_names()
