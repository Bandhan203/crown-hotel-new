import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdCheck,
  MdHome,
  MdImage,
  MdOpenInNew,
  MdSave,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { unwrapList } from '../../utils/cmsList';
import { toMediaUrl } from '../../utils/mediaUrl';
import { hotelImages } from '../../constants/images';
import {
  HOME_DEFAULTS,
  HOME_SECTION_ORDER,
  type HomeAsset,
  type HomeCMSConfig,
  type HomeSectionConfig,
  type HomeSectionKey,
} from '../../hooks/useHomeCMS';

type PageCMS = {
  id?: number;
  page_slug: string;
  title: string;
  subtitle: string;
  hero_image: string | null;
  meta_description: string;
  extra_content: HomeCMSConfig;
};

type AssetDraft = {
  file: File | null;
  alt_text: string;
};

type PickerItem = {
  id: number;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string | null;
  badge?: string;
  status?: string;
  manageUrl?: string;
};

type HeroSlideItem = PickerItem & {
  cta?: string;
  active?: boolean;
};

type ReferenceData = {
  heroSlides: HeroSlideItem[];
  rooms: PickerItem[];
  services: PickerItem[];
  complimentaryFacilities: PickerItem[];
  generalFacilities: PickerItem[];
  featureFacilities: PickerItem[];
  testimonials: PickerItem[];
  news: PickerItem[];
  gallery: PickerItem[];
};

const EMPTY_REFS: ReferenceData = {
  heroSlides: [],
  rooms: [],
  services: [],
  complimentaryFacilities: [],
  generalFacilities: [],
  featureFacilities: [],
  testimonials: [],
  news: [],
  gallery: [],
};

const ASSET_FIELDS = {
  about_image: 'About Image',
  video_background_image: 'Video Background Image',
  booking_background_image: 'Booking Background Image',
};

function idsToString(value?: number[]): string {
  return (value || []).join(', ');
}

function listToString(value?: string[]): string {
  return (value || []).join(', ');
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function mergeHomeConfig(input?: Partial<HomeCMSConfig>): HomeCMSConfig {
  const sections = { ...HOME_DEFAULTS.sections };
  HOME_SECTION_ORDER.forEach((key) => {
    sections[key] = { ...HOME_DEFAULTS.sections[key], ...(input?.sections?.[key] || {}) };
  });
  const order = (input?.section_order || []).filter((key): key is HomeSectionKey =>
    HOME_SECTION_ORDER.includes(key as HomeSectionKey),
  );
  return {
    section_order: order.length > 0 ? order : HOME_DEFAULTS.section_order,
    sections,
  };
}

function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });
}

export default function CMSHomePage() {
  const [page, setPage] = useState<PageCMS | null>(null);
  const [assets, setAssets] = useState<Record<string, HomeAsset>>({});
  const [assetDrafts, setAssetDrafts] = useState<Record<string, AssetDraft>>({});
  const [refs, setRefs] = useState<ReferenceData>(EMPTY_REFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const orderedSections = useMemo(
    () => page?.extra_content.section_order || HOME_SECTION_ORDER,
    [page?.extra_content.section_order],
  );

  useEffect(() => {
    void loadHomePage();
    void loadReferenceData();
  }, []);

  async function loadHomePage(): Promise<void> {
    setLoading(true);
    try {
      let currentPage: PageCMS;
      const pagesRes = await api.get<PageCMS[] | { results: PageCMS[] }>('/admin/pages/', {
        params: { page_size: 100 },
      });
      const homePage = unwrapList(pagesRes.data).find((item) => item.page_slug === 'home');

      if (homePage) {
        currentPage = {
          ...homePage,
          extra_content: mergeHomeConfig(homePage.extra_content),
        };
      } else {
        currentPage = {
          page_slug: 'home',
          title: 'Hotel Crown',
          subtitle: 'Experience Comfort, Luxury & Hospitality',
          hero_image: null,
          meta_description: '',
          extra_content: HOME_DEFAULTS,
        };
      }
      setPage(currentPage);

      const draftKeys = Object.keys(ASSET_FIELDS);
      if (currentPage.id) {
        try {
          const assetRes = await api.get<HomeAsset[] | { results: HomeAsset[] }>('/admin/page-assets/', {
            params: { page: currentPage.id, page_size: 100 },
          });
          const list = unwrapList(assetRes.data);
          const nextAssets = Object.fromEntries(list.map((asset) => [asset.key, asset]));
          setAssets(nextAssets);
          setAssetDrafts(Object.fromEntries(draftKeys.map((key) => [
            key,
            { file: null, alt_text: nextAssets[key]?.alt_text || '' },
          ])));
        } catch {
          setAssets({});
          setAssetDrafts(Object.fromEntries(draftKeys.map((key) => [key, { file: null, alt_text: '' }])));
        }
      } else {
        setAssets({});
        setAssetDrafts(Object.fromEntries(draftKeys.map((key) => [key, { file: null, alt_text: '' }])));
      }
    } catch {
      toast.error('Failed to load Home page CMS');
    } finally {
      setLoading(false);
    }
  }

  async function loadReferenceData(): Promise<void> {
    try {
      const [
        heroRes,
        roomRes,
        serviceRes,
        facilityRes,
        testimonialRes,
        newsRes,
        galleryRes,
      ] = await Promise.all([
        api.get('/admin/hero-slides/', { params: { page_size: 200 } }),
        api.get('/rooms/', { params: { page_size: 200 } }),
        api.get('/admin/hotel-services/'),
        api.get('/admin/facilities/'),
        api.get('/admin/testimonials/', { params: { page_size: 200 } }),
        api.get('/admin/news/', { params: { page_size: 200 } }),
        api.get('/admin/gallery/', { params: { page_size: 200 } }),
      ]);

      const facilities = unwrapList<any>(facilityRes.data);
      setRefs({
        heroSlides: unwrapList<any>(heroRes.data).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          image: item.background_image,
          cta: item.cta_text,
          active: item.is_active,
          badge: `Order ${item.order ?? 0}`,
          status: item.is_active ? 'Active' : 'Inactive',
          manageUrl: '/admin/cms/hero-slides',
        })),
        rooms: unwrapList<any>(roomRes.data).map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: `BDT ${Math.round(Number(item.price_per_night || 0)).toLocaleString()} • ${item.max_guests} guests`,
          description: item.description,
          image: item.primary_image,
          badge: item.is_featured ? 'Featured' : 'Room',
          manageUrl: '/admin/rooms',
        })),
        services: unwrapList<any>(serviceRes.data).map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.icon || 'Service',
          description: item.description,
          badge: item.is_active ? 'Active' : 'Inactive',
          manageUrl: '/admin/services',
        })),
        complimentaryFacilities: facilities
          .filter((item) => item.category === 'COMPLIMENTARY')
          .map(facilityToPickerItem),
        generalFacilities: facilities
          .filter((item) => item.category === 'GENERAL')
          .map(facilityToPickerItem),
        featureFacilities: facilities
          .filter((item) => item.category === 'FEATURE')
          .map(facilityToPickerItem),
        testimonials: unwrapList<any>(testimonialRes.data).map((item) => ({
          id: item.id,
          title: item.guest_name,
          subtitle: item.guest_role || 'Guest review',
          description: item.content,
          image: item.avatar,
          badge: `${item.rating || 5} stars`,
          status: item.is_active ? 'Active' : 'Inactive',
          manageUrl: '/admin/cms/testimonials',
        })),
        news: unwrapList<any>(newsRes.data).map((item) => ({
          id: item.id,
          title: item.title,
          subtitle: [item.category, formatDate(item.published_at)].filter(Boolean).join(' • '),
          description: item.excerpt,
          image: item.image,
          badge: item.is_published ? 'Published' : 'Draft',
          manageUrl: '/admin/cms/news',
        })),
        gallery: unwrapList<any>(galleryRes.data).map((item) => ({
          id: item.id,
          title: item.title || item.caption || `Gallery image #${item.id}`,
          subtitle: item.category,
          description: item.alt_text || item.description,
          image: item.image,
          badge: item.is_published ? 'Published' : 'Draft',
          manageUrl: '/admin/cms/gallery',
        })),
      });
    } catch {
      toast.error('Some Home CMS item lists failed to load');
    }
  }

  function facilityToPickerItem(item: any): PickerItem {
    return {
      id: item.id,
      title: item.name,
      subtitle: item.subtitle || item.category,
      description: item.description,
      image: item.image_url || item.image,
      badge: item.is_active ? 'Active' : 'Inactive',
      manageUrl: '/admin/services',
    };
  }

  function updatePageField(field: keyof PageCMS, value: string): void {
    setPage((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  function updateSection(key: HomeSectionKey, patch: Partial<HomeSectionConfig>): void {
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        extra_content: {
          ...prev.extra_content,
          sections: {
            ...prev.extra_content.sections,
            [key]: { ...prev.extra_content.sections[key], ...patch },
          },
        },
      };
    });
  }

  function updateSectionOrder(value: string): void {
    const order = value
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is HomeSectionKey => HOME_SECTION_ORDER.includes(item as HomeSectionKey));
    setPage((prev) => prev ? {
      ...prev,
      extra_content: { ...prev.extra_content, section_order: order.length ? order : HOME_SECTION_ORDER },
    } : prev);
  }

  async function saveAssets(pageId: number): Promise<void> {
    for (const key of Object.keys(ASSET_FIELDS)) {
      const draft = assetDrafts[key];
      if (!draft || (!draft.file && draft.alt_text === (assets[key]?.alt_text || ''))) continue;

      const form = new FormData();
      form.append('page', String(pageId));
      form.append('key', key);
      form.append('alt_text', draft.alt_text || '');
      if (draft.file) form.append('image', draft.file);

      const existing = assets[key];
      if (existing?.id) {
        await api.patch(`/admin/page-assets/${existing.id}/`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (draft.file) {
        await api.post('/admin/page-assets/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    }
  }

  async function handleSave(): Promise<void> {
    if (!page) return;
    setSaving(true);
    try {
      const payload = {
        ...page,
        extra_content: mergeHomeConfig(page.extra_content),
      };
      const res = page.id
        ? await api.put<PageCMS>('/admin/pages/home/', payload)
        : await api.post<PageCMS>('/admin/pages/', payload);

      if (res.data.id) {
        await saveAssets(res.data.id);
      }
      toast.success('Home page CMS saved');
      await loadHomePage();
      await loadReferenceData();
    } catch (error: any) {
      toast.error(error.response?.data ? JSON.stringify(error.response.data) : 'Failed to save Home page CMS');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !page) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sections = page.extra_content.sections;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur border-b border-gray-200 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
              <MdHome className="inline mr-2 text-primary" />Home Page CMS
            </h1>
            <p className="text-sm text-gray-500 mt-1">Structured in the same order as the public landing page.</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            <MdSave size={18} /> {saving ? 'Saving...' : 'Save Home Page'}
          </button>
        </div>
      </div>

      <SectionPanel title="Page Meta & Frontend Section Order" eyebrow="Global">
        <TextField label="Page Title" value={page.title} onChange={(value) => updatePageField('title', value)} />
        <TextField label="Page Subtitle" value={page.subtitle} onChange={(value) => updatePageField('subtitle', value)} />
        <TextArea
          label="SEO Meta Description"
          value={page.meta_description}
          onChange={(value) => updatePageField('meta_description', value)}
          className="md:col-span-2"
        />
        <TextField
          label="Section Order"
          value={orderedSections.join(', ')}
          onChange={updateSectionOrder}
          helper={`Allowed: ${HOME_SECTION_ORDER.join(', ')}`}
          className="md:col-span-2"
        />
      </SectionPanel>

      <SectionPanel title="1. Hero Slider" eyebrow="Top of Home">
        <Toggle label="Show hero section" checked={sections.hero.enabled !== false} onChange={(value) => updateSection('hero', { enabled: value })} />
        <ShortcutLink to="/admin/cms/hero-slides" label="Manage hero slides" />
        <PreviewGrid
          items={refs.heroSlides}
          emptyLabel="No hero slides yet."
          renderMeta={(item) => (
            <>
              <span>{item.status}</span>
              {item.cta && <span>{item.cta}</span>}
            </>
          )}
        />
        <TextField label="Primary Button Fallback Text" value={sections.hero.primary_cta_fallback_text || ''} onChange={(value) => updateSection('hero', { primary_cta_fallback_text: value })} />
        <TextField label="Primary Button Fallback Link" value={sections.hero.primary_cta_fallback_link || ''} onChange={(value) => updateSection('hero', { primary_cta_fallback_link: value })} />
        <TextField label="Secondary Button Text" value={sections.hero.secondary_cta_text || ''} onChange={(value) => updateSection('hero', { secondary_cta_text: value })} />
        <TextField label="Secondary Button Link" value={sections.hero.secondary_cta_link || ''} onChange={(value) => updateSection('hero', { secondary_cta_link: value })} />
      </SectionPanel>

      <SectionPanel title="2. Hero Booking Bar" eyebrow="Inside Hero">
        <Toggle label="Show booking bar" checked={sections.hero.show_booking_bar !== false} onChange={(value) => updateSection('hero', { show_booking_bar: value })} />
        <div />
        <TextField label="Check-in Label" value={sections.hero.checkin_label || ''} onChange={(value) => updateSection('hero', { checkin_label: value })} />
        <TextField label="Check-out Label" value={sections.hero.checkout_label || ''} onChange={(value) => updateSection('hero', { checkout_label: value })} />
        <TextField label="Adults Label" value={sections.hero.adults_label || ''} onChange={(value) => updateSection('hero', { adults_label: value })} />
        <TextField label="Children Label" value={sections.hero.children_label || ''} onChange={(value) => updateSection('hero', { children_label: value })} />
        <TextField label="Check Button Text" value={sections.hero.check_button_text || ''} onChange={(value) => updateSection('hero', { check_button_text: value })} />
        <TextField label="Adult Options" value={listToString(sections.hero.adult_options)} onChange={(value) => updateSection('hero', { adult_options: parseList(value) })} helper="Comma separated values." />
        <TextField label="Children Options" value={listToString(sections.hero.children_options)} onChange={(value) => updateSection('hero', { children_options: parseList(value) })} helper="Comma separated values." />
      </SectionPanel>

      <SectionPanel title="3. About" eyebrow="Intro Content">
        <CommonSectionFields section={sections.about} onChange={(patch) => updateSection('about', patch)} includeBody />
        <SectionAssetUpload assetKey="about_image" assets={assets} drafts={assetDrafts} setDrafts={setAssetDrafts} fallback={hotelImages.about} />
        <TextArea label="Address" value={sections.about.address || ''} onChange={(value) => updateSection('about', { address: value })} />
        <TextField label="Phone Label" value={sections.about.phone_label || ''} onChange={(value) => updateSection('about', { phone_label: value })} />
        <TextField label="Phone" value={sections.about.phone || ''} onChange={(value) => updateSection('about', { phone: value })} />
        <TextField label="Phone Link" value={sections.about.phone_href || ''} onChange={(value) => updateSection('about', { phone_href: value })} />
      </SectionPanel>

      <SectionPanel title="4. Rooms & Suites" eyebrow="Room Cards">
        <CommonSectionFields section={sections.rooms} onChange={(patch) => updateSection('rooms', patch)} />
        <SelectedItemPicker
          title="Home room cards"
          items={refs.rooms}
          selectedIds={sections.rooms.selected_ids || []}
          onChange={(selected_ids) => updateSection('rooms', { selected_ids })}
          fallbackText="Leave empty to show featured rooms first, then latest rooms."
        />
        <TextField label="Limit" value={String(sections.rooms.limit || '')} onChange={(value) => updateSection('rooms', { limit: Number(value) || 0 })} />
        <TextField label="Guest Suffix" value={sections.rooms.guest_suffix || ''} onChange={(value) => updateSection('rooms', { guest_suffix: value })} />
        <TextField label="Price Prefix" value={sections.rooms.price_prefix || ''} onChange={(value) => updateSection('rooms', { price_prefix: value })} />
        <TextField label="USD Conversion Rate" value={String(sections.rooms.usd_rate || '')} onChange={(value) => updateSection('rooms', { usd_rate: Number(value) || 0 })} />
        <TextField label="Details Button Text" value={sections.rooms.details_button_text || ''} onChange={(value) => updateSection('rooms', { details_button_text: value })} />
        <TextField label="Book Button Text" value={sections.rooms.book_button_text || ''} onChange={(value) => updateSection('rooms', { book_button_text: value })} />
        <TextArea label="Fallback Description" value={sections.rooms.fallback_description || ''} onChange={(value) => updateSection('rooms', { fallback_description: value })} className="md:col-span-2" />
      </SectionPanel>

      <SectionPanel title="5. Premium Services" eyebrow="Service Cards">
        <CommonSectionFields section={sections.services} onChange={(patch) => updateSection('services', patch)} includeIntro />
        <SelectedItemPicker
          title="Home service cards"
          items={refs.services}
          selectedIds={sections.services.selected_ids || []}
          onChange={(selected_ids) => updateSection('services', { selected_ids })}
          fallbackText="Leave empty to use active services by service order."
        />
        <TextField label="Limit" value={String(sections.services.limit || '')} onChange={(value) => updateSection('services', { limit: Number(value) || 0 })} />
        <TextField label="Phone Label" value={sections.services.phone_label || ''} onChange={(value) => updateSection('services', { phone_label: value })} />
        <TextField label="Phone" value={sections.services.phone || ''} onChange={(value) => updateSection('services', { phone: value })} />
        <TextField label="Phone Link" value={sections.services.phone_href || ''} onChange={(value) => updateSection('services', { phone_href: value })} />
      </SectionPanel>

      <SectionPanel title="6. Video" eyebrow="Video CTA">
        <CommonSectionFields section={sections.video} onChange={(patch) => updateSection('video', patch)} />
        <SectionAssetUpload assetKey="video_background_image" assets={assets} drafts={assetDrafts} setDrafts={setAssetDrafts} fallback={hotelImages.video} />
        <TextField label="Video URL" value={sections.video.video_url || ''} onChange={(value) => updateSection('video', { video_url: value })} />
      </SectionPanel>

      <SectionPanel title="7. Amenities & Facilities" eyebrow="Two Frontend Lists">
        <CommonSectionFields section={sections.facilities} onChange={(patch) => updateSection('facilities', patch)} />
        <TextField label="Complimentary Card Title" value={sections.facilities.complimentary_title || ''} onChange={(value) => updateSection('facilities', { complimentary_title: value })} />
        <TextField label="General Card Title" value={sections.facilities.general_title || ''} onChange={(value) => updateSection('facilities', { general_title: value })} />
        <SelectedItemPicker
          title="Complimentary services list"
          items={refs.complimentaryFacilities}
          selectedIds={sections.facilities.complimentary_selected_ids || []}
          onChange={(complimentary_selected_ids) => updateSection('facilities', { complimentary_selected_ids })}
          fallbackText="Leave empty to show active complimentary facilities in their saved order."
          compact
        />
        <SelectedItemPicker
          title="General facilities list"
          items={refs.generalFacilities}
          selectedIds={sections.facilities.general_selected_ids || []}
          onChange={(general_selected_ids) => updateSection('facilities', { general_selected_ids })}
          fallbackText="Leave empty to show active general facilities in their saved order."
          compact
        />
        <TextField label="Complimentary Limit" value={String(sections.facilities.complimentary_limit || '')} onChange={(value) => updateSection('facilities', { complimentary_limit: Number(value) || 0 })} />
        <TextField label="General Limit" value={String(sections.facilities.general_limit || '')} onChange={(value) => updateSection('facilities', { general_limit: Number(value) || 0 })} />
      </SectionPanel>

      <SectionPanel title="8. Testimonials" eyebrow="Guest Reviews">
        <CommonSectionFields section={sections.testimonials} onChange={(patch) => updateSection('testimonials', patch)} />
        <SelectedItemPicker
          title="Home testimonial cards"
          items={refs.testimonials}
          selectedIds={sections.testimonials.selected_ids || []}
          onChange={(selected_ids) => updateSection('testimonials', { selected_ids })}
          fallbackText="Leave empty to show active testimonials."
        />
        <TextField label="Limit" value={String(sections.testimonials.limit || '')} onChange={(value) => updateSection('testimonials', { limit: Number(value) || 0 })} />
      </SectionPanel>

      <SectionPanel title="9. Feature Highlight Blocks" eyebrow="Alternating Image Blocks">
        <Toggle label="Show section" checked={sections.features.enabled !== false} onChange={(value) => updateSection('features', { enabled: value })} />
        <ShortcutLink to="/admin/services" label="Manage feature facilities" />
        <SelectedItemPicker
          title="Feature blocks"
          items={refs.featureFacilities}
          selectedIds={sections.features.selected_ids || []}
          onChange={(selected_ids) => updateSection('features', { selected_ids })}
          fallbackText="Leave empty to show active FEATURE facilities."
        />
        <TextField label="Limit" value={String(sections.features.limit || '')} onChange={(value) => updateSection('features', { limit: Number(value) || 0 })} />
        <TextField label="Button Text" value={sections.features.button_text || ''} onChange={(value) => updateSection('features', { button_text: value })} />
      </SectionPanel>

      <SectionPanel title="10. News" eyebrow="Blog Cards">
        <CommonSectionFields section={sections.news} onChange={(patch) => updateSection('news', patch)} />
        <SelectedItemPicker
          title="Home news cards"
          items={refs.news}
          selectedIds={sections.news.selected_ids || []}
          onChange={(selected_ids) => updateSection('news', { selected_ids })}
          fallbackText="Leave empty to show published news by publish date."
        />
        <TextField label="Limit" value={String(sections.news.limit || '')} onChange={(value) => updateSection('news', { limit: Number(value) || 0 })} />
      </SectionPanel>

      <SectionPanel title="11. Gallery" eyebrow="Image Grid">
        <CommonSectionFields section={sections.gallery} onChange={(patch) => updateSection('gallery', patch)} />
        <SelectedItemPicker
          title="Home gallery images"
          items={refs.gallery}
          selectedIds={sections.gallery.selected_ids || []}
          onChange={(selected_ids) => updateSection('gallery', { selected_ids })}
          fallbackText="Leave empty to show published gallery images by gallery order."
        />
        <TextField label="Limit" value={String(sections.gallery.limit || '')} onChange={(value) => updateSection('gallery', { limit: Number(value) || 0 })} />
        <TextField label="Button Text" value={sections.gallery.button_text || ''} onChange={(value) => updateSection('gallery', { button_text: value })} />
        <TextField label="Button Link" value={sections.gallery.button_link || ''} onChange={(value) => updateSection('gallery', { button_link: value })} />
      </SectionPanel>

      <SectionPanel title="12. Booking CTA" eyebrow="Bottom of Home">
        <CommonSectionFields section={sections.booking} onChange={(patch) => updateSection('booking', patch)} />
        <SectionAssetUpload assetKey="booking_background_image" assets={assets} drafts={assetDrafts} setDrafts={setAssetDrafts} fallback={hotelImages.booking} />
        <Toggle label="Show booking form" checked={sections.booking.show_form !== false} onChange={(value) => updateSection('booking', { show_form: value })} />
        <TextArea label="Tagline" value={sections.booking.tagline || ''} onChange={(value) => updateSection('booking', { tagline: value })} />
        <TextField label="Button Text" value={sections.booking.button_text || ''} onChange={(value) => updateSection('booking', { button_text: value })} />
        <TextField label="Check-in Label" value={sections.booking.checkin_label || ''} onChange={(value) => updateSection('booking', { checkin_label: value })} />
        <TextField label="Check-out Label" value={sections.booking.checkout_label || ''} onChange={(value) => updateSection('booking', { checkout_label: value })} />
        <TextField label="Adults Label" value={sections.booking.adults_label || ''} onChange={(value) => updateSection('booking', { adults_label: value })} />
        <TextField label="Children Label" value={sections.booking.children_label || ''} onChange={(value) => updateSection('booking', { children_label: value })} />
        <TextField label="Adult Options" value={listToString(sections.booking.adult_options)} onChange={(value) => updateSection('booking', { adult_options: parseList(value) })} helper="Comma separated values." />
        <TextField label="Children Options" value={listToString(sections.booking.children_options)} onChange={(value) => updateSection('booking', { children_options: parseList(value) })} helper="Comma separated values." />
        <TextField label="Front Label" value={sections.booking.front_label || ''} onChange={(value) => updateSection('booking', { front_label: value })} />
        <TextField label="Front Phone" value={sections.booking.front_phone || ''} onChange={(value) => updateSection('booking', { front_phone: value })} />
        <TextField label="Front Phone Link" value={sections.booking.front_phone_href || ''} onChange={(value) => updateSection('booking', { front_phone_href: value })} />
        <TextField label="Reservations Label" value={sections.booking.reservations_label || ''} onChange={(value) => updateSection('booking', { reservations_label: value })} />
        <TextField label="Reservations Phone" value={sections.booking.reservations_phone || ''} onChange={(value) => updateSection('booking', { reservations_phone: value })} />
        <TextField label="Reservations Phone Link" value={sections.booking.reservations_phone_href || ''} onChange={(value) => updateSection('booking', { reservations_phone_href: value })} />
        <TextField label="Email" value={sections.booking.email || ''} onChange={(value) => updateSection('booking', { email: value })} />
        <TextField label="Website" value={sections.booking.website || ''} onChange={(value) => updateSection('booking', { website: value })} />
      </SectionPanel>
    </div>
  );
}

function SectionPanel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        {eyebrow && <p className="text-[11px] uppercase tracking-widest text-teal-700 font-semibold mb-1">{eyebrow}</p>}
        <h2 className="text-slate-800 font-semibold text-lg">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function CommonSectionFields({
  section,
  onChange,
  includeBody = false,
  includeIntro = false,
}: {
  section: HomeSectionConfig;
  onChange: (patch: Partial<HomeSectionConfig>) => void;
  includeBody?: boolean;
  includeIntro?: boolean;
}) {
  return (
    <>
      <Toggle label="Show section" checked={section.enabled !== false} onChange={(value) => onChange({ enabled: value })} />
      <div />
      <TextField label="Subtitle" value={section.subtitle || ''} onChange={(value) => onChange({ subtitle: value })} />
      <TextField label="Title" value={section.title || ''} onChange={(value) => onChange({ title: value })} />
      {includeBody && <TextArea label="Body" value={section.body || ''} onChange={(value) => onChange({ body: value })} className="md:col-span-2" />}
      {includeIntro && <TextArea label="Intro" value={section.intro || ''} onChange={(value) => onChange({ intro: value })} className="md:col-span-2" />}
    </>
  );
}

function SelectedItemPicker({
  title,
  items,
  selectedIds,
  onChange,
  fallbackText,
  compact = false,
}: {
  title: string;
  items: PickerItem[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  fallbackText: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState('');
  const selectedItems = selectedIds
    .map((id) => items.find((item) => item.id === id))
    .filter(Boolean) as PickerItem[];
  const availableItems = items.filter((item) => !selectedIds.includes(item.id));
  const filteredAvailable = availableItems.filter((item) => {
    const haystack = `${item.title} ${item.subtitle || ''} ${item.description || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  function add(id: number): void {
    onChange([...selectedIds, id]);
  }

  function remove(id: number): void {
    onChange(selectedIds.filter((itemId) => itemId !== id));
  }

  function move(id: number, direction: -1 | 1): void {
    const index = selectedIds.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  }

  return (
    <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <p className="text-xs text-gray-500">{selectedIds.length > 0 ? `${selectedIds.length} selected` : fallbackText}</p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search available items"
          className="w-full sm:w-64 px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected order</p>
          <div className="space-y-2">
            {selectedItems.length === 0 && (
              <div className="text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-lg p-4">
                No manual selection. The frontend fallback will be used.
              </div>
            )}
            {selectedItems.map((item, index) => (
              <PickerCard
                key={item.id}
                item={item}
                compact={compact}
                leading={`${index + 1}`}
                actions={(
                  <>
                    <IconButton label="Move up" onClick={() => move(item.id, -1)} disabled={index === 0}>
                      <MdArrowUpward size={14} />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => move(item.id, 1)} disabled={index === selectedItems.length - 1}>
                      <MdArrowDownward size={14} />
                    </IconButton>
                    <button type="button" onClick={() => remove(item.id)} className="px-2 py-1 text-xs rounded bg-red-50 text-red-600 hover:bg-red-100">
                      Remove
                    </button>
                  </>
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Available items</p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredAvailable.length === 0 && (
              <div className="text-sm text-gray-500 bg-white border border-dashed border-gray-200 rounded-lg p-4">
                No available items match this search.
              </div>
            )}
            {filteredAvailable.map((item) => (
              <PickerCard
                key={item.id}
                item={item}
                compact={compact}
                actions={(
                  <button type="button" onClick={() => add(item.id)} className="px-2 py-1 text-xs rounded bg-teal-700 text-white hover:bg-teal-600">
                    Add
                  </button>
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewGrid({
  items,
  emptyLabel,
  renderMeta,
}: {
  items: HeroSlideItem[];
  emptyLabel: string;
  renderMeta?: (item: HeroSlideItem) => ReactNode;
}) {
  return (
    <div className="md:col-span-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {items.length === 0 && (
          <div className="md:col-span-3 text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-4">
            {emptyLabel}
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            <div className="h-28 bg-gray-100">
              {item.image ? (
                <img src={toMediaUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400"><MdImage size={22} /></div>
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-semibold text-slate-800 line-clamp-1">{item.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-1">{item.subtitle}</p>
              <div className="flex flex-wrap gap-1 mt-2 text-[11px] text-gray-500">
                {renderMeta?.(item)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PickerCard({
  item,
  actions,
  leading,
  compact = false,
}: {
  item: PickerItem;
  actions: ReactNode;
  leading?: string;
  compact?: boolean;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3 items-start">
      {leading && (
        <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-xs font-bold flex items-center justify-center shrink-0">
          {leading}
        </div>
      )}
      {!compact && (
        <div className="w-16 h-14 rounded bg-gray-100 overflow-hidden shrink-0">
          {item.image ? (
            <img src={toMediaUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400"><MdImage size={18} /></div>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-800 truncate">{item.title}</h4>
            {item.subtitle && <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>}
          </div>
          {item.badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{item.badge}</span>}
        </div>
        {item.description && !compact && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>}
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1">
            {item.manageUrl && (
              <Link to={item.manageUrl} className="inline-flex items-center gap-1 text-[11px] text-teal-700 hover:text-teal-600">
                Manage <MdOpenInNew size={12} />
              </Link>
            )}
          </div>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      </div>
    </div>
  );
}

function SectionAssetUpload({
  assetKey,
  assets,
  drafts,
  setDrafts,
  fallback,
}: {
  assetKey: keyof typeof ASSET_FIELDS;
  assets: Record<string, HomeAsset>;
  drafts: Record<string, AssetDraft>;
  setDrafts: Dispatch<SetStateAction<Record<string, AssetDraft>>>;
  fallback: string;
}) {
  const imageUrl = assets[assetKey]?.image_url || fallback;
  return (
    <div className="md:col-span-2 rounded-lg border border-gray-200 p-4 bg-gray-50">
      <label className="block text-sm font-medium text-gray-600 mb-2">{ASSET_FIELDS[assetKey]}</label>
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-lg border border-gray-200 bg-white" />
        <div className="space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setDrafts((prev) => ({
              ...prev,
              [assetKey]: { ...(prev[assetKey] || { alt_text: '' }), file: event.target.files?.[0] || null },
            }))}
            className="text-xs text-gray-600 w-full"
          />
          <TextField
            label="Alt Text"
            value={drafts[assetKey]?.alt_text || ''}
            onChange={(value) => setDrafts((prev) => ({
              ...prev,
              [assetKey]: { ...(prev[assetKey] || { file: null }), alt_text: value },
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function ShortcutLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100">
      {label} <MdOpenInNew size={14} />
    </Link>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 rounded border-gray-200 bg-gray-50"
      />
      {checked && <MdCheck className="text-teal-700" size={16} />}
      {label}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  helper,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
      />
      {helper && <p className="text-xs text-gray-400 mt-1">{helper}</p>}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none resize-none"
      />
    </div>
  );
}
