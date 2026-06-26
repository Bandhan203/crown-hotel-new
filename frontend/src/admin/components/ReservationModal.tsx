import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdEventAvailable } from 'react-icons/md';
import api from '../../services/api';
import {
  canPickRoom,
  fetchAvailableRooms,
  nightsBetween,
  type AvailableRoom,
} from '../utils/fetchAvailableRooms';
import { COUNTRIES, COUNTRY_ALIASES, NATIONALITIES } from '../constants/countries';
import SearchableSelect from './SearchableSelect';
import {
  checkRoomCapacity,
  formatCapacityWarning,
  MAX_EXTRA_BEDS,
} from '../utils/roomCapacity';
import {
  computeRatePlanPricing,
  isRatePlanApplicable,
  ratePlanHint,
  type RatePlan,
} from '../utils/ratePlanPricing';

interface RoomType { id: number; name: string; price_per_night: string; max_guests: number; }
interface Props { onClose: () => void; onSuccess: () => void; }

const TODAY    = new Date().toISOString().split('T')[0];
const TOMORROW = new Date(Date.now() + 86400000).toISOString().split('T')[0];

function formatApiError(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Failed to create reservation';
  const d = data as Record<string, unknown>;
  if (typeof d.detail === 'string') return d.detail;
  const parts: string[] = [];
  for (const [field, val] of Object.entries(d)) {
    if (Array.isArray(val)) {
      const label = field.replace(/_/g, ' ');
      parts.push(`${label}: ${val.join(', ')}`);
    } else if (typeof val === 'string') parts.push(val);
  }
  return parts.join(' · ') || 'Failed to create reservation';
}

const EMPTY_FORM = {
  status: 'CONFIRMED',
  designation: '', first_name: '', last_name: '',
  date_of_birth: '', gender: '', nationality: '', country: '',
  address: '', occupation: '',
  guest_email: '', guest_phone: '', contact_person: '',
  company_name: '', booking_source: 'PHONE',
  id_type: '', id_number: '', place_of_issue: '', visa_no: '',
  room_type: '', room_id: '', rate_plan: '',
  check_in_date: TODAY,
  check_out_date: TOMORROW,
  arrival_time: '', departure_time: '',
  num_rooms: '1',
  adults: '1', children: '0', infants: '0', extra_bed: '0',
  guest_type: '', purpose_of_visit: '', coming_from: '',
  rack_rate: '', base_offer_rate: '', offer_rate: '',
  discount_pct: '0', discount_amount: '0',
  service_charge_pct: '10', vat_pct: '15',
  payment_amount: '0', payment_method: 'CASH',
  pickup_required: 'NO', flight_pickup_no: '', flight_eta: '',
  drop_required: 'NO', flight_drop_no: '', flight_etd: '',
  dnm: 'false', no_post: 'false', is_travel_agency: 'false', non_smoking: 'false',
  special_requests: '', profile_note: '',
  reference_source: '', guest_hobbies: '', guest_preferences: '',
  airport_details: '', transport_notes: '', parent_booking_id: '',
};

/* Classic PMS light theme — module-level so React does not remount on every keystroke */
const LBL_W = 'w-[7rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5';
const LBL_WIDE = 'w-[7.75rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5';
const LBL_COMPACT = 'w-[4.75rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5 whitespace-nowrap';
const LBL_COMPACT_MED = 'w-[5.25rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5 whitespace-nowrap';
const ROW_FOCUS = 'rounded-sm px-1 transition-colors duration-150 focus-within:bg-blue-50/80 focus-within:shadow-[inset_4px_0_0_#2563eb]';
const LBL_FOCUS = 'group-focus-within/field:text-blue-700 group-focus-within/field:font-bold transition-all duration-150';

const FIELD_BASE = [
  'bg-white border border-slate-300 rounded-sm',
  'h-7 px-2 text-sm font-medium text-slate-800 leading-none',
  'shadow-[inset_1px_1px_1px_rgba(0,0,0,0.04)]',
  'placeholder:text-slate-400 placeholder:font-normal',
  'hover:border-slate-400 hover:bg-slate-50/50',
  'focus:outline-none focus:border-blue-600 focus:bg-blue-50/40 focus:text-slate-900',
  'focus:ring-[3px] focus:ring-blue-500/35 focus:shadow-[0_1px_4px_rgba(37,99,235,0.15)]',
  'focus-visible:outline-none focus-visible:border-blue-600 focus-visible:ring-[3px] focus-visible:ring-blue-500/35',
  'disabled:bg-slate-100 disabled:text-slate-500 disabled:font-normal disabled:border-slate-200 disabled:cursor-not-allowed',
  'transition-all duration-150 box-border max-w-full',
].join(' ');
const INP = FIELD_BASE + ' block w-full min-w-0 cursor-text';
const SEL = FIELD_BASE + ' w-full min-w-0 cursor-pointer pr-7 truncate';
const INP_NUM = FIELD_BASE + ' block w-[2.75rem] shrink-0 text-center px-1.5 cursor-text appearance-none [appearance:textfield]';
const TAREA = [
  'bg-white border border-slate-300 rounded-sm w-full min-w-0',
  'px-2 py-1.5 text-sm font-medium text-slate-800 leading-snug',
  'shadow-[inset_1px_1px_1px_rgba(0,0,0,0.04)]',
  'placeholder:text-slate-400 placeholder:font-normal',
  'hover:border-slate-400 hover:bg-slate-50/50',
  'focus:outline-none focus:border-blue-600 focus:bg-blue-50/40',
  'focus:ring-[3px] focus:ring-blue-500/35 focus:shadow-[0_1px_4px_rgba(37,99,235,0.15)]',
  'transition-all duration-150 box-border',
].join(' ');
const COL2 = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]';
const COL3 = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]';
const COL4 = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]';
const COL_ROOM_ROW = 'grid-cols-[minmax(0,1fr)_auto_auto]';
const COL_PAX = 'grid-cols-[2.75rem_2.75rem_2.75rem]';

function lblClass(wide?: boolean, compact?: boolean, compactMed?: boolean) {
  if (compactMed) return LBL_COMPACT_MED;
  if (compact) return LBL_COMPACT;
  return wide ? LBL_WIDE : LBL_W;
}

function Split({ label, cols, children, wide, compact }: {
  label: string; cols: string; children: React.ReactNode; wide?: boolean; compact?: boolean;
}) {
  return (
    <div className={`group/field flex items-center gap-1.5 shrink-0 py-0.5 ${ROW_FOCUS}`}>
      <span className={`${lblClass(wide, compact)} ${LBL_FOCUS}`}>{label}</span>
      <div className={`shrink-0 grid ${cols} gap-1`}>{children}</div>
    </div>
  );
}

function Field({ id, label, children, wide, compact, compactMed, tight }: {
  id?: string; label: string; children: React.ReactNode;
  wide?: boolean; compact?: boolean; compactMed?: boolean; tight?: boolean;
}) {
  return (
    <div className={`group/field flex items-center gap-1.5 min-w-0 py-0.5 ${ROW_FOCUS}`}>
      <label htmlFor={id} className={`${lblClass(wide, compact, compactMed)} ${LBL_FOCUS}`}>{label}</label>
      <div className={tight ? 'shrink-0 relative' : 'flex-1 min-w-0 relative'}>{children}</div>
    </div>
  );
}

function Chk({ id, checked, onChange, label }: {
  id: string; checked: boolean; onChange: () => void; label: string;
}) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-1 cursor-pointer select-none">
      <input
        id={id} type="checkbox" checked={checked} onChange={onChange}
        className="w-4 h-4 rounded-sm accent-blue-600 cursor-pointer
                   focus:outline-none focus:ring-[3px] focus:ring-blue-400/50"
      />
      <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{label}</span>
    </label>
  );
}

function Row({ children, cols = COL2 }: { children: React.ReactNode; cols?: string }) {
  return (
    <div className={`grid ${cols} gap-x-4 gap-y-0 py-0.5 min-w-0 [&>*]:min-w-0`}>
      {children}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-sm bg-white/60 mb-2">
      {title && (
        <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
          {title}
        </div>
      )}
      <div className="px-2 py-1">{children}</div>
    </div>
  );
}

/** Gross rate before discount */
function netFromBase(base: number, pct: number): number {
  if (!base || pct <= 0) return base;
  return base * (1 - pct / 100);
}

/** Recover gross from net + discount % */
function baseFromNet(net: number, pct: number): number {
  if (!net || pct <= 0 || pct >= 100) return net;
  return net / (1 - pct / 100);
}

function stayDiscountAmount(base: number, nights: number, rooms: number, pct: number): string {
  if (base <= 0 || nights <= 0 || pct <= 0) return '0';
  return (base * nights * rooms * pct / 100).toFixed(2);
}

export default function ReservationModal({ onClose, onSuccess }: Props) {
  const [roomTypes,      setRoomTypes]      = useState<RoomType[]>([]);
  const [ratePlans,      setRatePlans]      = useState<RatePlan[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading,   setRoomsLoading]   = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [loading,        setLoading]        = useState(false);
  const [nights,         setNights]         = useState(0);
  const [grandTotal,     setGrandTotal]     = useState(0);

  const isForeigner = form.country.trim() !== '' &&
    !form.country.toLowerCase().includes('bangladesh');

  /* ── data loaders ─── */
  useEffect(() => {
    api.get('/rooms/').then(r => setRoomTypes(r.data.results ?? r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const rt = form.room_type;
    const ci = form.check_in_date;
    const co = form.check_out_date;
    const params: Record<string, string> = {};
    if (rt && ci && co && nightsBetween(ci, co) > 0) {
      params.room_type = rt;
      params.check_in_date = ci;
      params.check_out_date = co;
    }
    api.get('/rate-plans/available/', { params })
      .then(r => setRatePlans(r.data.results ?? r.data))
      .catch(() => setRatePlans([]));
  }, [form.room_type, form.check_in_date, form.check_out_date]);

  /* ── available rooms ─── */
  useEffect(() => {
    if (!canPickRoom(form.room_type, form.check_in_date, form.check_out_date)) {
      setAvailableRooms([]); setRoomsLoading(false); return;
    }
    let cancelled = false;
    setRoomsLoading(true);
    fetchAvailableRooms(form.room_type, form.check_in_date, form.check_out_date)
      .then(rooms => {
        if (cancelled) return;
        setAvailableRooms(rooms);
        setForm(f => f.room_id && !rooms.some(r => r.id === Number(f.room_id))
          ? { ...f, room_id: '' } : f);
      })
      .catch(() => { if (!cancelled) setAvailableRooms([]); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, [form.room_type, form.check_in_date, form.check_out_date]);

  const numRooms = Math.max(1, parseInt(form.num_rooms || '1', 10) || 1);

  const selectedRoomType = useMemo(
    () => roomTypes.find(r => r.id === Number(form.room_type)),
    [roomTypes, form.room_type],
  );

  const capacityCheck = useMemo(() => {
    if (!selectedRoomType?.max_guests) return null;
    return checkRoomCapacity({
      maxGuestsPerRoom: selectedRoomType.max_guests,
      numRooms,
      adults: parseInt(form.adults || '0', 10) || 0,
      children: parseInt(form.children || '0', 10) || 0,
      infants: parseInt(form.infants || '0', 10) || 0,
      extraBeds: parseInt(form.extra_bed || '0', 10) || 0,
    });
  }, [
    selectedRoomType, numRooms,
    form.adults, form.children, form.infants, form.extra_bed,
  ]);

  const capacityWarning = useMemo(() => {
    if (!capacityCheck || capacityCheck.ok || !selectedRoomType) return '';
    return formatCapacityWarning(
      selectedRoomType.name,
      selectedRoomType.max_guests,
      numRooms,
      capacityCheck,
    );
  }, [capacityCheck, selectedRoomType, numRooms]);

  const overCapacity = capacityCheck !== null && !capacityCheck.ok;
  const capInputClass = overCapacity
    ? INP_NUM + ' !border-amber-500 !bg-amber-50/60 focus:!border-amber-600 focus:!ring-amber-500/35'
    : INP_NUM;

  const pricing = useMemo(() => {
    const n = nightsBetween(form.check_in_date, form.check_out_date);
    const base = parseFloat(form.base_offer_rate || form.rack_rate || '0');
    const net = parseFloat(form.offer_rate || '0');
    const rack = parseFloat(form.rack_rate || '0');
    const pct = parseFloat(form.discount_pct || '0');
    const discAmt = parseFloat(form.discount_amount || '0');
    const grossStay = base * n * numRooms;
    const subtotal = Math.max(0, net * n * numRooms);
    return { n, base, net, rack, pct, discAmt, grossStay, subtotal };
  }, [
    form.check_in_date, form.check_out_date, form.offer_rate, form.base_offer_rate,
    form.rack_rate, form.discount_pct, form.discount_amount, numRooms,
  ]);

  /** Apply selected rate plan discount automatically */
  useEffect(() => {
    const rack = parseFloat(form.rack_rate || '0');
    const nights = nightsBetween(form.check_in_date, form.check_out_date);
    if (!form.rate_plan || rack <= 0 || nights <= 0) return;

    const plan = ratePlans.find(p => p.id === Number(form.rate_plan));
    if (!plan) {
      if (ratePlans.length > 0) {
        setForm(f => ({
          ...f,
          rate_plan: '',
          discount_pct: '0',
          discount_amount: '0',
          base_offer_rate: f.rack_rate,
          offer_rate: f.rack_rate,
        }));
      }
      return;
    }

    const roomTypeId = Number(form.room_type);
    if (!isRatePlanApplicable(plan, roomTypeId, form.check_in_date, form.check_out_date)) {
      toast.error(`${plan.name} needs at least ${plan.min_nights} night(s) for this stay.`);
      setForm(f => ({
        ...f,
        rate_plan: '',
        discount_pct: '0',
        discount_amount: '0',
        base_offer_rate: f.rack_rate,
        offer_rate: f.rack_rate,
      }));
      return;
    }

    const computed = computeRatePlanPricing(rack, nights, numRooms, plan);
    setForm(f =>
      f.offer_rate === computed.offer_rate
      && f.discount_amount === computed.discount_amount
      && f.discount_pct === computed.discount_pct
        ? f
        : { ...f, ...computed },
    );
  }, [
    form.rate_plan, form.rack_rate, form.check_in_date, form.check_out_date,
    form.num_rooms, form.room_type, ratePlans, numRooms,
  ]);

  /** Recompute net room rent + discount when base rate, %, dates, or room count change (manual discount) */
  useEffect(() => {
    if (form.rate_plan) return;
    const base = parseFloat(form.base_offer_rate || '0');
    if (base <= 0) return;
    const pct = parseFloat(form.discount_pct || '0');
    const n = nightsBetween(form.check_in_date, form.check_out_date);
    const netStr = netFromBase(base, pct).toFixed(2);
    const discStr = stayDiscountAmount(base, n, numRooms, pct);
    setForm(f =>
      f.offer_rate === netStr && f.discount_amount === discStr
        ? f
        : { ...f, offer_rate: netStr, discount_amount: discStr },
    );
  }, [
    form.rate_plan, form.base_offer_rate, form.discount_pct,
    form.check_in_date, form.check_out_date, form.num_rooms, numRooms,
  ]);

  /* ── grand total (incl. service + VAT on subtotal after discount) ─── */
  useEffect(() => {
    setNights(pricing.n);
    const svcPct = parseFloat(form.service_charge_pct || '0');
    const vatPct = parseFloat(form.vat_pct || '0');
    const sub = pricing.subtotal;
    setGrandTotal(sub + sub * svcPct / 100 + sub * vatPct / 100);
  }, [pricing.subtotal, form.service_charge_pct, form.vat_pct, pricing.n]);

  const advanceAmount = useMemo(() => {
    const v = parseFloat(form.payment_amount || '0');
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, [form.payment_amount]);

  const paymentBalance = useMemo(() => {
    const due = Math.max(0, grandTotal - advanceAmount);
    const overpaid = Math.max(0, advanceAmount - grandTotal);
    const fullyPaid = grandTotal > 0 && advanceAmount >= grandTotal && overpaid === 0;
    return { due, overpaid, fullyPaid };
  }, [grandTotal, advanceAmount]);

  /* ── field setter ─── */
  const set = useCallback((key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'rate_plan') {
        if (!value) {
          const rack = f.rack_rate || '';
          next.discount_pct = '0';
          next.discount_amount = '0';
          next.base_offer_rate = rack;
          next.offer_rate = rack;
        }
      }
      if (key === 'discount_pct' || key === 'discount_amount') {
        next.rate_plan = '';
      }
      if (key === 'room_type') {
        next.room_id = '';
        const rt = roomTypes.find(r => r.id === Number(value));
        if (rt) {
          const price = String(rt.price_per_night);
          next.rack_rate = price;
          if (!f.rate_plan) {
            const pct = parseFloat(f.discount_pct || '0');
            const n = nightsBetween(f.check_in_date, f.check_out_date);
            const rooms = Math.max(1, parseInt(f.num_rooms || '1', 10) || 1);
            next.base_offer_rate = price;
            next.offer_rate = netFromBase(parseFloat(price), pct).toFixed(2);
            next.discount_amount = stayDiscountAmount(parseFloat(price), n, rooms, pct);
          } else {
            next.base_offer_rate = price;
          }
        }
      }
      if (key === 'offer_rate') {
        const net = parseFloat(value) || 0;
        const pct = parseFloat(f.discount_pct || '0');
        const n = nightsBetween(f.check_in_date, f.check_out_date);
        const rooms = Math.max(1, parseInt(f.num_rooms || '1', 10) || 1);
        const base = baseFromNet(net, pct);
        next.base_offer_rate = base > 0 ? base.toFixed(2) : '';
        next.discount_amount = stayDiscountAmount(base, n, rooms, pct);
      }
      if (key === 'discount_amount') {
        const disc = parseFloat(value) || 0;
        const base = parseFloat(f.base_offer_rate || f.rack_rate || '0');
        const n = nightsBetween(f.check_in_date, f.check_out_date);
        const rooms = Math.max(1, parseInt(f.num_rooms || '1', 10) || 1);
        const gross = base * n * rooms;
        if (gross > 0 && disc >= 0) {
          const netTotal = Math.max(0, gross - disc);
          next.offer_rate = n > 0 && rooms > 0
            ? (netTotal / (n * rooms)).toFixed(2)
            : f.offer_rate;
        }
      }
      if (key === 'check_in_date' && value >= (next.check_out_date || '')) {
        const d = new Date(value + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        next.check_out_date = d.toISOString().split('T')[0];
      }
      return next;
    }), [roomTypes]);

  const toggle = (k: 'dnm' | 'no_post' | 'is_travel_agency' | 'non_smoking') =>
    setForm(f => ({ ...f, [k]: f[k] === 'true' ? 'false' : 'true' }));
  const bool = (k: 'dnm' | 'no_post' | 'is_travel_agency' | 'non_smoking') => form[k] === 'true';

  const roomLabel = () => {
    if (!form.room_type)       return 'Select type first';
    if (nights <= 0)           return 'Set valid dates';
    if (roomsLoading)          return 'Loading…';
    if (availableRooms.length) return 'Auto-assign';
    return 'No rooms';
  };

  /* ── submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim())  { toast.error('First name is required'); return; }
    if (!form.guest_email.trim()) { toast.error('Email is required');      return; }
    if (!form.room_type)          { toast.error('Room type is required');  return; }
    if (nights <= 0)              { toast.error('Departure must be after arrival'); return; }
    if (capacityCheck && !capacityCheck.ok) {
      toast.error(capacityWarning || 'Guest count exceeds room capacity. Add extra bed(s) or adjust PAX.');
      return;
    }
    if (paymentBalance.overpaid > 0) {
      toast.error(
        `Advance (BDT ${advanceAmount.toFixed(2)}) exceeds grand total (BDT ${grandTotal.toFixed(2)}). ` +
        `Reduce advance by BDT ${paymentBalance.overpaid.toFixed(2)}.`,
      );
      return;
    }
    setLoading(true);
    try {
      await api.post('/admin/reservations/create/', {
        status: form.status, guest_email: form.guest_email, guest_phone: form.guest_phone,
        designation: form.designation, first_name: form.first_name, last_name: form.last_name,
        date_of_birth: form.date_of_birth || null, gender: form.gender,
        nationality: form.nationality, country: form.country, address: form.address,
        occupation: form.occupation,
        place_of_issue: form.place_of_issue || undefined, visa_no: form.visa_no,
        contact_person: form.contact_person,
        id_type: isForeigner ? 'PASSPORT' : form.id_type, id_number: form.id_number,
        room_type: Number(form.room_type),
        room_id: form.room_id ? Number(form.room_id) : null,
        rate_plan: form.rate_plan ? Number(form.rate_plan) : null,
        check_in_date: form.check_in_date, check_out_date: form.check_out_date,
        arrival_time: form.arrival_time || null, departure_time: form.departure_time || null,
        num_rooms: Number(form.num_rooms) || 1,
        adults: Number(form.adults), children: Number(form.children),
        infants: Number(form.infants), extra_bed: Number(form.extra_bed),
        guest_type: form.guest_type, purpose_of_visit: form.purpose_of_visit,
        coming_from: form.coming_from, booking_source: form.booking_source,
        company_name: form.company_name,
        rack_rate:           parseFloat(form.rack_rate)           || 0,
        offer_rate:          parseFloat(form.base_offer_rate || form.rack_rate) || 0,
        discount_pct:        parseFloat(form.discount_pct)        || 0,
        discount_amount:     parseFloat(form.discount_amount)     || 0,
        service_charge_pct:  parseFloat(form.service_charge_pct)  || 0,
        vat_pct:             parseFloat(form.vat_pct)             || 0,
        payment_amount:  parseFloat(form.payment_amount)  || 0,
        payment_method:  form.payment_method,
        dnm:              bool('dnm'),
        no_post:          bool('no_post'),
        is_travel_agency: bool('is_travel_agency'),
        non_smoking:      bool('non_smoking'),
        pickup_required: form.pickup_required, flight_pickup_no: form.flight_pickup_no, flight_eta: form.flight_eta,
        drop_required:   form.drop_required,   flight_drop_no:   form.flight_drop_no,   flight_etd: form.flight_etd,
        special_requests: form.special_requests, profile_note: form.profile_note,
        reference_source: form.reference_source,
        guest_hobbies: form.guest_hobbies,
        guest_preferences: form.guest_preferences,
        airport_details: form.airport_details,
        transport_notes: form.transport_notes,
        parent_booking_id: form.parent_booking_id ? Number(form.parent_booking_id) : null,
      });
      toast.success('Reservation created successfully');
      onSuccess();
    } catch (err: any) {
      toast.error(formatApiError(err?.response?.data));
    } finally { setLoading(false); }
  };

  const roomReady = canPickRoom(form.room_type, form.check_in_date, form.check_out_date);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
      e.preventDefault();
      const formElements = Array.from(
        e.currentTarget.querySelectorAll('input, select, textarea, button[type="submit"]')
      ) as HTMLElement[];
      const index = formElements.indexOf(target);
      if (index > -1 && index < formElements.length - 1) {
        formElements[index + 1].focus();
      }
    }
  };

  /* ─────────────────────────────── RENDER ──────────────────────────────── */
  return (
    <div
      className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-2 sm:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-modal-title"
    >
      <div
        className="bg-[#eceef2] border border-slate-300 rounded-sm
                   w-full max-w-5xl max-h-[96vh]
                   flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)]"
      >

        {/* ── title bar (classic PMS) ── */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-slate-700 to-slate-600 shrink-0">
          <span id="reservation-modal-title" className="text-sm font-semibold text-white tracking-wide">
            Reservation Entry
          </span>
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="text-white/70 hover:text-white rounded-sm focus:outline-none focus:ring-2 focus:ring-white/50 p-0.5 transition-colors"
          >
            <MdClose size={16} />
          </button>
        </div>

        {/* ── top toolbar ── */}
        <div className="flex items-center gap-3 px-3 py-2 bg-slate-200/80 border-b border-slate-300 shrink-0">
          <div className="flex-1 min-w-0">
            <Field id="company_name" label="Company Name">
              <input id="company_name" type="text"
                value={form.company_name} onChange={e => set('company_name', e.target.value)}
                className={INP} placeholder="N/A" />
            </Field>
          </div>
          <div className="flex-1 min-w-0">
            <Field id="guest_type" label="Guest Type">
              <select id="guest_type" value={form.guest_type}
                onChange={e => set('guest_type', e.target.value)} className={SEL}>
                <option value="">— Select —</option>
                <option value="FIT">FIT</option>
                <option value="GROUP">Group</option>
                <option value="CORPORATE">Corporate</option>
                <option value="VIP">VIP</option>
                <option value="GOVERNMENT">Government</option>
                <option value="DIPLOMATIC">Diplomatic</option>
              </select>
            </Field>
          </div>
          <div className="min-w-[11.5rem] shrink-0">
            <Field id="status" label="Status" compact>
              <select id="status" value={form.status}
                onChange={e => set('status', e.target.value)} className={SEL}>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING">Pending</option>
              </select>
            </Field>
          </div>
          <div className="shrink-0 flex gap-2">
            <button type="button" disabled
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-sm bg-slate-100 text-slate-400 cursor-not-allowed">
              Reg. Report
            </button>
            <button type="button" disabled
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-sm bg-slate-100 text-slate-400 cursor-not-allowed">
              Confirmation
            </button>
          </div>
        </div>

        {/* ── scrollable body ── */}
        <div className="overflow-y-auto overflow-x-hidden flex-1">
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="px-3 pb-3 pt-2 min-w-0 [color-scheme:light]">

            <Section title="Guest Information">
            {/* ══ Row 1 — Conf No + Title | Mode of Payment ══ */}
            <Row>
              <Split label="Conf. No. / Title" cols="grid-cols-[minmax(0,1fr)_4.5rem]" wide>
                <input type="text" disabled placeholder="Auto"
                  className={FIELD_BASE + ' min-w-0 w-full bg-slate-100'} tabIndex={-1} aria-hidden />
                <select id="designation" value={form.designation}
                  onChange={e => set('designation', e.target.value)}
                  className={FIELD_BASE + ' w-full cursor-pointer'}>
                  <option value="">Title</option>
                  <option value="MR">Mr.</option>
                  <option value="MRS">Mrs.</option>
                  <option value="MS">Ms.</option>
                  <option value="DR">Dr.</option>
                  <option value="PROF">Prof.</option>
                </select>
              </Split>
              <Field id="payment_method" label="Mode of Payment" wide>
                <select id="payment_method" value={form.payment_method}
                  onChange={e => set('payment_method', e.target.value)} className={SEL}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                </select>
              </Field>
            </Row>

            {/* ══ Row 2 — Last Name | Passport / NID ══ */}
            <Row>
              <Field id="last_name" label="Last Name">
                <input id="last_name" type="text" value={form.last_name}
                  onChange={e => set('last_name', e.target.value)}
                  className={INP} placeholder="Last name" />
              </Field>
              <Split
                label={isForeigner ? 'Passport No.' : 'Passport / NID No.'}
                cols={isForeigner ? 'grid-cols-1' : 'grid-cols-[6.5rem_minmax(0,1fr)]'}
              >
                {!isForeigner && (
                  <select id="id_type" value={form.id_type}
                    onChange={e => set('id_type', e.target.value)}
                    className={FIELD_BASE + ' w-full cursor-pointer'}>
                    <option value="">Type</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="NID">NID</option>
                    <option value="DRIVING_LICENSE">License</option>
                  </select>
                )}
                <input id="id_number" type="text" value={form.id_number}
                  onChange={e => set('id_number', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'} placeholder="N/A" />
              </Split>
            </Row>

            {/* ══ Row 3 — First Name * | DOB + Gender / Place of Issue + Visa ══ */}
            <Row>
              <Field id="first_name" label="First Name *">
                <input id="first_name" type="text" value={form.first_name}
                  onChange={e => set('first_name', e.target.value)}
                  className={INP} placeholder="First name" />
              </Field>
              {isForeigner ? (
                <div className="flex flex-col gap-0 min-w-0">
                  <Field id="place_of_issue" label="Place of Issue">
                    <input id="place_of_issue" type="text" value={form.place_of_issue}
                      onChange={e => set('place_of_issue', e.target.value)}
                      className={INP} placeholder="Country / city" />
                  </Field>
                  <Field id="visa_no" label="Visa No.">
                    <input id="visa_no" type="text" value={form.visa_no}
                      onChange={e => set('visa_no', e.target.value)}
                      className={INP} placeholder="Visa no." />
                  </Field>
                </div>
              ) : (
                <div className="flex flex-col gap-0 min-w-0">
                  <Field id="date_of_birth" label="Date of Birth">
                    <input id="date_of_birth" type="date" value={form.date_of_birth}
                      onChange={e => set('date_of_birth', e.target.value)} className={INP} />
                  </Field>
                  <Field id="gender" label="Gender">
                    <select id="gender" value={form.gender}
                      onChange={e => set('gender', e.target.value)} className={SEL}>
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </Field>
                </div>
              )}
            </Row>

            </Section>

            <Section title="Stay &amp; Transport">
            <Row>
              <Split label="Arrival Date" cols="grid-cols-[minmax(7rem,1fr)_4.5rem_2rem]" wide>
                <input id="check_in_date" type="date" value={form.check_in_date}
                  onChange={e => set('check_in_date', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'} />
                <input id="arrival_time" type="time" value={form.arrival_time}
                  onChange={e => set('arrival_time', e.target.value)}
                  className={FIELD_BASE + ' w-full'} />
                <div className="flex flex-col items-center justify-center bg-amber-50 border-2 border-amber-300 rounded-sm px-1.5 py-0.5">
                  <span className="text-[9px] font-semibold text-amber-700 leading-none">Nts</span>
                  <span className="text-xs font-bold text-amber-900 leading-none">{nights}</span>
                </div>
              </Split>
              <Split label="Pickup,Flt/ETA" cols="grid-cols-[2.75rem_minmax(0,1fr)_4.5rem]" wide>
                <select id="pickup_required" value={form.pickup_required}
                  onChange={e => set('pickup_required', e.target.value)}
                  className={FIELD_BASE + ' w-full cursor-pointer'}>
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
                <input id="flight_pickup_no" type="text" value={form.flight_pickup_no}
                  onChange={e => set('flight_pickup_no', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'}
                  placeholder="Flight No." disabled={form.pickup_required === 'NO'} />
                <input id="flight_eta" type="time" value={form.flight_eta}
                  onChange={e => set('flight_eta', e.target.value)}
                  className={FIELD_BASE + ' w-full'}
                  disabled={form.pickup_required === 'NO'} />
              </Split>
            </Row>

            {/* ══ Row 5 — Departure Date | Drop Flt/ETD ══ */}
            <Row>
              <Split label="Departure Date" cols="grid-cols-[minmax(7rem,1fr)_4.5rem]" wide>
                <input id="check_out_date" type="date" value={form.check_out_date}
                  min={form.check_in_date}
                  onChange={e => set('check_out_date', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'} />
                <input id="departure_time" type="time" value={form.departure_time}
                  onChange={e => set('departure_time', e.target.value)}
                  className={FIELD_BASE + ' w-full'} />
              </Split>
              <Split label="Drop,Flt/ETD" cols="grid-cols-[2.75rem_minmax(0,1fr)_4.5rem]" wide>
                <select id="drop_required" value={form.drop_required}
                  onChange={e => set('drop_required', e.target.value)}
                  className={FIELD_BASE + ' w-full cursor-pointer'}>
                  <option value="NO">NO</option>
                  <option value="YES">YES</option>
                </select>
                <input id="flight_drop_no" type="text" value={form.flight_drop_no}
                  onChange={e => set('flight_drop_no', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'}
                  placeholder="Flight No." disabled={form.drop_required === 'NO'} />
                <input id="flight_etd" type="time" value={form.flight_etd}
                  onChange={e => set('flight_etd', e.target.value)}
                  className={FIELD_BASE + ' w-full'}
                  disabled={form.drop_required === 'NO'} />
              </Split>
            </Row>

            </Section>

            <Section title="Contact &amp; Location">
            <Row>
              <Field id="country" label="Country">
                <SearchableSelect
                  id="country"
                  value={form.country}
                  onChange={v => set('country', v)}
                  options={COUNTRIES}
                  aliases={COUNTRY_ALIASES}
                  placeholder="Select country"
                  emptyLabel="N/A"
                  variant="light"
                />
              </Field>
              <Field id="contact_person" label="Contact Person">
                <input id="contact_person" type="text" value={form.contact_person}
                  onChange={e => set('contact_person', e.target.value)}
                  className={INP} placeholder="Contact person" />
              </Field>
            </Row>
            <Row>
              <Field id="nationality" label="Nationality">
                <SearchableSelect
                  id="nationality"
                  value={form.nationality}
                  onChange={v => set('nationality', v)}
                  options={NATIONALITIES}
                  placeholder="Nationality"
                  emptyLabel="N/A"
                  variant="light"
                />
              </Field>
              <Split label="Mail / Cell" cols={COL2} wide>
                <input id="guest_email" type="email" value={form.guest_email}
                  onChange={e => set('guest_email', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'} placeholder="Email *" />
                <input id="guest_phone" type="tel" value={form.guest_phone}
                  onChange={e => set('guest_phone', e.target.value)}
                  className={FIELD_BASE + ' min-w-0 w-full'} placeholder="Mobile" />
              </Split>
            </Row>
            <Row>
              <Field id="occupation" label="Occupation">
                <input id="occupation" type="text" value={form.occupation}
                  onChange={e => set('occupation', e.target.value)}
                  className={INP} placeholder="Occupation" autoComplete="off" />
              </Field>
              <Field id="address" label="Address" wide>
                <input id="address" type="text" value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className={INP} placeholder="Street, area, city"
                  autoComplete="off" />
              </Field>
            </Row>
            </Section>

            <Section title="Room &amp; Rates">
            {/* ══ Row 8 — Rate Plan | Room Type ══ */}
            <Row>
              <Field id="rate_plan" label="Rate Plan" wide>
                <select id="rate_plan" value={form.rate_plan}
                  onChange={e => set('rate_plan', e.target.value)} className={SEL}>
                  <option value="">N/A</option>
                  {ratePlans.map(rp => (
                    <option key={rp.id} value={rp.id}>
                      {rp.name} ({rp.code}) — {ratePlanHint(rp)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="room_type" label="Room Type *">
                <select id="room_type" value={form.room_type}
                  onChange={e => set('room_type', e.target.value)} className={SEL}>
                  <option value="">— Select room type —</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} — BDT {rt.price_per_night}/night (max {rt.max_guests})
                    </option>
                  ))}
                </select>
              </Field>
            </Row>

            {/* ══ Row 9 — Room No | No. of Rm | PAX | Extra Bed ══ */}
            <Row cols={COL_ROOM_ROW}>
              <Field id="room_id" label="Room No" compact>
                <select id="room_id" value={form.room_id}
                  onChange={e => set('room_id', e.target.value)}
                  className={SEL} disabled={!roomReady || roomsLoading}
                  title={form.room_id ? undefined : roomLabel()}>
                  <option value="">{roomLabel()}</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>Rm {r.room_number} (F{r.floor})</option>
                  ))}
                </select>
              </Field>
              <Field id="num_rooms" label="No. of Rm" compact tight>
                <input id="num_rooms" type="number" min="1" max="20"
                  value={form.num_rooms} onChange={e => set('num_rooms', e.target.value)}
                  className={INP_NUM} />
              </Field>
              <div className="flex items-center gap-4 min-w-0 shrink-0 relative z-0">
                <Split label="PAX" cols={COL_PAX} compact>
                  <input id="adults" type="number" min="1" max="20"
                    value={form.adults} onChange={e => set('adults', e.target.value)}
                    className={capInputClass} placeholder="Ad" title="Adults" />
                  <input id="children" type="number" min="0" max="20"
                    value={form.children} onChange={e => set('children', e.target.value)}
                    className={capInputClass} placeholder="Ch" title="Children" />
                  <input id="infants" type="number" min="0" max="20"
                    value={form.infants} onChange={e => set('infants', e.target.value)}
                    className={capInputClass} placeholder="In" title="Infants" />
                </Split>
                <Field id="extra_bed" label="Extra Bed" compactMed tight>
                  <input id="extra_bed" type="number" min="0" max={MAX_EXTRA_BEDS}
                    value={form.extra_bed} onChange={e => set('extra_bed', e.target.value)}
                    className={overCapacity ? capInputClass : INP_NUM}
                    title={`Max ${MAX_EXTRA_BEDS} extra beds`} />
                </Field>
              </div>
            </Row>

            {capacityWarning && (
              <div
                role="alert"
                className="mx-1 mb-1 flex items-start gap-2 rounded-sm border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium leading-snug text-amber-900"
              >
                <span className="shrink-0 font-bold text-amber-700">!</span>
                <span>{capacityWarning}</span>
              </div>
            )}

            {/* ══ Row 10 — Room Rent | Rack Rate | Discount % | Discount Amt ══ */}
            <Row cols={COL4}>
              <Field
                id="offer_rate"
                label={
                  pricing.pct > 0
                    ? `Room Rent (${pricing.pct}% disc.)`
                    : 'Room Rent (BDT)'
                }
                wide
              >
                <input id="offer_rate" type="number" step="0.01" min="0"
                  value={form.offer_rate} onChange={e => set('offer_rate', e.target.value)}
                  className={INP} placeholder="Net rate per night" />
              </Field>
              <Field id="rack_rate" label="Rack Rate (BDT)">
                <input id="rack_rate" type="number" step="0.01" min="0"
                  value={form.rack_rate} onChange={e => set('rack_rate', e.target.value)}
                  className={INP} placeholder="List rate" />
              </Field>
              <Field id="discount_pct" label="Discount (%)">
                <input id="discount_pct" type="number" step="0.01" min="0" max="100"
                  value={form.discount_pct} onChange={e => set('discount_pct', e.target.value)}
                  className={INP} />
              </Field>
              <Field id="discount_amount" label="Discount (BDT)">
                <input id="discount_amount" type="number" step="0.01" min="0"
                  value={form.discount_amount} onChange={e => set('discount_amount', e.target.value)}
                  className={INP} />
              </Field>
            </Row>

            <Row>
              <Field id="booking_source" label="Business Source" wide>
                <select id="booking_source" value={form.booking_source}
                  onChange={e => set('booking_source', e.target.value)} className={SEL}>
                  <option value="PHONE">Phone</option>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="WEBSITE">Website</option>
                  <option value="OTA">OTA</option>
                  <option value="AGENT">Agent</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </Field>
              <Field id="reference_source" label="Ref Source">
                <select id="reference_source" value={form.reference_source}
                  onChange={e => set('reference_source', e.target.value)} className={SEL}>
                  <option value="">— Select Reference —</option>
                  <option value="Booking.com">Booking.com</option>
                  <option value="Agoda">Agoda</option>
                  <option value="Expedia">Expedia</option>
                  <option value="Direct Call">Direct Call</option>
                  <option value="Email">Email</option>
                  <option value="Walk In">Walk In</option>
                  <option value="Local Corporate">Local Corporate</option>
                </select>
              </Field>
            </Row>
            <Row>
              <Field id="parent_booking_id" label="Parent Invoice" wide>
                <input id="parent_booking_id" type="number" min="1"
                  value={form.parent_booking_id} onChange={e => set('parent_booking_id', e.target.value)}
                  className={INP} placeholder="Parent Booking ID for Group Billing" />
              </Field>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-[2px] pl-[1.5rem]">
                <Chk id="chk_dnm"  checked={bool('dnm')}  onChange={() => toggle('dnm')}  label="DNM" />
                <Chk id="chk_ta"   checked={bool('is_travel_agency')} onChange={() => toggle('is_travel_agency')} label="Travel Agency" />
                <Chk id="chk_np"   checked={bool('no_post')} onChange={() => toggle('no_post')} label="No Post" />
                <Chk id="chk_ns"   checked={bool('non_smoking')} onChange={() => toggle('non_smoking')} label="Non-Smoking" />
              </div>
            </Row>
            <Row>
              <Field id="service_charge_pct" label="Ser. (%)">
                <input id="service_charge_pct" type="number" step="0.01" min="0" max="100"
                  value={form.service_charge_pct} onChange={e => set('service_charge_pct', e.target.value)}
                  className={INP} />
              </Field>
              <Field id="vat_pct" label="Vat (%)">
                <input id="vat_pct" type="number" step="0.01" min="0" max="100"
                  value={form.vat_pct} onChange={e => set('vat_pct', e.target.value)}
                  className={INP} />
              </Field>
            </Row>
            <Row>
              <Field id="purpose_of_visit" label="Purpose" wide>
                <input id="purpose_of_visit" type="text" value={form.purpose_of_visit}
                  onChange={e => set('purpose_of_visit', e.target.value)}
                  className={INP} placeholder="Purpose of visit" />
              </Field>
              <Field id="coming_from" label="Coming From">
                <input id="coming_from" type="text" value={form.coming_from}
                  onChange={e => set('coming_from', e.target.value)}
                  className={INP} placeholder="City / Country" />
              </Field>
            </Row>
            </Section>

            <Section title="Guest Profiling">
            <Row>
              <Field id="guest_hobbies" label="Hobbies" wide>
                <input id="guest_hobbies" type="text" value={form.guest_hobbies}
                  onChange={e => set('guest_hobbies', e.target.value)}
                  className={INP} placeholder="E.g., Reading, Golf" />
              </Field>
              <Field id="guest_preferences" label="Preferences">
                <input id="guest_preferences" type="text" value={form.guest_preferences}
                  onChange={e => set('guest_preferences', e.target.value)}
                  className={INP} placeholder="E.g., Extra pillows, Quiet room" />
              </Field>
            </Row>
            </Section>

            <Section title="Logistics & Transport">
            <Row>
              <Field id="airport_details" label="Airport Details" wide>
                <input id="airport_details" type="text" value={form.airport_details}
                  onChange={e => set('airport_details', e.target.value)}
                  className={INP} placeholder="E.g., DAC Terminal 1" />
              </Field>
              <Field id="transport_notes" label="Transport Notes">
                <input id="transport_notes" type="text" value={form.transport_notes}
                  onChange={e => set('transport_notes', e.target.value)}
                  className={INP} placeholder="E.g., VIP Transport" />
              </Field>
            </Row>
            </Section>

            <Section title="Payment">
            <Row>
              <Field id="payment_amount" label="Advance (BDT)" wide>
                <input id="payment_amount" type="number" step="0.01" min="0"
                  max={grandTotal > 0 ? grandTotal : undefined}
                  value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)}
                  className={
                    INP + (paymentBalance.overpaid > 0
                      ? ' !border-red-500 !bg-red-50/60 focus:!border-red-600 focus:!ring-red-500/35'
                      : '')
                  }
                  title={grandTotal > 0 ? `Maximum advance: BDT ${grandTotal.toFixed(2)}` : undefined}
                />
              </Field>
              <div className="group/field flex items-start gap-1.5 min-w-0 py-0.5">
                <span className={`${LBL_W} font-semibold text-amber-900 pt-1.5`}>Summary</span>
                <div className={`flex-1 min-w-0 rounded-sm px-2.5 py-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] border-2 ${
                  paymentBalance.overpaid > 0
                    ? 'bg-red-50 border-red-400'
                    : 'bg-amber-50 border-amber-300'
                }`}>
                  <p className="text-[10px] font-medium text-amber-800 leading-none">
                    Room: BDT {pricing.grossStay.toFixed(2)}
                    {pricing.discAmt > 0 ? ` − ${pricing.discAmt.toFixed(2)}` : ''}
                    {pricing.n > 0 ? ` · ${pricing.n} nt × ${numRooms} rm` : ''}
                    {pricing.n > 0 ? ` → BDT ${pricing.subtotal.toFixed(2)}` : ''}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-sm font-semibold text-amber-950 leading-tight">
                      Grand Total: <span className="font-bold">BDT {grandTotal.toFixed(2)}</span>
                      <span className="text-[10px] font-medium text-amber-700"> (incl. tax)</span>
                    </p>
                    {advanceAmount > 0 ? (
                      <>
                        <p className="text-xs font-medium text-emerald-800 leading-tight">
                          Advance: BDT {advanceAmount.toFixed(2)}
                        </p>
                        {paymentBalance.overpaid > 0 ? (
                          <p className="text-xs font-semibold text-red-700 leading-tight">
                            Overpaid by BDT {paymentBalance.overpaid.toFixed(2)} — reduce advance to max BDT {grandTotal.toFixed(2)}
                          </p>
                        ) : paymentBalance.fullyPaid ? (
                          <p className="text-sm font-bold text-emerald-700 leading-tight">
                            Due: BDT 0.00 · Fully paid
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-amber-950 leading-tight">
                            Due: BDT {paymentBalance.due.toFixed(2)}
                          </p>
                        )}
                      </>
                    ) : grandTotal > 0 && (
                      <p className="text-sm font-bold text-amber-950 leading-tight">
                        Due: BDT {grandTotal.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Row>
            </Section>

            {/* ══ Remarks & Profile Note ══ */}
            <Section>
            <Field id="special_requests" label="Remarks" wide>
              <textarea id="special_requests" rows={2} value={form.special_requests}
                onChange={e => set('special_requests', e.target.value)}
                className={TAREA + ' resize-y'}
                placeholder="Special requests or remarks…" />
            </Field>
            <Field id="profile_note" label="Profile Note" wide>
              <textarea id="profile_note" rows={2} value={form.profile_note}
                onChange={e => set('profile_note', e.target.value)}
                className={TAREA + ' resize-y'}
                placeholder="Internal profile notes…" />
            </Field>
            </Section>

            {/* ══ Footer ══ */}
            <div className="flex gap-2 pt-2 border-t border-slate-300 mt-1">
              <button
                type="button" onClick={onClose}
                className="px-5 py-2 border-2 border-slate-300 rounded-sm bg-slate-100 text-slate-700 text-sm font-medium
                           hover:bg-slate-200 hover:border-slate-400
                           focus:outline-none focus:ring-4 focus:ring-slate-300/60 focus:border-slate-400 transition"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2
                           bg-blue-600 border-2 border-blue-700 rounded-sm text-white text-sm font-semibold
                           hover:bg-blue-700 hover:border-blue-800
                           focus:outline-none focus:ring-4 focus:ring-blue-400/50 focus:border-blue-800
                           transition disabled:opacity-50 shadow-sm"
              >
                <MdEventAvailable size={15} />
                {loading ? 'Creating…' : 'Create Reservation'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
