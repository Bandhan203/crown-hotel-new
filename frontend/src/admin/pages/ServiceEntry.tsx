import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MdKeyboard, MdWarning, MdCheckCircle, MdBlock, MdFlashOn, MdReceipt, MdPrint,
  MdRefresh, MdAdd, MdTransform, MdFolderShared, MdPerson,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import GuestFolio from '../components/GuestFolio';

// ─── API types ───
interface InHouseBooking {
  id: number;
  booking_ref: string;
  guest: number;
  guest_name: string;
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  meal_plan?: string;
  billing_type?: string;
  folio_balance: number;
  is_settled: boolean;
}

interface FolioWindowCharge {
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
  window_total: number;
  charges: FolioWindowCharge[];
}

interface FolioSummary {
  balance: number;
  folio_total: number;
  payments_total: number;
  is_settled: boolean;
}

const CATEGORIES = ['Room Rent', 'Restaurant', 'Laundry', 'Telephone', 'Transport', 'Minibar', 'Spa', 'Damage', 'Miscellaneous', 'Adjustment', 'Payment'];

const CATEGORY_TO_CHARGE_TYPE: Record<string, string> = {
  'Room Rent': 'ROOM',
  Restaurant: 'FOOD',
  Laundry: 'LAUNDRY',
  Telephone: 'PHONE',
  Transport: 'SERVICE',
  Minibar: 'MINIBAR',
  Spa: 'SPA',
  Damage: 'SERVICE',
  Miscellaneous: 'SERVICE',
  Adjustment: 'SERVICE',
};

const PAY_MODE_TO_METHOD: Record<string, string> = {
  Cash: 'CASH',
  Card: 'CARD',
  bKash: 'CASH',
  Nagad: 'CASH',
  Rocket: 'CASH',
  Bank: 'BANK_TRANSFER',
};

const REASON_CODES = ['BILLING_ERROR', 'COMP', 'GOODWILL', 'MANAGER_APPROVAL', 'DUPLICATE', 'RATE_CORRECTION', 'OTHER'];

const DEPT_WINDOW: Record<'Restaurant' | 'Spa' | 'Laundry', number> = {
  Restaurant: 1,
  Spa: 1,
  Laundry: 1,
};

function parseList<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

function resolveBookingFromQuery(query: string, list: InHouseBooking[]): InHouseBooking | undefined {
  const q = query.trim();
  if (!q) return undefined;
  const lower = q.toLowerCase();

  const byId = list.find(b => String(b.id) === q);
  if (byId) return byId;

  const byGuest = list.find(b => String(b.guest) === q);
  if (byGuest) return byGuest;

  const byRef = list.find(b => b.booking_ref.toLowerCase() === lower);
  if (byRef) return byRef;

  return list.find(b => b.room_number != null && String(b.room_number) === q);
}

export default function ServiceEntry() {
  const [inHouseBookings, setInHouseBookings] = useState<InHouseBooking[]>([]);
  const [loadingInHouse, setLoadingInHouse] = useState(true);
  const [folioWindows, setFolioWindows] = useState<FolioWindow[]>([]);
  const [folioSummary, setFolioSummary] = useState<FolioSummary | null>(null);
  const [loadingFolio, setLoadingFolio] = useState(false);
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().split('T')[0]);

  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWindow, setActiveWindow] = useState(1);

  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [autoHitMode, setAutoHitMode] = useState(false);
  const [autoHitQuery, setAutoHitQuery] = useState('');
  const [autoHitDept, setAutoHitDept] = useState<'Restaurant' | 'Spa' | 'Laundry'>('Restaurant');
  const [autoHitAmt, setAutoHitAmt] = useState('');
  const [autoHitDesc, setAutoHitDesc] = useState('');
  const [posting, setPosting] = useState(false);

  const [showFullFolio, setShowFullFolio] = useState(false);
  const [transferCharge, setTransferCharge] = useState<FolioWindowCharge | null>(null);
  const [transferTarget, setTransferTarget] = useState(2);
  const [adjustCharge, setAdjustCharge] = useState<FolioWindowCharge | null>(null);
  const [adjustReason, setAdjustReason] = useState('BILLING_ERROR');
  const [adjustNote, setAdjustNote] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);
  const catRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  const activeBooking = inHouseBookings.find(b => b.id === activeBookingId) ?? null;
  const balance = folioSummary?.balance ?? activeBooking?.folio_balance ?? 0;
  const isPayment = category === 'Payment' || category === 'Adjustment';
  const activeWindowData = folioWindows.find(w => w.window_number === activeWindow);

  const loadInHouse = useCallback(async () => {
    setLoadingInHouse(true);
    try {
      const res = await api.get('/admin/reservations/in-house/');
      setInHouseBookings(parseList<InHouseBooking>(res.data));
    } catch {
      toast.error('Failed to load in-house guests');
    } finally {
      setLoadingInHouse(false);
    }
  }, []);

  const loadFolioWindows = useCallback(async (bookingId: number) => {
    setLoadingFolio(true);
    try {
      const [winRes, folioRes] = await Promise.all([
        api.get(`/admin/bookings/${bookingId}/folio-windows/`),
        api.get(`/admin/bookings/${bookingId}/folio/`),
      ]);
      const windows: FolioWindow[] = winRes.data;
      setFolioWindows(windows);
      setFolioSummary(folioRes.data.summary);
      setActiveWindow(prev => (
        windows.some(w => w.window_number === prev) ? prev : windows[0]?.window_number ?? 1
      ));
    } catch {
      setFolioWindows([]);
      setFolioSummary(null);
      toast.error('Failed to load folio windows');
    } finally {
      setLoadingFolio(false);
    }
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
    loadInHouse();
    api.get('/admin/config/')
      .then(res => { if (res.data?.business_date) setBusinessDate(res.data.business_date); })
      .catch(() => {});
  }, [loadInHouse]);

  useEffect(() => {
    if (activeBookingId) loadFolioWindows(activeBookingId);
    else {
      setFolioWindows([]);
      setFolioSummary(null);
    }
  }, [activeBookingId, loadFolioWindows]);

  const selectBooking = (booking: InHouseBooking) => {
    setActiveBookingId(booking.id);
    setSearchQuery(booking.room_number ?? booking.booking_ref);
    setActiveWindow(booking.billing_type === 'COMPANY' ? 2 : 1);
  };

  const resolveSearch = async () => {
    const local = resolveBookingFromQuery(searchQuery, inHouseBookings);
    if (local) {
      selectBooking(local);
      catRef.current?.focus();
      return;
    }

    const q = searchQuery.trim();
    if (!q) {
      toast.error('Enter room, booking ref, or guest ID');
      return;
    }

    const params = new URLSearchParams();
    if (q.includes('-') || /^CRN/i.test(q)) {
      params.set('booking_ref', q);
    } else if (/^\d+$/.test(q)) {
      if (q.length <= 3) params.set('room_number', q);
      else params.set('guest_id', q);
    } else {
      params.set('room_number', q);
    }

    try {
      const res = await api.get(`/admin/checkout/lookup/?${params}`);
      const booking = res.data.booking;
      const mapped: InHouseBooking = {
        id: booking.id,
        booking_ref: booking.booking_ref,
        guest: booking.guest,
        guest_name: booking.guest_name,
        room_number: booking.room_number,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        meal_plan: booking.meal_plan,
        billing_type: booking.billing_type,
        folio_balance: res.data.folio.balance,
        is_settled: res.data.folio.is_settled,
      };
      setInHouseBookings(prev => {
        const exists = prev.some(b => b.id === mapped.id);
        return exists ? prev.map(b => b.id === mapped.id ? mapped : b) : [...prev, mapped];
      });
      setActiveBookingId(mapped.id);
      setFolioSummary({
        balance: res.data.folio.balance,
        folio_total: res.data.folio.folio_total,
        payments_total: res.data.folio.payments_total,
        is_settled: res.data.folio.is_settled,
      });
      await loadFolioWindows(mapped.id);
      catRef.current?.focus();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Guest not found');
    }
  };

  const refreshAll = async () => {
    await loadInHouse();
    if (activeBookingId) await loadFolioWindows(activeBookingId);
  };

  const postFolioCharge = async (bookingId: number, chargeType: string, desc: string, amt: number, window: number) => {
    await api.post(`/admin/bookings/${bookingId}/folio/`, {
      charge_type: chargeType,
      description: desc,
      amount: amt,
      quantity: 1,
      charge_date: businessDate,
      folio_window: window,
    });
  };

  const handlePost = async () => {
    if (!activeBooking) {
      toast.error('Select an in-house guest first');
      return;
    }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return; }
    if (!category) { toast.error('Category required'); return; }

    setPosting(true);
    try {
      if (isPayment) {
        await api.post(`/admin/checkout/${activeBooking.id}/payment/`, {
          amount: amt,
          payment_method: PAY_MODE_TO_METHOD[payMode] ?? 'CASH',
          pos_reference: description || `${category} - ${payMode}`,
        });
        toast.success(`Payment received — ৳${amt.toLocaleString()}`);
      } else {
        await postFolioCharge(
          activeBooking.id,
          CATEGORY_TO_CHARGE_TYPE[category] ?? 'SERVICE',
          description || category,
          amt,
          activeWindow,
        );
        toast.success(`Posted to ${activeWindowData?.label ?? `W${activeWindow}`} — ৳${amt.toLocaleString()}`);
      }
      setCategory('');
      setDescription('');
      setAmount('');
      await refreshAll();
      searchRef.current?.focus();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Post failed');
    } finally {
      setPosting(false);
    }
  };

  const handleAutoHit = async () => {
    const booking = resolveBookingFromQuery(autoHitQuery, inHouseBookings);
    if (!booking) { toast.error('No in-house guest found'); return; }
    const amt = parseFloat(autoHitAmt);
    if (!amt || isNaN(amt) || amt <= 0) { toast.error('Invalid amount'); return; }

    const chargeType = autoHitDept === 'Restaurant' ? 'FOOD' : autoHitDept === 'Spa' ? 'SPA' : 'LAUNDRY';
    const window = DEPT_WINDOW[autoHitDept];

    setPosting(true);
    try {
      await postFolioCharge(
        booking.id,
        chargeType,
        `${autoHitDesc || autoHitDept} (Auto-hit)`,
        amt,
        window,
      );
      toast.success(`Auto-hit → Room ${booking.room_number} W${window} — ৳${amt.toLocaleString()}`);
      setAutoHitQuery('');
      setAutoHitAmt('');
      setAutoHitDesc('');
      if (activeBookingId === booking.id) await refreshAll();
      else await loadInHouse();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Auto-hit failed');
    } finally {
      setPosting(false);
    }
  };

  const handleAddWindow = async () => {
    if (!activeBooking) return;
    if (folioWindows.length >= 8) { toast.error('Maximum 8 windows'); return; }
    try {
      await api.post(`/admin/bookings/${activeBooking.id}/folio-windows/`, {
        label: `Window ${folioWindows.length + 1}`,
      });
      toast.success('Folio window added');
      await loadFolioWindows(activeBooking.id);
    } catch {
      toast.error('Failed to add window');
    }
  };

  const handleTransfer = async () => {
    if (!activeBooking || !transferCharge) return;
    const destination = transferTarget;
    try {
      await api.post(`/admin/bookings/${activeBooking.id}/folio-transfer/`, {
        charge_id: transferCharge.id,
        target_window: destination,
      });
      toast.success('Charge transferred');
      setTransferCharge(null);
      setActiveWindow(destination);
      await refreshAll();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Transfer failed');
    }
  };

  const handleAdjust = async () => {
    if (!adjustCharge || !adjustNote.trim()) {
      toast.error('Reason note required');
      return;
    }
    try {
      await api.post(`/admin/folio/${adjustCharge.id}/adjust/`, {
        reason_code: adjustReason,
        reason_note: adjustNote,
      });
      toast.success('Adjustment recorded');
      setAdjustCharge(null);
      setAdjustNote('');
      await refreshAll();
    } catch {
      toast.error('Adjustment failed');
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <MdReceipt className="text-teal-700" size={24} />
          Service Entry & Billing
        </h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refreshAll}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 px-2 py-1.5 rounded-lg border border-gray-200 hover:border-teal-600/40 transition">
            <MdRefresh size={14} /> Refresh
          </button>
          <div className="text-xs font-mono bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200">
            Business Date: <span className="text-yellow-600 font-bold">{businessDate}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-col lg:flex-row min-h-0 lg:min-h-[calc(100vh-160px)]">
        {/* Left — posting */}
        <div className="w-full lg:w-[420px] lg:shrink-0 flex flex-col gap-3 overflow-auto min-w-0">
          <div className="flex gap-2">
            <button onClick={() => setAutoHitMode(false)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${!autoHitMode ? 'bg-teal-700 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              <MdKeyboard size={14} /> Manual Post
            </button>
            <button onClick={() => setAutoHitMode(true)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition ${autoHitMode ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-white text-gray-500 border-gray-200'}`}>
              <MdFlashOn size={14} /> Auto-Hit
            </button>
          </div>

          {!autoHitMode ? (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-[10px] text-gray-500">
                <MdPerson size={12} /> Room · Booking Ref · Guest ID — then Enter
              </div>

              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Find Guest (relational lookup)</label>
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') resolveSearch(); }}
                  placeholder="101 · CRN-2026-0012 · Guest ID"
                  className={`w-full bg-gray-50 border rounded-lg px-3 py-2.5 text-slate-800 text-sm font-mono focus:outline-none focus:ring-2 transition ${activeBooking ? 'border-green-500/50 focus:ring-green-500/30' : 'border-gray-200 focus:ring-teal-600/30'}`}
                />
              </div>

              {activeBooking && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5 text-xs space-y-1">
                  <div className="font-bold text-teal-900">{activeBooking.guest_name}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-gray-600 font-mono text-[10px]">
                    <span>Guest ID: <strong className="text-teal-700">{activeBooking.guest}</strong></span>
                    <span>Booking: <strong>{activeBooking.id}</strong></span>
                    <span>{activeBooking.booking_ref}</span>
                    {activeBooking.room_number && <span>Rm {activeBooking.room_number}</span>}
                  </div>
                  <div className="flex gap-3 text-gray-500">
                    <span>{activeBooking.check_in_date} → {activeBooking.check_out_date}</span>
                    <span className={balance > 0.01 ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>
                      ৳{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullFolio(true)}
                    className="mt-1 flex items-center gap-1 text-[10px] text-teal-700 hover:underline"
                  >
                    <MdFolderShared size={12} /> Open full multi-folio manager
                  </button>
                </div>
              )}

              {searchQuery.trim() && !activeBooking && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                  <MdWarning size={14} /> Press Enter to lookup, or pick from in-house list
                </div>
              )}

              {/* Folio window selector */}
              {activeBooking && folioWindows.length > 0 && (
                <div>
                  <label className="text-[11px] text-gray-500 block mb-1.5">Post to Folio Window</label>
                  <div className="flex flex-wrap gap-1.5">
                    {folioWindows.map(w => (
                      <button
                        key={w.window_number}
                        type="button"
                        onClick={() => setActiveWindow(w.window_number)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition ${
                          activeWindow === w.window_number
                            ? 'bg-teal-700 text-white border-teal-600'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-teal-400'
                        }`}
                      >
                        {w.label}
                        <span className="ml-1 opacity-70">৳{w.window_total.toLocaleString()}</span>
                      </button>
                    ))}
                    {folioWindows.length < 8 && (
                      <button type="button" onClick={handleAddWindow}
                        className="px-2 py-1.5 rounded-lg text-[10px] border border-dashed border-gray-300 text-gray-500 hover:border-teal-500 hover:text-teal-700 flex items-center gap-0.5">
                        <MdAdd size={12} /> Window
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Category</label>
                <select ref={catRef} value={category} onChange={e => setCategory(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') descRef.current?.focus(); }}
                  disabled={!activeBooking}
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/30 ${!activeBooking ? 'opacity-40' : ''}`}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Description (optional)</label>
                <input ref={descRef} value={description} onChange={e => setDescription(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') amtRef.current?.focus(); }}
                  disabled={!activeBooking} placeholder="Details..."
                  className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-slate-800 text-sm focus:outline-none ${!activeBooking ? 'opacity-40' : ''}`} />
              </div>

              <div className="flex gap-2">
                <div className="flex-[2]">
                  <label className="text-[11px] text-gray-500 block mb-1">Amount (৳)</label>
                  <input ref={amtRef} type="number" value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !posting) handlePost(); }}
                    disabled={!activeBooking || posting} placeholder="0.00"
                    className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-yellow-600 font-mono font-bold focus:outline-none ${!activeBooking ? 'opacity-40' : ''}`} />
                </div>
                {isPayment && (
                  <div className="flex-1">
                    <label className="text-[11px] text-gray-500 block mb-1">Mode</label>
                    <select value={payMode} onChange={e => setPayMode(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs">
                      <option>Cash</option><option>Card</option><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option>
                    </select>
                  </div>
                )}
              </div>

              <button onClick={handlePost} disabled={!activeBooking || !category || !amount || posting}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition ${
                  isPayment ? 'bg-green-500 text-black' : 'bg-teal-700 text-white'
                } disabled:opacity-40`}>
                <MdCheckCircle size={16} />
                {posting ? 'Posting…' : isPayment ? 'Receive Payment' : `Post to ${activeWindowData?.label ?? `W${activeWindow}`}`}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-yellow-500/30 rounded-xl p-4 space-y-3">
              <div className="text-xs text-yellow-600 font-semibold flex items-center gap-2">
                <MdFlashOn size={14} /> Auto-Hit by room / ref / guest ID
              </div>
              <div className="flex gap-2">
                {(['Restaurant', 'Spa', 'Laundry'] as const).map(d => (
                  <button key={d} onClick={() => setAutoHitDept(d)}
                    className={`flex-1 py-2 rounded-lg text-xs border ${autoHitDept === d ? 'bg-yellow-500/20 text-yellow-700 border-yellow-400 font-bold' : 'bg-gray-50 text-gray-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
              <input value={autoHitQuery} onChange={e => setAutoHitQuery(e.target.value)} placeholder="Room / Booking Ref / Guest ID"
                className="w-full bg-gray-50 border rounded-lg px-3 py-2 font-mono font-bold" />
              <div className="flex gap-2">
                <input type="number" value={autoHitAmt} onChange={e => setAutoHitAmt(e.target.value)} placeholder="Amount"
                  className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 font-mono text-yellow-600 font-bold" />
                <input value={autoHitDesc} onChange={e => setAutoHitDesc(e.target.value)} placeholder="Description"
                  className="flex-[2] bg-gray-50 border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={handleAutoHit} disabled={posting}
                className="w-full py-3 rounded-lg bg-yellow-500 text-black font-extrabold text-sm disabled:opacity-50">
                <MdFlashOn className="inline mr-1" /> Post Auto-Hit
              </button>
            </div>
          )}
        </div>

        {/* Right — ledger + in-house */}
        <div className="flex-1 flex flex-col gap-3 overflow-auto min-w-0">
          {activeBooking && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between text-[11px] text-gray-500 uppercase tracking-wider">
                <span>
                  {activeWindowData?.label ?? `Window ${activeWindow}`} — Guest #{activeBooking.guest}
                </span>
                <button type="button" className="flex items-center gap-1 hover:text-slate-800"><MdPrint size={12} /> Print</button>
              </div>
              <div className="max-h-[320px] overflow-auto">
                {loadingFolio && <p className="p-4 text-center text-xs text-gray-500">Loading…</p>}
                {!loadingFolio && (!activeWindowData?.charges.length) && (
                  <p className="p-4 text-center text-xs text-gray-500">No charges in this window</p>
                )}
                {!loadingFolio && activeWindowData?.charges.map(ch => (
                  <div key={ch.id} className="grid grid-cols-[72px_100px_1fr_90px_72px] gap-2 px-4 py-2 border-t border-gray-100 text-xs items-center">
                    <span className="text-gray-500 font-mono">{ch.date}</span>
                    <span className="text-blue-600">{ch.type}</span>
                    <span className="truncate text-gray-600">{ch.desc}</span>
                    <span className="text-right font-mono font-bold">৳{ch.total.toLocaleString()}</span>
                    <span className="flex gap-1 justify-end">
                      <button type="button" title="Transfer" onClick={() => { setTransferCharge(ch); setTransferTarget(folioWindows.find(w => w.window_number !== activeWindow)?.window_number ?? 2); }}
                        className="p-1 rounded hover:bg-blue-50 text-blue-600"><MdTransform size={14} /></button>
                      <button type="button" title="Adjust/Void" onClick={() => setAdjustCharge(ch)}
                        className="p-1 rounded hover:bg-red-50 text-red-500"><MdBlock size={14} /></button>
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t-2 bg-gray-50 flex justify-between text-xs">
                <span className="text-gray-500">Window: ৳{(activeWindowData?.window_total ?? 0).toLocaleString()}</span>
                <span className="font-mono font-bold text-slate-800">
                  Total balance: <span className={balance > 0.01 ? 'text-red-500' : 'text-green-600'}>৳{balance.toLocaleString()}</span>
                </span>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex-1">
            <div className="px-4 py-2.5 bg-gray-50 text-[11px] text-gray-500 uppercase flex justify-between">
              <span>In-House — Quick Reference</span>
              <span className="text-teal-700 font-bold">{inHouseBookings.length}</span>
            </div>
            {loadingInHouse ? (
              <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
            ) : inHouseBookings.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No in-house guests</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] p-2.5 gap-1.5">
                {inHouseBookings.map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => selectBooking(b)}
                    className={`text-left rounded-lg p-2 border transition hover:border-teal-600/50 ${
                      activeBookingId === b.id ? 'border-teal-600 ring-1 ring-teal-600/30 bg-teal-50/50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-extrabold text-teal-700 font-mono">{b.room_number ?? '—'}</span>
                      <span className="text-[9px] text-gray-400 font-mono">G{b.guest}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 truncate">{b.guest_name}</div>
                    <div className={`text-[10px] font-mono ${b.folio_balance > 0.01 ? 'text-red-500' : 'text-green-600'}`}>
                      ৳{b.folio_balance.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showFullFolio && activeBooking && (
        <GuestFolio
          bookingId={activeBooking.id}
          bookingRef={activeBooking.booking_ref}
          onClose={() => { setShowFullFolio(false); refreshAll(); }}
        />
      )}

      {transferCharge && activeBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm border border-blue-200">
            <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-3"><MdTransform /> Transfer Charge</h3>
            <p className="text-xs text-gray-500 mb-3">{transferCharge.desc} — ৳{transferCharge.total}</p>
            <select value={transferTarget} onChange={e => setTransferTarget(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4">
              {folioWindows.filter(w => w.window_number !== activeWindow).map(w => (
                <option key={w.window_number} value={w.window_number}>{w.label} (W{w.window_number})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTransferCharge(null)} className="flex-1 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="button" onClick={handleTransfer} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Transfer</button>
            </div>
          </div>
        </div>
      )}

      {adjustCharge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm border border-red-200">
            <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3"><MdBlock /> Revenue Guard Adjust</h3>
            <p className="text-xs text-gray-500 mb-3">{adjustCharge.desc} — ৳{adjustCharge.total}</p>
            <select value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-xs mb-2">
              {REASON_CODES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
            <textarea value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="Audit note (required)"
              className="w-full border rounded-lg px-3 py-2 text-xs h-20 mb-4" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdjustCharge(null)} className="flex-1 py-2 rounded-lg border text-sm">Cancel</button>
              <button type="button" onClick={handleAdjust} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
