import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdPersonAdd } from 'react-icons/md';
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

  const inp = 'w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none focus:border-teal-600';
  const lbl = 'block text-xs text-gray-500 mb-1';
  const req = <span className="text-teal-700">*</span>;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <MdPersonAdd className="text-teal-700" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">New Guest Registration</h2>
              <p className="text-xs text-gray-500 mt-0.5">Register a new guest and check them in</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-slate-800"><MdClose size={22} /></button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-6">

          {/* ─── Section 1: Personal Information ─── */}
          <Section title="Personal Information">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lbl}>Designation</label>
                <select value={form.designation} onChange={e => set('designation', e.target.value)} className={inp}>
                  <option value="">Select</option>
                  <option value="MR">Mr.</option>
                  <option value="MRS">Mrs.</option>
                  <option value="MS">Ms.</option>
                  <option value="DR">Dr.</option>
                  <option value="PROF">Prof.</option>
                </select>
              </div>
              <div>
                <label className={lbl}>First Name {req}</label>
                <input type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inp} placeholder="First name" />
              </div>
              <div>
                <label className={lbl}>Last Name</label>
                <input type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inp} placeholder="Last name" />
              </div>
              <div>
                <label className={lbl}>Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Nationality</label>
                <input list="nationalities" value={form.nationality} onChange={e => set('nationality', e.target.value)} className={inp} placeholder="e.g. Bangladeshi" />
                <datalist id="nationalities">
                  <option value="Bangladeshi" />
                  <option value="Indian" />
                  <option value="American" />
                  <option value="British" />
                  <option value="Canadian" />
                  <option value="Australian" />
                </datalist>
              </div>
              <div>
                <label className={lbl}>Country</label>
                <input list="countries" value={form.country} onChange={e => set('country', e.target.value)} className={inp} placeholder="e.g. Bangladesh" />
                <datalist id="countries">
                  <option value="Bangladesh" />
                  <option value="India" />
                  <option value="United States" />
                  <option value="United Kingdom" />
                  <option value="Canada" />
                  <option value="Australia" />
                </datalist>
              </div>
              <div>
                <label className={lbl}>Occupation</label>
                <input type="text" value={form.occupation} onChange={e => set('occupation', e.target.value)} className={inp} placeholder="Profession" />
              </div>
            </div>
          </Section>

          {/* ─── Section 2: Contact Details ─── */}
          <Section title="Contact Details">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Email {req}</label>
                <input type="email" value={form.guest_email} onChange={e => set('guest_email', e.target.value)} className={inp} placeholder="guest@email.com" />
              </div>
              <div>
                <label className={lbl}>Mobile No</label>
                <input type="text" value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)} className={inp} placeholder="+880..." />
              </div>
              <div>
                <label className={lbl}>Address</label>
                <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={inp} placeholder="Street address" />
              </div>
              <div>
                <label className={lbl}>Company Name</label>
                <input type="text" value={form.company_name} onChange={e => set('company_name', e.target.value)} className={inp} placeholder="Company" />
              </div>
              <div>
                <label className={lbl}>Business Source</label>
                <select value={form.booking_source} onChange={e => set('booking_source', e.target.value)} className={inp}>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="PHONE">Phone</option>
                  <option value="WEBSITE">Website</option>
                  <option value="OTA">OTA</option>
                  <option value="AGENT">Agent</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </div>
            </div>
          </Section>

          {/* ─── Section 3: Identity Documents ─── */}
          <Section title="Identity Documents">
            <div className="grid grid-cols-2 gap-3">
              {isForeigner ? (
                <>
                  <div>
                    <label className={lbl}>Passport Number</label>
                    <input type="text" value={form.id_number} onChange={e => set('id_number', e.target.value)} className={inp} placeholder="Passport number" />
                  </div>
                  <div>
                    <label className={lbl}>Place of Issue</label>
                    <input type="text" value={form.place_of_issue} onChange={e => set('place_of_issue', e.target.value)} className={inp} placeholder="Issuing country / city" />
                  </div>
                  <div>
                    <label className={lbl}>Visa No</label>
                    <input type="text" value={form.visa_no} onChange={e => set('visa_no', e.target.value)} className={inp} placeholder="Visa number" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={lbl}>Passport / NID</label>
                    <select value={form.id_type} onChange={e => set('id_type', e.target.value)} className={inp}>
                      <option value="">Select type</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="NID">National ID</option>
                      <option value="DRIVING_LICENSE">Driving License</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>
                      {form.id_type === 'PASSPORT' ? 'Passport Number' : form.id_type === 'NID' ? 'NID Number' : 'ID Number'}
                    </label>
                    <input type="text" value={form.id_number} onChange={e => set('id_number', e.target.value)} className={inp} placeholder="ID number" />
                  </div>
                  {form.id_type === 'PASSPORT' && (
                    <div>
                      <label className={lbl}>Place of Issue</label>
                      <input type="text" value={form.place_of_issue} onChange={e => set('place_of_issue', e.target.value)} className={inp} placeholder="Issuing country / city" />
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          {/* ─── Section 4: Stay Details ─── */}
          <Section title="Stay Details">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Room Type {req}</label>
                <select value={form.room_type} onChange={e => set('room_type', e.target.value)} className={inp}>
                  <option value="">Select room type...</option>
                  {roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} — BDT {rt.price_per_night}/night
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Check-in Date {req}</label>
                <input type="date" value={form.check_in_date} onChange={e => set('check_in_date', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Check-in Time</label>
                <input type="time" value={form.arrival_time} onChange={e => set('arrival_time', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Check-out Date {req}</label>
                <input type="date" value={form.check_out_date} onChange={e => set('check_out_date', e.target.value)} min={form.check_in_date} className={inp} />
              </div>
              <div>
                <label className={lbl}>Room No</label>
                <select
                  value={form.room_id}
                  onChange={e => set('room_id', e.target.value)}
                  className={inp}
                  disabled={!roomNoReady || roomsLoading}
                >
                  <option value="">{roomNoPlaceholder()}</option>
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Type of Guest</label>
                <select value={form.guest_type} onChange={e => set('guest_type', e.target.value)} className={inp}>
                  <option value="">Select</option>
                  <option value="FIT">FIT</option>
                  <option value="GROUP">Group</option>
                  <option value="CORPORATE">Corporate</option>
                  <option value="VIP">VIP</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="DIPLOMATIC">Diplomatic</option>
                </select>
              </div>
              <div>
                <label className={lbl}>No of Nights</label>
                <input type="text" value={nights} disabled className={inp + ' opacity-50'} />
              </div>
              <div>
                <label className={lbl}>No of Days</label>
                <input type="text" value={nights + 1} disabled className={inp + ' opacity-50'} />
              </div>
              <div>
                <label className={lbl}>Purpose of Visit</label>
                <input type="text" value={form.purpose_of_visit} onChange={e => set('purpose_of_visit', e.target.value)} className={inp} placeholder="e.g. Business" />
              </div>
              <div>
                <label className={lbl}>Coming From</label>
                <input type="text" value={form.coming_from} onChange={e => set('coming_from', e.target.value)} className={inp} placeholder="City / Country" />
              </div>
            </div>
          </Section>

          {/* ─── Section 5: Room & Rates ─── */}
          <Section title="Room & Rates">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lbl}>PAX (Adults)</label>
                <input type="number" min="1" max="4" value={form.adults} onChange={e => set('adults', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Child</label>
                <input type="number" min="0" max="3" value={form.children} onChange={e => set('children', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Extra Bed</label>
                <input type="number" min="0" max="3" value={form.extra_bed} onChange={e => set('extra_bed', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Rack Rate ($)</label>
                <input type="number" step="0.01" min="0" value={form.rack_rate} onChange={e => set('rack_rate', e.target.value)} className={inp} placeholder="0.00" />
              </div>
              <div>
                <label className={lbl}>Offer Rate ($)</label>
                <input type="number" step="0.01" min="0" value={form.offer_rate} onChange={e => set('offer_rate', e.target.value)} className={inp} placeholder="0.00" />
              </div>
              <div>
                <label className={lbl}>Discount ($)</label>
                <input type="number" step="0.01" min="0" value={form.discount_amount} onChange={e => set('discount_amount', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Deposit ($)</label>
                <input type="number" step="0.01" min="0" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} className={inp} />
              </div>
              <div className="flex items-end">
                <div className="w-full bg-teal-50 border border-teal-600/30 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 mb-0.5">Total Price</p>
                  <p className="text-lg font-bold text-teal-700">BDT {totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* ─── Section 6: Remarks ─── */}
          <Section title="Remarks">
            <textarea
              rows={2}
              value={form.special_requests}
              onChange={e => set('special_requests', e.target.value)}
              className={inp}
              placeholder="Any special requests or notes..."
            />
          </Section>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-700 rounded-lg text-white text-sm font-medium hover:bg-teal-800 transition disabled:opacity-50"
            >
              <MdPersonAdd size={18} />
              {loading ? 'Registering...' : 'Register & Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-3 pb-1.5 border-b border-white/5">{title}</h3>
      {children}
    </div>
  );
}
