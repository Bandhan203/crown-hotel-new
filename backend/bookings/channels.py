"""Booking channel / attribution helpers for online & OTA reservations."""

from django.db.models import Q

# Standard reference_source codes stored on Booking.reference_source
REFERENCE_SOURCES = {
    'LANDING_PAGE': 'Website (Landing Page)',
    'FACEBOOK': 'Facebook',
    'INSTAGRAM': 'Instagram',
    'WHATSAPP': 'WhatsApp',
    'GOOGLE': 'Google',
    'BOOKING_COM': 'Booking.com',
    'AGODA': 'Agoda',
    'EXPEDIA': 'Expedia',
    'AIRBNB': 'Airbnb',
    'TRIPADVISOR': 'TripAdvisor',
}

# Aliases from utm_source / referrer / manual entry → canonical code
_SOURCE_ALIASES = {
    'landing': 'LANDING_PAGE',
    'landing_page': 'LANDING_PAGE',
    'website': 'LANDING_PAGE',
    'web': 'LANDING_PAGE',
    'facebook': 'FACEBOOK',
    'fb': 'FACEBOOK',
    'instagram': 'INSTAGRAM',
    'ig': 'INSTAGRAM',
    'whatsapp': 'WHATSAPP',
    'wa': 'WHATSAPP',
    'google': 'GOOGLE',
    'gmb': 'GOOGLE',
    'booking.com': 'BOOKING_COM',
    'bookingcom': 'BOOKING_COM',
    'booking_com': 'BOOKING_COM',
    'agoda': 'AGODA',
    'expedia': 'EXPEDIA',
    'airbnb': 'AIRBNB',
    'tripadvisor': 'TRIPADVISOR',
}

# Admin filter tabs → queryset filter
CHANNEL_FILTERS = {
    'ONLINE': Q(booking_source='WEBSITE'),
    'FACEBOOK': (
        Q(reference_source__iexact='FACEBOOK')
        | Q(reference_source__icontains='facebook')
    ),
    'BOOKING_COM': (
        Q(reference_source__iexact='BOOKING_COM')
        | Q(reference_source__icontains='booking.com')
    ),
    'OTA': Q(booking_source='OTA'),
    'DIRECT': Q(booking_source__in=['PHONE', 'WALK_IN']),
    'AGENT': Q(booking_source='AGENT'),
    'CORPORATE': Q(booking_source='CORPORATE'),
}


def normalize_reference_source(raw: str | None) -> str:
    """Map free-text / utm values to a canonical reference_source code."""
    if not raw or not str(raw).strip():
        return 'LANDING_PAGE'
    key = str(raw).strip().lower().replace('-', '_').replace(' ', '_')
    if key in _SOURCE_ALIASES:
        return _SOURCE_ALIASES[key]
    upper = str(raw).strip().upper().replace(' ', '_').replace('.', '_')
    if upper in REFERENCE_SOURCES:
        return upper
    return upper[:50]


def channel_display(booking) -> str:
    """Human-readable channel label for admin UI."""
    ref = (getattr(booking, 'reference_source', '') or '').strip()
    if ref:
        upper = ref.upper()
        if upper in REFERENCE_SOURCES:
            return REFERENCE_SOURCES[upper]
        return ref.replace('_', ' ').title()

    source = getattr(booking, 'booking_source', '') or ''
    from .models import Booking

    labels = dict(Booking.BookingSource.choices)
    return labels.get(source, source or '—')


def channel_filter_q(channel: str) -> Q | None:
    code = (channel or '').strip().upper()
    if not code or code == 'ALL':
        return None
    return CHANNEL_FILTERS.get(code)
