import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdDelete, MdEdit, MdSpa, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';
import { BADGE, NO_BADGE, YES_BADGE, deleteBtn, editBtn, pinCol } from '../utils/gridHelpers';

interface SpaServiceRow {
  id: number; name: string; description: string;
  duration: number; price: string; is_available: boolean;
  image?: string | null; image_url?: string | null;
}

export default function SpaManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<SpaServiceRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/spa-services/', { params: { page_size: 100 } });
      const rows: SpaServiceRow[] = res.data.results ?? res.data;
      setTotalCount(typeof res.data.count === 'number' ? res.data.count : rows.length);
      setAvailableCount(rows.filter(r => r.is_available).length);
    } catch {
      toast.error('Failed to load spa services');
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, refreshKey]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this service?')) return;
    try {
      await api.delete(`/admin/spa-services/${id}/`);
      toast.success('Deleted');
      bumpRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  }, []);

  const handleSave = async (data: Record<string, unknown>, imageFile?: File | null) => {
    try {
      const useMultipart = Boolean(imageFile);
      let payload: FormData | Record<string, unknown>;
      if (useMultipart) {
        const fd = new FormData();
        fd.append('name', String(data.name));
        fd.append('description', String(data.description || ''));
        fd.append('duration', String(Number(data.duration) || 60));
        fd.append('price', String(data.price));
        fd.append('is_available', String(data.is_available ?? true));
        if (imageFile) fd.append('image', imageFile);
        payload = fd;
      } else {
        payload = {
          ...data,
          duration: Number(data.duration) || 60,
          price: data.price,
          is_available: data.is_available ?? true,
        };
      }
      const headers = useMultipart ? { 'Content-Type': 'multipart/form-data' } : undefined;
      if (editItem?.id) await api.patch(`/admin/spa-services/${editItem.id}/`, payload, { headers });
      else await api.post('/admin/spa-services/', payload, { headers });
      toast.success(editItem ? 'Updated' : 'Created');
      setShowModal(false);
      setEditItem(null);
      bumpRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      toast.error(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to save');
    }
  };

  const columns = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Service', width: 180, minWidth: 180, maxWidth: 180, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'name', ...pinCol },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 140, cellClass: 'cell-ellipsis', tooltipField: 'description' },
    { field: 'duration', headerName: 'Duration', width: 100, valueFormatter: p => p.value ? `${p.value} min` : '—' },
    { field: 'price', headerName: 'Price', width: 108, cellClass: 'cell-amount', valueFormatter: p => `৳${Number(p.value).toLocaleString()}` },
    {
      field: 'is_available', headerName: 'Status', width: 96, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${p.value ? YES_BADGE : NO_BADGE}`}>{p.value ? 'Available' : 'Off'}</span>
      ),
    },
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true, sortable: false, filter: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
      cellRenderer: (p: ICellRendererParams) => (
        <div className="flex items-center gap-1 h-full">
          <button type="button" title="Edit" onClick={() => { setEditItem(p.data); setShowModal(true); }} className={editBtn}>
            <MdEdit size={12} />
          </button>
          <button type="button" title="Delete" onClick={() => handleDelete(p.data.id)} className={deleteBtn}>
            <MdDelete size={12} />
          </button>
        </div>
      ),
    },
  ], [handleDelete]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MdSpa className="text-purple-500" /> Spa & Wellness
          </h1>
          <p className="text-gray-500 text-sm">Service catalog — charge in-house guests via Service Entry → Folio</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
            {totalCount} service{totalCount !== 1 ? 's' : ''}
          </span>
          <button type="button" onClick={loadStats} className="p-2 border border-gray-200 rounded-lg text-gray-500">
            <MdRefresh size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-lg">
        <Stat label="Total Services" value={String(totalCount)} accent="text-teal-700" />
        <Stat label="Available" value={String(availableCount)} accent="text-green-600" />
        <Stat label="Unavailable" value={String(Math.max(0, totalCount - availableCount))} accent="text-red-500" />
      </div>

      {totalCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          No spa services yet. Click <strong>Add Service</strong> or run: <code className="bg-white px-1 rounded">python manage.py seed_spa</code>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 flex justify-end">
        <button type="button" onClick={() => { setEditItem(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600">
          <MdAdd size={16} /> Add Service
        </button>
      </div>

      <AdminDataGrid
        url="/admin/spa-services/"
        columnDefs={columns}
        pageSize={20}
        refreshKey={refreshKey}
        rowLabel="spa service"
        queryParams={{ page_size: 100 }}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setEditItem(null); }}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? 'Edit' : 'Add'} Spa Service</h2>
            <SpaForm initial={editItem} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${accent || 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function SpaForm({ initial, onSave }: { initial: SpaServiceRow | null; onSave: (d: Record<string, unknown>, imageFile?: File | null) => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    duration: initial?.duration ? String(initial.duration) : '60',
    price: initial?.price || '',
    is_available: initial?.is_available ?? true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <FI label="Service Name *" value={form.name} onChange={v => set('name', v)} />
      <FI label="Description" value={form.description} onChange={v => set('description', v)} />
      <div className="grid grid-cols-2 gap-4">
        <FI label="Duration (min) *" value={form.duration} onChange={v => set('duration', v)} type="number" />
        <FI label="Price (৳) *" value={form.price} onChange={v => set('price', v)} type="number" />
      </div>
      <div>
        <label className="block text-sm text-gray-600 mb-1">Service Image</label>
        {initial?.image_url && !imageFile && (
          <img src={initial.image_url} alt="" className="h-16 w-24 object-cover rounded mb-2 border" />
        )}
        <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
          className="text-xs text-gray-600 w-full" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} className="rounded" />
        Available for booking
      </label>
      <button type="button" onClick={() => form.name && onSave(form, imageFile)} className="w-full py-2 bg-teal-700 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function FI({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-teal-600 outline-none" />
    </div>
  );
}
