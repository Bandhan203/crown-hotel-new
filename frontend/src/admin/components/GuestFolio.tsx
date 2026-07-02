import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdAdd, MdBlock, MdReceipt, MdFolderShared, MdTransform, MdClose } from 'react-icons/md';
import api from '../../services/api';

interface FolioCharge {
  id: number;
  type: string;
  desc: string;
  amount: number;
  qty: number;
  total: number;
  date: string;
  is_adjustment: boolean;
}

interface FolioWindow {
  window_number: number;
  label: string;
  charges: FolioCharge[];
}

interface Props {
  bookingId: number;
  bookingRef: string;
  onClose: () => void;
  onFolioChanged?: () => void;
}

const chargeTypeLabels: Record<string, string> = {
  ROOM: 'Room', FOOD: 'Food & Bev', BEVERAGE: 'Beverage',
  PHONE: 'Phone', LAUNDRY: 'Laundry', MINIBAR: 'Minibar',
  SPA: 'Spa', SERVICE: 'Service', TAX: 'Tax',
  DISCOUNT: 'Discount', DEPOSIT: 'Deposit', REFUND: 'Refund',
};

const reasonCodes = ['BILLING_ERROR', 'COMP', 'GOODWILL', 'MANAGER_APPROVAL', 'DUPLICATE', 'RATE_CORRECTION', 'OTHER'];

export default function GuestFolio({ bookingId, bookingRef, onClose, onFolioChanged }: Props) {
  const [windows, setWindows] = useState<FolioWindow[]>([]);
  const [activeWindow, setActiveWindow] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // Forms
  const [showPostForm, setShowPostForm] = useState(false);
  const [postForm, setPostForm] = useState({ charge_type: 'SERVICE', description: '', amount: '', quantity: '1', charge_date: new Date().toISOString().split('T')[0] });
  
  // Adjustment Modal
  const [adjustCharge, setAdjustCharge] = useState<FolioCharge | null>(null);
  const [adjustForm, setAdjustForm] = useState({ reason_code: 'BILLING_ERROR', reason_note: '' });

  // Transfer Modal
  const [transferCharge, setTransferCharge] = useState<FolioCharge | null>(null);
  const [transferTarget, setTransferTarget] = useState<number>(1);

  const fetchFolio = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/bookings/${bookingId}/folio-windows/`);
      setWindows(res.data);
      if (res.data.length > 0 && !res.data.find((w: FolioWindow) => w.window_number === activeWindow)) {
        setActiveWindow(res.data[0].window_number);
      }
    } catch {
      toast.error('Failed to load folio windows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFolio(); }, [bookingId]);

  const handleAddWindow = async () => {
    if (windows.length >= 8) return toast.error('Maximum 8 folio windows allowed');
    try {
      await api.post(`/admin/bookings/${bookingId}/folio-windows/`, { label: `Window ${windows.length + 1}` });
      toast.success('Window added');
      await fetchFolio();
      onFolioChanged?.();
    } catch { toast.error('Failed to add window'); }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/admin/bookings/${bookingId}/folio/`, {
        ...postForm,
        amount: parseFloat(postForm.amount),
        quantity: Number(postForm.quantity),
        folio_window: activeWindow
      });
      toast.success('Charge posted to active window');
      setShowPostForm(false);
      setPostForm({ charge_type: 'SERVICE', description: '', amount: '', quantity: '1', charge_date: new Date().toISOString().split('T')[0] });
      await fetchFolio();
      onFolioChanged?.();
    } catch { toast.error('Failed to post charge'); }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustCharge) return;
    try {
      await api.post(`/admin/folio/${adjustCharge.id}/adjust/`, adjustForm);
      toast.success('Adjustment securely recorded');
      setAdjustCharge(null);
      await fetchFolio();
      onFolioChanged?.();
    } catch { toast.error('Failed to adjust charge'); }
  };

  const openTransfer = (charge: FolioCharge) => {
    const target = windows.find(w => w.window_number !== activeWindow);
    setTransferTarget(target?.window_number ?? (activeWindow === 1 ? 2 : 1));
    setTransferCharge(charge);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferCharge) return;
    const destination = transferTarget;
    try {
      await api.post(`/admin/bookings/${bookingId}/folio-transfer/`, {
        charge_id: transferCharge.id,
        target_window: destination,
      });
      toast.success(`Moved to ${windows.find(w => w.window_number === destination)?.label ?? `Window ${destination}`}`);
      setTransferCharge(null);
      setActiveWindow(destination);
      await fetchFolio();
      onFolioChanged?.();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to transfer charge');
    }
  };

  const activeWindowData = windows.find(w => w.window_number === activeWindow);
  const activeTotal = activeWindowData?.charges.reduce((acc, c) => acc + c.total, 0) || 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-50 border border-gray-200 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700">
              <MdFolderShared size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">Multi-Folio Billing</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{bookingRef}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
            <MdClose size={20} />
          </button>
        </div>

        {/* Windows Tabs */}
        <div className="px-5 py-3 border-b border-gray-200 flex gap-2 overflow-x-auto scrollbar-hide bg-slate-50 shrink-0">
          {windows.map(w => (
            <button
              key={w.window_number}
              type="button"
              onClick={() => setActiveWindow(w.window_number)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeWindow === w.window_number
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-teal-50 border border-gray-200'
              }`}
            >
              <span>{w.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeWindow === w.window_number ? 'bg-white/20 text-white' : 'bg-gray-100 text-slate-500'
              }`}>
                {w.charges.length}
              </span>
            </button>
          ))}
          {windows.length < 8 && (
            <button type="button" onClick={handleAddWindow} className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center gap-1 shrink-0">
              <MdAdd size={14} /> Add Window
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 relative">
          {loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-4">
              
              <div className="flex justify-between items-end mb-4">
                <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Window Balance</p>
                  <p className="text-2xl font-bold font-mono text-teal-700">BDT {activeTotal.toLocaleString()}</p>
                </div>
                <button type="button" onClick={() => setShowPostForm(!showPostForm)} className="h-10 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                  <MdAdd size={16} /> Post Charge
                </button>
              </div>

              {showPostForm && (
                <form onSubmit={handlePost} className="bg-slate-50 border border-teal-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] text-gray-500 uppercase mb-1">Type</label>
                    <select value={postForm.charge_type} onChange={e => setPostForm(f => ({...f, charge_type: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-xs focus:border-teal-600 outline-none">
                      {Object.entries(chargeTypeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-[10px] text-gray-500 uppercase mb-1">Description</label>
                    <input required value={postForm.description} onChange={e => setPostForm(f => ({...f, description: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-xs focus:border-teal-600 outline-none" />
                  </div>
                  <div className="sm:col-span-1 lg:col-span-1">
                    <label className="block text-[10px] text-gray-500 uppercase mb-1">Amount</label>
                    <input required type="number" step="0.01" value={postForm.amount} onChange={e => setPostForm(f => ({...f, amount: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-xs focus:border-teal-600 outline-none" />
                  </div>
                  <div className="sm:col-span-1 lg:col-span-1">
                    <button type="submit" className="w-full bg-teal-700 hover:bg-teal-600 text-white rounded-lg py-2 text-xs font-bold transition-colors">Post</button>
                  </div>
                </form>
              )}

              {/* Charges Table */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead className="bg-slate-100 border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-600">Date</th>
                      <th className="py-3 px-4 font-semibold text-slate-600">Type</th>
                      <th className="py-3 px-4 font-semibold text-slate-600">Description</th>
                      <th className="py-3 px-4 font-semibold text-slate-600 text-right">Total</th>
                      <th className="py-3 px-4 font-semibold text-slate-600 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeWindowData?.charges.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-500">No charges in this window.</td></tr>
                    )}
                    {activeWindowData?.charges.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 text-slate-600 font-mono">{c.date}</td>
                        <td className="py-2.5 px-4 text-teal-700 font-medium">{chargeTypeLabels[c.type] || c.type}</td>
                        <td className="py-2.5 px-4 text-slate-800">
                          {c.desc}
                          {c.is_adjustment && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase">Adjustment</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {c.total > 0 ? '' : '-'}{Math.abs(c.total).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                            <button type="button" onClick={() => openTransfer(c)} className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded transition-colors" title="Transfer">
                              <MdTransform size={14} />
                            </button>
                            <button onClick={() => setAdjustCharge(c)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Adjust/Void">
                              <MdBlock size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustCharge && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <form onSubmit={handleAdjust} className="bg-white border border-red-200 p-5 rounded-xl w-full max-w-[400px] mx-4 shadow-xl">
            <h3 className="text-red-600 font-bold mb-1 flex items-center gap-2"><MdBlock /> Revenue Guard: Void/Adjust</h3>
            <p className="text-xs text-slate-600 mb-4">Adjusting: <strong className="text-slate-900">{adjustCharge.desc}</strong> (BDT {adjustCharge.total})</p>
            
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Reason Code *</label>
            <select required value={adjustForm.reason_code} onChange={e => setAdjustForm(f => ({...f, reason_code: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-xs mb-3 outline-none">
              {reasonCodes.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>

            <label className="block text-[10px] text-gray-500 uppercase mb-1">Manager Note *</label>
            <textarea required value={adjustForm.reason_note} onChange={e => setAdjustForm(f => ({...f, reason_note: e.target.value}))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-xs h-20 outline-none mb-4" placeholder="Mandatory audit trail reason..." />

            <div className="flex gap-2">
              <button type="button" onClick={() => setAdjustCharge(null)} className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-600 text-xs hover:bg-white/10">Cancel</button>
              <button type="submit" className="flex-1 py-2 rounded-lg bg-red-500 text-slate-800 font-bold text-xs hover:bg-red-600">Confirm Adjustment</button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer Modal */}
      {transferCharge && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
          <form onSubmit={handleTransfer} className="bg-white border border-blue-200 p-5 rounded-xl w-full max-w-[350px] mx-4 shadow-xl">
            <h3 className="text-blue-700 font-bold mb-1 flex items-center gap-2"><MdTransform /> Transfer Charge</h3>
            <p className="text-xs text-slate-600 mb-4">Transfer <strong className="text-slate-900">{transferCharge.desc}</strong> to:</p>
            
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Target Window</label>
            <select
              value={transferTarget}
              onChange={e => setTransferTarget(Number(e.target.value))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-xs mb-4 outline-none"
            >
              {windows.filter(w => w.window_number !== activeWindow).map(w => (
                <option key={w.window_number} value={w.window_number}>
                  {w.label} (Window {w.window_number})
                </option>
              ))}
            </select>
            {windows.filter(w => w.window_number !== activeWindow).length === 0 && (
              <p className="text-xs text-amber-600 mb-3">Add another folio window before transferring.</p>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setTransferCharge(null)} className="flex-1 py-2 rounded-lg bg-gray-50 text-gray-600 text-xs hover:bg-white/10">Cancel</button>
              <button type="submit" disabled={windows.filter(w => w.window_number !== activeWindow).length === 0}
                className="flex-1 py-2 rounded-lg bg-blue-500 text-slate-800 font-bold text-xs hover:bg-blue-600 disabled:opacity-40">
                Transfer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
