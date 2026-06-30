import { useCallback, useEffect, useMemo, useState } from 'react';
import { type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { MdAdd, MdDelete, MdEdit, MdRestaurant, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import AdminDataGrid from '../components/AdminDataGrid';
import { BADGE, NO_BADGE, YES_BADGE, deleteBtn, editBtn, pinCol } from '../utils/gridHelpers';

type Tab = 'categories' | 'items';

interface Category { id: number; name: string; order: number; }
interface MenuItemRow {
  id: number; name: string; description: string; price: string;
  category: number; category_name: string; is_available: boolean;
}

export default function RestaurantManagement() {
  const [tab, setTab] = useState<Tab>('items');
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [availableCount, setAvailableCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | MenuItemRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = () => setRefreshKey(k => k + 1);

  const loadStats = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/admin/menu-categories/', { params: { page_size: 100 } }),
        api.get('/admin/menu-items/', { params: { page_size: 100 } }),
      ]);
      const cats = catRes.data.results ?? catRes.data;
      const items: MenuItemRow[] = itemRes.data.results ?? itemRes.data;
      setCategories(cats);
      setItemCount(typeof itemRes.data.count === 'number' ? itemRes.data.count : items.length);
      setAvailableCount(items.filter(i => i.is_available).length);
    } catch {
      toast.error('Failed to load restaurant data');
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, refreshKey]);

  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Delete this record?')) return;
    try {
      await api.delete(`/admin/${tab === 'categories' ? 'menu-categories' : 'menu-items'}/${id}/`);
      toast.success('Deleted');
      bumpRefresh();
    } catch {
      toast.error('Failed to delete');
    }
  }, [tab]);

  const handleSave = async (data: Record<string, unknown>) => {
    const endpoint = tab === 'categories' ? 'menu-categories' : 'menu-items';
    try {
      if (editItem?.id) await api.patch(`/admin/${endpoint}/${editItem.id}/`, data);
      else await api.post(`/admin/${endpoint}/`, data);
      toast.success(editItem ? 'Updated' : 'Created');
      setShowModal(false);
      setEditItem(null);
      bumpRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: Record<string, unknown> } };
      const d = e.response?.data;
      toast.error(d ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`).join(' ') : 'Failed to save');
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
    { field: 'category_name', headerName: 'Category', flex: 1, minWidth: 130, cellClass: 'cell-ellipsis' },
    { field: 'price', headerName: 'Price', width: 108, cellClass: 'cell-amount', valueFormatter: p => `৳${Number(p.value).toLocaleString()}` },
    {
      field: 'is_available', headerName: 'Available', width: 96, cellClass: '',
      cellRenderer: (p: ICellRendererParams) => (
        <span className={`${BADGE} ${p.value ? YES_BADGE : NO_BADGE}`}>{p.value ? 'Yes' : 'No'}</span>
      ),
    },
    {
      headerName: 'Actions', width: 96, minWidth: 96, maxWidth: 96,
      pinned: 'right', lockPinned: true, cellRenderer: Actions, sortable: false, filter: false,
      cellClass: 'cell-pin cell-actions', ...pinCol,
    },
  ], [Actions]);

  const gridUrl = tab === 'categories' ? '/admin/menu-categories/' : '/admin/menu-items/';
  const rowLabel = tab === 'categories' ? 'category' : 'menu item';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MdRestaurant className="text-orange-500" /> Restaurant & F&B
          </h1>
          <p className="text-gray-500 text-sm">Menu catalog — posts to guest folio via Service Entry</p>
        </div>
        <button type="button" onClick={loadStats} className="p-2 border border-gray-200 rounded-lg text-gray-500">
          <MdRefresh size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Categories" value={String(categories.length)} />
        <Stat label="Menu Items" value={String(itemCount)} accent="text-teal-700" />
        <Stat label="Available" value={String(availableCount)} accent="text-green-600" />
        <Stat label="Unavailable" value={String(Math.max(0, itemCount - availableCount))} accent="text-red-500" />
      </div>

      {categories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          No categories yet — add a <strong>Category</strong> first, then menu items. Or run: <code className="bg-white px-1 rounded">python manage.py seed_restaurant</code>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 p-0.5 rounded-md border border-gray-100 shrink-0">
            {(['items', 'categories'] as Tab[]).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${tab === t ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800'}`}>
                {t === 'categories' ? `Categories (${categories.length})` : `Menu Items (${itemCount})`}
              </button>
            ))}
          </div>
          <button type="button"
            onClick={() => {
              if (tab === 'items' && categories.length === 0) {
                toast.error('Create a category first');
                setTab('categories');
                return;
              }
              setEditItem(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-md text-xs font-medium hover:bg-teal-600 shrink-0 ml-auto">
            <MdAdd size={16} /> Add {tab === 'categories' ? 'Category' : 'Item'}
          </button>
        </div>
      </div>

      <AdminDataGrid
        url={gridUrl}
        columnDefs={tab === 'categories' ? catCols : itemCols}
        pageSize={20}
        refreshKey={`${tab}-${refreshKey}`}
        rowLabel={rowLabel}
        queryParams={{ page_size: 100 }}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); setEditItem(null); }}>
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">{editItem ? 'Edit' : 'Add'} {tab === 'categories' ? 'Category' : 'Menu Item'}</h2>
            {tab === 'categories' ? (
              <CatForm initial={editItem as Category | null} onSave={handleSave} />
            ) : (
              <ItemForm initial={editItem as MenuItemRow | null} categories={categories} onSave={handleSave} />
            )}
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

function CatForm({ initial, onSave }: { initial: Category | null; onSave: (d: Record<string, unknown>) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [order, setOrder] = useState(initial?.order ?? 0);
  return (
    <div className="space-y-4">
      <FInput label="Name *" value={name} onChange={setName} />
      <FInput label="Display Order" value={order} onChange={v => setOrder(parseInt(v) || 0)} type="number" />
      <button type="button" onClick={() => name && onSave({ name, order })} className="w-full py-2 bg-teal-700 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function ItemForm({ initial, categories, onSave }: { initial: MenuItemRow | null; categories: Category[]; onSave: (d: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    price: initial?.price || '',
    category: initial?.category || categories[0]?.id || '',
    is_available: initial?.is_available ?? true,
  });
  const set = (k: string, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <FInput label="Name *" value={form.name} onChange={v => set('name', v)} />
      <FInput label="Description" value={form.description} onChange={v => set('description', v)} />
      <FInput label="Price (৳) *" value={form.price} onChange={v => set('price', v)} type="number" />
      <div>
        <label className="block text-sm text-gray-600 mb-1">Category *</label>
        <select value={form.category} onChange={e => set('category', Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={form.is_available} onChange={e => set('is_available', e.target.checked)} className="rounded" />
        Available on menu
      </label>
      <button type="button" onClick={() => form.name && form.category && onSave(form)} className="w-full py-2 bg-teal-700 text-white rounded-lg text-sm font-medium">Save</button>
    </div>
  );
}

function FInput({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-teal-600 outline-none" />
    </div>
  );
}
