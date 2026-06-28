import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import ReservationFormView from './ReservationFormView';
import api from '../../services/api';
import {
  canPickRoom,
  fetchAvailableRooms,
  nightsBetween,
  type AvailableRoom,
} from '../utils/fetchAvailableRooms';
import {
  checkRoomCapacity,
  formatCapacityWarning,
} from '../utils/roomCapacity';
import {
  computeRatePlanPricing,
  isRatePlanApplicable,
  type RatePlan,
} from '../utils/ratePlanPricing';
import { useEnterNav } from '../../hooks/useEnterNav';

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
  return parts.join(' Â· ') || 'Failed to create reservation';
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
  const formRef = useRef<HTMLFormElement>(null);

  useEnterNav(formRef);

  const isForeigner = form.country.trim() !== '' &&
    !form.country.toLowerCase().includes('bangladesh');

  /* â”€â”€ data loaders â”€â”€â”€ */
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

  /* â”€â”€ available rooms â”€â”€â”€ */
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

  /* â”€â”€ grand total (incl. service + VAT on subtotal after discount) â”€â”€â”€ */
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

  /* â”€â”€ field setter â”€â”€â”€ */
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
    if (roomsLoading)          return 'Loadingâ€¦';
    if (availableRooms.length) return 'Auto-assign';
    return 'No rooms';
  };

  /* â”€â”€ submit â”€â”€â”€ */
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

  const roomReady = !!(form.room_type && form.check_in_date && form.check_out_date);

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ');
  const setFullName = (v: string) => {
    const parts = v.trim().split(/\s+/).filter(Boolean);
    setForm(f => ({ ...f, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' }));
  };
  const statusLabel = form.status === 'CONFIRMED' ? 'Confirmed' : 'Pending';
  const docType = form.id_type === 'NID' ? 'NID' : 'PASSPORT';
  const pickupOn = form.pickup_required === 'YES';

  return (
    <ReservationFormView
      formRef={formRef}
      form={form}
      set={(k, v) => set(k as keyof typeof EMPTY_FORM, v)}
      setFullName={setFullName}
      fullName={fullName}
      toggle={toggle}
      bool={bool}
      isForeigner={isForeigner}
      docType={docType}
      statusLabel={statusLabel}
      pickupOn={pickupOn}
      nights={nights}
      grandTotal={grandTotal}
      overCapacity={overCapacity}
      capacityWarning={capacityWarning}
      roomReady={roomReady}
      roomsLoading={roomsLoading}
      roomLabel={roomLabel}
      roomTypes={roomTypes}
      ratePlans={ratePlans}
      availableRooms={availableRooms}
      paymentBalance={paymentBalance}
      advanceAmount={advanceAmount}
      loading={loading}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
