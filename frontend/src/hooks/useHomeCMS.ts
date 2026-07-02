import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export type HomeSectionKey =
  | 'hero'
  | 'about'
  | 'rooms'
  | 'services'
  | 'video'
  | 'facilities'
  | 'testimonials'
  | 'features'
  | 'news'
  | 'gallery'
  | 'booking';

export type HomeSectionConfig = {
  enabled?: boolean;
  subtitle?: string;
  title?: string;
  body?: string;
  intro?: string;
  address?: string;
  limit?: number;
  selected_ids?: number[];
  button_text?: string;
  button_link?: string;
  phone_label?: string;
  phone?: string;
  phone_href?: string;
  video_url?: string;
  secondary_cta_text?: string;
  secondary_cta_link?: string;
  primary_cta_fallback_text?: string;
  primary_cta_fallback_link?: string;
  show_booking_bar?: boolean;
  checkin_label?: string;
  checkout_label?: string;
  adults_label?: string;
  children_label?: string;
  check_button_text?: string;
  adult_options?: string[];
  children_options?: string[];
  complimentary_title?: string;
  general_title?: string;
  complimentary_limit?: number;
  general_limit?: number;
  complimentary_selected_ids?: number[];
  general_selected_ids?: number[];
  front_label?: string;
  front_phone?: string;
  front_phone_href?: string;
  reservations_label?: string;
  reservations_phone?: string;
  reservations_phone_href?: string;
  email?: string;
  website?: string;
  tagline?: string;
  guest_suffix?: string;
  price_prefix?: string;
  usd_rate?: number;
  details_button_text?: string;
  book_button_text?: string;
  fallback_description?: string;
  show_form?: boolean;
};

export type HomeCMSConfig = {
  section_order: HomeSectionKey[];
  sections: Record<HomeSectionKey, HomeSectionConfig>;
};

export type HomeAsset = {
  id: number;
  key: string;
  image: string;
  image_url: string | null;
  alt_text: string;
};

type PageCMSResponse = {
  page?: {
    page_slug?: string;
    extra_content?: Partial<HomeCMSConfig>;
  };
  assets?: Record<string, HomeAsset>;
};

export const HOME_SECTION_ORDER: HomeSectionKey[] = [
  'hero',
  'about',
  'rooms',
  'services',
  'video',
  'facilities',
  'testimonials',
  'features',
  'news',
  'gallery',
  'booking',
];

export const HOME_DEFAULTS: HomeCMSConfig = {
  section_order: HOME_SECTION_ORDER,
  sections: {
    hero: {
      enabled: true,
      secondary_cta_text: 'Explore Facilities',
      secondary_cta_link: '/facilities',
      primary_cta_fallback_text: 'Book Your Room',
      primary_cta_fallback_link: '/rooms',
      show_booking_bar: true,
      checkin_label: 'Check-in',
      checkout_label: 'Check-out',
      adults_label: 'Adults',
      children_label: 'Children',
      check_button_text: 'Check Now',
      adult_options: ['1', '2', '3', '4'],
      children_options: ['0', '1', '2', '3'],
    },
    about: {
      enabled: true,
      subtitle: 'HOTEL CROWN',
      title: 'Experience Comfort, Luxury & Hospitality',
      body:
        'Discover a world of comfort and refined hospitality. Ideally located in Padma Abasik, Rajshahi, the hotel offers elegant accommodations, contemporary facilities, and attentive service in a welcoming environment. From relaxing stays to business visits, every detail is thoughtfully designed to provide an exceptional guest experience.',
      address:
        'Padma Abasik, Rajshahi, Bangladesh (Rajshahi - 6200). House# 310, Road 7, Padma housing state, Padma abasik, Boalia, Rajshahi city, Rajshahi.',
      phone_label: 'Front Office',
      phone: '01334 945 375',
      phone_href: '01334945375',
    },
    rooms: {
      enabled: true,
      subtitle: 'HOTEL CROWN',
      title: 'Rooms & Suites',
      limit: 6,
      selected_ids: [],
      guest_suffix: 'Guests',
      price_prefix: 'BDT',
      usd_rate: 115,
      details_button_text: 'Details',
      book_button_text: 'Book',
      fallback_description: 'Experience ultimate comfort and luxury in this beautifully designed room, perfectly suited for your stay in Rajshahi.',
    },
    services: {
      enabled: true,
      subtitle: 'CORE SERVICES',
      title: 'Our Premium Services',
      intro:
        'From elegant arrivals to memorable dining and rejuvenating spa experiences, Hotel Crown offers thoughtfully curated services designed for comfort, convenience, and exceptional hospitality throughout your stay in Rajshahi.',
      phone_label: 'Reservations',
      phone: '01334 945 376',
      phone_href: '01334945376',
      limit: 6,
      selected_ids: [],
    },
    video: {
      enabled: true,
      subtitle: 'HOTEL CROWN',
      title: 'Experience Rajshahi',
      video_url: 'https://youtu.be/7BGNAGahig8',
    },
    facilities: {
      enabled: true,
      subtitle: 'HOTEL CROWN',
      title: 'Amenities & Facilities',
      complimentary_title: 'Complimentary Services',
      general_title: 'General Facilities',
      complimentary_limit: 20,
      general_limit: 20,
      complimentary_selected_ids: [],
      general_selected_ids: [],
    },
    testimonials: {
      enabled: true,
      subtitle: 'TESTIMONIALS',
      title: "What Client's Say?",
      limit: 6,
      selected_ids: [],
    },
    features: {
      enabled: true,
      limit: 5,
      selected_ids: [],
      button_text: 'LEARN MORE',
    },
    news: {
      enabled: true,
      subtitle: 'HOTEL BLOG',
      title: 'Our News',
      limit: 6,
      selected_ids: [],
    },
    gallery: {
      enabled: true,
      subtitle: 'HOTEL GALLERY',
      title: 'Our Gallery',
      button_text: 'VIEW ALL',
      button_link: '/gallery',
      limit: 6,
      selected_ids: [],
    },
    booking: {
      enabled: true,
      subtitle: 'HOTEL CROWN',
      title: 'Book Your Stay',
      button_text: 'Check Availability',
      tagline: 'Experience Comfort, Luxury & Hospitality at Hotel Crown, Padma Abasik, Rajshahi.',
      show_form: true,
      checkin_label: 'Check-in Date',
      checkout_label: 'Check-out Date',
      adults_label: 'Adults',
      children_label: 'Children',
      adult_options: ['1', '2', '3', '4'],
      children_options: ['0', '1', '2', '3'],
      front_label: 'Front Office',
      front_phone: '01334 945 375',
      front_phone_href: '01334945375',
      reservations_label: 'Reservations',
      reservations_phone: '01334 945 376, 01334 945 377',
      reservations_phone_href: '01334945376',
      email: 'hotelcrownbd@gmail.com',
      website: 'www.hotelcrownbd.com',
    },
  },
};

function mergeConfig(input?: Partial<HomeCMSConfig>): HomeCMSConfig {
  const sections = { ...HOME_DEFAULTS.sections };
  const inputSections = (input?.sections || {}) as Partial<Record<HomeSectionKey, HomeSectionConfig>>;

  HOME_SECTION_ORDER.forEach((key) => {
    sections[key] = { ...HOME_DEFAULTS.sections[key], ...(inputSections[key] || {}) };
  });

  const validOrder = (input?.section_order || []).filter((key): key is HomeSectionKey =>
    HOME_SECTION_ORDER.includes(key as HomeSectionKey),
  );

  return {
    section_order: validOrder.length > 0 ? validOrder : HOME_DEFAULTS.section_order,
    sections,
  };
}

export function pickBySelectedIds<T extends { id: number }>(
  items: T[],
  selectedIds: number[] | undefined,
  limit: number | undefined,
): T[] {
  const max = Math.max(0, Number(limit || 0));
  const ids = (selectedIds || []).filter((id) => Number.isFinite(id));
  const source = ids.length > 0
    ? ids.map((id) => items.find((item) => item.id === id)).filter(Boolean) as T[]
    : items;
  return max > 0 ? source.slice(0, max) : source;
}

export function useHomeCMS() {
  const [config, setConfig] = useState<HomeCMSConfig>(HOME_DEFAULTS);
  const [assets, setAssets] = useState<Record<string, HomeAsset>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadHomeCMS(): Promise<void> {
      try {
        const res = await api.get<PageCMSResponse>('/pages/home/');
        if (!mounted) return;
        setConfig(mergeConfig(res.data.page?.extra_content));
        setAssets(res.data.assets || {});
      } catch {
        if (mounted) {
          setConfig(HOME_DEFAULTS);
          setAssets({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadHomeCMS();
    return () => {
      mounted = false;
    };
  }, []);

  return useMemo(() => ({ config, assets, loading }), [config, assets, loading]);
}
