import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdPersonAdd, MdPerson, MdLocationOn, MdHotel, MdPayments, MdInfo } from 'react-icons/md';
import { INP, SEL, TAREA } from './ReservationFormView';
import api from '../../services/api';
import {
  canPickRoom,
  fetchAvailableRooms,
  nightsBetween,
  type AvailableRoom,
} from '../utils/fetchAvailableRooms';
import { useEnterNav } from '../../hooks/useEnterNav';

interface RoomType {
  id: number;
  name: string;
  price_per_night: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  guest_email: '',
  guest_phone: '',
  designation: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  nationality: '',
  country: '',
  address: '',
  occupation: '',
  place_of_issue: '',
  contact_person: '',
  visa_no: '',
  id_type: '',
  id_number: '',
  room_type: '',
  room_id: '',
  check_in_date: new Date().toISOString().split('T')[0],
  check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  arrival_time: '',
  adults: '1',
  children: '0',
  extra_bed: '0',
  guest_type: '',
  purpose_of_visit: '',
  coming_from: '',
  booking_source: 'WALK_IN',
  company_name: '',
  rack_rate: '',
  offer_rate: '',
  discount_amount: '0',
  deposit_amount: '0',
  special_requests: '',
};

export default function WalkInModal({ onClose, onSuccess }: Props) {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [nights, setNights] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEnterNav(formRef);

  const isForeigner = form.country.trim() !== '' && !form.country.toLowerCase().includes('bangladesh');

  useEffect(() => {
    api.get('/rooms/').then(res => {
      setRoomTypes(res.data.results ?? res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!canPickRoom(form.room_type, form.check_in_date, form.check_out_date)) {
      setAvailableRooms([]);
      setRoomsLoading(false);
      return;
    }
    let cancelled = false;
    setRoomsLoading(true);
    fetchAvailableRooms(form.room_type, form.check_in_date, form.check_out_date)
      .then(rooms => {
        if (cancelled) return;
        setAvailableRooms(rooms);
        setForm(f => {
          if (f.room_id && !rooms.some(r => r.id === Number(f.room_id))) {
            return { ...f, room_id: '' };
          }
          return f;
        });
      })
      .catch(() => { if (!cancelled) setAvailableRooms([]); })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, [form.room_type, form.check_in_date, form.check_out_date]);

  // Auto-set rack_rate when room type changes
  useEffect(() => {
    if (!form.room_type) return;
    const rt = roomTypes.find(r => r.id === Number(form.room_type));
    if (rt) {
      setForm(f => ({
        ...f,
        rack_rate: f.rack_rate || rt.price_per_night,
        offer_rate: f.offer_rate || rt.price_per_night,
      }));
    }
  }, [form.room_type, roomTypes]);

  // Recalculate nights and total price
  useEffect(() => {
    if (!form.check_in_date || !form.check_out_date) { setNights(0); setTotalPrice(0); return; }
    const n = nightsBetween(form.check_in_date, form.check_out_date);
    setNights(n);
    const offer = parseFloat(form.offer_rate || form.rack_rate || '0');
    const disc = parseFloat(form.discount_amount || '0');
    setTotalPrice(Math.max(0, offer * n - disc));
  }, [form.check_in_date, form.check_out_date, form.offer_rate, form.rack_rate, form.discount_amount]);

  const roomNoReady = canPickRoom(form.room_type, form.check_in_date, form.check_out_date);
  const roomNoPlaceholder = () => {
    if (!form.room_type) return 'Select room type first';
    if (!form.check_in_date || !form.check_out_date) return 'Set check-in & check-out dates';
    if (nightsBetween(form.check_in_date, form.check_out_date) <= 0) return 'Check-out must be after check-in';
    if (roomsLoading) return 'Loading rooms...';
    if (availableRooms.length) return 'Auto-assign (recommended)';
    return 'No rooms available for these dates';
  };

  const set = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm(f => {
      const next = { ...f, [key]: value };
      if (key === 'room_type') next.room_id = '';
      return next;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim()) { toast.error('First name is required'); return; }
    if (!form.guest_email.trim()) { toast.error('Email is required'); return; }
    if (!form.room_type) { toast.error('Room type is required'); return; }
    if (!form.check_out_date) { toast.error('Check-out date is required'); return; }
    if (nights <= 0) { toast.error('Check-out must be after check-in'); return; }

    setLoading(true);
    try {
      await api.post('/admin/reservations/walk-in/', {
        guest_email: form.guest_email,
        guest_phone: form.guest_phone,
        designation: form.designation,
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender,
        nationality: form.nationality,
        country: form.country,
        address: form.address,
        occupation: form.occupation,
        place_of_issue: form.place_of_issue,
        contact_person: form.contact_person,
        id_type: isForeigner ? 'PASSPORT' : form.id_type,
        id_number: form.id_number,
        visa_no: form.visa_no,
        room_type: Number(form.room_type),
        room_id: form.room_id ? Number(form.room_id) : null,
        check_in_date: form.check_in_date,
        check_out_date: form.check_out_date,
        arrival_time: form.arrival_time || null,
        adults: Number(form.adults),
        children: Number(form.children),
        extra_bed: Number(form.extra_bed),
        guest_type: form.guest_type,
        purpose_of_visit: form.purpose_of_visit,
        coming_from: form.coming_from,
        booking_source: form.booking_source,
        company_name: form.company_name,
        rack_rate: parseFloat(form.rack_rate) || 0,
        offer_rate: parseFloat(form.offer_rate) || 0,
        discount_amount: parseFloat(form.discount_amount) || 0,
        deposit_amount: parseFloat(form.deposit_amount) || 0,
        special_requests: form.special_requests,
      });
      toast.success('Guest registered and checked in successfully');
      onSuccess();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || 'Registration failed';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const inp = INP;
  const lbl = 'block text-xs font-semibold text-on-surface-variant tracking-wide mb-2';
  const req = <span className="text-primary">*</span>;

  const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ');
  const setFullName = (v: string) => {
    const parts = v.trim().split(/\s+/).filter(Boolean);
    setForm(f => ({ ...f, first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' }));
  };
  const docType = form.id_type === 'NID' ? 'NID' : 'PASSPORT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[10px] px-4 py-8" role="dialog" aria-modal="true">
      <div className="bg-surface w-full max-w-5xl max-h-[min(921px,96vh)] overflow-hidden rounded-2xl shadow-2xl flex flex-col border border-outline-variant">
        <div className="px-8 py-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-primary">New Guest Registration</h2>
            <p className="text-sm text-on-surface-variant mt-0.5">Register a new guest and check them in</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors">
            <MdClose size={22} />
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Guest Information */}
          <Section icon={<MdPerson />} title="Guest Information">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-2">
                <label className={lbl}>Title</label>
                <select value={form.designation} onChange={e => set('designation', e.target.value)} className={SEL}>
                  <option value="">Mr.</option>
                  <option value="MR">Mr.</option>
                  <option value="MRS">Mrs.</option>
                  <option value="MS">Ms.</option>
                  <option value="DR">Dr.</option>
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inp} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={SEL}>
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className={lbl}>Full Name {req}</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inp} placeholder="e.g. Johnathan Doe" />
              </div>
              <div className="col-span-6 md:col-span-4">
                <label className={lbl}>Guest Type</label>
                <select value={form.guest_type} onChange={e => set('guest_type', e.target.value)} className={SEL}>
                  <option value="">Standard Individual</option>
                  <option value="FIT">FIT</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              {!isForeigner && (
                <div className="col-span-12 md:col-span-8">
                  <label className={lbl}>Document Type</label>
                  <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant max-w-md">
                    <button type="button" onClick={() => set('id_type', 'PASSPORT')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${docType === 'PASSPORT' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}>Passport</button>
                    <button type="button" onClick={() => set('id_type', 'NID')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md ${docType === 'NID' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant'}`}>NID</button>
                  </div>
                </div>
              )}
              <div className="col-span-6 md:col-span-4">
                <label className={lbl}>Document Number</label>
                <input type="text" value={form.id_number} onChange={e => set('id_number', e.target.value)} className={inp} placeholder="ID number" />
              </div>
              <div className="col-span-6">
                <label className={lbl}>Contact Email {req}</label>
                <input type="email" value={form.guest_email} onChange={e => set('guest_email', e.target.value)} className={inp} placeholder="guest@example.com" />
              </div>
              <div className="col-span-6">
                <label className={lbl}>Phone Number</label>
                <input type="text" value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)} className={inp} placeholder="+880..." />
              </div>
            </div>
          </Section>

          <hr className="border-outline-variant" />

          {/* Contact & Location */}
          <Section icon={<MdLocationOn />} title="Contact & Location">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-4">
                <label className={lbl}>Country</label>
                <input type="text" value={form.country} onChange={e => set('country', e.target.value)} className={inp} placeholder="e.g. Bangladesh" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className={lbl}>Nationality</label>
                <input type="text" value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inp} placeholder="e.g. Bangladeshi" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className={lbl}>Occupation</label>
                <input type="text" value={form.occupation} onChange={e => set('occupation', e.target.value)} className={inp} placeholder="Profession" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className={lbl}>Company Name</label>
                <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)} className={inp} placeholder="Company" />
              </div>
              <div className="col-span-12 md:col-span-4">
                <label className={lbl}>Business Source</label>
                <select value={form.booking_source} onChange={e => set('booking_source', e.target.value)} className={SEL}>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="PHONE">Phone</option>
                  <option value="WEBSITE">Website</option>
                  <option value="OTA">OTA</option>
                </select>
              </div>
              {isForeigner && (
                <>
                  <div className="col-span-6 md:col-span-4">
                    <label className={lbl}>Place of Issue</label>
                    <input type="text" value={form.place_of_issue} onChange={e => set('place_of_issue', e.target.value)} className={inp} />
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <label className={lbl}>Visa No</label>
                    <input type="text" value={form.visa_no} onChange={e => set('visa_no', e.target.value)} className={inp} />
                  </div>
                </>
              )}
              <div className="col-span-12">
                <label className={lbl}>Full Address</label>
                <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)}
                  className={TAREA + ' h-20'} placeholder="Street, City, State..." />
              </div>
            </div>
          </Section>

          <hr className="border-outline-variant" />

          <Section icon={<MdHotel />} title="Stay & Room">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className={lbl}>Room Type {req}</label>
                <select value={form.room_type} onChange={e => set('room_type', e.target.value)} className={SEL}>
                  <option value="">Select room type...</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name} — BDT {rt.price_per_night}/night</option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Check-in Date {req}</label>
                <input type="date" value={form.check_in_date} onChange={e => set('check_in_date', e.target.value)} className={inp} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Check-out Date {req}</label>
                <input type="date" value={form.check_out_date} onChange={e => set('check_out_date', e.target.value)} min={form.check_in_date} className={inp} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Room No</label>
                <select value={form.room_id} onChange={e => set('room_id', e.target.value)} className={SEL}
                  disabled={!roomNoReady || roomsLoading}>
                  <option value="">{roomNoPlaceholder()}</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.room_number}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Nights</label>
                <input type="text" value={nights} disabled className={inp + ' opacity-60'} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Adults</label>
                <input type="number" min="1" max="4" value={form.adults} onChange={e => set('adults', e.target.value)} className={inp} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Children</label>
                <input type="number" min="0" max="3" value={form.children} onChange={e => set('children', e.target.value)} className={inp} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Offer Rate (BDT)</label>
                <input type="number" step="0.01" min="0" value={form.offer_rate} onChange={e => set('offer_rate', e.target.value)} className={inp} />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className={lbl}>Deposit (BDT)</label>
                <input type="number" step="0.01" min="0" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} className={inp} />
              </div>
              <div className="col-span-12 md:col-span-4 flex items-end">
                <div className="w-full bg-primary-container text-on-primary-container rounded-xl p-4">
                  <p className="text-xs uppercase opacity-80">Total</p>
                  <p className="text-2xl font-bold">BDT {totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </Section>

          <hr className="border-outline-variant" />

          <Section icon={<MdPayments />} title="Remarks">
            <textarea rows={3} value={form.special_requests} onChange={e => set('special_requests', e.target.value)}
              className={TAREA} placeholder="Any special requests or notes..." />
          </Section>
          </div>

          <div className="px-8 py-6 bg-surface-container-high border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <MdInfo className="text-primary text-xl shrink-0" />
              <p className="text-sm text-on-surface-variant">Guest will be checked in immediately upon registration.</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button type="button" onClick={onClose}
                className="flex-1 md:flex-none px-8 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 md:flex-none px-12 py-4 bg-primary-container text-white rounded-xl font-bold shadow-lg shadow-primary-container/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <MdPersonAdd size={18} />
                {loading ? 'Registering...' : 'Register & Check In'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        {icon && <span className="text-primary-container text-2xl">{icon}</span>}
        <h3 className="text-xl font-semibold text-on-surface">{title}</h3>
      </div>
      {children}
    </section>
  );
}
