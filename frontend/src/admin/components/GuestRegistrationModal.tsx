import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { MdClose, MdUploadFile, MdSave, MdBadge } from 'react-icons/md';
import api from '../../services/api';
import { useEnterNav } from '../../hooks/useEnterNav';

interface Props {
  bookingId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RegData {
  booking_ref: string;
  status: string;
  guest_email: string;
  guest_phone: string;
  room_type_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  contact_person: string;
  deposit_amount: string;
  total_price: string;
  guest_type: string;
  purpose_of_visit: string;
  coming_from: string;
  extra_bed: number;
  rack_rate: string;
  offer_rate: string;
  discount_amount: string;
  special_requests: string;
  company_name: string;
  booking_source: string;
  arrival_time: string;
  id_type: string;
  id_number: string;
  registration_card: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  country: string;
  address: string;
  occupation: string;
  place_of_issue: string;
  visa_no: string;
}

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

export default function GuestRegistrationModal({ bookingId, onClose, onSuccess }: Props) {
  const [data, setData] = useState<RegData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEnterNav(formRef);

  useEffect(() => {
    api.get(`/admin/reservations/${bookingId}/registration/`)
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load registration data'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const set = (key: keyof RegData, value: string | number) =>
    setData(d => d ? { ...d, [key]: value } : d);

  const isForeigner = data && data.country.trim() !== '' && !data.country.toLowerCase().includes('bangladesh');

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.put(`/admin/reservations/${bookingId}/registration/`, {
        guest_type: data.guest_type,
        purpose_of_visit: data.purpose_of_visit,
        coming_from: data.coming_from,
        extra_bed: data.extra_bed,
        rack_rate: data.rack_rate,
        offer_rate: data.offer_rate,
        discount_amount: data.discount_amount,
        special_requests: data.special_requests,
        company_name: data.company_name,
        booking_source: data.booking_source,
        arrival_time: data.arrival_time || null,
        id_type: isForeigner ? 'PASSPORT' : data.id_type,
        id_number: data.id_number,
        first_name: data.first_name,
        last_name: data.last_name,
        designation: data.designation,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender,
        nationality: data.nationality,
        country: data.country,
        address: data.address,
        occupation: data.occupation,
        place_of_issue: data.place_of_issue,
        visa_no: data.visa_no,
        contact_person: data.contact_person,
        infants: data.infants,
        deposit_amount: data.deposit_amount,
      });
      toast.success('Registration saved successfully');
      onSuccess?.();
    } catch {
      toast.error('Failed to save registration');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('registration_card', file);
      const res = await api.post(
        `/admin/reservations/${bookingId}/registration/upload/`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white border border-gray-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <MdBadge className="text-teal-700" size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Guest Registration Card</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {data.booking_ref} — {data.guest_email}
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-medium bg-white/10">
                  {data.status}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-slate-800">
            <MdClose size={22} />
          </button>
        </div>

        {/* ── Scrollable form body ── */}
        <form
          ref={formRef}
          onSubmit={e => { e.preventDefault(); handleSave(); }}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Section 1: Guest Personal Info */}
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

            {/* Section 2: Contact Info */}
            <Section title="Contact Details">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Email</label>
                  <input type="text" value={data.guest_email} disabled className={inputClass + ' opacity-50'} />
                </div>
                <div>
                  <label className={labelClass}>Mobile No</label>
                  <input type="text" value={data.guest_phone} disabled className={inputClass + ' opacity-50'} />
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

            {/* Section 3: Identity & Travel */}
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
                      <label className={labelClass}>
                        {data.id_type === 'PASSPORT' ? 'Passport Number' : data.id_type === 'NID' ? 'NID Number' : 'ID Number'}
                      </label>
                      <input type="text" value={data.id_number} onChange={e => set('id_number', e.target.value)} className={inputClass} />
                    </div>
                  </>
                )}
              </div>
            </Section>

            {/* Section 4: Stay Details */}
            <Section title="Stay Details">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className={labelClass}>Confirmation No</label><input type="text" value={data.booking_ref} disabled className={inputClass + ' opacity-50 font-mono'} /></div>
                <div><label className={labelClass}>Room Type</label><input type="text" value={data.room_type_name} disabled className={inputClass + ' opacity-50'} /></div>
                <div><label className={labelClass}>Room No</label><input type="text" value={data.room_number || 'Unassigned'} disabled className={inputClass + ' opacity-50'} /></div>
                <div><label className={labelClass}>Check-in Date</label><input type="text" value={data.check_in_date} disabled className={inputClass + ' opacity-50'} /></div>
                <div><label className={labelClass}>Check-in Time</label><input type="time" value={data.arrival_time || ''} onChange={e => set('arrival_time', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Check-out Date</label><input type="text" value={data.check_out_date} disabled className={inputClass + ' opacity-50'} /></div>
                <div><label className={labelClass}>No of Nights</label><input type="text" value={data.nights} disabled className={inputClass + ' opacity-50'} /></div>
                <div><label className={labelClass}>No of Days</label><input type="text" value={data.nights + 1} disabled className={inputClass + ' opacity-50'} /></div>
                <div><label className={labelClass}>Purpose of Visit</label><input type="text" value={data.purpose_of_visit} onChange={e => set('purpose_of_visit', e.target.value)} className={inputClass} /></div>
                <div><label className={labelClass}>Coming From</label><input type="text" value={data.coming_from} onChange={e => set('coming_from', e.target.value)} className={inputClass} /></div>
              </div>
            </Section>

            {/* Section 5: Room & Rates */}
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
                <div><label className={labelClass}>Total Price</label><input type="text" value={`BDT ${data.total_price}`} disabled className={inputClass + ' opacity-50'} /></div>
              </div>
            </Section>

            {/* Section 6: Remarks & Registration Card */}
            <Section title="Remarks & Registration Card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Remarks</label>
                  <textarea rows={3} value={data.special_requests} onChange={e => set('special_requests', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Registration Card</label>
                  <div className="space-y-2">
                    {data.registration_card && (
                      <a href={data.registration_card} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 hover:underline block truncate">
                        View current card
                      </a>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:border-teal-600 transition-colors">
                      <MdUploadFile className="text-teal-700" size={18} />
                      <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Upload Registration Card'}</span>
                      <input type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                </div>
              </div>
            </Section>

          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-slate-800 border border-gray-200 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-600 disabled:opacity-50">
              <MdSave size={18} />
              {saving ? 'Saving...' : 'Save Registration'}
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
      <h3 className="text-sm font-semibold text-teal-700 mb-3 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  );
}
