import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { MdHome, MdImage, MdSave } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { unwrapList } from '../../utils/cmsList';
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

const ASSET_FIELDS = [
  { key: 'about_image', label: 'About Image' },
  { key: 'video_background_image', label: 'Video Background Image' },
  { key: 'booking_background_image', label: 'Booking Background Image' },
];

function parseIds(value: string): number[] {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function idsToString(value?: number[]): string {
  return (value || []).join(', ');
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

export default function CMSHomePage() {
  const [page, setPage] = useState<PageCMS | null>(null);
  const [assets, setAssets] = useState<Record<string, HomeAsset>>({});
  const [assetDrafts, setAssetDrafts] = useState<Record<string, AssetDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const orderedSections = useMemo(
    () => page?.extra_content.section_order || HOME_SECTION_ORDER,
    [page?.extra_content.section_order],
  );

  useEffect(() => {
    void loadHomePage();
  }, []);

  async function loadHomePage(): Promise<void> {
    setLoading(true);
    try {
      let currentPage: PageCMS;
      try {
        const res = await api.get<PageCMS>('/admin/pages/home/');
        currentPage = {
          ...res.data,
          extra_content: mergeHomeConfig(res.data.extra_content),
        };
      } catch (error: any) {
        if (error.response?.status !== 404) throw error;
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

      if (currentPage.id) {
        const assetRes = await api.get<HomeAsset[] | { results: HomeAsset[] }>('/admin/page-assets/', {
          params: { page: currentPage.id, page_size: 100 },
        });
        const list = unwrapList(assetRes.data);
        const nextAssets = Object.fromEntries(list.map((asset) => [asset.key, asset]));
        setAssets(nextAssets);
        setAssetDrafts(Object.fromEntries(ASSET_FIELDS.map((field) => [
          field.key,
          { file: null, alt_text: nextAssets[field.key]?.alt_text || '' },
        ])));
      }
    } catch {
      toast.error('Failed to load Home page CMS');
    } finally {
      setLoading(false);
    }
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
    for (const field of ASSET_FIELDS) {
      const draft = assetDrafts[field.key];
      if (!draft || (!draft.file && draft.alt_text === (assets[field.key]?.alt_text || ''))) continue;

      const form = new FormData();
      form.append('page', String(pageId));
      form.append('key', field.key);
      form.append('alt_text', draft.alt_text || '');
      if (draft.file) form.append('image', draft.file);

      const existing = assets[field.key];
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <MdHome className="inline mr-2 text-primary" />Home Page CMS
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
        >
          <MdSave size={18} /> {saving ? 'Saving...' : 'Save Home Page'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <AssetPanel assets={assets} drafts={assetDrafts} setDrafts={setAssetDrafts} />

      <SectionPanel title="Hero Settings">
        <Toggle label="Show section" checked={page.extra_content.sections.hero.enabled !== false} onChange={(value) => updateSection('hero', { enabled: value })} />
        <TextField label="Secondary Button Text" value={page.extra_content.sections.hero.secondary_cta_text || ''} onChange={(value) => updateSection('hero', { secondary_cta_text: value })} />
        <TextField label="Secondary Button Link" value={page.extra_content.sections.hero.secondary_cta_link || ''} onChange={(value) => updateSection('hero', { secondary_cta_link: value })} />
        <p className="md:col-span-2 text-xs text-gray-500">Hero slides are managed in the existing Hero Slides module.</p>
      </SectionPanel>

      <SectionPanel title="About Section">
        <CommonSectionFields section={page.extra_content.sections.about} onChange={(patch) => updateSection('about', patch)} includeBody />
        <TextArea label="Address" value={page.extra_content.sections.about.address || ''} onChange={(value) => updateSection('about', { address: value })} />
        <TextField label="Phone Label" value={page.extra_content.sections.about.phone_label || ''} onChange={(value) => updateSection('about', { phone_label: value })} />
        <TextField label="Phone" value={page.extra_content.sections.about.phone || ''} onChange={(value) => updateSection('about', { phone: value })} />
        <TextField label="Phone Link" value={page.extra_content.sections.about.phone_href || ''} onChange={(value) => updateSection('about', { phone_href: value })} />
      </SectionPanel>

      <CollectionPanel title="Rooms Section" section={page.extra_content.sections.rooms} onChange={(patch) => updateSection('rooms', patch)} />
      <CollectionPanel title="Testimonials Section" section={page.extra_content.sections.testimonials} onChange={(patch) => updateSection('testimonials', patch)} />
      <CollectionPanel title="News Section" section={page.extra_content.sections.news} onChange={(patch) => updateSection('news', patch)} />

      <SectionPanel title="Services Section">
        <CommonSectionFields section={page.extra_content.sections.services} onChange={(patch) => updateSection('services', patch)} includeIntro />
        <TextField label="Limit" value={String(page.extra_content.sections.services.limit || '')} onChange={(value) => updateSection('services', { limit: Number(value) || 0 })} />
        <TextField label="Selected Service IDs" value={idsToString(page.extra_content.sections.services.selected_ids)} onChange={(value) => updateSection('services', { selected_ids: parseIds(value) })} />
        <TextField label="Phone Label" value={page.extra_content.sections.services.phone_label || ''} onChange={(value) => updateSection('services', { phone_label: value })} />
        <TextField label="Phone" value={page.extra_content.sections.services.phone || ''} onChange={(value) => updateSection('services', { phone: value })} />
        <TextField label="Phone Link" value={page.extra_content.sections.services.phone_href || ''} onChange={(value) => updateSection('services', { phone_href: value })} />
      </SectionPanel>

      <SectionPanel title="Video Section">
        <CommonSectionFields section={page.extra_content.sections.video} onChange={(patch) => updateSection('video', patch)} />
        <TextField label="Video URL" value={page.extra_content.sections.video.video_url || ''} onChange={(value) => updateSection('video', { video_url: value })} />
      </SectionPanel>

      <SectionPanel title="Amenities & Facilities Section">
        <CommonSectionFields section={page.extra_content.sections.facilities} onChange={(patch) => updateSection('facilities', patch)} />
        <TextField label="Complimentary Title" value={page.extra_content.sections.facilities.complimentary_title || ''} onChange={(value) => updateSection('facilities', { complimentary_title: value })} />
        <TextField label="General Title" value={page.extra_content.sections.facilities.general_title || ''} onChange={(value) => updateSection('facilities', { general_title: value })} />
        <TextField label="Complimentary Limit" value={String(page.extra_content.sections.facilities.complimentary_limit || '')} onChange={(value) => updateSection('facilities', { complimentary_limit: Number(value) || 0 })} />
        <TextField label="General Limit" value={String(page.extra_content.sections.facilities.general_limit || '')} onChange={(value) => updateSection('facilities', { general_limit: Number(value) || 0 })} />
        <TextField label="Complimentary Facility IDs" value={idsToString(page.extra_content.sections.facilities.complimentary_selected_ids)} onChange={(value) => updateSection('facilities', { complimentary_selected_ids: parseIds(value) })} />
        <TextField label="General Facility IDs" value={idsToString(page.extra_content.sections.facilities.general_selected_ids)} onChange={(value) => updateSection('facilities', { general_selected_ids: parseIds(value) })} />
      </SectionPanel>

      <SectionPanel title="Feature Highlight Blocks">
        <Toggle label="Show section" checked={page.extra_content.sections.features.enabled !== false} onChange={(value) => updateSection('features', { enabled: value })} />
        <TextField label="Limit" value={String(page.extra_content.sections.features.limit || '')} onChange={(value) => updateSection('features', { limit: Number(value) || 0 })} />
        <TextField label="Selected Feature Facility IDs" value={idsToString(page.extra_content.sections.features.selected_ids)} onChange={(value) => updateSection('features', { selected_ids: parseIds(value) })} />
        <TextField label="Button Text" value={page.extra_content.sections.features.button_text || ''} onChange={(value) => updateSection('features', { button_text: value })} />
      </SectionPanel>

      <SectionPanel title="Gallery Section">
        <CommonSectionFields section={page.extra_content.sections.gallery} onChange={(patch) => updateSection('gallery', patch)} />
        <TextField label="Limit" value={String(page.extra_content.sections.gallery.limit || '')} onChange={(value) => updateSection('gallery', { limit: Number(value) || 0 })} />
        <TextField label="Selected Gallery IDs" value={idsToString(page.extra_content.sections.gallery.selected_ids)} onChange={(value) => updateSection('gallery', { selected_ids: parseIds(value) })} />
        <TextField label="Button Text" value={page.extra_content.sections.gallery.button_text || ''} onChange={(value) => updateSection('gallery', { button_text: value })} />
        <TextField label="Button Link" value={page.extra_content.sections.gallery.button_link || ''} onChange={(value) => updateSection('gallery', { button_link: value })} />
      </SectionPanel>

      <SectionPanel title="Booking CTA Section">
        <CommonSectionFields section={page.extra_content.sections.booking} onChange={(patch) => updateSection('booking', patch)} />
        <TextArea label="Tagline" value={page.extra_content.sections.booking.tagline || ''} onChange={(value) => updateSection('booking', { tagline: value })} />
        <TextField label="Button Text" value={page.extra_content.sections.booking.button_text || ''} onChange={(value) => updateSection('booking', { button_text: value })} />
        <TextField label="Front Label" value={page.extra_content.sections.booking.front_label || ''} onChange={(value) => updateSection('booking', { front_label: value })} />
        <TextField label="Front Phone" value={page.extra_content.sections.booking.front_phone || ''} onChange={(value) => updateSection('booking', { front_phone: value })} />
        <TextField label="Front Phone Link" value={page.extra_content.sections.booking.front_phone_href || ''} onChange={(value) => updateSection('booking', { front_phone_href: value })} />
        <TextField label="Reservations Label" value={page.extra_content.sections.booking.reservations_label || ''} onChange={(value) => updateSection('booking', { reservations_label: value })} />
        <TextField label="Reservations Phone" value={page.extra_content.sections.booking.reservations_phone || ''} onChange={(value) => updateSection('booking', { reservations_phone: value })} />
        <TextField label="Reservations Phone Link" value={page.extra_content.sections.booking.reservations_phone_href || ''} onChange={(value) => updateSection('booking', { reservations_phone_href: value })} />
        <TextField label="Email" value={page.extra_content.sections.booking.email || ''} onChange={(value) => updateSection('booking', { email: value })} />
        <TextField label="Website" value={page.extra_content.sections.booking.website || ''} onChange={(value) => updateSection('booking', { website: value })} />
      </SectionPanel>
    </div>
  );
}

function SectionPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-slate-800 font-semibold text-lg mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function AssetPanel({
  assets,
  drafts,
  setDrafts,
}: {
  assets: Record<string, HomeAsset>;
  drafts: Record<string, AssetDraft>;
  setDrafts: Dispatch<SetStateAction<Record<string, AssetDraft>>>;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h2 className="text-slate-800 font-semibold text-lg mb-4">
        <MdImage className="inline mr-2 text-primary" />Home Images
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ASSET_FIELDS.map((field) => (
          <div key={field.key} className="border border-gray-100 rounded-lg p-3">
            <label className="block text-sm text-gray-600 mb-2">{field.label}</label>
            {assets[field.key]?.image_url && (
              <img src={assets[field.key].image_url || ''} alt="" className="w-full h-28 object-cover rounded mb-3 border" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setDrafts((prev) => ({
                ...prev,
                [field.key]: { ...(prev[field.key] || { alt_text: '' }), file: event.target.files?.[0] || null },
              }))}
              className="text-xs text-gray-600 w-full mb-2"
            />
            <TextField
              label="Alt Text"
              value={drafts[field.key]?.alt_text || ''}
              onChange={(value) => setDrafts((prev) => ({
                ...prev,
                [field.key]: { ...(prev[field.key] || { file: null }), alt_text: value },
              }))}
            />
          </div>
        ))}
      </div>
    </div>
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

function CollectionPanel({
  title,
  section,
  onChange,
}: {
  title: string;
  section: HomeSectionConfig;
  onChange: (patch: Partial<HomeSectionConfig>) => void;
}) {
  return (
    <SectionPanel title={title}>
      <CommonSectionFields section={section} onChange={onChange} />
      <TextField label="Limit" value={String(section.limit || '')} onChange={(value) => onChange({ limit: Number(value) || 0 })} />
      <TextField
        label="Selected IDs"
        value={idsToString(section.selected_ids)}
        onChange={(value) => onChange({ selected_ids: parseIds(value) })}
        helper="Comma separated. Leave blank to use featured/latest items."
      />
    </SectionPanel>
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
