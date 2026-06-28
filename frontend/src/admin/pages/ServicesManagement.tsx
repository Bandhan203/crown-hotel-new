import { useCallback, useMemo, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';
import { ACTIVE_BADGE, BADGE, deleteBtn, editBtn, pinCol } from '../utils/gridHelpers';

type Tab = 'services' | 'facilities';

export default function ServicesManagement() {
  const [tab, setTab] = useState<Tab>('services');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey(k => k + 1);
  const endpoint = tab === 'services' ? 'hotel-services' : 'facilities';

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete?')) return;
    try {
      await api.delete(`/admin/${endpoint}/${id}/`);
      toast.success('Deleted');
      bumpRefresh();
    } catch {
      toast.error('Failed');
    }
  }, [endpoint]);

  const handleSave = async (formData: any) => {
    try {
      if (editItem?.id) await api.put(`/admin/${endpoint}/${editItem.id}/`, formData);
      else await api.post(`/admin/${endpoint}/`, formData);
      toast.success(editItem ? 'Updated' : 'Created');
      setShowModal(false);
      setEditItem(null);
      bumpRefresh();
    } catch (err: any) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : 'Failed');
    }
  };

  const Actions = useCallback((p: ICellRendererParams) => (
    <div className="flex items-center gap-1 h-full">
      <button type="button" title="Edit" onClick={() => { setEditItem(p.data); setShowModal(true); }} className={editBtn}>
        <MdEdit size={12} />
      </button>
      <button type="button" title="Delete" onClick={() => handleDelete(p.data.id)} className={deleteBtn}>
        <MdDelete size={12} />
      </button>
    </div>
  ), [handleDelete]);

  const columns = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Name', width: 180, minWidth: 180, maxWidth: 180, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'name', ...pinCol },
    { field: 'icon', headerName: 'Icon', flex: 1, minWidth: 100, valueFormatter: p => p.value || '—' },
    {
      field: 'is_active', headerName: 'Status', width: 90, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${ACTIVE_BADGE[String(p.value)] || 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {p.value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    ...(tab === 'facilities'
      ? [{ field: 'category', headerName: 'Category', width: 130, valueFormatter: (p) => p.value || 'GENERAL' } as ColDef]
      : []),
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true, cellRenderer: Actions, sortable: false, filter: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
    },
  ], [Actions, tab]);

  const rowLabel = tab === 'services' ? 'service' : 'facility';

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 p-0.5 rounded-md border border-white/5 shrink-0">
            {(['services', 'facilities'] as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${tab === t ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}
              >
                {t === 'services' ? 'Services' : 'Facilities'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 transition shrink-0 ml-auto"
          >
            <MdAdd size={16} /> Add {tab === 'services' ? 'Service' : 'Facility'}
          </button>
        </div>
      </div>

      <AdminDataGrid
        url={`/admin/${endpoint}/`}
        columnDefs={columns}
        pageSize={15}
        refreshKey={`${tab}-${refreshKey}`}
        rowLabel={rowLabel}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setEditItem(null); }}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? 'Edit' : 'Add'} {tab === 'services' ? 'Service' : 'Facility'}</h2>
            <ServiceForm initial={editItem} isService={tab === 'services'} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceForm({ initial, isService, onSave }: { initial: any; isService: boolean; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    icon: initial?.icon || '',
    category: initial?.category || 'GENERAL',
    subtitle: initial?.subtitle || '',
    link: initial?.link || '',
    is_active: initial?.is_active ?? true,
  });
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-4">
      <FI label="Name" value={form.name} onChange={v => set('name', v)} />
      <FI label="Description" value={form.description} onChange={v => set('description', v)} />
      <FI label="Icon" value={form.icon} onChange={v => set('icon', v)} placeholder="e.g. MdRestaurant" />
      {!isService && (
        <>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none"
            >
              <option value="COMPLIMENTARY">Complimentary Services</option>
              <option value="GENERAL">General Facilities</option>
              <option value="FEATURE">Feature Highlight (home blocks)</option>
            </select>
          </div>
          {form.category === 'FEATURE' && (
            <>
              <FI label="Subtitle" value={form.subtitle} onChange={v => set('subtitle', v)} placeholder="WELCOME" />
              <FI label="Link" value={form.link} onChange={v => set('link', v)} placeholder="/restaurant" />
            </>
          )}
        </>
      )}
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
          className="w-4 h-4 rounded border-gray-200 bg-gray-50" />Active
      </label>
      <button onClick={() => onSave(form)} className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function FI({ label, value, onChange, placeholder = '' }: { label: string; value: any; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none" />
    </div>
  );
}
