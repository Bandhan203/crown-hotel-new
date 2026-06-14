import { useEffect, useState, useRef } from 'react';
import { MdPalette, MdSave, MdRefresh, MdColorLens, MdTextFields, MdImage } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

interface SiteSetting {
  id: number;
  key: string;
  value: string;
}

const BRANDING_KEYS = [
  'site_name',
  'admin_accent_color',
  'admin_logo_url',
  'admin_tagline',
  'site_tagline',
  'about_image',
  'footer_copyright',
  'primary_cta_label',
  'primary_cta_link',
];

const PRESET_COLORS = [
  { name: 'Gold (Default)', value: '#aa8453' },
  { name: 'Royal Blue',     value: '#1e40af' },
  { name: 'Emerald',        value: '#059669' },
  { name: 'Rose',           value: '#e11d48' },
  { name: 'Purple',         value: '#7c3aed' },
  { name: 'Slate',          value: '#475569' },
  { name: 'Amber',          value: '#d97706' },
  { name: 'Teal',           value: '#0d9488' },
];

export default function Branding() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const { refresh: refreshPublicSettings } = useSiteSettings();

  const fetchSettings = () => {
    setLoading(true);
    api.get('/admin/site-settings/')
      .then(res => {
        const list: SiteSetting[] = res.data.results || res.data;
        setSettings(list);
        const map: Record<string, string> = {};
        list.forEach(item => { map[item.key] = item.value; });
        setDraft(map);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const upsertSetting = async (key: string, value: string) => {
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await api.put(`/admin/site-settings/${existing.id}/`, { key, value });
    } else {
      await api.post('/admin/site-settings/', { key, value });
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(BRANDING_KEYS.map(key => upsertSetting(key, draft[key] || '')));
      toast.success('Branding saved & applied!');
      fetchSettings();
      await refreshPublicSettings();
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  const accentColor = draft['admin_accent_color'] || '#aa8453';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Gilda Display", serif' }}>
            <MdPalette className="inline mr-2 mb-1" style={{ color: accentColor }} />
            Branding
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Customize hotel name, admin panel colors, and identity across the entire system.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition"
          style={{ backgroundColor: accentColor }}
        >
          <MdSave size={18} />
          {saving ? 'Saving...' : 'Save & Apply'}
        </button>
      </div>

      {/* Live Preview */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
          <MdColorLens style={{ color: accentColor }} />
          Live Sidebar Preview
        </h2>
        <div className="flex items-center gap-4 bg-[#111] border border-white/10 rounded-lg px-5 py-4">
          <div className="w-2.5 h-8 rounded-full" style={{ backgroundColor: accentColor }} />
          <div>
            <p className="text-lg font-bold text-white" style={{ fontFamily: '"Gilda Display", serif' }}>
              <span style={{ color: accentColor }}>{draft['site_name'] || 'Hotel Crown'}</span>
            </p>
            <p className="text-xs text-gray-500">{draft['admin_tagline'] || 'Hotel Management System'}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">This is how your hotel name appears in the admin sidebar and login page.</p>
      </div>

      {/* Hotel Identity */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <MdTextFields style={{ color: accentColor }} />
          Hotel Identity
        </h2>
        <p className="text-sm text-gray-400 mb-4">These values appear in the admin sidebar, login screen, and public site header.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Hotel / Site Name <span className="text-red-400">*</span></label>
            <input
              value={draft['site_name'] || ''}
              onChange={e => setDraft(p => ({ ...p, site_name: e.target.value }))}
              placeholder="Hotel Crown"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none focus:border-opacity-100 transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <p className="text-xs text-gray-500 mt-1">Shown in admin sidebar header and login page</p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Admin Panel Tagline</label>
            <input
              value={draft['admin_tagline'] || ''}
              onChange={e => setDraft(p => ({ ...p, admin_tagline: e.target.value }))}
              placeholder="Hotel Management System"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <p className="text-xs text-gray-500 mt-1">Small text below hotel name in sidebar</p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Public Site Tagline</label>
            <input
              value={draft['site_tagline'] || ''}
              onChange={e => setDraft(p => ({ ...p, site_tagline: e.target.value }))}
              placeholder="Experience Comfort & Luxury"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Footer Copyright</label>
            <input
              value={draft['footer_copyright'] || ''}
              onChange={e => setDraft(p => ({ ...p, footer_copyright: e.target.value }))}
              placeholder="© 2025 Hotel Crown. All rights reserved."
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        </div>
      </div>

      {/* Accent Color */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <MdColorLens style={{ color: accentColor }} />
          Admin Accent Color
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          This color is used for active sidebar items, buttons, highlights, and charts in the admin panel. 
          Changes apply immediately after saving.
        </p>

        {/* Preset colors */}
        <div className="flex flex-wrap gap-3 mb-5">
          {PRESET_COLORS.map(preset => (
            <button
              key={preset.value}
              onClick={() => setDraft(p => ({ ...p, admin_accent_color: preset.value }))}
              title={preset.name}
              className="group relative w-9 h-9 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: preset.value,
                borderColor: draft['admin_accent_color'] === preset.value ? '#fff' : 'transparent',
              }}
            >
              {draft['admin_accent_color'] === preset.value && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
              )}
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition">
                {preset.name}
              </span>
            </button>
          ))}
        </div>

        {/* Custom color + hex input */}
        <div className="flex items-center gap-3 mt-8">
          <div
            className="w-11 h-11 rounded-xl border-2 border-white/20 cursor-pointer overflow-hidden shrink-0 shadow-lg"
            style={{ backgroundColor: accentColor }}
            onClick={() => colorInputRef.current?.click()}
            title="Click to open color picker"
          >
            <input
              ref={colorInputRef}
              type="color"
              value={accentColor}
              onChange={e => setDraft(p => ({ ...p, admin_accent_color: e.target.value }))}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Custom HEX Color</label>
            <input
              value={draft['admin_accent_color'] || '#aa8453'}
              onChange={e => setDraft(p => ({ ...p, admin_accent_color: e.target.value }))}
              placeholder="#aa8453"
              className="w-full px-3 py-2 bg-[#0f0f0f] border border-white/10 rounded-lg text-white font-mono text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
          <button
            onClick={() => setDraft(p => ({ ...p, admin_accent_color: '#aa8453' }))}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition mt-4"
            title="Reset to default gold"
          >
            <MdRefresh size={14} />
            Reset
          </button>
        </div>

        {/* Color preview bar */}
        <div className="mt-4 rounded-lg overflow-hidden h-8" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}>
          <div className="h-full flex items-center justify-center text-white text-xs font-medium opacity-80">
            {accentColor} — Preview
          </div>
        </div>
      </div>

      {/* Media / Logos */}
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
        <h2 className="text-white font-semibold text-base mb-1 flex items-center gap-2">
          <MdImage style={{ color: accentColor }} />
          Media & Logo
        </h2>
        <p className="text-sm text-gray-400 mb-4">Image URLs used in the public-facing website.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Admin Logo URL</label>
            <input
              value={draft['admin_logo_url'] || ''}
              onChange={e => setDraft(p => ({ ...p, admin_logo_url: e.target.value }))}
              placeholder="/media/hotel/logo.png"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">About Section Image URL</label>
            <input
              value={draft['about_image'] || ''}
              onChange={e => setDraft(p => ({ ...p, about_image: e.target.value }))}
              placeholder="/media/hotel/hotel-010.jpg"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Primary CTA Label</label>
            <input
              value={draft['primary_cta_label'] || ''}
              onChange={e => setDraft(p => ({ ...p, primary_cta_label: e.target.value }))}
              placeholder="BOOK NOW"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Primary CTA Link</label>
            <input
              value={draft['primary_cta_link'] || ''}
              onChange={e => setDraft(p => ({ ...p, primary_cta_link: e.target.value }))}
              placeholder="/rooms"
              className="w-full px-3 py-2.5 bg-[#0f0f0f] border border-white/10 rounded-lg text-white text-sm outline-none transition"
              onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
        </div>
      </div>

      {/* Save button bottom */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 text-white rounded-xl text-sm font-semibold disabled:opacity-60 transition shadow-lg"
          style={{ backgroundColor: accentColor }}
        >
          <MdSave size={18} />
          {saving ? 'Saving...' : 'Save & Apply Branding'}
        </button>
      </div>
    </div>
  );
}
