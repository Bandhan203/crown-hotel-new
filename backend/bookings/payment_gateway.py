import logging

from django.conf import settings
from sslcommerz_lib import SSLCOMMERZ

logger = logging.getLogger(__name__)


def _get_config():
    """Return gateway config dict from DB (preferred) or Django settings (.env fallback)."""
    from .models import PaymentGatewayConfig
    cfg = PaymentGatewayConfig.load()
    if cfg:
        return {
            'store_id': cfg.store_id,
            'store_pass': cfg.store_password,
            'issandbox': cfg.is_sandbox,
            'frontend_url': cfg.frontend_url,
            'is_active': cfg.is_active,
        }
    # Fallback to .env / Django settings
    return {
        'store_id': settings.SSLCZ_STORE_ID,
        'store_pass': settings.SSLCZ_STORE_PASSWORD,
        'issandbox': settings.SSLCZ_IS_SANDBOX,
        'frontend_url': getattr(settings, 'FRONTEND_URL', 'http://localhost:5173'),
        'is_active': True,
    }


def get_sslcz_client():
    cfg = _get_config()
    return SSLCOMMERZ({
        'store_id': cfg['store_id'],
        'store_pass': cfg['store_pass'],
        'issandbox': cfg['issandbox'],
    })


def initiate_payment(booking, request=None):
    sslcz = get_sslcz_client()

    if request:
        success_url = request.build_absolute_uri('/api/payments/success/')
        fail_url = request.build_absolute_uri('/api/payments/fail/')
        cancel_url = request.build_absolute_uri('/api/payments/cancel/')
        ipn_url = request.build_absolute_uri('/api/payments/ipn/')
    else:
        backend_base = getattr(settings, 'BACKEND_URL', 'http://127.0.0.1:8000').rstrip('/')
        success_url = f'{backend_base}/api/payments/success/'
        fail_url = f'{backend_base}/api/payments/fail/'
        cancel_url = f'{backend_base}/api/payments/cancel/'
        ipn_url = f'{backend_base}/api/payments/ipn/'

    guest = booking.guest
    post_body = {
        'total_amount': float(booking.total_price),
        'currency': 'BDT',
        'tran_id': booking.booking_ref,
        'success_url': success_url,
        'fail_url': fail_url,
        'cancel_url': cancel_url,
        'ipn_url': ipn_url,
        'cus_name': guest.full_name or guest.email,
        'cus_email': guest.email,
        'cus_phone': getattr(guest, 'phone', '') or '01700000000',
        'cus_add1': 'N/A',
        'cus_city': 'N/A',
        'cus_country': 'Bangladesh',
        'shipping_method': 'NO',
        'num_of_item': 1,
        'product_name': f'Hotel Booking {booking.booking_ref}',
        'product_category': 'Hotel',
        'product_profile': 'travel-vertical',
        'hotel_name': 'Hotel',
        'length_of_stay': f'{booking.nights} nights',
        'check_in_time': str(booking.check_in_date),
        'hotel_city': 'N/A',
        'emi_option': 0,
        'value_a': str(booking.id),
        'value_b': booking.booking_ref,
        'value_c': str(guest.id),
        'value_d': '',
    }

    response = sslcz.createSession(post_body)
    logger.info('SSLCommerz session for %s: status=%s', booking.booking_ref, response.get('status'))
    return response


def validate_ipn(post_data):
    sslcz = get_sslcz_client()

    if not sslcz.hash_validate_ipn(post_data):
        logger.warning('SSLCommerz IPN hash validation failed for tran_id=%s', post_data.get('tran_id'))
        return False, None

    val_id = post_data.get('val_id', '')
    if val_id:
        validation = sslcz.validationTransactionOrder(val_id)
        return True, validation

    return True, None


def initiate_refund(bank_tran_id, refund_amount, refund_remarks):
    sslcz = get_sslcz_client()
    return sslcz.init_refund(bank_tran_id, str(refund_amount), refund_remarks)


def query_transaction(tran_id):
    sslcz = get_sslcz_client()
    return sslcz.transaction_query_tranid(tran_id)
