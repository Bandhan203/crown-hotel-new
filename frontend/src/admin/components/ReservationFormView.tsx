import type { FormEvent, RefObject } from 'react';
import {
  MdClose, MdPerson, MdLocationOn, MdFlight, MdHotel,
  MdPsychology, MdBusiness, MdPayments, MdInfo, MdEmail,
  MdPhone, MdSchedule,
} from 'react-icons/md';
import SearchableSelect from './SearchableSelect';
import { COUNTRIES, COUNTRY_ALIASES, NATIONALITIES } from '../constants/countries';
import type { AvailableRoom } from '../utils/fetchAvailableRooms';
import type { RatePlan } from '../utils/ratePlanPricing';
import { REFERENCE_SOURCE_OPTIONS } from '../../utils/bookingChannel';

export const INP = [
  'w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-sm text-on-surface',
  'focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container outline-none transition-all',
  'placeholder:text-on-surface-variant/60 disabled:bg-surface-container disabled:cursor-not-allowed',
].join(' ');
export const SEL = INP + ' appearance-none cursor-pointer';
export const TAREA = INP + ' resize-none';
const MAX_EXTRA_BEDS = 2;
const LBL = 'block text-xs font-semibold text-on-surface-variant tracking-wide';

function FormField({ id, label, required, children, className = '' }: {
  id?: string; label: string; required?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className={LBL}>{label}{required ? ' *' : ''}</label>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary-container text-2xl">{icon}</span>
      <h4 className="text-xl font-semibold text-on-surface">{title}</h4>
    </div>
  );
}

function Stepper({ id, value, onChange, min = 0, max = 20, warn }: {
  id?: string; value: string; onChange: (v: string) => void; min?: number; max?: number; warn?: boolean;
}) {
  const n = parseInt(value, 10) || 0;
  const border = warn ? 'border-amber-500' : 'border-outline-variant';
  return (
    <div className={`flex items-center border ${border} rounded-lg overflow-hidden h-10`}>
      <button type="button" tabIndex={-1} onClick={() => onChange(String(Math.max(min, n - 1)))}
        className="px-3 hover:bg-surface-container transition-colors text-on-surface-variant">−</button>
      <input id={id} type="text" inputMode="numeric" value={value} onChange={e => onChange(e.target.value)}
        className="w-full border-none text-center focus:ring-0 text-sm bg-transparent" />
      <button type="button" tabIndex={-1} onClick={() => onChange(String(Math.min(max, n + 1)))}
        className="px-3 hover:bg-surface-container transition-colors text-on-surface-variant">+</button>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ${on ? 'bg-primary-container' : 'bg-surface-container-highest'}`}>
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${on ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

function Divider() {
  return <hr className="border-outline-variant" />;
}

interface RoomType { id: number; name: string; price_per_night: string; max_guests: number; }

export interface ReservationFormViewProps {
  formRef: RefObject<HTMLFormElement | null>;
  form: Record<string, string>;
  set: (key: string, value: string) => void;
  setFullName: (v: string) => void;
  fullName: string;
  toggle: (k: 'dnm' | 'no_post' | 'is_travel_agency' | 'non_smoking') => void;
  bool: (k: 'dnm' | 'no_post' | 'is_travel_agency' | 'non_smoking') => boolean;
  isForeigner: boolean;
  docType: string;
  statusLabel: string;
  pickupOn: boolean;
  nights: number;
  grandTotal: number;
  overCapacity: boolean;
  capacityWarning: string;
  roomReady: boolean;
  roomsLoading: boolean;
  roomLabel: () => string;
  roomTypes: RoomType[];
  ratePlans: RatePlan[];
  availableRooms: AvailableRoom[];
  paymentBalance: { due: number; overpaid: number };
  advanceAmount: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}

export default function ReservationFormView(props: ReservationFormViewProps) {
  const {
    formRef, form, set, setFullName, fullName, toggle, bool, isForeigner, docType,
    statusLabel, pickupOn, nights, grandTotal, overCapacity, capacityWarning,
    roomReady, roomsLoading, roomLabel, roomTypes, ratePlans, availableRooms,
    paymentBalance, advanceAmount, loading, onClose, onSubmit,
  } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[10px] px-4 py-8"
      role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title">
      <div className="bg-surface w-full max-w-5xl max-h-[min(921px,96vh)] overflow-hidden rounded-2xl shadow-2xl flex flex-col border border-outline-variant">

        <div className="px-8 py-6 border-b border-outline-variant bg-surface-container-low flex justify-between items-center shrink-0">
          <div>
            <h3 id="reservation-modal-title" className="text-xl font-semibold text-primary">New Reservation Entry</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">Complete the details below to secure the booking.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('status', form.status === 'CONFIRMED' ? 'PENDING' : 'CONFIRMED')}
              className="flex items-center gap-2 px-3 py-1 bg-white border border-outline-variant rounded-full text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
              title="Click to toggle status">
              <span className={`w-2 h-2 rounded-full ${form.status === 'CONFIRMED' ? 'bg-primary' : 'bg-amber-500'}`} />
              Status: {statusLabel}
            </button>
            <button type="button" onClick={onClose} aria-label="Close"
              className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors">
              <MdClose size={22} />
            </button>
          </div>
        </div>

        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 [color-scheme:light]">
          <div className="flex-1 overflow-y-auto p-8 space-y-6">

            <section className="space-y-6">
              <SectionTitle icon={<MdPerson />} title="Guest Information" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-2">
                  <FormField id="designation" label="Title">
                    <select id="designation" value={form.designation} onChange={e => set('designation', e.target.value)} className={SEL}>
                      <option value="">Mr.</option>
                      <option value="MR">Mr.</option>
                      <option value="MS">Ms.</option>
                      <option value="MRS">Mrs.</option>
                      <option value="DR">Dr.</option>
                      <option value="PROF">Prof.</option>
                    </select>
                  </FormField>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <FormField id="date_of_birth" label="Date of Birth">
                    <input id="date_of_birth" type="date" value={form.date_of_birth}
                      onChange={e => set('date_of_birth', e.target.value)} className={INP} />
                  </FormField>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <FormField id="gender" label="Gender">
                    <select id="gender" value={form.gender} onChange={e => set('gender', e.target.value)} className={SEL}>
                      <option value="">Male</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <FormField id="full_name" label="Full Name" required>
                    <input id="full_name" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                      className={INP} placeholder="e.g. Johnathan Doe" />
                  </FormField>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <FormField id="guest_type" label="Guest Type">
                    <select id="guest_type" value={form.guest_type} onChange={e => set('guest_type', e.target.value)} className={SEL}>
                      <option value="">Standard Individual</option>
                      <option value="FIT">Standard Individual</option>
                      <option value="CORPORATE">Corporate Member</option>
                      <option value="VIP">VIP Guest</option>
                      <option value="GROUP">Group</option>
                      <option value="GOVERNMENT">Government</option>
                      <option value="DIPLOMATIC">Diplomatic</option>
                    </select>
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!isForeigner ? (
                    <FormField label="Document Type">
                      <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant">
                        <button type="button" onClick={() => set('id_type', 'PASSPORT')}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${docType === 'PASSPORT' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:bg-white/50'}`}>
                          Passport
                        </button>
                        <button type="button" onClick={() => set('id_type', 'NID')}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${docType === 'NID' ? 'bg-white shadow-sm text-primary' : 'text-on-surface-variant hover:bg-white/50'}`}>
                          NID
                        </button>
                      </div>
                    </FormField>
                  ) : (
                    <FormField id="place_of_issue" label="Place of Issue">
                      <input id="place_of_issue" type="text" value={form.place_of_issue}
                        onChange={e => set('place_of_issue', e.target.value)} className={INP} placeholder="Country / city" />
                    </FormField>
                  )}
                  <FormField id="id_number" label="Document Number">
                    <input id="id_number" type="text" value={form.id_number}
                      onChange={e => set('id_number', e.target.value)} className={INP} placeholder="Enter Passport or NID No." />
                  </FormField>
                  {isForeigner && (
                    <div className="md:col-span-2">
                      <FormField id="visa_no" label="Visa No.">
                        <input id="visa_no" type="text" value={form.visa_no}
                          onChange={e => set('visa_no', e.target.value)} className={INP} placeholder="Visa number" />
                      </FormField>
                    </div>
                  )}
                </div>
                <div className="col-span-6">
                  <FormField id="guest_email" label="Contact Email">
                    <div className="relative">
                      <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
                      <input id="guest_email" type="email" value={form.guest_email}
                        onChange={e => set('guest_email', e.target.value)} className={INP + ' pl-10'} placeholder="guest@example.com" />
                    </div>
                  </FormField>
                </div>
                <div className="col-span-6">
                  <FormField id="guest_phone" label="Phone Number">
                    <div className="relative">
                      <MdPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" size={18} />
                      <input id="guest_phone" type="tel" value={form.guest_phone}
                        onChange={e => set('guest_phone', e.target.value)} className={INP + ' pl-10'} placeholder="+1 (555) 000-0000" />
                    </div>
                  </FormField>
                </div>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <SectionTitle icon={<MdLocationOn />} title="Contact & Location" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4">
                  <FormField id="country" label="Country">
                    <SearchableSelect id="country" value={form.country} onChange={v => set('country', v)}
                      options={COUNTRIES} aliases={COUNTRY_ALIASES} placeholder="e.g. USA" emptyLabel="" variant="light" className={INP} />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <FormField id="nationality" label="Nationality">
                    <SearchableSelect id="nationality" value={form.nationality} onChange={v => set('nationality', v)}
                      options={NATIONALITIES} placeholder="e.g. American" emptyLabel="" variant="light" className={INP} />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <FormField id="occupation" label="Occupation">
                    <input id="occupation" type="text" value={form.occupation}
                      onChange={e => set('occupation', e.target.value)} className={INP} placeholder="e.g. Engineer" />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <FormField id="contact_person" label="Contact Person">
                    <input id="contact_person" type="text" value={form.contact_person}
                      onChange={e => set('contact_person', e.target.value)} className={INP} placeholder="Emergency Contact" />
                  </FormField>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <FormField id="drop_required" label="Drop Service">
                    <select id="drop_required" value={form.drop_required} onChange={e => set('drop_required', e.target.value)} className={SEL}>
                      <option value="NO">No</option>
                      <option value="YES">Yes</option>
                    </select>
                  </FormField>
                </div>
                <div className="col-span-6 md:col-span-4">
                  <FormField id="flight_drop_no_contact" label="Flt/ETD">
                    <input id="flight_drop_no_contact" type="text" value={form.flight_drop_no}
                      onChange={e => set('flight_drop_no', e.target.value)} className={INP} placeholder="Flight No / Time"
                      disabled={form.drop_required === 'NO'} />
                  </FormField>
                </div>
                <div className="col-span-12">
                  <FormField id="address" label="Full Address">
                    <textarea id="address" rows={3} value={form.address} onChange={e => set('address', e.target.value)}
                      className={TAREA + ' h-20'} placeholder="Street, City, State, Zip..." />
                  </FormField>
                </div>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <SectionTitle icon={<MdFlight />} title="Stay & Transport" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6 grid grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant">
                  <FormField id="check_in_date" label="Arrival Date">
                    <input id="check_in_date" type="date" value={form.check_in_date}
                      onChange={e => set('check_in_date', e.target.value)} className={INP + ' px-3 py-2'} />
                  </FormField>
                  <FormField id="check_out_date" label="Departure Date">
                    <input id="check_out_date" type="date" value={form.check_out_date} min={form.check_in_date}
                      onChange={e => set('check_out_date', e.target.value)} className={INP + ' px-3 py-2'} />
                  </FormField>
                  <div className="col-span-2 flex items-center gap-2 p-2 bg-primary-fixed text-on-primary-fixed-variant rounded-lg text-xs font-semibold">
                    <MdSchedule size={16} />
                    Total Duration: {nights} Night{nights !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-on-surface">Airport Pickup Service</span>
                    <Toggle on={pickupOn} onToggle={() => set('pickup_required', pickupOn ? 'NO' : 'YES')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField id="flight_pickup_no" label="Arrival Flight No. & ETA">
                      <input id="flight_pickup_no" type="text" value={form.flight_pickup_no}
                        onChange={e => set('flight_pickup_no', e.target.value)} className={INP}
                        placeholder="e.g. EK502 @ 14:30" disabled={!pickupOn} />
                    </FormField>
                    <FormField id="flight_eta" label="Arrival ETA">
                      <input id="flight_eta" type="time" value={form.flight_eta}
                        onChange={e => set('flight_eta', e.target.value)} className={INP} disabled={!pickupOn} />
                    </FormField>
                  </div>
                </div>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <SectionTitle icon={<MdHotel />} title="Room & Rates" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-8 bg-white border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField id="room_type" label="Room Category" required>
                      <select id="room_type" value={form.room_type} onChange={e => set('room_type', e.target.value)}
                        className={SEL + ' bg-surface-container-low'}>
                        <option value="">Select room type</option>
                        {roomTypes.map(rt => (
                          <option key={rt.id} value={rt.id}>{rt.name} — BDT {rt.price_per_night}/night</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField id="room_id" label="Assign Room">
                      <select id="room_id" value={form.room_id} onChange={e => set('room_id', e.target.value)}
                        className={SEL + ' bg-surface-container-low'} disabled={!roomReady || roomsLoading}>
                        <option value="">{roomLabel()}</option>
                        {availableRooms.map(r => (
                          <option key={r.id} value={r.id}>{r.room_number} (Available)</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField id="num_rooms" label="No. of Rooms">
                      <input id="num_rooms" type="number" min="1" max="20" value={form.num_rooms}
                        onChange={e => set('num_rooms', e.target.value)} className={INP + ' bg-surface-container-low'} />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant uppercase font-bold tracking-tight">Adults</p>
                      <Stepper id="adults" value={form.adults} onChange={v => set('adults', v)} min={1} warn={overCapacity} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant uppercase font-bold tracking-tight">Children</p>
                      <Stepper id="children" value={form.children} onChange={v => set('children', v)} warn={overCapacity} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-on-surface-variant uppercase font-bold tracking-tight">Extra Bed</p>
                      <Stepper id="extra_bed" value={form.extra_bed} onChange={v => set('extra_bed', v)} max={MAX_EXTRA_BEDS} warn={overCapacity} />
                    </div>
                  </div>
                  {capacityWarning && (
                    <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                      <span className="font-bold text-amber-700">!</span>
                      <span>{capacityWarning}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-12 gap-4 pt-4 border-t border-outline-variant">
                    <div className="col-span-6 md:col-span-4">
                      <FormField id="rate_plan" label="Rate Plan">
                        <select id="rate_plan" value={form.rate_plan} onChange={e => set('rate_plan', e.target.value)}
                          className={SEL + ' px-3 py-2 bg-surface-container-low'}>
                          <option value="">Standard Rate</option>
                          {ratePlans.map(rp => (
                            <option key={rp.id} value={rp.id}>{rp.name} ({rp.code})</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <FormField id="offer_rate" label="Rate/Night">
                        <input id="offer_rate" type="number" step="0.01" min="0" value={form.offer_rate}
                          onChange={e => set('offer_rate', e.target.value)} className={INP + ' px-3 py-2'} />
                      </FormField>
                    </div>
                    <div className="col-span-3 md:col-span-3">
                      <FormField id="discount_pct" label="Discount (%)">
                        <input id="discount_pct" type="number" step="0.01" min="0" max="100" value={form.discount_pct}
                          onChange={e => set('discount_pct', e.target.value)} className={INP + ' px-3 py-2'} />
                      </FormField>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <FormField id="discount_amount" label="Discount (BDT)">
                        <input id="discount_amount" type="number" step="0.01" min="0" value={form.discount_amount}
                          onChange={e => set('discount_amount', e.target.value)} className={INP + ' px-3 py-2'} />
                      </FormField>
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <FormField id="booking_source" label="Business Source">
                        <select id="booking_source" value={form.booking_source} onChange={e => set('booking_source', e.target.value)}
                          className={SEL + ' px-3 py-2'}>
                          <option value="PHONE">Direct</option>
                          <option value="WALK_IN">Walk-in</option>
                          <option value="WEBSITE">Website</option>
                          <option value="OTA">OTA</option>
                          <option value="AGENT">Agent</option>
                          <option value="CORPORATE">Corporate</option>
                        </select>
                      </FormField>
                    </div>
                    <div className="col-span-6 md:col-span-4">
                      <FormField id="reference_source" label="Channel / Ref Source">
                        <select id="reference_source" value={form.reference_source}
                          onChange={e => set('reference_source', e.target.value)} className={SEL + ' px-3 py-2'}>
                          {REFERENCE_SOURCE_OPTIONS.map(o => (
                            <option key={o.value || 'empty'} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <FormField id="parent_booking_id" label="Parent Invoice">
                        <input id="parent_booking_id" type="text" value={form.parent_booking_id}
                          onChange={e => set('parent_booking_id', e.target.value)} className={INP + ' px-3 py-2'} placeholder="Invoice ID" />
                      </FormField>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <FormField id="service_charge_pct" label="Ser (%)">
                        <input id="service_charge_pct" type="number" step="0.01" min="0" max="100" value={form.service_charge_pct}
                          onChange={e => set('service_charge_pct', e.target.value)} className={INP + ' px-3 py-2'} />
                      </FormField>
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <FormField id="vat_pct" label="Vat (%)">
                        <input id="vat_pct" type="number" step="0.01" min="0" max="100" value={form.vat_pct}
                          onChange={e => set('vat_pct', e.target.value)} className={INP + ' px-3 py-2'} />
                      </FormField>
                    </div>
                    <div className="col-span-4 md:col-span-4">
                      <FormField id="purpose_of_visit" label="Purpose">
                        <input id="purpose_of_visit" type="text" value={form.purpose_of_visit}
                          onChange={e => set('purpose_of_visit', e.target.value)} className={INP + ' px-3 py-2'} placeholder="e.g. Business" />
                      </FormField>
                    </div>
                    <div className="col-span-12 md:col-span-4">
                      <FormField id="coming_from" label="Coming From">
                        <input id="coming_from" type="text" value={form.coming_from}
                          onChange={e => set('coming_from', e.target.value)} className={INP + ' px-3 py-2'} placeholder="City/Country" />
                      </FormField>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-4 bg-primary-container text-on-primary-container rounded-xl p-6 shadow-md flex flex-col justify-between min-h-[280px]">
                  <div>
                    <p className="text-xs font-semibold uppercase opacity-80 mb-1">Billing Summary</p>
                    <h5 className="text-3xl font-bold">BDT {grandTotal.toFixed(2)}</h5>
                    <p className="text-xs opacity-70 mt-1">Incl. VAT ({form.vat_pct}%) & Service Charge</p>
                  </div>
                  <div className="pt-4 border-t border-white/20 mt-4 space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs opacity-80 uppercase font-bold">Rate/Night</label>
                      <input type="text" readOnly
                        value={`BDT ${(parseFloat(form.offer_rate || form.rack_rate || '0')).toFixed(2)}`}
                        className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white w-full outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="payment_amount" className="text-xs opacity-80 uppercase font-bold">Advance Paid</label>
                      <input id="payment_amount" type="number" step="0.01" min="0"
                        max={grandTotal > 0 ? grandTotal : undefined}
                        value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)}
                        className={`bg-white/10 border rounded-lg px-3 py-1.5 text-white w-full outline-none focus:ring-1 focus:ring-white/40 ${
                          paymentBalance.overpaid > 0 ? 'border-red-300' : 'border-white/20'
                        }`} placeholder="0.00" />
                    </div>
                    {paymentBalance.overpaid > 0 && (
                      <p className="text-xs text-red-200">Overpaid by BDT {paymentBalance.overpaid.toFixed(2)}</p>
                    )}
                    {advanceAmount > 0 && paymentBalance.due > 0 && (
                      <p className="text-xs opacity-90">Due: BDT {paymentBalance.due.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <SectionTitle icon={<MdPsychology />} title="Guest Profiling & Logistics" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <FormField id="guest_hobbies" label="Hobbies">
                    <input id="guest_hobbies" type="text" value={form.guest_hobbies}
                      onChange={e => set('guest_hobbies', e.target.value)} className={INP} placeholder="e.g. Golf, Reading" />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormField id="guest_preferences" label="Preferences">
                    <input id="guest_preferences" type="text" value={form.guest_preferences}
                      onChange={e => set('guest_preferences', e.target.value)} className={INP} placeholder="e.g. High floor, extra pillows" />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormField id="airport_details" label="Airport Details">
                    <input id="airport_details" type="text" value={form.airport_details}
                      onChange={e => set('airport_details', e.target.value)} className={INP} placeholder="Terminal, Gate info" />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormField id="transport_notes" label="Transport Notes">
                    <input id="transport_notes" type="text" value={form.transport_notes}
                      onChange={e => set('transport_notes', e.target.value)} className={INP} placeholder="Driver details, vehicle type" />
                  </FormField>
                </div>
                <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {([
                    ['chk_dnm', 'dnm', 'DNM (Do Not Move)'],
                    ['chk_ta', 'is_travel_agency', 'Travel Agency'],
                    ['chk_np', 'no_post', 'No Post'],
                    ['chk_ns', 'non_smoking', 'Non-Smoking'],
                  ] as const).map(([id, key, label]) => (
                    <label key={id} htmlFor={id} className="flex items-center gap-2 cursor-pointer">
                      <input id={id} type="checkbox" checked={bool(key)} onChange={() => toggle(key)}
                        className="rounded border-outline-variant text-primary focus:ring-primary" />
                      <span className="text-sm text-on-surface">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <SectionTitle icon={<MdBusiness />} title="Additional Details" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4">
                  <FormField id="company_name" label="Company Name">
                    <input id="company_name" type="text" value={form.company_name}
                      onChange={e => set('company_name', e.target.value)} className={INP} placeholder="e.g. Acme Corp" />
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <FormField id="profile_note" label="Profile Note">
                    <input id="profile_note" type="text" value={form.profile_note}
                      onChange={e => set('profile_note', e.target.value)} className={INP} placeholder="General notes about the guest profile" />
                  </FormField>
                </div>
              </div>
            </section>

            <Divider />

            <section className="space-y-6">
              <SectionTitle icon={<MdPayments />} title="Payment & Notes" />
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4">
                  <FormField id="payment_method" label="Payment Mode">
                    <select id="payment_method" value={form.payment_method} onChange={e => set('payment_method', e.target.value)} className={SEL}>
                      <option value="CARD">Credit Card</option>
                      <option value="CASH">Cash</option>
                      <option value="ONLINE">Bank Transfer</option>
                    </select>
                  </FormField>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <FormField id="special_requests" label="Internal Remarks">
                    <textarea id="special_requests" rows={4} value={form.special_requests}
                      onChange={e => set('special_requests', e.target.value)} className={TAREA + ' h-24'}
                      placeholder="e.g. Birthday surprise setup requested, high floor preference..." />
                  </FormField>
                </div>
              </div>
            </section>
          </div>

          <div className="px-8 py-6 bg-surface-container-high border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <MdInfo className="text-primary text-xl shrink-0" />
              <p className="text-sm text-on-surface-variant">A confirmation email will be sent automatically.</p>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button type="button" onClick={onClose}
                className="flex-1 md:flex-none px-8 py-3 font-bold text-on-surface-variant hover:bg-surface-container-highest rounded-lg transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 md:flex-none px-12 py-4 bg-primary-container text-white rounded-xl font-bold shadow-lg shadow-primary-container/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                {loading ? 'Creating…' : 'Create Reservation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
