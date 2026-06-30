/** Capture & resolve booking attribution (landing page, Facebook, etc.) */

const STORAGE_KEY = 'crown_booking_ref_source';

const ALIASES: Record<string, string> = {
  landing: 'LANDING_PAGE',
  landing_page: 'LANDING_PAGE',
  website: 'LANDING_PAGE',
  web: 'LANDING_PAGE',
  facebook: 'FACEBOOK',
  fb: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  ig: 'INSTAGRAM',
  whatsapp: 'WHATSAPP',
  wa: 'WHATSAPP',
  google: 'GOOGLE',
  'booking.com': 'BOOKING_COM',
  bookingcom: 'BOOKING_COM',
  booking_com: 'BOOKING_COM',
  agoda: 'AGODA',
  expedia: 'EXPEDIA',
  airbnb: 'AIRBNB',
};

export const CHANNEL_LABELS: Record<string, string> = {
  LANDING_PAGE: 'Website',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  GOOGLE: 'Google',
  BOOKING_COM: 'Booking.com',
  AGODA: 'Agoda',
  EXPEDIA: 'Expedia',
  AIRBNB: 'Airbnb',
  TRIPADVISOR: 'TripAdvisor',
  WEBSITE: 'Website',
  PHONE: 'Phone',
  WALK_IN: 'Walk-in',
  OTA: 'OTA',
  AGENT: 'Agent',
  CORPORATE: 'Corporate',
};

export const CHANNEL_COLORS: Record<string, string> = {
  LANDING_PAGE: 'bg-sky-50 text-sky-700 border-sky-200',
  FACEBOOK: 'bg-blue-50 text-blue-700 border-blue-200',
  INSTAGRAM: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  BOOKING_COM: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  AGODA: 'bg-violet-50 text-violet-700 border-violet-200',
  OTA: 'bg-purple-50 text-purple-700 border-purple-200',
  WEBSITE: 'bg-sky-50 text-sky-700 border-sky-200',
  PHONE: 'bg-slate-100 text-slate-600 border-slate-200',
  WALK_IN: 'bg-amber-50 text-amber-700 border-amber-200',
};

function normalize(raw: string | null | undefined): string {
  if (!raw?.trim()) return 'LANDING_PAGE';
  const key = raw.trim().toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
  if (ALIASES[key]) return ALIASES[key];
  return raw.trim().toUpperCase().replace(/\s+/g, '_').replace(/\./g, '_').slice(0, 50);
}

/** Call once on public site load to store utm_source / ref from URL */
export function captureBookingAttribution(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const src = params.get('utm_source') || params.get('ref') || params.get('source');
    if (src) sessionStorage.setItem(STORAGE_KEY, normalize(src));
  } catch {
    /* ignore */
  }
}

export function getBookingAttribution(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || 'LANDING_PAGE';
  } catch {
    return 'LANDING_PAGE';
  }
}

export function channelLabel(booking: {
  channel_display?: string;
  reference_source?: string;
  booking_source?: string;
}): string {
  if (booking.channel_display) return booking.channel_display;
  const ref = (booking.reference_source || '').toUpperCase();
  if (ref && CHANNEL_LABELS[ref]) return CHANNEL_LABELS[ref];
  if (ref) return ref.replace(/_/g, ' ');
  const src = booking.booking_source || '';
  return CHANNEL_LABELS[src] || src || '—';
}

export function channelBadgeClass(booking: {
  reference_source?: string;
  booking_source?: string;
}): string {
  const key = (booking.reference_source || booking.booking_source || '').toUpperCase();
  return CHANNEL_COLORS[key] || 'bg-slate-100 text-slate-600 border-slate-200';
}

export const REFERENCE_SOURCE_OPTIONS = [
  { value: '', label: '— Select channel —' },
  { value: 'LANDING_PAGE', label: 'Website (Landing Page)' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'GOOGLE', label: 'Google' },
  { value: 'BOOKING_COM', label: 'Booking.com' },
  { value: 'AGODA', label: 'Agoda' },
  { value: 'EXPEDIA', label: 'Expedia' },
  { value: 'AIRBNB', label: 'Airbnb' },
];
