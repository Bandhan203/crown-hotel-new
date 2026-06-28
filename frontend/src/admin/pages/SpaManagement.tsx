import { useCallback, useMemo, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';
import { ACTIVE_BADGE, BADGE, deleteBtn, editBtn, pinCol } from '../utils/gridHelpers';

export default function SpaManagement() {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this service?')) return;
    try {
      await api.delete(`/admin/spa-services/${id}/`);
      toast.success('Deleted');
      bumpRefresh();
    } catch {
      toast.error('Failed');
    }
  }, []);

  const handleSave = async (data: any) => {
    try {
      if (editItem?.id) await api.put(`/admin/spa-services/${editItem.id}/`, data);
      else await api.post('/admin/spa-services/', data);
      toast.success(editItem ? 'Updated' : 'Created');
      setShowModal(false);
      setEditItem(null);
      bumpRefresh();
    } catch (err: any) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : 'Failed');
    }
  };

  const columns = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Service', width: 180, minWidth: 180, maxWidth: 180, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'name', ...pinCol },
    { field: 'duration', headerName: 'Duration', flex: 1, minWidth: 100, valueFormatter: p => p.value ? `${p.value} min` : '—' },
    { field: 'price', headerName: 'Price', width: 108, cellClass: 'cell-amount', valueFormatter: p => `BDT ${p.value}` },
    {
      field: 'is_active', headerName: 'Status', width: 90, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${ACTIVE_BADGE[String(p.value)] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {p.value ? 'Active' : 'Inactive'}
        </span>
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
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 transition shrink-0"
          >
            <MdAdd size={16} /> Add Service
          </button>
        </div>
      </div>

      <AdminDataGrid url="/admin/spa-services/" columnDefs={columns} pageSize={15} refreshKey={refreshKey} rowLabel="spa service" />

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

function SpaForm({ initial, onSave }: { initial: any; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '', description: initial?.description || '',
    duration: initial?.duration || '', price: initial?.price || '',
    is_active: initial?.is_active ?? true,
  });
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <FI label="Name" value={form.name} onChange={v => set('name', v)} />
      <FI label="Description" value={form.description} onChange={v => set('description', v)} />
      <div className="grid grid-cols-2 gap-4">
        <FI label="Duration" value={form.duration} onChange={v => set('duration', v)} placeholder="e.g. 60 min" />
        <FI label="Price" value={form.price} onChange={v => set('price', v)} type="number" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-gray-200 bg-gray-50" />Active
      </label>
      <button onClick={() => onSave(form)} className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function FI({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none" />
    </div>
  );
}
