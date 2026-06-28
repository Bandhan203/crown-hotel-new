import { useEffect, useState } from 'react';
import { MdTune, MdSave } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

type GlobalSiteSettings = {
  id?: number;
  site_name: string;
  light_logo: string | null;
  dark_logo: string | null;
  favicon: string | null;
  contact_phone: string;
  contact_email: string;
  address: string;
  map_embed_url: string;
  social_links: Record<string, string>;
};

export default function CMSSiteSettings() {
  const [settings, setSettings] = useState<GlobalSiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { refresh: refreshPublicSettings } = useSiteSettings();

  const fetchSettings = () => {
    setLoading(true);
    api.get('/admin/site-settings/')
      .then(res => {
        const data = res.data.results ? res.data.results[0] : res.data[0];
        if (data) {
          setSettings(data);
        } else {
          // Defaults if none exists
          setSettings({
            site_name: '', light_logo: null, dark_logo: null, favicon: null,
            contact_phone: '', contact_email: '', address: '', map_embed_url: '',
            social_links: { facebook: '', twitter: '', instagram: '' }
          });
        }
      })
      .catch(() => toast.error('Failed to load site settings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      if (settings.id) {
        await api.put(`/admin/site-settings/${settings.id}/`, settings);
      } else {
        await api.post('/admin/site-settings/', settings);
      }
      toast.success('Site settings saved');
      fetchSettings();
      await refreshPublicSettings();
    } catch {
      toast.error('Failed to save settings');
    }
    setSaving(false);
  };

  const updateField = (field: keyof GlobalSiteSettings, value: any) => {
    setSettings((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const updateSocialLink = (network: string, value: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        social_links: { ...prev.social_links, [network]: value }
      };
    });
  };

  if (loading || !settings) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <MdTune className="inline mr-2 text-primary" />Global Site Settings
        </h1>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
          <MdSave size={18} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Manage the global identity and contact details of the hotel. These changes reflect immediately.
      </p>

      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-slate-800 font-semibold text-lg mb-4">Branding</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Site Name</label>
              <input value={settings.site_name} onChange={(e) => updateField('site_name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Light Logo URL</label>
              <input value={settings.light_logo || ''} onChange={(e) => updateField('light_logo', e.target.value)} placeholder="/media/logo.png"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-slate-800 font-semibold text-lg mb-4">Contact Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Contact Phone</label>
              <input value={settings.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Contact Email</label>
              <input value={settings.contact_email} onChange={(e) => updateField('contact_email', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Address</label>
              <textarea rows={3} value={settings.address} onChange={(e) => updateField('address', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Google Maps Embed URL</label>
              <textarea rows={2} value={settings.map_embed_url} onChange={(e) => updateField('map_embed_url', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none resize-none" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-slate-800 font-semibold text-lg mb-4">Social Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['facebook', 'twitter', 'instagram', 'tripadvisor', 'linkedin'].map((network) => (
              <div key={network}>
                <label className="block text-sm text-gray-600 mb-1 capitalize">{network} URL</label>
                <input value={settings.social_links[network] || ''} onChange={(e) => updateSocialLink(network, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
