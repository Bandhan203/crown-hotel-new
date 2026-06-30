import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdClose, MdLogout, MdPreview, MdPayment, MdTransform, MdBlock,
  MdCleaningServices, MdReceipt, MdLock,
} from 'react-icons/md';
import api from '../../services/api';
import { useEnterNav } from '../../hooks/useEnterNav';

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

interface FolioBalance {
  folio_total: number;
  payments_total: number;
  payments_received?: number;
  payments_refunded?: number;
  balance: number;
  is_settled: boolean;
  settlement_direction?: 'payment_due' | 'refund_due' | 'settled';
  windows: { window_number: number; total: number }[];
  charges_by_type: Record<string, number>;
}

interface CheckoutContext {
  business_date: string;
  room: { id: number; room_number: string; status: string; housekeeping_status: string };
  booking: {
    id: number;
    booking_ref: string;
    guest_name: string;
    room_number: string | null;
    check_in_date: string;
    check_out_date: string;
    actual_check_in?: string | null;
    company_name?: string;
    room_type_detail?: { name: string };
  };
  registration_ref: string | null;
  folio: FolioBalance;
}

const chargeTypeLabels: Record<string, string> = {
  ROOM: 'Room Rent', FOOD: 'F&B', BEVERAGE: 'Beverage', SERVICE: 'Services',
  TAX: 'VAT', SPA: 'Spa', LAUNDRY: 'Laundry', MINIBAR: 'Minibar', PHONE: 'Phone',
  DISCOUNT: 'Discount', DEPOSIT: 'Deposit', REFUND: 'Refund',
};

const reasonCodes = ['BILLING_ERROR', 'COMP', 'GOODWILL', 'MANAGER_APPROVAL', 'DUPLICATE', 'RATE_CORRECTION', 'OTHER'];

interface Props {
  initialRoomNumber?: string;
  initialBookingId?: number;
  onClose?: () => void;
  onSuccess?: () => void;
  embedded?: boolean;
}

export default function CheckoutModule({
  initialRoomNumber = '',
  initialBookingId,
  onClose,
  onSuccess,
  embedded = false,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  useEnterNav(formRef);

  const [roomInput, setRoomInput] = useState(initialRoomNumber);
  const [ctx, setCtx] = useState<CheckoutContext | null>(null);
  const [windows, setWindows] = useState<FolioWindow[]>([]);
  const [activeWindow, setActiveWindow] = useState(1);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'CASH',
    pos_reference: '',
    company_name: '',
  });
  const [confirmPaymentStyle, setConfirmPaymentStyle] = useState(false);
  const [confirmSavePayment, setConfirmSavePayment] = useState(false);
  const [checkoutAuth, setCheckoutAuth] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState(false);

  const [transferCharge, setTransferCharge] = useState<FolioCharge | null>(null);
  const [transferTarget, setTransferTarget] = useState(1);
  const [adjustCharge, setAdjustCharge] = useState<FolioCharge | null>(null);
  const [adjustForm, setAdjustForm] = useState({ reason_code: 'BILLING_ERROR', reason_note: '' });

  const [dupRef, setDupRef] = useState('');

  const fetchFolioWindows = useCallback(async (bookingId: number, focusWindow?: number) => {
    const res = await api.get(`/admin/bookings/${bookingId}/folio-windows/`);
    setWindows(res.data);
    if (res.data.length > 0) {
      const next = focusWindow && res.data.some((w: FolioWindow) => w.window_number === focusWindow)
        ? focusWindow
        : res.data[0].window_number;
      setActiveWindow(next);
    }
  }, []);

  const refreshContext = useCallback(async (roomNumber: string) => {
    setLookupLoading(true);
    try {
      const res = await api.get('/admin/checkout/lookup/', { params: { room_number: roomNumber } });
      setCtx(res.data);
      await fetchFolioWindows(res.data.booking.id);
      const bal = res.data.folio.balance as number;
      if (bal > 0.01) {
        setPaymentForm(p => ({ ...p, amount: bal.toFixed(2), payment_method: 'CASH' }));
      } else if (bal < -0.01) {
        setPaymentForm(p => ({ ...p, amount: Math.abs(bal).toFixed(2), payment_method: 'CASH', company_name: '' }));
      }
      setCheckoutDone(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Room lookup failed');
      setCtx(null);
    } finally {
      setLookupLoading(false);
    }
  }, [fetchFolioWindows]);

  useEffect(() => {
    api.get('/admin/checkout/companies/').then(r => setCompanies(r.data.companies || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialBookingId && !ctx) {
      api.get(`/admin/bookings/${initialBookingId}/`)
        .then(b => {
          const rn = b.data.room_number;
          if (rn) {
            setRoomInput(rn);
            refreshContext(rn);
          }
        })
        .catch(() => {});
    } else if (initialRoomNumber && !ctx) {
      refreshContext(initialRoomNumber);
    }
  }, [initialBookingId, initialRoomNumber, ctx, refreshContext]);

  const handleRoomLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim()) return;
    refreshContext(roomInput.trim());
  };

  const openInvoicePreview = () => {
    if (!ctx) return;
    api.get(`/admin/checkout/${ctx.booking.id}/invoice-preview/`, { responseType: 'blob' })
      .then(res => {
        const url = URL.createObjectURL(res.data);
        window.open(url, '_blank');
      })
      .catch(() => toast.error('Invoice preview failed'));
  };

  const requestPaymentSave = () => {
    const amt = parseFloat(paymentForm.amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (paymentForm.payment_method === 'CARD' && !paymentForm.pos_reference.trim()) {
      toast.error('POS reference is required for card payments');
      return;
    }
    if (paymentForm.payment_method === 'COMPANY_CREDIT' && !paymentForm.company_name) {
      toast.error('Select an authorized company');
      return;
    }
    setConfirmPaymentStyle(true);
  };

  const savePayment = async () => {
    if (!ctx) return;
    setConfirmSavePayment(false);
    setLoading(true);
    try {
      const res = await api.post(`/admin/checkout/${ctx.booking.id}/payment/`, {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        pos_reference: paymentForm.pos_reference,
        company_name: paymentForm.company_name,
      });
      setCtx(c => c ? { ...c, folio: res.data.folio } : c);
      toast.success(res.data.type === 'refund' ? 'Refund posted — folio updated' : 'Payment saved — ledger updated');
      await fetchFolioWindows(ctx.booking.id);
      if (res.data.folio.is_settled) {
        setPaymentForm(p => ({ ...p, amount: '0' }));
      }
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string } } })?.response;
      toast.error(res?.data?.detail || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const executeCheckout = async () => {
    if (!ctx) return;
    setConfirmCheckout(false);
    setLoading(true);
    try {
      const fresh = await api.get('/admin/checkout/lookup/', {
        params: { room_number: ctx.room.room_number },
      });
      setCtx(fresh.data);
      if (!fresh.data.folio.is_settled) {
        toast.error(
          fresh.data.folio.settlement_direction === 'refund_due'
            ? `Refund BDT ${Math.abs(fresh.data.folio.balance).toFixed(2)} required before checkout`
            : `Payment BDT ${fresh.data.folio.balance.toFixed(2)} required before checkout`,
        );
        return;
      }

      const auth = checkoutAuth.trim();
      const normPhrase = auth.toUpperCase().replace(/[\s_-]/g, '');
      const isPhrase = normPhrase === 'CHECKOUT';
      const payload: Record<string, string> = {
        checkout_phrase: isPhrase ? 'CHECKOUT' : '',
      };
      if (!isPhrase) {
        payload.password = auth;
        payload.authorization = auth;
      } else if (auth) {
        payload.authorization = auth;
      }
      if (checkoutNotes.trim()) {
        payload.notes_internal = checkoutNotes.trim();
      }
      await api.post(`/admin/checkout/${ctx.booking.id}/execute/`, payload);
      toast.success(`Room ${ctx.room.room_number} checked out`);
      setCheckoutDone(true);
      onSuccess?.();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: Record<string, unknown> } })?.response;
      const data = res?.data;
      let message = 'Checkout failed';
      if (data) {
        if (typeof data.detail === 'string') message = data.detail;
        else {
          const parts = Object.entries(data).flatMap(([k, v]) => {
            if (Array.isArray(v)) return v.map(item => `${k}: ${item}`);
            if (typeof v === 'string') return [`${k}: ${v}`];
            return [];
          });
          if (parts.length) message = parts.join(' · ');
        }
      }
      toast.error(message, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!ctx || !transferCharge) return;
    const destination = transferTarget;
    try {
      await api.post(`/admin/bookings/${ctx.booking.id}/folio-transfer/`, {
        charge_id: transferCharge.id,
        target_window: destination,
      });
      toast.success(`Charge moved to window ${destination}`);
      setTransferCharge(null);
      await fetchFolioWindows(ctx.booking.id, destination);
      const res = await api.get('/admin/checkout/lookup/', { params: { room_number: ctx.room.room_number } });
      setCtx(res.data);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Transfer failed');
    }
  };

  const handleAdjust = async () => {
    if (!ctx || !adjustCharge) return;
    if (!adjustForm.reason_note.trim()) {
      toast.error('Manager note is required');
      return;
    }
    try {
      await api.post(`/admin/folio/${adjustCharge.id}/adjust/`, adjustForm);
      toast.success('Void/Adjustment recorded');
      setAdjustCharge(null);
      await fetchFolioWindows(ctx.booking.id);
      const res = await api.get('/admin/checkout/lookup/', { params: { room_number: ctx.room.room_number } });
      setCtx(res.data);
    } catch {
      toast.error('Adjustment failed');
    }
  };

  const downloadDuplicateBill = () => {
    if (!dupRef.trim()) {
      toast.error('Enter registration or booking reference');
      return;
    }
    api.get('/admin/checkout/duplicate-bill/', {
      params: { ref: dupRef.trim() },
      responseType: 'blob',
    })
      .then(res => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `duplicate_${dupRef.trim()}.pdf`;
        a.click();
      })
      .catch(() => toast.error('Duplicate bill not available'));
  };

  const handleRoomReady = async () => {
    if (!ctx?.room.id) return;
    try {
      const res = await api.post(`/admin/rooms/${ctx.room.id}/room-ready/`);
      toast.success(res.data.detail);
      setCtx(c => c ? {
        ...c,
        room: { ...c.room, status: res.data.status, housekeeping_status: res.data.housekeeping_status },
      } : c);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || 'Room Ready failed');
    }
  };

  const activeCharges = windows.find(w => w.window_number === activeWindow)?.charges || [];
  const balance = ctx?.folio.balance ?? 0;
  const settled = ctx?.folio.is_settled ?? false;
  const refundDue = ctx?.folio.settlement_direction === 'refund_due' || balance < -0.01;
  const paymentDue = ctx?.folio.settlement_direction === 'payment_due' || balance > 0.01;

  const shell = embedded
    ? 'bg-white border border-gray-200 rounded-xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col'
    : 'min-h-[calc(100vh-4rem)] flex flex-col';

  return (
    <div className={embedded ? 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4' : ''}>
      <div className={shell}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <MdLogout className="text-orange-600" size={24} />
            <div>
              <h1 className="text-lg font-bold text-slate-800">Guest Check-out</h1>
              <p className="text-xs text-gray-500">Revenue Guard · Keyboard-driven · Business date settlement</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-slate-800 p-1">
              <MdClose size={22} />
            </button>
          )}
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Main */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Step A: Lookup */}
            <form ref={formRef} onSubmit={handleRoomLookup} className="flex gap-3 items-end">
              <div className="flex-1 max-w-xs">
                <label className="block text-xs font-medium text-gray-500 mb-1">Room Number (Enter)</label>
                <input
                  autoFocus
                  value={roomInput}
                  onChange={e => setRoomInput(e.target.value)}
                  placeholder="e.g. 703"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="px-5 py-2.5 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800 disabled:opacity-50"
              >
                {lookupLoading ? 'Loading…' : 'Lookup'}
              </button>
            </form>

            {ctx && (
              <div className="lg:hidden border border-gray-200 rounded-lg p-3 bg-slate-50 text-sm grid grid-cols-2 gap-2">
                <div><span className="text-gray-500 text-xs">Guest</span><p className="font-semibold">{ctx.booking.guest_name}</p></div>
                <div><span className="text-gray-500 text-xs">Balance</span><p className={`font-bold ${settled ? 'text-green-600' : 'text-red-600'}`}>BDT {balance.toFixed(2)}</p></div>
              </div>
            )}

            {ctx && (
              <>
                {/* Folio windows */}
                <section className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h2 className="text-sm font-semibold text-slate-800">Folio Windows (8)</h2>
                    <button
                      type="button"
                      onClick={openInvoicePreview}
                      className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900"
                    >
                      <MdPreview size={16} /> Invoice Preview
                    </button>
                  </div>
                  <div className="flex gap-1 p-2 border-b border-gray-100 overflow-x-auto">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(n => {
                      const wt = ctx.folio.windows.find(w => w.window_number === n)?.total ?? 0;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setActiveWindow(n)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                            activeWindow === n ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          W{n} · {wt.toFixed(0)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-3">
                    {activeCharges.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No charges in this window</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 text-xs">
                            <th className="pb-2">Type</th>
                            <th className="pb-2">Description</th>
                            <th className="pb-2 text-right">Total</th>
                            <th className="pb-2 w-24" />
                          </tr>
                        </thead>
                        <tbody>
                          {activeCharges.map(c => (
                            <tr key={c.id} className="border-t border-gray-100">
                              <td className="py-2 text-gray-600">{chargeTypeLabels[c.type] || c.type}</td>
                              <td className="py-2 text-slate-800">{c.desc}</td>
                              <td className="py-2 text-right font-medium">BDT {c.total.toFixed(2)}</td>
                              <td className="py-2 text-right">
                                <button type="button" title="Transfer" onClick={() => {
                                  const dest = windows.find(w => w.window_number !== activeWindow);
                                  setTransferTarget(dest?.window_number ?? (activeWindow === 1 ? 2 : 1));
                                  setTransferCharge(c);
                                }}
                                  className="p-1 text-gray-400 hover:text-teal-600"><MdTransform size={16} /></button>
                                <button type="button" title="Void/Adjust" onClick={() => setAdjustCharge(c)}
                                  className="p-1 text-gray-400 hover:text-red-500"><MdBlock size={16} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {Object.keys(ctx.folio.charges_by_type).length > 0 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {Object.entries(ctx.folio.charges_by_type).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-gray-500">{chargeTypeLabels[k] || k}</span>
                          <span className="font-medium text-slate-800">BDT {v.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Step C: Payment */}
                {!checkoutDone && !settled && (
                  <section className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <MdPayment className={refundDue ? 'text-blue-600' : 'text-teal-700'} />
                      {refundDue ? 'Issue Refund (Guest Credit)' : 'Payment Receive'}
                    </h2>
                    {refundDue && (
                      <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        Guest has BDT {Math.abs(balance).toFixed(2)} credit (e.g. excess deposit). Post a refund to zero the folio before checkout.
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Amount (BDT)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={paymentForm.amount}
                          onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">{refundDue ? 'Refund Via' : 'Payment Style'}</label>
                        <select
                          value={paymentForm.payment_method}
                          onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card (POS)</option>
                          {!refundDue && <option value="COMPANY_CREDIT">Company Credit</option>}
                        </select>
                      </div>
                      {paymentForm.payment_method === 'CARD' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">POS Reference</label>
                          <input
                            value={paymentForm.pos_reference}
                            onChange={e => setPaymentForm(p => ({ ...p, pos_reference: e.target.value }))}
                            placeholder="Terminal ref / auth code"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      )}
                      {paymentForm.payment_method === 'COMPANY_CREDIT' && (
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Authorized Company</label>
                          <select
                            value={paymentForm.company_name}
                            onChange={e => setPaymentForm(p => ({ ...p, company_name: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-600"
                          >
                            <option value="">Select company…</option>
                            {companies.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={requestPaymentSave}
                      disabled={loading}
                      className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${
                        refundDue ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {refundDue ? 'Post Refund' : 'Receive Payment'}
                    </button>
                  </section>
                )}

                {/* Step D: Checkout */}
                {!checkoutDone ? (
                  <section className="border border-orange-200 rounded-xl p-4 bg-orange-50/50 space-y-3">
                    <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <MdLock className="text-orange-600" /> Secure Checkout
                    </h2>
                    <p className="text-xs text-gray-600">
                      Revenue Guard requires folio balance exactly BDT 0.00 (±0.01) across all windows before checkout.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Authorization</label>
                        <input
                          type="text"
                          autoComplete="off"
                          value={checkoutAuth}
                          onChange={e => setCheckoutAuth(e.target.value)}
                          placeholder="Login password or CHECKOUT"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 font-mono"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Type CHECKOUT or your admin login password</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Internal Notes</label>
                        <input
                          value={checkoutNotes}
                          onChange={e => setCheckoutNotes(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={loading || !settled || !checkoutAuth.trim()}
                      onClick={() => setConfirmCheckout(true)}
                      className="px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 disabled:opacity-50"
                    >
                      Execute Checkout
                    </button>
                    {!settled && (
                      <p className="text-xs text-red-600 font-medium">
                        {refundDue
                          ? `Refund BDT ${Math.abs(balance).toFixed(2)} to guest before checkout.`
                          : paymentDue
                            ? `Collect BDT ${balance.toFixed(2)} before checkout.`
                            : 'Settle folio balance before checkout.'}
                      </p>
                    )}
                  </section>
                ) : (
                  <section className="border border-green-200 rounded-xl p-4 bg-green-50 space-y-4">
                    <p className="text-sm font-semibold text-green-800">Checkout complete — room marked Dirty on dashboard.</p>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleRoomReady}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        <MdCleaningServices size={18} /> Room Ready (HK)
                      </button>
                    </div>
                  </section>
                )}

                {/* Duplicate bill */}
                <section className="border border-gray-200 rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                    <MdReceipt /> Duplicate Bill
                  </h2>
                  <div className="flex gap-2">
                    <input
                      value={dupRef}
                      onChange={e => setDupRef(e.target.value)}
                      placeholder="Registration # or Booking ref"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button type="button" onClick={downloadDuplicateBill}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                      PDF
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="w-72 shrink-0 border-l border-gray-200 bg-slate-50 p-4 space-y-4 overflow-y-auto hidden lg:block">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Selection</h3>
            {ctx ? (
              <>
                <div>
                  <p className="text-xs text-gray-500">Guest</p>
                  <p className="font-semibold text-slate-800">{ctx.booking.guest_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Room</p>
                  <p className="font-semibold text-slate-800">
                    {ctx.room.room_number}
                    {ctx.booking.room_type_detail?.name && (
                      <span className="text-gray-500 font-normal"> · {ctx.booking.room_type_detail.name}</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Folio Balance</p>
                  <p className={`text-2xl font-bold ${settled ? 'text-green-600' : refundDue ? 'text-blue-600' : 'text-red-600'}`}>
                    BDT {balance.toFixed(2)}
                  </p>
                  {settled && <span className="text-xs text-green-600 font-medium">Settled (0.00)</span>}
                  {refundDue && !settled && (
                    <span className="text-xs text-blue-600 font-medium">Guest credit — refund due</span>
                  )}
                  {paymentDue && !settled && (
                    <span className="text-xs text-red-600 font-medium">Payment due</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Arrival</p>
                    <p>{ctx.booking.check_in_date}</p>
                    {ctx.booking.actual_check_in && (
                      <p className="text-xs text-gray-400">In: {new Date(ctx.booking.actual_check_in).toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departure</p>
                    <p>{ctx.booking.check_out_date}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Business Date</p>
                  <p className="font-medium text-teal-800">{ctx.business_date}</p>
                </div>
                {ctx.registration_ref && (
                  <div>
                    <p className="text-xs text-gray-500">Registration</p>
                    <p className="font-mono text-sm">{ctx.registration_ref}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-200 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Charges</span><span>BDT {ctx.folio.folio_total.toFixed(2)}</span></div>
                  {(ctx.folio.payments_received ?? 0) > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">Received</span><span className="text-green-600">BDT {ctx.folio.payments_received!.toFixed(2)}</span></div>
                  )}
                  {(ctx.folio.payments_refunded ?? 0) > 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">Refunded</span><span className="text-blue-600">BDT {ctx.folio.payments_refunded!.toFixed(2)}</span></div>
                  )}
                  {!(ctx.folio.payments_received) && !(ctx.folio.payments_refunded) && ctx.folio.payments_total !== 0 && (
                    <div className="flex justify-between"><span className="text-gray-500">Net Paid</span><span className="text-green-600">BDT {ctx.folio.payments_total.toFixed(2)}</span></div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">Enter room number and press Enter to load guest folio.</p>
            )}
          </aside>
        </div>

        {/* Confirm: payment style */}
        {confirmPaymentStyle && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <p className="text-slate-800 font-medium mb-4">Are you sure of your payment style?</p>
              <p className="text-sm text-gray-500 mb-4">
                {paymentForm.payment_method} · BDT {parseFloat(paymentForm.amount || '0').toFixed(2)}
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmPaymentStyle(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={() => { setConfirmPaymentStyle(false); setConfirmSavePayment(true); }}
                  className="flex-1 py-2 bg-teal-700 text-white rounded-lg text-sm">Yes</button>
              </div>
            </div>
          </div>
        )}

        {confirmSavePayment && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <p className="text-slate-800 font-medium mb-4">Would you like to save it?</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmSavePayment(false)} className="flex-1 py-2 border rounded-lg text-sm">No</button>
                <button type="button" onClick={savePayment} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        )}

        {confirmCheckout && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <p className="text-slate-800 font-medium mb-4">Are you sure to check out the room?</p>
              <p className="text-sm text-gray-500 mb-4">Room {ctx?.room.room_number} · {ctx?.booking.guest_name}</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirmCheckout(false)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={executeCheckout} className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm">Checkout</button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer modal */}
        {transferCharge && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-sm w-full">
              <h3 className="font-semibold mb-3">Transfer Charge</h3>
              <p className="text-sm text-gray-600 mb-3">{transferCharge.desc} — BDT {transferCharge.total.toFixed(2)}</p>
              <select value={transferTarget} onChange={e => setTransferTarget(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 mb-4 text-sm">
                {Array.from({ length: 8 }, (_, i) => i + 1).filter(n => n !== activeWindow).map(n => (
                  <option key={n} value={n}>Window {n}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTransferCharge(null)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={handleTransfer} className="flex-1 py-2 bg-teal-700 text-white rounded-lg text-sm">Transfer</button>
              </div>
            </div>
          </div>
        )}

        {adjustCharge && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full">
              <h3 className="font-semibold mb-3">Void / Adjustment</h3>
              <select value={adjustForm.reason_code} onChange={e => setAdjustForm(f => ({ ...f, reason_code: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 mb-2 text-sm">
                {reasonCodes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <textarea
                value={adjustForm.reason_note}
                onChange={e => setAdjustForm(f => ({ ...f, reason_note: e.target.value }))}
                placeholder="Manager note (required)"
                rows={3}
                className="w-full border rounded-lg px-3 py-2 mb-4 text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setAdjustCharge(null)} className="flex-1 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="button" onClick={handleAdjust} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm">Void</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
