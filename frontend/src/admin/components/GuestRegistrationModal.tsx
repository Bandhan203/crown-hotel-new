import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdUploadFile, MdSave, MdBadge, MdLogin, MdPrint } from 'react-icons/md';
import api from '../../services/api';
import { useEnterNav } from '../../hooks/useEnterNav';
import { fetchAvailableRooms, nightsBetween, type AvailableRoom } from '../utils/fetchAvailableRooms';
import {
  type RegistrationData,
  type RegistrationMode,
  buildRegistrationPayload,
  hydrateRegistrationForm,
} from './registration/registrationTypes';

interface RoomType { id: number; name: string; price_per_night: string; }

interface Props {
  mode?: RegistrationMode;
  bookingId?: number;
  registrationId?: number;
  onClose: () => void;
  onSuccess?: () => void;
  onRefresh?: () => void;
  checkInMode?: boolean;
}

type DialogPhase = null | 'billing' | 'update_confirm';

const DESIGNATIONS = [
  { value: '', label: 'Select' },
  { value: 'MR', label: 'Mr.' },
  { value: 'MRS', label: 'Mrs.' },
  { value: 'MS', label: 'Ms.' },
  { value: 'DR', label: 'Dr.' },
  { value: 'PROF', label: 'Prof.' },
];

const GUEST_TYPES = [
  { value: '', label: 'Select' },
  { value: 'FIT', label: 'FIT (Free Individual Traveler)' },
  { value: 'GROUP', label: 'Group' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'VIP', label: 'VIP' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'DIPLOMATIC', label: 'Diplomatic' },
];

const GENDERS = [
  { value: '', label: 'Select' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const ID_TYPES = [
  { value: '', label: 'Select' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'NID', label: 'National ID' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
];

const BOOKING_SOURCES = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'OTA', label: 'OTA' },
  { value: 'AGENT', label: 'Agent' },
  { value: 'CORPORATE', label: 'Corporate' },
];

function buildPayload(data: RegistrationData, roomId: string, roomTypeId: string) {
  return buildRegistrationPayload(data, roomId, roomTypeId);
}

export default function RegistrationModule({
  mode = 'advance',
  bookingId,
  registrationId: initialRegistrationId,
  onClose,
  onSuccess,
  onRefresh,
  checkInMode = false,
}: Props) {
  const [registrationId, setRegistrationId] = useState<number | null>(initialRegistrationId ?? null);
  const [data, setData] = useState<RegistrationData | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInComplete, setCheckInComplete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [dialog, setDialog] = useState<DialogPhase>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEnterNav(formRef);

  const isWalkIn = mode === 'walk-in';
  const canCheckIn = isWalkIn
    ? data?.status !== 'CHECKED_IN'
    : data?.status === 'PENDING' || data?.status === 'CONFIRMED';
  const isCheckedIn = data?.status === 'CHECKED_IN';

  useEffect(() => {
    if (isWalkIn) {
      api.get('/rooms/').then(r => setRoomTypes(r.data.results ?? r.data)).catch(() => {});
    }
  }, [isWalkIn]);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;

    async function load() {
      try {
        let payload: RegistrationData;
        if (isWalkIn && !registrationId && !bookingId) {
          const res = await api.post('/admin/registrations/', { mode: 'WALK_IN' });
          payload = hydrateRegistrationForm(res.data);
          if (!cancelled) setRegistrationId(payload.registration_id);
        } else if (bookingId) {
          const res = await api.get(`/admin/registrations/by-booking/${bookingId}/`);
          payload = hydrateRegistrationForm(res.data);
          if (!cancelled) setRegistrationId(payload.registration_id);
        } else if (registrationId) {
          const res = await api.get(`/admin/registrations/${registrationId}/`);
          payload = hydrateRegistrationForm(res.data);
        } else {
          return;
        }
        if (!cancelled) {
          setData(payload);
          setRoomId(payload.room_id ? String(payload.room_id) : '');
          setRoomTypeId(payload.room_type_id ? String(payload.room_type_id) : '');
          setHydrated(true);
        }
      } catch {
        if (!cancelled) toast.error('Failed to load registration');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [bookingId, registrationId, isWalkIn, hydrated]);

  useEffect(() => {
    if (!isWalkIn || !roomTypeId) return;
    const rt = roomTypes.find(r => r.id === Number(roomTypeId));
    if (rt && data) {
      setData(d => d ? {
        ...d,
        room_type_id: rt.id,
        room_type_name: rt.name,
        rack_rate: d.rack_rate || rt.price_per_night,
        offer_rate: d.offer_rate || rt.price_per_night,
      } : d);
    }
  }, [roomTypeId, roomTypes, isWalkIn]);

  useEffect(() => {
    if (!data?.check_in_date || !data?.check_out_date) return;
    const n = nightsBetween(data.check_in_date, data.check_out_date);
    if (n !== data.nights) setData(d => d ? { ...d, nights: n } : d);
  }, [data?.check_in_date, data?.check_out_date]);

  useEffect(() => {
    const rtId = data?.room_type_id;
    if (!rtId || !canCheckIn || !data?.check_in_date || !data?.check_out_date) return;
    let cancelled = false;
    setRoomsLoading(true);
    fetchAvailableRooms(rtId, data.check_in_date, data.check_out_date, data.booking_id ?? undefined)
      .then(rooms => {
        if (cancelled) return;
        let list = rooms;
        if (data.room_id && data.room_type_id && !rooms.some(r => r.id === data.room_id)) {
          list = [
            {
              id: data.room_id,
              room_number: data.room_number || String(data.room_id),
              floor: 0,
              status: 'RESERVED',
              room_type: data.room_type_name,
              room_type_id: data.room_type_id,
            },
            ...rooms,
          ];
        }
        setAvailableRooms(list);
      })
      .catch(() => { if (!cancelled) setAvailableRooms([]); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, [data, canCheckIn]);

  const set = (key: keyof RegistrationData, value: string | number) =>
    setData(d => d ? { ...d, [key]: value } : d);

  const isForeigner = data && data.country.trim() !== '' && !data.country.toLowerCase().includes('bangladesh');

  const handleUpdate = async () => {
    if (!data || !registrationId) return;
    setSaving(true);
    try {
      const payload = buildPayload(data, roomId, roomTypeId);
      if (isForeigner) payload.id_type = 'PASSPORT';
      await api.put(`/admin/registrations/${registrationId}/`, payload);
      toast.success('Registration updated — guest list and ledger synchronized');
      onRefresh?.();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Failed to update registration');
    } finally {
      setSaving(false);
      setDialog(null);
    }
  };

  const handleCheckIn = async (billingType: 'GUEST' | 'COMPANY') => {
    if (!data || !registrationId) return;
    if (!data.first_name?.trim()) {
      toast.error('First name is required before check-in');
      return;
    }
    if (!data.guest_email?.trim()) {
      toast.error('Email is required before check-in');
      return;
    }
    if (isWalkIn && !roomTypeId) {
      toast.error('Room type is required');
      return;
    }
    if (billingType === 'COMPANY' && !data.company_name?.trim()) {
      toast.error('Company name is required for Company Payment billing');
      return;
    }
    setCheckingIn(true);
    try {
      const payload = {
        ...buildPayload({ ...data, billing_type: billingType }, roomId, roomTypeId),
        billing_type: billingType,
      };
      if (isForeigner) payload.id_type = 'PASSPORT';
      const res = await api.post(`/admin/registrations/${registrationId}/check-in/`, payload);
      const updated = hydrateRegistrationForm(res.data.registration);
      toast.success(`${data.first_name || 'Guest'} checked in successfully`);
      setData(updated);
      setCheckInComplete(true);
      setDialog(null);
      onRefresh?.();
      await printRegistrationCard(updated.booking_id ?? data.booking_id);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  const printRegistrationCard = useCallback(async (bid?: number | null) => {
    const pdfBookingId = bid ?? data?.booking_id;
    if (!pdfBookingId) {
      toast.error('No booking linked for registration card');
      return;
    }
    setPrinting(true);
    try {
      const res = await api.get(`/admin/reservations/${pdfBookingId}/registration/pdf/`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.focus();
      else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `registration_${data?.booking_ref ?? bookingId}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Failed to generate registration card');
    } finally {
      setPrinting(false);
    }
  }, [data?.booking_id, data?.booking_ref]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const uploadBookingId = data?.booking_id;
    if (!file || !uploadBookingId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('registration_card', file);
      const res = await api.post(
        `/admin/reservations/${uploadBookingId}/registration/upload/`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setData(d => d ? { ...d, registration_card: res.data.registration_card } : d);
      toast.success('Registration card uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const inputClass = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600';
  const labelClass = 'block text-xs text-gray-500 mb-1';
  const selectClass = inputClass + ' appearance-none';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <p className="text-gray-500">Loading registration...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sym = data.currency || 'BDT';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col">

          <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                <MdBadge className="text-teal-700" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {isWalkIn ? 'Fast-Track Registration' : 'Registration Module'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {data.registration_ref}
                  {data.booking_ref ? ` · ${data.booking_ref}` : ''}
                  {data.guest_email ? ` — ${data.guest_email}` : ''}
                  <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700">
                    {data.status.replace('_', ' ')}
                  </span>
                  {checkInMode && canCheckIn && (
                    <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
                      Check-in mode
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-slate-800">
              <MdClose size={22} />
            </button>
          </div>

          {checkInMode && canCheckIn && (
            <div className="mx-5 mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-900">
              <strong>Check-in procedure:</strong> Verify guest details → assign room → click <strong>Check In</strong> →
              select billing type → print registration card → upload signed copy.
            </div>
          )}

          {checkInComplete && (
            <div className="mx-5 mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-900">
              Guest is checked in. Print the registration card, collect signature, then upload the signed copy below.
              Click <strong>Done</strong> when finished.
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={e => { e.preventDefault(); setDialog('update_confirm'); }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              <Section title="Guest Information">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelClass}>Designation</label>
                    <select value={data.designation} onChange={e => set('designation', e.target.value)} className={selectClass}>
                      {DESIGNATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>First Name</label>
                    <input type="text" value={data.first_name} onChange={e => set('first_name', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <input type="text" value={data.last_name} onChange={e => set('last_name', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Gender</label>
                    <select value={data.gender} onChange={e => set('gender', e.target.value)} className={selectClass}>
                      {GENDERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input type="date" value={data.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nationality</label>
                    <input list="nationalities_guest" type="text" value={data.nationality} onChange={e => set('nationality', e.target.value)} className={inputClass} />
                    <datalist id="nationalities_guest">
                      <option value="Bangladeshi" /><option value="Indian" /><option value="American" />
                      <option value="British" /><option value="Canadian" /><option value="Australian" />
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>Occupation</label>
                    <input type="text" value={data.occupation} onChange={e => set('occupation', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Type of Guest</label>
                    <select value={data.guest_type} onChange={e => set('guest_type', e.target.value)} className={selectClass}>
                      {GUEST_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </Section>

              <Section title="Contact Details">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Email {isWalkIn && <span className="text-red-500">*</span>}</label>
                    <input
                      type="email"
                      value={data.guest_email}
                      onChange={e => set('guest_email', e.target.value)}
                      disabled={!isWalkIn && !!data.booking_id}
                      className={inputClass + (!isWalkIn && data.booking_id ? ' opacity-50' : '')}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Mobile No</label>
                    <input type="text" value={data.guest_phone} onChange={e => set('guest_phone', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Cell / Contact Person</label>
                    <input type="text" value={data.contact_person} onChange={e => set('contact_person', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Address</label>
                    <input type="text" value={data.address} onChange={e => set('address', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input list="countries_guest" type="text" value={data.country} onChange={e => set('country', e.target.value)} className={inputClass} />
                    <datalist id="countries_guest">
                      <option value="Bangladesh" /><option value="India" /><option value="United States" />
                      <option value="United Kingdom" /><option value="Canada" /><option value="Australia" />
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>Company Name</label>
                    <input type="text" value={data.company_name} onChange={e => set('company_name', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Business Source</label>
                    <select value={data.booking_source} onChange={e => set('booking_source', e.target.value)} className={selectClass}>
                      {BOOKING_SOURCES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </Section>

              <Section title="Identity & Travel Documents">
                <div className="grid grid-cols-2 gap-3">
                  {isForeigner ? (
                    <>
                      <div>
                        <label className={labelClass}>Passport Number</label>
                        <input type="text" value={data.id_number} onChange={e => set('id_number', e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Visa No</label>
                        <input type="text" value={data.visa_no} onChange={e => set('visa_no', e.target.value)} className={inputClass} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className={labelClass}>Passport / NID</label>
                        <select value={data.id_type} onChange={e => set('id_type', e.target.value)} className={selectClass}>
                          {ID_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>ID Number</label>
                        <input type="text" value={data.id_number} onChange={e => set('id_number', e.target.value)} className={inputClass} />
                      </div>
                    </>
                  )}
                </div>
              </Section>

              <Section title={isWalkIn ? 'Stay Details' : 'Stay Details (from booking)'}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className={labelClass}>Registration No</label><input type="text" value={data.registration_ref} disabled className={inputClass + ' opacity-50 font-mono'} /></div>
                  {data.booking_ref && (
                    <div><label className={labelClass}>Confirmation No</label><input type="text" value={data.booking_ref} disabled className={inputClass + ' opacity-50 font-mono'} /></div>
                  )}
                  <div>
                    <label className={labelClass}>Room Type {isWalkIn && '*'}</label>
                    {isWalkIn ? (
                      <select
                        value={roomTypeId}
                        onChange={e => { setRoomTypeId(e.target.value); setRoomId(''); }}
                        className={selectClass}
                      >
                        <option value="">Select room type</option>
                        {roomTypes.map(rt => (
                          <option key={rt.id} value={rt.id}>{rt.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={data.room_type_name} disabled className={inputClass + ' opacity-50'} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Room No</label>
                    {canCheckIn ? (
                      <select
                        value={roomId}
                        onChange={e => setRoomId(e.target.value)}
                        disabled={roomsLoading}
                        className={selectClass}
                      >
                        <option value="">
                          {roomsLoading ? 'Loading…' : availableRooms.length ? 'Auto-assign' : data.room_number || 'No rooms'}
                        </option>
                        {availableRooms.map(r => (
                          <option key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={data.room_number || '—'} disabled className={inputClass + ' opacity-50'} />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Check-in Date</label>
                    {isWalkIn ? (
                      <input type="date" value={data.check_in_date} onChange={e => set('check_in_date', e.target.value)} className={inputClass} />
                    ) : (
                      <input type="text" value={data.check_in_date} disabled className={inputClass + ' opacity-50'} />
                    )}
                  </div>
                  <div><label className={labelClass}>Check-in Time</label><input type="time" value={data.arrival_time || ''} onChange={e => set('arrival_time', e.target.value)} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Check-out Date</label>
                    {isWalkIn ? (
                      <input type="date" value={data.check_out_date} onChange={e => set('check_out_date', e.target.value)} className={inputClass} />
                    ) : (
                      <input type="text" value={data.check_out_date} disabled className={inputClass + ' opacity-50'} />
                    )}
                  </div>
                  <div><label className={labelClass}>No of Nights</label><input type="text" value={data.nights} disabled className={inputClass + ' opacity-50'} /></div>
                  <div><label className={labelClass}>Purpose of Visit</label><input type="text" value={data.purpose_of_visit} onChange={e => set('purpose_of_visit', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Coming From</label><input type="text" value={data.coming_from} onChange={e => set('coming_from', e.target.value)} className={inputClass} /></div>
                </div>
              </Section>

              <Section title="Room & Rates">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className={labelClass}>PAX (Adults)</label><input type="text" value={data.adults} disabled className={inputClass + ' opacity-50'} /></div>
                  <div><label className={labelClass}>Child</label><input type="text" value={data.children} disabled className={inputClass + ' opacity-50'} /></div>
                  <div>
                    <label className={labelClass}>Infant</label>
                    <input type="number" min="0" max="6" value={data.infants} onChange={e => set('infants', parseInt(e.target.value) || 0)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Extra Bed</label>
                    <input type="number" min="0" max="3" value={data.extra_bed} onChange={e => set('extra_bed', parseInt(e.target.value) || 0)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Rack Rate</label>
                    <input type="number" step="0.01" value={data.rack_rate} onChange={e => set('rack_rate', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Offer Rate</label>
                    <input type="number" step="0.01" value={data.offer_rate} onChange={e => set('offer_rate', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Discount</label>
                    <input type="number" step="0.01" value={data.discount_amount} onChange={e => set('discount_amount', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Deposit</label>
                    <input type="number" step="0.01" value={data.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} className={inputClass} />
                  </div>
                  <div><label className={labelClass}>Total Price</label><input type="text" value={`${sym} ${data.total_price}`} disabled className={inputClass + ' opacity-50'} /></div>
                  <div><label className={labelClass}>Grand Total</label><input type="text" value={`${sym} ${data.grand_total || data.total_price}`} disabled className={inputClass + ' opacity-50'} /></div>
                  {data.billing_type && (
                    <div><label className={labelClass}>Billing Type</label><input type="text" value={data.billing_type === 'COMPANY' ? 'Company Payment' : 'Guest Payment'} disabled className={inputClass + ' opacity-50'} /></div>
                  )}
                </div>
              </Section>

              <Section title="Remarks & Registration Card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Remarks</label>
                    <textarea rows={3} value={data.special_requests} onChange={e => set('special_requests', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Signed Registration Card (scan)</label>
                    <div className="space-y-2">
                      {data.registration_card && (
                        <a href={data.registration_card} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 hover:underline block truncate">
                          View current card
                        </a>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:border-teal-600 transition-colors">
                        <MdUploadFile className="text-teal-700" size={18} />
                        <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Upload signed card'}</span>
                        <input type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
                      </label>
                    </div>
                  </div>
                </div>
              </Section>

            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 shrink-0">
              <button type="button" onClick={checkInComplete ? () => onSuccess?.() : onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-slate-800 border border-gray-200 rounded-lg">
                {checkInComplete ? 'Done' : 'Cancel'}
              </button>
              {(isCheckedIn || checkInComplete) && (
                <button
                  type="button"
                  disabled={printing}
                  onClick={() => void printRegistrationCard()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 disabled:opacity-50"
                >
                  <MdPrint size={18} />
                  {printing ? 'Printing…' : 'Print Card'}
                </button>
              )}
              {!checkInComplete && (
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                >
                  <MdSave size={18} />
                  {saving ? 'Updating…' : 'Update'}
                </button>
              )}
              {canCheckIn && !checkInComplete && (
                <button
                  type="button"
                  disabled={checkingIn}
                  onClick={() => setDialog('billing')}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <MdLogin size={18} />
                  {checkingIn ? 'Checking in…' : 'Check In'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {dialog === 'billing' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Billing Configuration</h3>
            <p className="text-sm text-gray-500 mb-6">
              Select billing type before finalizing check-in for <strong>{data.booking_ref}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={checkingIn}
                onClick={() => void handleCheckIn('GUEST')}
                className="flex-1 py-2.5 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-60"
              >
                Guest Payment
              </button>
              <button
                type="button"
                disabled={checkingIn}
                onClick={() => void handleCheckIn('COMPANY')}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-slate-800 font-semibold text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Company Payment
              </button>
            </div>
            <button type="button" onClick={() => setDialog(null)} className="mt-4 w-full text-sm text-gray-500 hover:text-slate-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      {dialog === 'update_confirm' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Update</h3>
            <p className="text-sm text-gray-500 mb-6">Are You Sure You Want Update?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleUpdate()}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-teal-700 text-white font-semibold text-sm hover:bg-teal-600 disabled:opacity-60"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-slate-800 font-semibold text-sm hover:bg-gray-50"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-teal-700 mb-3 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}
