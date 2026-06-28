import { useEffect, useState } from 'react';
import { MdArticle, MdSave } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface PageCMS {
  id?: number;
  page_slug: string;
  title: string;
  subtitle: string;
  hero_image: string | null;
  meta_description: string;
  extra_content: Record<string, string>;
}

const PAGE_SLUGS = [
  { value: 'home', label: 'Home Page' },
  { value: 'about', label: 'About Page' },
  { value: 'faq', label: 'FAQ Page' },
  { value: 'rooms', label: 'Rooms Page' },
  { value: 'news', label: 'News Page' },
  { value: 'contact', label: 'Contact Page' },
];

export default function CMSPages() {
  const [selectedSlug, setSelectedSlug] = useState('home');
  const [page, setPage] = useState<PageCMS | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extraKey, setExtraKey] = useState('');
  const [extraValue, setExtraValue] = useState('');

  const fetchPage = async (slug: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/pages/${slug}/`);
      setPage(res.data);
    } catch (e: any) {
      if (e.response?.status === 404) {
        setPage({
          page_slug: slug,
          title: '',
          subtitle: '',
          hero_image: null,
          meta_description: '',
          extra_content: {}
        });
      } else {
        toast.error('Failed to load page');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPage(selectedSlug);
  }, [selectedSlug]);

  const handleSave = async () => {
    if (!page) return;
    setSaving(true);
    try {
      if (page.id) {
        await api.put(`/admin/pages/${page.page_slug}/`, page);
      } else {
        await api.post('/admin/pages/', page);
      }
      toast.success('Page content saved successfully');
      fetchPage(selectedSlug);
    } catch {
      toast.error('Failed to save page');
    }
    setSaving(false);
  };

  const updateField = (field: keyof PageCMS, value: any) => {
    setPage(prev => prev ? { ...prev, [field]: value } : null);
  };

  const addExtraContent = () => {
    if (!extraKey.trim() || !page) return;
    setPage({
      ...page,
      extra_content: { ...page.extra_content, [extraKey.trim()]: extraValue }
    });
    setExtraKey('');
    setExtraValue('');
  };

  const removeExtraContent = (key: string) => {
    if (!page) return;
    const newExtra = { ...page.extra_content };
    delete newExtra[key];
    setPage({ ...page, extra_content: newExtra });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <MdArticle className="inline mr-2 text-primary" />Page Layouts
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none"
          >
            {PAGE_SLUGS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-teal-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            <MdSave size={18} /> {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Manage specific text and images for individual pages. Use the dynamic block section for custom sections.
      </p>

      {loading || !page ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Page Title</label>
              <input value={page.title} onChange={(e) => updateField('title', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Page Subtitle</label>
              <input value={page.subtitle} onChange={(e) => updateField('subtitle', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">SEO Meta Description</label>
              <textarea rows={2} value={page.meta_description} onChange={(e) => updateField('meta_description', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none resize-none" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-slate-800 font-semibold text-lg mb-4">Dynamic Section Blocks</h2>
            <div className="space-y-3 mb-5">
              {Object.entries(page.extra_content || {}).map(([key, val]) => (
                <div key={key} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-white/5">
                  <div className="flex-1">
                    <div className="text-xs text-primary mb-1 font-mono">{key}</div>
                    <textarea value={val} onChange={(e) => setPage({ ...page, extra_content: { ...page.extra_content, [key]: e.target.value } })}
                      className="w-full bg-transparent text-slate-800 text-sm outline-none resize-none" rows={2} />
                  </div>
                  <button onClick={() => removeExtraContent(key)} className="text-red-400 hover:text-red-300 text-sm px-2 py-1">Remove</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-start mt-4 pt-4 border-t border-gray-200">
              <input value={extraKey} onChange={(e) => setExtraKey(e.target.value)} placeholder="Block Key (e.g., home_video_url)"
                className="w-1/3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
              <input value={extraValue} onChange={(e) => setExtraValue(e.target.value)} placeholder="Block Content"
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-primary outline-none" />
              <button onClick={addExtraContent} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
