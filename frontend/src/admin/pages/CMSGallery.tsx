import { useEffect, useMemo, useState } from 'react';
import { MdAdd, MdDelete, MdEdit, MdPhotoLibrary } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

type Category = 'ROOMS' | 'RESTAURANT' | 'SPA' | 'POOL' | 'EXTERIOR';
type FilterCategory = 'ALL' | Category;

type GalleryImage = {
  id: number;
  image: string;
  category: Category;
  title: string;
  description: string;
  alt_text: string;
  is_published: boolean;
  order: number;
  created_at: string;
};

type GalleryForm = {
  title: string;
  description: string;
  category: Category;
  alt_text: string;
  is_published: boolean;
  order: number;
  imageFile: File | null;
};

const CATEGORIES: Array<{ key: FilterCategory; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ROOMS', label: 'Rooms' },
  { key: 'RESTAURANT', label: 'Restaurant' },
  { key: 'SPA', label: 'Spa' },
  { key: 'POOL', label: 'Pool' },
  { key: 'EXTERIOR', label: 'Exterior' },
];

const CATEGORY_BADGE: Record<Category, string> = {
  ROOMS: 'bg-blue-100 text-blue-800',
  RESTAURANT: 'bg-amber-100 text-amber-800',
  SPA: 'bg-emerald-100 text-emerald-800',
  POOL: 'bg-cyan-100 text-cyan-800',
  EXTERIOR: 'bg-violet-100 text-violet-800',
};

function toAbsoluteMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  return path.startsWith('/') ? path : `/${path}`;
}

function emptyForm(): GalleryForm {
  return {
    title: '',
    description: '',
    category: 'ROOMS',
    alt_text: '',
    is_published: true,
    order: 0,
    imageFile: null,
  };
}

export default function CMSGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>('ALL');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<GalleryImage | null>(null);
  const [form, setForm] = useState<GalleryForm>(emptyForm());

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState<GalleryImage | null>(null);

  async function fetchImages(): Promise<void> {
    setLoading(true);
    try {
      const res = await api.get<{ results?: GalleryImage[] } | GalleryImage[]>('/admin/gallery/');
      const payload = res.data;
      const list = Array.isArray(payload) ? payload : (payload.results || []);
      setImages(list);
    } catch {
      toast.error('Failed to load gallery images');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchImages();
  }, []);

  const filteredImages = useMemo(() => {
    if (filter === 'ALL') return images;
    return images.filter((img) => img.category === filter);
  }, [images, filter]);

  const stats = useMemo(() => {
    const total = images.length;
    const published = images.filter((img) => img.is_published).length;
    const drafts = total - published;
    const totalCategories = new Set(images.map((img) => img.category)).size;
    return { total, published, drafts, totalCategories };
  }, [images]);

  function openAddModal(): void {
    setEditing(null);
    setForm(emptyForm());
    setShowFormModal(true);
  }

  function openEditModal(item: GalleryImage): void {
    setEditing(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category,
      alt_text: item.alt_text || '',
      is_published: item.is_published,
      order: item.order || 0,
      imageFile: null,
    });
    setShowFormModal(true);
  }

  async function saveImage(): Promise<void> {
    if (!form.title.trim()) {
      toast.error('Image title is required');
      return;
    }

    if (!editing && !form.imageFile) {
      toast.error('Please upload an image');
      return;
    }

    try {
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description);
      data.append('category', form.category);
      data.append('alt_text', form.alt_text.trim());
      data.append('is_published', String(form.is_published));
      data.append('order', String(form.order || 0));
      data.append('caption', form.title.trim());
      if (form.imageFile) {
        data.append('image', form.imageFile);
      }

      if (editing) {
        await api.patch(`/admin/gallery/${editing.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Gallery image updated');
      } else {
        await api.post('/admin/gallery/', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Gallery image added');
      }

      setShowFormModal(false);
      setEditing(null);
      await fetchImages();
    } catch {
      toast.error('Failed to save image');
    }
  }

  function requestDelete(item: GalleryImage): void {
    setDeleting(item);
    setShowDeleteModal(true);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleting) return;
    try {
      await api.delete(`/admin/gallery/${deleting.id}/`);
      toast.success('Gallery image deleted');
      setShowDeleteModal(false);
      setDeleting(null);
      await fetchImages();
    } catch {
      toast.error('Failed to delete image');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>
          <span className="inline mr-2 text-primary"><MdPhotoLibrary size={24} /></span>
          Gallery Management
        </h1>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#9c7c47] text-white rounded-lg text-sm font-medium"
        >
          <MdAdd size={18} /> Add New Image
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Images" value={stats.total} />
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Drafts" value={stats.drafts} />
        <StatCard label="Total Categories" value={stats.totalCategories} />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-4 py-2 text-xs uppercase tracking-wide border rounded-md transition-colors ${
              filter === cat.key
                ? 'bg-[#8B6F3E] border-[#8B6F3E] text-slate-800'
                : 'bg-[#121212] border-white/15 text-gray-600 hover:border-[#8B6F3E] hover:text-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-500">Loading gallery...</div>
      ) : filteredImages.length === 0 ? (
        <div className="text-gray-500">No images in this category yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredImages.map((item) => (
            <div key={item.id} className="bg-[#161616] border border-gray-200 rounded-xl overflow-hidden">
              <img
                src={toAbsoluteMediaUrl(item.image)}
                alt={item.alt_text || item.title || 'Gallery image'}
                className="w-full h-56 object-cover"
              />

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${CATEGORY_BADGE[item.category]}`}>
                    {item.category}
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full ${item.is_published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {item.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <h3 className="text-slate-800 font-semibold line-clamp-1">{item.title || 'Untitled Image'}</h3>
                <p
                  className="text-sm text-gray-500"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {item.description || 'No description'}
                </p>

                <p className="text-xs text-gray-500">
                  Uploaded: {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                </p>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                  >
                    <MdEdit size={16} /> Edit
                  </button>
                  <button
                    onClick={() => requestDelete(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm bg-red-500/15 text-red-300 hover:bg-red-500/25"
                  >
                    <MdDelete size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowFormModal(false)}>
          <div className="w-full max-w-2xl bg-[#161616] border border-gray-200 rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold text-slate-800 mb-5">{editing ? 'Edit Image' : 'Add New Image'}</h2>

            <div className="space-y-4">
              <UploadZone
                onFileSelected={(file) => setForm((prev) => ({ ...prev, imageFile: file }))}
                selectedFileName={form.imageFile?.name || ''}
                existingImageUrl={editing ? toAbsoluteMediaUrl(editing.image) : ''}
              />

              <div>
                <label className="block text-sm text-gray-600 mb-1">Image Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary"
                  placeholder="Deluxe Room Sunset View"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary resize-none"
                  placeholder="Shown on the public gallery card..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as Category }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary"
                  >
                    {CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Alt text</label>
                  <input
                    value={form.alt_text}
                    onChange={(e) => setForm((prev) => ({ ...prev, alt_text: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary"
                    placeholder="Guest room with king bed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Published
                </label>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Display order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm((prev) => ({ ...prev, order: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg bg-[#101010] border border-gray-200 text-slate-800 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowFormModal(false)} className="px-4 py-2 text-gray-600 hover:text-slate-800">Cancel</button>
              <button onClick={() => void saveImage()} className="px-4 py-2 rounded-lg bg-primary hover:bg-[#9c7c47] text-slate-800">Save</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleting && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-md bg-[#161616] border border-gray-200 rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg text-slate-800 font-semibold mb-2">Delete Image?</h3>
            <p className="text-sm text-gray-500 mb-2">You are deleting: <span className="text-slate-800">{deleting.title || 'Untitled Image'}</span></p>
            <p className="text-sm text-red-300 mb-6">This action is permanent and cannot be undone.</p>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 text-gray-600 hover:text-slate-800">Cancel</button>
              <button onClick={() => void confirmDelete()} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-slate-800">Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#151515] border border-gray-200 rounded-xl p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function UploadZone({
  onFileSelected,
  selectedFileName,
  existingImageUrl,
}: {
  onFileSelected: (file: File | null) => void;
  selectedFileName: string;
  existingImageUrl?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  function validateAndSet(file: File | null): void {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, and WEBP are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max file size is 5 MB');
      return;
    }
    onFileSelected(file);
  }

  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">Image upload</label>
      {existingImageUrl && (
        <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-[#101010]">
          <p className="text-xs text-gray-500 mb-2">Existing image</p>
          <img
            src={existingImageUrl}
            alt="Existing gallery image"
            className="w-full h-40 object-cover rounded-md"
          />
          <p className="text-[11px] text-gray-500 mt-2">Upload a new file only if you want to replace this image.</p>
        </div>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          validateAndSet(e.dataTransfer.files?.[0] || null);
        }}
        className={`border-2 border-dashed rounded-lg p-4 text-center ${dragOver ? 'border-primary bg-primary/10' : 'border-white/15 bg-[#101010]'}`}
      >
        <p className="text-sm text-gray-600">Drag & drop image here or browse</p>
        <p className="text-xs text-gray-500 mt-1">Accept: JPG, PNG, WEBP (max 5 MB)</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => validateAndSet(e.target.files?.[0] || null)}
          className="mt-3 text-sm text-gray-600"
        />
        {selectedFileName && <p className="text-xs text-emerald-300 mt-2">Selected replacement: {selectedFileName}</p>}
      </div>
    </div>
  );
}
