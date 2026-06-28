import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdDelete, MdEdit } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';
import { BADGE, NO_BADGE, YES_BADGE, deleteBtn, editBtn, pinCol } from '../utils/gridHelpers';

type Tab = 'categories' | 'items';

export default function RestaurantManagement() {
  const [tab, setTab] = useState<Tab>('items');
  const [categories, setCategories] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    api.get('/admin/menu-categories/')
      .then(r => setCategories(r.data.results || r.data))
      .catch(() => {});
  }, [refreshKey]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/admin/${tab === 'categories' ? 'menu-categories' : 'menu-items'}/${id}/`);
      toast.success('Deleted');
      bumpRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  }, [tab]);

  const handleSave = async (data: any) => {
    const endpoint = tab === 'categories' ? 'menu-categories' : 'menu-items';
    try {
      if (editItem?.id) await api.put(`/admin/${endpoint}/${editItem.id}/`, data);
      else await api.post(`/admin/${endpoint}/`, data);
      toast.success(editItem ? 'Updated' : 'Created');
      setShowModal(false);
      setEditItem(null);
      bumpRefresh();
    } catch (err: any) {
      const d = err.response?.data;
      toast.error(d ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : 'Failed to save');
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

  const catCols = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180, cellClass: 'cell-guest cell-ellipsis', tooltipField: 'name' },
    { field: 'order', headerName: 'Order', width: 80, cellClass: 'cell-amount' },
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true, cellRenderer: Actions, sortable: false, filter: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
    },
  ], [Actions]);

  const itemCols = useMemo<ColDef[]>(() => [
    { field: 'name', headerName: 'Name', width: 160, minWidth: 160, maxWidth: 160, pinned: 'left', lockPinned: true, cellClass: 'cell-guest cell-pin cell-ellipsis', tooltipField: 'name', ...pinCol },
    {
      field: 'category_name', headerName: 'Category', flex: 1, minWidth: 130,
      valueGetter: (p: any) => categories.find((c: any) => c.id === p.data?.category)?.name || '—',
      cellClass: 'cell-ellipsis',
    },
    { field: 'price', headerName: 'Price', width: 108, cellClass: 'cell-amount', valueFormatter: (p: any) => `BDT ${p.value}` },
    {
      field: 'is_available', headerName: 'Available', width: 96, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${p.value ? YES_BADGE : NO_BADGE}`}>
          {p.value ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true, cellRenderer: Actions, sortable: false, filter: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
    },
  ], [Actions, categories]);

  const gridUrl = tab === 'categories' ? '/admin/menu-categories/' : '/admin/menu-items/';
  const rowLabel = tab === 'categories' ? 'category' : 'menu item';

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 p-0.5 rounded-md border border-white/5 shrink-0">
            {(['items', 'categories'] as Tab[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${tab === t ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}
              >
                {t === 'categories' ? 'Categories' : 'Menu Items'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { setEditItem(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 transition shrink-0 ml-auto"
          >
            <MdAdd size={16} /> Add {tab === 'categories' ? 'Category' : 'Item'}
          </button>
        </div>
      </div>

      <AdminDataGrid
        url={gridUrl}
        columnDefs={tab === 'categories' ? catCols : itemCols}
        pageSize={15}
        refreshKey={`${tab}-${refreshKey}`}
        rowLabel={rowLabel}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setEditItem(null); }}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? 'Edit' : 'Add'} {tab === 'categories' ? 'Category' : 'Menu Item'}</h2>
            {tab === 'categories' ? (
              <CatForm initial={editItem} onSave={handleSave} />
            ) : (
              <ItemForm initial={editItem} categories={categories} onSave={handleSave} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CatForm({ initial, onSave }: { initial: any; onSave: (d: any) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [order, setOrder] = useState(initial?.order || 0);
  return (
    <div className="space-y-4">
      <FInput label="Name" value={name} onChange={setName} />
      <FInput label="Order" value={order} onChange={v => setOrder(parseInt(v) || 0)} type="number" />
      <button onClick={() => onSave({ name, order })} className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function ItemForm({ initial, categories, onSave }: { initial: any; categories: any[]; onSave: (d: any) => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '', description: initial?.description || '',
    price: initial?.price || '', category: initial?.category || (categories[0]?.id || ''),
    is_available: initial?.is_available ?? true,
  });
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  return (
    <div className="space-y-4">
      <FInput label="Name" value={form.name} onChange={v => set('name', v)} />
      <FInput label="Description" value={form.description} onChange={v => set('description', v)} />
      <FInput label="Price" value={form.price} onChange={v => set('price', v)} type="number" />
      <div>
        <label className="block text-sm text-gray-600 mb-1">Category</label>
        <select value={form.category} onChange={e => set('category', parseInt(e.target.value))}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none">
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)}
          className="w-4 h-4 rounded border-gray-200 bg-gray-50" />Available
      </label>
      <button onClick={() => onSave(form)} className="w-full py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function FInput({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:border-teal-600 outline-none" />
    </div>
  );
}
