import { useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useHotel } from '../../contexts/HotelContext';
import type { InventoryItem, StockTransaction } from '../../data/types';
import { initialInventory } from '../../data/mockData';
import { Package, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function Inventory() {
  const { config, generateId } = useHotel();
  const [items, setItems] = useLocalStorage<InventoryItem[]>('hotel_inventory', initialInventory);
  const [stockTxs, setStockTxs] = useLocalStorage<StockTransaction[]>('hotel_stock_txs', []);
  const [tab, setTab] = useState<'items' | 'requisitions' | 'purchase'>('items');
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm] = useState({ itemId: '', quantity: '', department: '', notes: '' });
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ itemId: '', quantity: '', unitPrice: '', notes: '' });

  const isManager = config.currentRole === 'admin' || config.currentRole === 'manager';
  const pendingReqs = stockTxs.filter(t => t.type === 'requisition' && t.status === 'pending');

  const submitRequisition = () => {
    if (!reqForm.itemId || !reqForm.quantity) { toast.error('আইটেম ও পরিমাণ আবশ্যক'); return; }
    const tx: StockTransaction = {
      id: generateId('st'),
      itemId: reqForm.itemId,
      date: config.systemDate,
      type: 'requisition',
      quantity: Number(reqForm.quantity),
      department: reqForm.department || config.currentUser,
      requestedBy: config.currentUser,
      status: 'pending',
      notes: reqForm.notes || undefined,
      timestamp: new Date().toISOString(),
    };
    setStockTxs(p => [...p, tx]);
    setReqForm({ itemId: '', quantity: '', department: '', notes: '' });
    setShowReqForm(false);
    toast.success('রিকুইজিশন জমা হয়েছে। ম্যানেজার অ্যাপ্রুভ করবেন।');
  };

  const approveReq = (txId: string, approve: boolean) => {
    if (!isManager) { toast.error('শুধুমাত্র ম্যানেজার অ্যাপ্রুভ করতে পারবেন।'); return; }
    setStockTxs(prev => prev.map(t => {
      if (t.id !== txId) return t;
      if (approve) {
        setItems(items => items.map(item => item.id === t.itemId ? { ...item, currentStock: item.currentStock - t.quantity } : item));
        return { ...t, status: 'approved', approvedBy: config.currentUser };
      } else {
        return { ...t, status: 'rejected', approvedBy: config.currentUser };
      }
    }));
    toast.success(approve ? 'রিকুইজিশন অ্যাপ্রুভ হয়েছে।' : 'রিকুইজিশন বাতিল করা হয়েছে।');
  };

  const submitPurchase = () => {
    if (!purchaseForm.itemId || !purchaseForm.quantity || !purchaseForm.unitPrice) { toast.error('সব তথ্য আবশ্যক'); return; }
    const qty = Number(purchaseForm.quantity);
    const price = Number(purchaseForm.unitPrice);
    const tx: StockTransaction = {
      id: generateId('st'),
      itemId: purchaseForm.itemId,
      date: config.systemDate,
      type: 'purchase',
      quantity: qty,
      unitPrice: price,
      totalAmount: qty * price,
      requestedBy: config.currentUser,
      approvedBy: config.currentUser,
      status: 'approved',
      notes: purchaseForm.notes || undefined,
      timestamp: new Date().toISOString(),
    };
    setStockTxs(p => [...p, tx]);
    setItems(prev => prev.map(i => i.id === purchaseForm.itemId ? { ...i, currentStock: i.currentStock + qty, unitPrice: price } : i));
    setPurchaseForm({ itemId: '', quantity: '', unitPrice: '', notes: '' });
    setShowPurchaseForm(false);
    toast.success('পার্চেজ এন্ট্রি সম্পন্ন। স্টক আপডেট হয়েছে।');
  };

  const lowStock = items.filter(i => i.currentStock <= i.reorderLevel);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Package size={18} color="#a78bfa" />
        <h2 style={{ margin: 0, color: '#fff', flex: 1 }}>স্টোর ও ইনভেন্টরি</h2>
        {pendingReqs.length > 0 && (
          <div style={{ background: '#2d1a0a', border: '1px solid #f97316', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: '#f97316', display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertTriangle size={12} /> {pendingReqs.length} পেন্ডিং রিকুইজিশন
          </div>
        )}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background: '#3b1111', border: '1px solid #ef444433', borderRadius: 8, padding: '8px 14px', marginBottom: 14, fontSize: 12 }}>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>কম স্টক সতর্কতা: </span>
          <span style={{ color: '#fca5a5' }}>{lowStock.map(i => i.name).join(', ')}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { key: 'items', label: 'আইটেম তালিকা' },
          { key: 'requisitions', label: `রিকুইজিশন (${pendingReqs.length} পেন্ডিং)` },
          { key: 'purchase', label: 'পার্চেজ এন্ট্রি' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ background: tab === t.key ? '#2563eb' : '#1e293b', color: tab === t.key ? '#fff' : '#94a3b8', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ITEMS TAB */}
      {tab === 'items' && (
        <div style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr', padding: '10px 14px', background: '#111827', fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
            <span>কোড</span><span>আইটেম নাম</span><span>ক্যাটাগরি</span><span>ইউনিট</span><span>স্টক</span><span>রিঅর্ডার</span>
          </div>
          {items.map((item, i) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr', padding: '10px 14px', borderTop: '1px solid #1e293b', gap: 8, alignItems: 'center', fontSize: 12, background: i % 2 === 0 ? 'transparent' : '#0f1623' }}>
              <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{item.code}</span>
              <span style={{ color: '#e2e8f0' }}>{item.name}</span>
              <span style={{ fontSize: 10, background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: 4 }}>{item.category}</span>
              <span style={{ color: '#94a3b8' }}>{item.unit}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: item.currentStock <= item.reorderLevel ? '#ef4444' : '#22c55e' }}>
                {item.currentStock}
                {item.currentStock <= item.reorderLevel && <span style={{ fontSize: 9, color: '#ef4444', marginLeft: 4 }}>⚠</span>}
              </span>
              <span style={{ color: '#64748b' }}>{item.reorderLevel} {item.unit}</span>
            </div>
          ))}
        </div>
      )}

      {/* REQUISITIONS TAB */}
      {tab === 'requisitions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowReqForm(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
              <Plus size={12} /> নতুন রিকুইজিশন
            </button>
          </div>

          {showReqForm && (
            <div style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 8, padding: 16, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ margin: 0, color: '#93c5fd', fontSize: 13 }}>নতুন রিকুইজিশন</h4>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>আইটেম</label>
                  <select value={reqForm.itemId} onChange={e => setReqForm(p => ({ ...p, itemId: e.target.value }))}
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                    <option value="">— আইটেম সিলেক্ট করুন —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} (স্টক: {i.currentStock} {i.unit})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>পরিমাণ</label>
                  <input type="number" value={reqForm.quantity} onChange={e => setReqForm(p => ({ ...p, quantity: e.target.value }))}
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>বিভাগ</label>
                  <input value={reqForm.department} onChange={e => setReqForm(p => ({ ...p, department: e.target.value }))} placeholder="Housekeeping / Restaurant"
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>নোট</label>
                  <input value={reqForm.notes} onChange={e => setReqForm(p => ({ ...p, notes: e.target.value }))}
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowReqForm(false)} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 12 }}>বাতিল</button>
                <button onClick={submitRequisition} style={{ flex: 2, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>রিকুইজিশন জমা দিন</button>
              </div>
            </div>
          )}

          <div style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 1fr 100px 120px', padding: '10px 14px', background: '#111827', fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
              <span>তারিখ</span><span>আইটেম</span><span>পরিমাণ</span><span>বিভাগ</span><span>স্ট্যাটাস</span>{isManager && <span>অ্যাকশন</span>}
            </div>
            {stockTxs.filter(t => t.type === 'requisition').slice().reverse().map((tx, i) => {
              const item = items.find(it => it.id === tx.itemId);
              return (
                <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 1fr 100px 120px', padding: '10px 14px', borderTop: '1px solid #1e293b', gap: 8, alignItems: 'center', fontSize: 12, background: i % 2 === 0 ? 'transparent' : '#0f1623' }}>
                  <span style={{ color: '#64748b' }}>{tx.date}</span>
                  <span style={{ color: '#e2e8f0' }}>{item?.name}</span>
                  <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{tx.quantity} {item?.unit}</span>
                  <span style={{ color: '#64748b' }}>{tx.department}</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: tx.status === 'pending' ? '#2d1a0a' : tx.status === 'approved' ? '#0f2d1a' : '#3b1111', color: tx.status === 'pending' ? '#f97316' : tx.status === 'approved' ? '#22c55e' : '#ef4444' }}>
                    {tx.status === 'pending' ? 'পেন্ডিং' : tx.status === 'approved' ? 'অ্যাপ্রুভড' : 'বাতিল'}
                  </span>
                  {isManager && tx.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => approveReq(tx.id, true)} style={{ background: '#0f2d1a', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', gap: 3, alignItems: 'center' }}>
                        <CheckCircle size={10} /> অ্যাপ্রুভ
                      </button>
                      <button onClick={() => approveReq(tx.id, false)} style={{ background: '#3b1111', color: '#ef4444', border: '1px solid #ef444433', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', gap: 3, alignItems: 'center' }}>
                        <XCircle size={10} />
                      </button>
                    </div>
                  )}
                  {(!isManager || tx.status !== 'pending') && <span style={{ color: '#475569', fontSize: 10 }}>{tx.approvedBy || tx.requestedBy}</span>}
                </div>
              );
            })}
            {stockTxs.filter(t => t.type === 'requisition').length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>কোনো রিকুইজিশন নেই</div>
            )}
          </div>
        </div>
      )}

      {/* PURCHASE TAB */}
      {tab === 'purchase' && (
        <div>
          {!isManager && (
            <div style={{ background: '#3b1111', border: '1px solid #ef444433', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 12, color: '#fca5a5', display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertTriangle size={14} /> পার্চেজ এন্ট্রি শুধুমাত্র ম্যানেজার/অ্যাডমিন করতে পারবেন।
            </div>
          )}
          {isManager && (
            <div style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 8, padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h4 style={{ margin: 0, color: '#93c5fd', fontSize: 13 }}>পার্চেজ এন্ট্রি (স্টক ইন)</h4>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 2 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>আইটেম</label>
                  <select value={purchaseForm.itemId} onChange={e => setPurchaseForm(p => ({ ...p, itemId: e.target.value }))}
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13 }}>
                    <option value="">— আইটেম সিলেক্ট করুন —</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>পরিমাণ</label>
                  <input type="number" value={purchaseForm.quantity} onChange={e => setPurchaseForm(p => ({ ...p, quantity: e.target.value }))}
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>ইউনিট মূল্য (৳)</label>
                  <input type="number" value={purchaseForm.unitPrice} onChange={e => setPurchaseForm(p => ({ ...p, unitPrice: e.target.value }))}
                    style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              </div>
              {purchaseForm.itemId && purchaseForm.quantity && purchaseForm.unitPrice && (
                <div style={{ background: '#0f2d1a', border: '1px solid #22c55e33', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#22c55e' }}>
                  মোট: ৳{(Number(purchaseForm.quantity) * Number(purchaseForm.unitPrice)).toLocaleString()}
                </div>
              )}
              <button onClick={submitPurchase} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 6, padding: '9px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                পার্চেজ এন্ট্রি দিন
              </button>
            </div>
          )}
          {/* Purchase history */}
          <div style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
            {stockTxs.filter(t => t.type === 'purchase').slice().reverse().map((tx, i) => {
              const item = items.find(it => it.id === tx.itemId);
              return (
                <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '100px 2fr 1fr 1fr 1fr', padding: '10px 14px', borderTop: '1px solid #1e293b', gap: 8, fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{tx.date}</span>
                  <span style={{ color: '#e2e8f0' }}>{item?.name}</span>
                  <span style={{ color: '#94a3b8' }}>{tx.quantity} {item?.unit}</span>
                  <span style={{ color: '#64748b' }}>৳{tx.unitPrice?.toLocaleString()}/unit</span>
                  <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>৳{tx.totalAmount?.toLocaleString()}</span>
                </div>
              );
            })}
            {stockTxs.filter(t => t.type === 'purchase').length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>কোনো পার্চেজ রেকর্ড নেই</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
