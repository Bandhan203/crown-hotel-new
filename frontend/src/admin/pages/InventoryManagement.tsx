import { useCallback, useEffect, useState } from 'react';
import {
  MdInventory, MdAdd, MdWarning, MdCheckCircle, MdCancel, MdShoppingCart,
  MdList, MdAssignment, MdRefresh, MdEdit,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Category { id: number; name: string; }
interface Item {
  id: number; code: string; name: string; category: number; category_name: string;
  unit: string; unit_price: string; current_stock: string; min_stock_level: string; low_stock: boolean;
}
interface ReqLine { item: number; item_name: string; item_unit: string; quantity: string; }
interface Requisition {
  id: number; department: string; status: string; notes: string; created_at: string;
  requested_by_name: string; approved_by_name: string | null; items: ReqLine[];
}
interface StockTx {
  id: number; item_name: string; transaction_type: string; quantity: string;
  reference: string; created_at: string; created_by_name: string | null;
}

const EMPTY_ITEM = { code: '', name: '', category: '', unit: 'Piece', unit_price: '', current_stock: '0', min_stock_level: '0' };

export default function InventoryManagement() {
  const [tab, setTab] = useState<'items' | 'requisitions' | 'purchase'>('items');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [purchases, setPurchases] = useState<StockTx[]>([]);
  const [itemTotalCount, setItemTotalCount] = useState(0);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);

  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm] = useState({ itemId: '', quantity: '', department: '', notes: '' });
  const [purchaseForm, setPurchaseForm] = useState({ itemId: '', quantity: '', unitPrice: '', reference: '' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catRes, reqRes, txRes] = await Promise.all([
        api.get('/inventory/items/', { params: { page_size: 100 } }),
        api.get('/inventory/categories/', { params: { page_size: 100 } }),
        api.get('/inventory/requisitions/', { params: { page_size: 100 } }),
        api.get('/inventory/transactions/', { params: { type: 'IN', page_size: 100 } }),
      ]);
      const itemList = itemsRes.data.results ?? itemsRes.data;
      setItems(itemList);
      setItemTotalCount(typeof itemsRes.data.count === 'number' ? itemsRes.data.count : itemList.length);
      setCategories(catRes.data.results ?? catRes.data);
      setRequisitions(reqRes.data.results ?? reqRes.data);
      setPurchases(txRes.data.results ?? txRes.data);
    } catch {
      toast.error('Failed to load inventory data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const pendingReqs = requisitions.filter(r => r.status === 'PENDING');
  const lowStock = items.filter(i => i.low_stock);
  const totalStockValue = items.reduce((sum, i) => sum + Number(i.current_stock) * Number(i.unit_price || 0), 0);

  const saveItem = async () => {
    if (!itemForm.name || !itemForm.category) { toast.error('Name and category required'); return; }
    const payload = {
      code: itemForm.code,
      name: itemForm.name,
      category: Number(itemForm.category),
      unit: itemForm.unit,
      unit_price: itemForm.unit_price || 0,
      current_stock: itemForm.current_stock || 0,
      min_stock_level: itemForm.min_stock_level || 0,
    };
    try {
      if (editItem) {
        await api.patch(`/inventory/items/${editItem.id}/`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/inventory/items/', payload);
        toast.success('Item created');
      }
      setShowItemForm(false); setEditItem(null); setItemForm(EMPTY_ITEM);
      loadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Save failed');
    }
  };

  const submitRequisition = async () => {
    if (!reqForm.itemId || !reqForm.quantity) { toast.error('Item and quantity required'); return; }
    try {
      await api.post('/inventory/requisitions/', {
        department: reqForm.department || 'General',
        notes: reqForm.notes,
        items: [{ item: Number(reqForm.itemId), quantity: reqForm.quantity }],
      });
      toast.success('Requisition submitted');
      setReqForm({ itemId: '', quantity: '', department: '', notes: '' });
      setShowReqForm(false);
      loadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Requisition failed');
    }
  };

  const approveReq = async (id: number, approve: boolean) => {
    try {
      await api.post(`/inventory/requisitions/${id}/${approve ? 'approve' : 'reject'}/`);
      toast.success(approve ? 'Approved — stock deducted' : 'Requisition rejected');
      loadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; shortages?: unknown } } };
      toast.error(err.response?.data?.detail || 'Action failed');
    }
  };

  const submitPurchase = async () => {
    if (!purchaseForm.itemId || !purchaseForm.quantity) { toast.error('Item and quantity required'); return; }
    try {
      await api.post('/inventory/stock-in/', {
        item: Number(purchaseForm.itemId),
        quantity: purchaseForm.quantity,
        reference: purchaseForm.reference || 'Purchase entry',
        unit_price: purchaseForm.unitPrice || undefined,
      });
      toast.success('Stock updated');
      setPurchaseForm({ itemId: '', quantity: '', unitPrice: '', reference: '' });
      loadAll();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || 'Purchase entry failed');
    }
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setItemForm({
      code: item.code, name: item.name, category: String(item.category), unit: item.unit,
      unit_price: item.unit_price, current_stock: item.current_stock, min_stock_level: item.min_stock_level,
    });
    setShowItemForm(true);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <MdInventory className="text-purple-500" size={24} /> Inventory & Store
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg">
            {itemTotalCount} item{itemTotalCount !== 1 ? 's' : ''} total
          </span>
          <button type="button" onClick={loadAll} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:text-slate-800">
            <MdRefresh size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill label="Total Items" value={String(itemTotalCount)} accent="text-teal-700" />
        <StatPill label="Categories" value={String(categories.length)} />
        <StatPill label="Low Stock" value={String(lowStock.length)} accent={lowStock.length > 0 ? 'text-red-600' : 'text-green-600'} />
        <StatPill label="Stock Value" value={`৳${Math.round(totalStockValue).toLocaleString()}`} />
      </div>

      {pendingReqs.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700 flex items-center gap-2">
          <MdWarning size={14} /> {pendingReqs.length} pending requisition(s)
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-xs">
          <span className="text-red-600 font-semibold">Low Stock: </span>
          <span className="text-red-700">{lowStock.map(i => i.name).join(', ')}</span>
        </div>
      )}

      <div className="flex gap-2">
        {[
          { key: 'items', label: `Item List (${itemTotalCount})`, icon: <MdList size={14} /> },
          { key: 'requisitions', label: `Requisitions (${pendingReqs.length})`, icon: <MdAssignment size={14} /> },
          { key: 'purchase', label: `Purchase Entry (${purchases.length})`, icon: <MdShoppingCart size={14} /> },
        ].map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium ${tab === t.key ? 'bg-teal-700 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing <strong className="text-slate-800">{items.length}</strong> of <strong className="text-slate-800">{itemTotalCount}</strong> items
            </p>
            <button type="button" onClick={() => { setEditItem(null); setItemForm(EMPTY_ITEM); setShowItemForm(true); }}
              className="flex items-center gap-1.5 bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <MdAdd size={14} /> Add Item
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                  <th className="py-2 px-3 text-left">Code</th><th className="text-left">Name</th><th className="text-left">Category</th>
                  <th className="text-left">Unit</th><th className="text-right">Stock</th><th className="text-right">Reorder</th><th className="text-right">Price</th><th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">{item.code || '—'}</td>
                    <td className="text-slate-800">{item.name}</td>
                    <td className="text-gray-500 text-xs">{item.category_name}</td>
                    <td className="text-gray-500">{item.unit}</td>
                    <td className={`text-right font-mono font-bold ${item.low_stock ? 'text-red-500' : 'text-green-600'}`}>{item.current_stock}</td>
                    <td className="text-right text-gray-500">{item.min_stock_level}</td>
                    <td className="text-right text-slate-800">৳{Number(item.unit_price).toLocaleString()}</td>
                    <td className="text-center">
                      <button type="button" onClick={() => openEdit(item)} className="text-teal-700 text-xs inline-flex items-center gap-0.5"><MdEdit size={12} /> Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <p className="p-6 text-center text-gray-500 text-sm">No items — run <code className="bg-gray-100 px-1 rounded">seed_inventory</code> or add manually.</p>}
          </div>
        </div>
      )}

      {tab === 'requisitions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowReqForm(true)} className="flex items-center gap-1.5 bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
              <MdAdd size={14} /> New Requisition
            </button>
          </div>
          {showReqForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex gap-3">
                <select value={reqForm.itemId} onChange={e => setReqForm(p => ({ ...p, itemId: e.target.value }))}
                  className="flex-[2] border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— Select item —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} (stock: {i.current_stock})</option>)}
                </select>
                <input type="number" placeholder="Qty" value={reqForm.quantity} onChange={e => setReqForm(p => ({ ...p, quantity: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-3">
                <input placeholder="Department" value={reqForm.department} onChange={e => setReqForm(p => ({ ...p, department: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Notes" value={reqForm.notes} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowReqForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-xs">Cancel</button>
                <button type="button" onClick={submitRequisition} className="flex-[2] bg-teal-700 text-white rounded-lg py-2 text-xs font-bold">Submit</button>
              </div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase">
                  <th className="py-2 px-3 text-left">Date</th><th className="text-left">Department</th><th className="text-left">Items</th>
                  <th className="text-left">By</th><th className="text-center">Status</th><th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map(req => (
                  <tr key={req.id} className="border-t border-gray-100">
                    <td className="py-2 px-3 text-gray-500 text-xs">{req.created_at.slice(0, 10)}</td>
                    <td>{req.department}</td>
                    <td className="text-xs text-gray-600">{req.items.map(li => `${li.item_name} ×${li.quantity}`).join(', ')}</td>
                    <td className="text-xs text-gray-500">{req.requested_by_name}</td>
                    <td className="text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        req.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{req.status}</span>
                    </td>
                    <td className="text-center">
                      {req.status === 'PENDING' ? (
                        <div className="flex justify-center gap-1">
                          <button type="button" onClick={() => approveReq(req.id, true)} className="text-green-700 text-[10px] flex items-center gap-0.5"><MdCheckCircle size={12} /> Approve</button>
                          <button type="button" onClick={() => approveReq(req.id, false)} className="text-red-600 text-[10px]"><MdCancel size={12} /></button>
                        </div>
                      ) : <span className="text-gray-400 text-[10px]">{req.approved_by_name || '—'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'purchase' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold text-slate-800">Purchase Entry (Stock In)</h4>
            <div className="flex gap-3 flex-wrap">
              <select value={purchaseForm.itemId} onChange={e => setPurchaseForm(p => ({ ...p, itemId: e.target.value }))}
                className="flex-[2] min-w-[200px] border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">— Item —</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <input type="number" placeholder="Quantity" value={purchaseForm.quantity} onChange={e => setPurchaseForm(p => ({ ...p, quantity: e.target.value }))}
                className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input type="number" placeholder="Unit price ৳" value={purchaseForm.unitPrice} onChange={e => setPurchaseForm(p => ({ ...p, unitPrice: e.target.value }))}
                className="flex-1 min-w-[100px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Reference / Invoice #" value={purchaseForm.reference} onChange={e => setPurchaseForm(p => ({ ...p, reference: e.target.value }))}
                className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={submitPurchase} className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-bold">Submit Purchase</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-[10px] text-gray-500 uppercase"><th className="py-2 px-3 text-left">Date</th><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-left">Reference</th><th className="text-left">By</th></tr></thead>
              <tbody>
                {purchases.map(tx => (
                  <tr key={tx.id} className="border-t border-gray-100">
                    <td className="py-2 px-3 text-xs text-gray-500">{tx.created_at.slice(0, 10)}</td>
                    <td>{tx.item_name}</td>
                    <td className="text-right font-mono">{tx.quantity}</td>
                    <td className="text-gray-500 text-xs">{tx.reference || '—'}</td>
                    <td className="text-gray-500 text-xs">{tx.created_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showItemForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 space-y-3">
            <h3 className="font-bold text-lg">{editItem ? 'Edit Item' : 'Add Item'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Code" value={itemForm.code} onChange={v => setItemForm(p => ({ ...p, code: v }))} />
              <Field label="Name *" value={itemForm.name} onChange={v => setItemForm(p => ({ ...p, name: v }))} />
              <div className="col-span-2">
                <label className="text-[11px] text-gray-500">Category *</label>
                <select value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Field label="Unit" value={itemForm.unit} onChange={v => setItemForm(p => ({ ...p, unit: v }))} />
              <Field label="Unit Price" value={itemForm.unit_price} onChange={v => setItemForm(p => ({ ...p, unit_price: v }))} type="number" />
              <Field label="Current Stock" value={itemForm.current_stock} onChange={v => setItemForm(p => ({ ...p, current_stock: v }))} type="number" />
              <Field label="Min Stock Level" value={itemForm.min_stock_level} onChange={v => setItemForm(p => ({ ...p, min_stock_level: v }))} type="number" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowItemForm(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
              <button type="button" onClick={saveItem} className="flex-[2] bg-teal-700 text-white rounded-lg py-2 text-sm font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-[11px] text-gray-500">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${accent || 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
