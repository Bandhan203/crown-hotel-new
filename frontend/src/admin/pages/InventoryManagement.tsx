import { useState } from 'react';
import { MdInventory, MdAdd, MdWarning, MdCheckCircle, MdCancel, MdShoppingCart, MdList, MdAssignment } from 'react-icons/md';
import toast from 'react-hot-toast';

// ─── Types ───
interface InventoryItem { id: string; code: string; name: string; category: 'Food' | 'Beverage' | 'Housekeeping' | 'Engineering' | 'Stationery' | 'Other'; unit: string; currentStock: number; reorderLevel: number; unitPrice: number; }
interface StockTransaction { id: string; itemId: string; date: string; type: 'purchase' | 'requisition' | 'adjustment'; quantity: number; unitPrice?: number; totalAmount?: number; department?: string; requestedBy?: string; approvedBy?: string; status: 'pending' | 'approved' | 'rejected'; notes?: string; timestamp: string; }

const SEED_ITEMS: InventoryItem[] = [
  { id: 'i001', code: 'HK001', name: 'Bed Sheet (Single)', category: 'Housekeeping', unit: 'Piece', currentStock: 45, reorderLevel: 10, unitPrice: 350 },
  { id: 'i002', code: 'HK002', name: 'Towel (Bath)', category: 'Housekeeping', unit: 'Piece', currentStock: 60, reorderLevel: 15, unitPrice: 250 },
  { id: 'i003', code: 'HK003', name: 'Soap (Bar)', category: 'Housekeeping', unit: 'Piece', currentStock: 200, reorderLevel: 50, unitPrice: 35 },
  { id: 'i004', code: 'HK004', name: 'Shampoo (Sachet)', category: 'Housekeeping', unit: 'Piece', currentStock: 4, reorderLevel: 40, unitPrice: 25 },
  { id: 'i005', code: 'FB001', name: 'Rice (kg)', category: 'Food', unit: 'KG', currentStock: 80, reorderLevel: 20, unitPrice: 70 },
  { id: 'i006', code: 'FB002', name: 'Cooking Oil (L)', category: 'Food', unit: 'Litre', currentStock: 30, reorderLevel: 10, unitPrice: 175 },
  { id: 'i007', code: 'BV001', name: 'Mineral Water (500ml)', category: 'Beverage', unit: 'Bottle', currentStock: 300, reorderLevel: 100, unitPrice: 20 },
  { id: 'i008', code: 'BV002', name: 'Tea Bags', category: 'Beverage', unit: 'Box', currentStock: 3, reorderLevel: 5, unitPrice: 120 },
  { id: 'i009', code: 'EN001', name: 'Light Bulb (LED)', category: 'Engineering', unit: 'Piece', currentStock: 40, reorderLevel: 10, unitPrice: 150 },
  { id: 'i010', code: 'ST001', name: 'A4 Paper (Ream)', category: 'Stationery', unit: 'Ream', currentStock: 15, reorderLevel: 5, unitPrice: 450 },
];

function usePMSStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => { try { const item = localStorage.getItem(key); return item ? JSON.parse(item) : initial; } catch { return initial; } });
  const setter = (value: T | ((p: T) => T)) => { try { const v = value instanceof Function ? value(val) : value; setVal(v); localStorage.setItem(key, JSON.stringify(v)); } catch (e) { console.error(e); } };
  return [val, setter];
}
function genId(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; }

const systemDate = new Date().toISOString().split('T')[0];

export default function InventoryManagement() {
  const [items, setItems] = usePMSStorage<InventoryItem[]>('pms_inventory', SEED_ITEMS);
  const [stockTxs, setStockTxs] = usePMSStorage<StockTransaction[]>('pms_stock_txs', []);
  const [tab, setTab] = useState<'items' | 'requisitions' | 'purchase'>('items');
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm] = useState({ itemId: '', quantity: '', department: '', notes: '' });
  const [purchaseForm, setPurchaseForm] = useState({ itemId: '', quantity: '', unitPrice: '', notes: '' });

  const pendingReqs = stockTxs.filter(t => t.type === 'requisition' && t.status === 'pending');
  const lowStock = items.filter(i => i.currentStock <= i.reorderLevel);

  const submitRequisition = () => {
    if (!reqForm.itemId || !reqForm.quantity) { toast.error('Item and quantity required'); return; }
    setStockTxs(p => [...p, {
      id: genId('st'), itemId: reqForm.itemId, date: systemDate, type: 'requisition',
      quantity: Number(reqForm.quantity), department: reqForm.department || 'General',
      requestedBy: 'Front Desk', status: 'pending', notes: reqForm.notes || undefined,
      timestamp: new Date().toISOString(),
    }]);
    setReqForm({ itemId: '', quantity: '', department: '', notes: '' });
    setShowReqForm(false);
    toast.success('Requisition submitted. Awaiting manager approval.');
  };

  const approveReq = (txId: string, approve: boolean) => {
    setStockTxs(prev => prev.map(t => {
      if (t.id !== txId) return t;
      if (approve) {
        setItems(items => items.map(item => item.id === t.itemId ? { ...item, currentStock: item.currentStock - t.quantity } : item));
        return { ...t, status: 'approved', approvedBy: 'Manager' };
      }
      return { ...t, status: 'rejected', approvedBy: 'Manager' };
    }));
    toast.success(approve ? 'Requisition approved' : 'Requisition rejected');
  };

  const submitPurchase = () => {
    if (!purchaseForm.itemId || !purchaseForm.quantity || !purchaseForm.unitPrice) { toast.error('All fields required'); return; }
    const qty = Number(purchaseForm.quantity);
    const price = Number(purchaseForm.unitPrice);
    setStockTxs(p => [...p, {
      id: genId('st'), itemId: purchaseForm.itemId, date: systemDate, type: 'purchase',
      quantity: qty, unitPrice: price, totalAmount: qty * price,
      requestedBy: 'Manager', approvedBy: 'Manager', status: 'approved',
      notes: purchaseForm.notes || undefined, timestamp: new Date().toISOString(),
    }]);
    setItems(prev => prev.map(i => i.id === purchaseForm.itemId ? { ...i, currentStock: i.currentStock + qty, unitPrice: price } : i));
    setPurchaseForm({ itemId: '', quantity: '', unitPrice: '', notes: '' });
    toast.success('Purchase entry complete. Stock updated.');
  };

  const tabs = [
    { key: 'items', label: 'Item List', icon: <MdList size={14} /> },
    { key: 'requisitions', label: `Requisitions (${pendingReqs.length} pending)`, icon: <MdAssignment size={14} /> },
    { key: 'purchase', label: 'Purchase Entry', icon: <MdShoppingCart size={14} /> },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <MdInventory className="text-purple-400" size={24} /> Inventory & Store
        </h1>
        {pendingReqs.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/40 rounded-lg px-3 py-1.5 text-xs text-orange-400 flex items-center gap-2">
            <MdWarning size={14} /> {pendingReqs.length} Pending Requisitions
          </div>
        )}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-xs">
          <span className="text-red-400 font-semibold">Low Stock Alert: </span>
          <span className="text-red-300">{lowStock.map(i => i.name).join(', ')}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${tab === t.key ? 'bg-[#aa8453] text-white' : 'bg-[#1a1a1a] text-gray-400 border border-white/10 hover:border-white/20'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ITEMS TAB */}
      {tab === 'items' && (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[80px_2fr_1fr_1fr_1fr_1fr] px-4 py-2.5 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider gap-3">
            <span>Code</span><span>Item Name</span><span>Category</span><span>Unit</span><span>Stock</span><span>Reorder</span>
          </div>
          {items.map((item, i) => (
            <div key={item.id} className={`grid grid-cols-[80px_2fr_1fr_1fr_1fr_1fr] px-4 py-2.5 border-t border-white/5 gap-3 items-center text-xs ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
              <span className="text-gray-500 font-mono">{item.code}</span>
              <span className="text-white">{item.name}</span>
              <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded w-fit">{item.category}</span>
              <span className="text-gray-400">{item.unit}</span>
              <span className={`font-mono font-bold ${item.currentStock <= item.reorderLevel ? 'text-red-400' : 'text-green-400'}`}>
                {item.currentStock} {item.currentStock <= item.reorderLevel && <span className="text-[9px]">⚠</span>}
              </span>
              <span className="text-gray-500">{item.reorderLevel} {item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* REQUISITIONS TAB */}
      {tab === 'requisitions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowReqForm(true)} className="flex items-center gap-1.5 bg-[#aa8453] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#8c6c44] transition">
              <MdAdd size={14} /> New Requisition
            </button>
          </div>

          {showReqForm && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-3">
              <h4 className="text-blue-300 text-sm font-semibold">New Requisition</h4>
              <div className="flex gap-3">
                <div className="flex-[2]">
                  <label className="text-[11px] text-gray-500 block mb-1">Item</label>
                  <select value={reqForm.itemId} onChange={e => setReqForm(p => ({ ...p, itemId: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                    <option value="">— Select item —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.currentStock} {i.unit})</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-gray-500 block mb-1">Quantity</label>
                  <input type="number" value={reqForm.quantity} onChange={e => setReqForm(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] text-gray-500 block mb-1">Department</label>
                  <input value={reqForm.department} onChange={e => setReqForm(p => ({ ...p, department: e.target.value }))} placeholder="Housekeeping / Restaurant"
                    className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] text-gray-500 block mb-1">Notes</label>
                  <input value={reqForm.notes} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowReqForm(false)} className="flex-1 bg-white/10 text-gray-400 rounded-lg py-2 text-xs hover:bg-white/15 transition">Cancel</button>
                <button onClick={submitRequisition} className="flex-[2] bg-[#aa8453] text-white rounded-lg py-2 text-xs font-bold hover:bg-[#8c6c44] transition">Submit Requisition</button>
              </div>
            </div>
          )}

          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[100px_2fr_1fr_1fr_100px_120px] px-4 py-2.5 bg-white/5 text-[10px] text-gray-500 uppercase tracking-wider gap-3">
              <span>Date</span><span>Item</span><span>Quantity</span><span>Department</span><span>Status</span><span>Action</span>
            </div>
            {stockTxs.filter(t => t.type === 'requisition').slice().reverse().map((tx, i) => {
              const item = items.find(it => it.id === tx.itemId);
              return (
                <div key={tx.id} className={`grid grid-cols-[100px_2fr_1fr_1fr_100px_120px] px-4 py-2.5 border-t border-white/5 gap-3 items-center text-xs ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                  <span className="text-gray-500">{tx.date}</span>
                  <span className="text-white">{item?.name}</span>
                  <span className="text-gray-400 font-mono">{tx.quantity} {item?.unit}</span>
                  <span className="text-gray-500">{tx.department}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded w-fit font-semibold ${tx.status === 'pending' ? 'bg-orange-500/10 text-orange-400' : tx.status === 'approved' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {tx.status === 'pending' ? 'Pending' : tx.status === 'approved' ? 'Approved' : 'Rejected'}
                  </span>
                  {tx.status === 'pending' ? (
                    <div className="flex gap-1">
                      <button onClick={() => approveReq(tx.id, true)} className="bg-green-500/10 text-green-400 border border-green-500/30 rounded px-2 py-1 text-[10px] flex items-center gap-1 hover:bg-green-500/20 transition">
                        <MdCheckCircle size={10} /> Approve
                      </button>
                      <button onClick={() => approveReq(tx.id, false)} className="bg-red-500/10 text-red-400 border border-red-500/30 rounded px-2 py-1 text-[10px] hover:bg-red-500/20 transition">
                        <MdCancel size={10} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-[10px]">{tx.approvedBy || tx.requestedBy}</span>
                  )}
                </div>
              );
            })}
            {stockTxs.filter(t => t.type === 'requisition').length === 0 && (
              <div className="p-6 text-center text-gray-500 text-xs">No requisitions yet</div>
            )}
          </div>
        </div>
      )}

      {/* PURCHASE TAB */}
      {tab === 'purchase' && (
        <div className="space-y-3">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 space-y-3">
            <h4 className="text-blue-300 text-sm font-semibold">Purchase Entry (Stock In)</h4>
            <div className="flex gap-3">
              <div className="flex-[2]">
                <label className="text-[11px] text-gray-500 block mb-1">Item</label>
                <select value={purchaseForm.itemId} onChange={e => setPurchaseForm(p => ({ ...p, itemId: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                  <option value="">— Select item —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-gray-500 block mb-1">Quantity</label>
                <input type="number" value={purchaseForm.quantity} onChange={e => setPurchaseForm(p => ({ ...p, quantity: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-gray-500 block mb-1">Unit Price (৳)</label>
                <input type="number" value={purchaseForm.unitPrice} onChange={e => setPurchaseForm(p => ({ ...p, unitPrice: e.target.value }))}
                  className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              </div>
            </div>
            {purchaseForm.itemId && purchaseForm.quantity && purchaseForm.unitPrice && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-xs text-green-400 font-semibold">
                Total: ৳{(Number(purchaseForm.quantity) * Number(purchaseForm.unitPrice)).toLocaleString()}
              </div>
            )}
            <button onClick={submitPurchase} className="w-full bg-green-500 text-black rounded-lg py-2.5 text-sm font-bold hover:bg-green-400 transition">
              Submit Purchase Entry
            </button>
          </div>

          {/* Purchase history */}
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-white/5 text-[11px] text-gray-500 uppercase tracking-wider">Purchase History</div>
            {stockTxs.filter(t => t.type === 'purchase').slice().reverse().map((tx, i) => {
              const item = items.find(it => it.id === tx.itemId);
              return (
                <div key={tx.id} className={`grid grid-cols-[100px_2fr_1fr_1fr_1fr] px-4 py-2.5 border-t border-white/5 gap-3 text-xs ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                  <span className="text-gray-500">{tx.date}</span>
                  <span className="text-white">{item?.name}</span>
                  <span className="text-gray-400">{tx.quantity} {item?.unit}</span>
                  <span className="text-gray-500">৳{tx.unitPrice?.toLocaleString()}/unit</span>
                  <span className="text-yellow-400 font-mono font-bold">৳{tx.totalAmount?.toLocaleString()}</span>
                </div>
              );
            })}
            {stockTxs.filter(t => t.type === 'purchase').length === 0 && (
              <div className="p-6 text-center text-gray-500 text-xs">No purchase records</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
