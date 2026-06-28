import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdClose, MdDownload, MdBadge, MdReceipt, MdLogin, MdLogout, MdCheck,
} from 'react-icons/md';
import api from '../../services/api';

/* ── types ─────────────────────────────────────────────────────────── */

interface Payment {
  id: number; amount: string; payment_method: string; transaction_id: string;
  status: string; paid_at: string; created_at: string;
  val_id?: string; bank_tran_id?: string; card_type?: string; card_no?: string;
  card_brand?: string; card_issuer?: string; card_issuer_country?: string;
  risk_level?: string; risk_title?: string;
}

interface BookingDetail {
  id: number; booking_ref: string; guest: number; guest_email: string; guest_name: string;
  room_type: number; room: number | null; room_number: string | null;
  check_in_date: string; check_out_date: string;
  adults: number; children: number; infants?: number; extra_bed?: number;
  total_price: string; status: string; payment_status: string;
  special_requests: string; profile_note?: string; notes_internal?: string;
  created_at: string; updated_at: string;
  room_type_detail?: { id: number; name: string; price_per_night: string };
  payments?: Payment[];
  booking_source?: string; rate_plan?: number; rate_plan_name?: string;
  arrival_time?: string; departure_time?: string;
  actual_check_in?: string | null; actual_check_out?: string | null;
  checked_in_by_name?: string | null; checked_out_by_name?: string | null;
  id_type?: string; id_number?: string;
  deposit_amount?: string; discount_amount?: string; tax_amount?: string; grand_total?: string;
  company_name?: string; no_show?: boolean;
  cancelled_at?: string | null; cancellation_reason?: string;
  nights?: number; guest_type?: string; purpose_of_visit?: string; coming_from?: string;
  contact_person?: string; rack_rate?: string; offer_rate?: string;
  num_rooms?: number; discount_pct?: string; service_charge_pct?: string; vat_pct?: string;
  dnm?: boolean; no_post?: boolean; is_travel_agency?: boolean; non_smoking?: boolean;
  pickup_required?: string; flight_pickup_no?: string; flight_eta?: string;
  drop_required?: string; flight_drop_no?: string; flight_etd?: string;
  registration_card?: string | null;
}

interface GuestProfile {
  guest_phone?: string;
  first_name?: string; last_name?: string; designation?: string;
  date_of_birth?: string; gender?: string; nationality?: string; country?: string;
  address?: string; occupation?: string; place_of_issue?: string; visa_no?: string;
}

interface Props {
  bookingId: number;
  onClose: () => void;
  onRefresh: () => void;
  onDeleted: () => void;
  onOpenFolio: (booking: BookingDetail) => void;
  onOpenRegistration: (bookingId: number) => void;
}

/* ── layout helpers (light PMS — matches ReservationModal) ──────── */

const LBL = 'w-[7rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5';
const LBL_WIDE = 'w-[7.75rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5';
const LBL_COMPACT = 'w-[4.75rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5 whitespace-nowrap';
const LBL_COMPACT_MED = 'w-[5.25rem] shrink-0 text-sm font-semibold text-slate-700 text-right leading-none pr-1.5 whitespace-nowrap';
const VAL = 'flex-1 min-w-0 text-sm font-medium text-slate-900 break-words';
const COL2 = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]';
const COL_ROOM_ROW = 'grid-cols-[minmax(0,1fr)_minmax(4.75rem,5.25rem)_auto]';
const COL_PAX = 'grid-cols-[2.75rem_2.75rem_2.75rem]';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-300',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-300',
  CHECKED_IN: 'bg-green-100 text-green-800 border-green-300',
  CHECKED_OUT: 'bg-slate-200 text-slate-700 border-slate-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
};

const PAY_STYLES: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-800 border-red-300',
  PAID: 'bg-green-100 text-green-800 border-green-300',
  PARTIAL: 'bg-amber-100 text-amber-800 border-amber-300',
  REFUNDED: 'bg-slate-200 text-slate-700 border-slate-300',
};

const statusFlow: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['CHECKED_OUT'],
};

const DESIGNATIONS: Record<string, string> = {
  MR: 'Mr.', MRS: 'Mrs.', MS: 'Ms.', DR: 'Dr.', PROF: 'Prof.',
};

const GUEST_TYPES: Record<string, string> = {
  FIT: 'FIT', GROUP: 'Group', CORPORATE: 'Corporate',
  VIP: 'VIP', GOVERNMENT: 'Government', DIPLOMATIC: 'Diplomatic',
};

const BOOKING_SOURCES: Record<string, string> = {
  PHONE: 'Phone', WALK_IN: 'Walk-in', ONLINE: 'Online',
  OTA: 'OTA', CORPORATE: 'Corporate', TRAVEL_AGENT: 'Travel Agent',
};

function dash(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function money(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? `BDT ${n.toFixed(2)}` : '—';
}

function ynFlag(v: unknown): string {
  if (v === true || v === 'true' || v === 'YES') return 'Yes';
  if (v === false || v === 'false' || v === 'NO') return 'No';
  return dash(v);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded-sm bg-white/60 mb-2">
      <div className="px-2.5 py-1.5 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
        {title}
      </div>
      <div className="px-2 py-1">{children}</div>
    </div>
  );
}

function GridRow({ children, cols = COL2 }: { children: React.ReactNode; cols?: string }) {
  return (
    <div className={`grid ${cols} gap-x-4 gap-y-0 py-0.5 min-w-0 [&>*]:min-w-0`}>{children}</div>
  );
}

function DField({ label, value, wide, compact, compactMed }: {
  label: string; value?: React.ReactNode; wide?: boolean; compact?: boolean; compactMed?: boolean;
}) {
  const lbl = compactMed ? LBL_COMPACT_MED : compact ? LBL_COMPACT : wide ? LBL_WIDE : LBL;
  return (
    <div className="flex items-center gap-1.5 min-w-0 py-0.5">
      <span className={lbl}>{label}</span>
      <span className={VAL}>{value ?? '—'}</span>
    </div>
  );
}

function PaxGroup({ adults, children, infants }: { adults: number; children: number; infants: number }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 py-0.5">
      <span className={LBL_COMPACT}>PAX</span>
      <div className={`grid ${COL_PAX} gap-1 shrink-0`}>
        {[
          { v: adults, t: 'Adults' },
          { v: children, t: 'Children' },
          { v: infants, t: 'Infants' },
        ].map(({ v, t }) => (
          <div key={t} title={t}
            className="h-7 px-1 flex items-center justify-center text-sm font-medium text-slate-800
                       bg-white border border-slate-300 rounded-sm min-w-[2.75rem]">
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ text, styles }: { text: string; styles: Record<string, string> }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-sm text-xs font-semibold border ${styles[text] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}

/* ── main modal ──────────────────────────────────────────────────── */

export default function BookingViewModal({
  bookingId, onClose, onRefresh, onDeleted, onOpenFolio, onOpenRegistration,
}: Props) {
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [profile, setProfile] = useState<GuestProfile>({});
  const [loading, setLoading] = useState(true);
  const [showAssignRoom, setShowAssignRoom] = useState(false);
  const [assignRoomId, setAssignRoomId] = useState('');
  const [availableRooms, setAvailableRooms] = useState<{ id: number; room_number: string; status: string }[]>([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'CASH', transaction_id: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        api.get(`/admin/bookings/${bookingId}/`),
        api.get(`/admin/reservations/${bookingId}/registration/`).catch(() => null),
      ]);
      setBooking(bRes.data);
      if (rRes?.data) {
        const d = rRes.data;
        setProfile({
          guest_phone: d.guest_phone,
          first_name: d.first_name, last_name: d.last_name, designation: d.designation,
          date_of_birth: d.date_of_birth, gender: d.gender, nationality: d.nationality,
          country: d.country, address: d.address, occupation: d.occupation,
          place_of_issue: d.place_of_issue, visa_no: d.visa_no,
        });
      }
    } catch {
      toast.error('Failed to load booking details');
      onClose();
    }
    setLoading(false);
  }, [bookingId, onClose]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!showAssignRoom || !booking) return;
    api.get(`/admin/rooms/?room_type=${booking.room_type}&status=AVAILABLE&page_size=100`)
      .then(r => setAvailableRooms(r.data.results ?? r.data)).catch(() => {});
  }, [showAssignRoom, booking]);

  const updateStatus = async (newStatus: string) => {
    if (!booking) return;
    try {
      const res = await api.patch(`/admin/bookings/${booking.id}/status/`, { status: newStatus });
      toast.success(`Status → ${newStatus.replace(/_/g, ' ')}`);
      setBooking(res.data);
      onRefresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleAssignRoom = async () => {
    if (!booking || !assignRoomId) return;
    try {
      const res = await api.patch(`/admin/bookings/${booking.id}/assign-room/`, { room_id: parseInt(assignRoomId) });
      toast.success('Room assigned');
      setBooking(res.data);
      setShowAssignRoom(false);
      setAssignRoomId('');
      onRefresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Room assignment failed');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!booking || !payForm.amount) { toast.error('Amount is required'); return; }
    try {
      await api.post(`/admin/bookings/${booking.id}/payments/`, payForm);
      toast.success('Payment recorded');
      const res = await api.get(`/admin/bookings/${booking.id}/`);
      setBooking(res.data);
      setShowPayForm(false);
      setPayForm({ amount: '', payment_method: 'CASH', transaction_id: '' });
      onRefresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Payment failed');
    }
  };

  const handleDelete = async () => {
    if (!booking || !window.confirm('Delete this booking permanently?')) return;
    try {
      await api.delete(`/admin/bookings/${booking.id}/delete/`);
      toast.success('Booking deleted');
      onDeleted();
    } catch {
      toast.error('Failed to delete booking');
    }
  };

  const guestDisplay = () => {
    const parts = [
      profile.designation ? DESIGNATIONS[profile.designation] || profile.designation : '',
      profile.first_name || '',
      profile.last_name || '',
    ].filter(Boolean);
    return parts.length ? parts.join(' ') : booking?.guest_name || '—';
  };

  const primaryPaymentMethod = booking?.payments?.length
    ? booking.payments[booking.payments.length - 1].payment_method
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50"
      role="dialog" aria-modal="true" aria-labelledby="booking-view-title">
      <div className="bg-[#eceef2] border border-slate-300 rounded-sm w-full max-w-5xl max-h-[96vh]
                      flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.18)]">

        {/* title bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-slate-700 to-slate-600 shrink-0">
          <span id="booking-view-title" className="text-sm font-semibold text-slate-800 tracking-wide">
            Booking View — <span className="font-mono text-amber-200">#{booking?.booking_ref ?? '…'}</span>
          </span>
          <button type="button" onClick={onClose} aria-label="Close"
            className="text-slate-800/70 hover:text-white rounded-sm p-0.5 transition-colors">
            <MdClose size={16} />
          </button>
        </div>

        {loading || !booking ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* toolbar */}
            <div className="flex items-center gap-3 px-3 py-2 bg-slate-200/80 border-b border-slate-300 shrink-0 flex-wrap">
              <div className="flex-1 min-w-[10rem]">
                <DField label="Company Name" value={dash(booking.company_name)} compact />
              </div>
              <div className="flex-1 min-w-[8rem]">
                <DField label="Guest Type" value={dash(GUEST_TYPES[booking.guest_type || ''] || booking.guest_type)} compact />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <Badge text={booking.status} styles={STATUS_STYLES} />
                <Badge text={booking.payment_status || 'UNPAID'} styles={PAY_STYLES} />
              </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden flex-1 px-3 pb-3 pt-2 [color-scheme:light]">

              <Section title="Guest Information">
                <GridRow>
                  <DField label="Conf. No." value={<span className="font-mono text-blue-800">{booking.booking_ref}</span>} wide />
                  <DField label="Mode of Payment" value={dash(primaryPaymentMethod)} wide />
                </GridRow>
                <GridRow>
                  <DField label="Guest Name" value={guestDisplay()} />
                  <DField label="Title" value={dash(DESIGNATIONS[profile.designation || ''] || profile.designation)} />
                </GridRow>
                <GridRow>
                  <DField label="Last Name" value={dash(profile.last_name)} />
                  <DField label="First Name" value={dash(profile.first_name)} />
                </GridRow>
                <GridRow>
                  <DField label="Passport / NID" wide
                    value={booking.id_type || booking.id_number
                      ? `${dash(booking.id_type)} ${booking.id_number || ''}`.trim() : '—'} />
                  <DField label="Date of Birth" value={dash(profile.date_of_birth)} />
                </GridRow>
                <GridRow>
                  <DField label="Gender" value={dash(profile.gender)} />
                  <DField label="Nationality" value={dash(profile.nationality)} />
                </GridRow>
                <GridRow>
                  <DField label="Place of Issue" value={dash(profile.place_of_issue)} />
                  <DField label="Visa No." value={dash(profile.visa_no)} />
                </GridRow>
              </Section>

              <Section title="Stay &amp; Transport">
                <GridRow>
                  <DField label="Arrival Date" value={
                    <span>{booking.check_in_date}{booking.arrival_time ? ` · ${booking.arrival_time}` : ''}</span>
                  } />
                  <DField label="Departure Date" value={
                    <span>{booking.check_out_date}{booking.departure_time ? ` · ${booking.departure_time}` : ''}</span>
                  } />
                </GridRow>
                <GridRow>
                  <DField label="Nights" value={dash(booking.nights)} />
                  <DField label="Booking Source" value={dash(BOOKING_SOURCES[booking.booking_source || ''] || booking.booking_source)} />
                </GridRow>
                <GridRow>
                  <DField label="Pickup / ETA" wide
                    value={booking.pickup_required === 'YES'
                      ? `${dash(booking.flight_pickup_no)} ${booking.flight_eta || ''}`.trim()
                      : ynFlag(booking.pickup_required)} />
                  <DField label="Drop / ETD" wide
                    value={booking.drop_required === 'YES'
                      ? `${dash(booking.flight_drop_no)} ${booking.flight_etd || ''}`.trim()
                      : ynFlag(booking.drop_required)} />
                </GridRow>
                <GridRow>
                  <DField label="Purpose" value={dash(booking.purpose_of_visit)} />
                  <DField label="Coming From" value={dash(booking.coming_from)} />
                </GridRow>
                {(booking.actual_check_in || booking.actual_check_out) && (
                  <GridRow>
                    <DField label="Actual Check-in" value={booking.actual_check_in ? new Date(booking.actual_check_in).toLocaleString() : '—'} />
                    <DField label="Actual Check-out" value={booking.actual_check_out ? new Date(booking.actual_check_out).toLocaleString() : '—'} />
                  </GridRow>
                )}
                {(booking.checked_in_by_name || booking.checked_out_by_name) && (
                  <GridRow>
                    <DField label="Checked in by" value={dash(booking.checked_in_by_name)} />
                    <DField label="Checked out by" value={dash(booking.checked_out_by_name)} />
                  </GridRow>
                )}
              </Section>

              <Section title="Contact &amp; Location">
                <GridRow>
                  <DField label="Country" value={dash(profile.country)} />
                  <DField label="Occupation" value={dash(profile.occupation)} />
                </GridRow>
                <GridRow>
                  <DField label="Contact Person" value={dash(booking.contact_person)} />
                  <DField label="Email" value={dash(booking.guest_email)} />
                </GridRow>
                <GridRow>
                  <DField label="Mobile" value={dash(profile.guest_phone)} />
                  <DField label="Address" value={dash(profile.address)} />
                </GridRow>
              </Section>

              <Section title="Room &amp; Rates">
                <GridRow>
                  <DField label="Rate Plan" value={dash(booking.rate_plan_name)} wide />
                  <DField label="Room Type" value={dash(booking.room_type_detail?.name)} />
                </GridRow>
                <GridRow cols={COL_ROOM_ROW}>
                  <DField label="Room No" value={dash(booking.room_number || 'Not assigned')} compact />
                  <DField label="No. of Rm" value={dash(booking.num_rooms ?? 1)} compact />
                  <div className="flex items-center gap-4 shrink-0">
                    <PaxGroup adults={booking.adults} children={booking.children} infants={booking.infants ?? 0} />
                    <DField label="Extra Bed" value={dash(booking.extra_bed ?? 0)} compactMed />
                  </div>
                </GridRow>
                <GridRow>
                  <DField label="Room Rent (BDT)" value={money(booking.offer_rate)} wide />
                  <DField label="Rack Rate (BDT)" value={money(booking.rack_rate)} />
                </GridRow>
                <GridRow>
                  <DField label="Discount (%)" value={dash(booking.discount_pct)} />
                  <DField label="Discount Amt" value={money(booking.discount_amount)} />
                </GridRow>
                <GridRow>
                  <DField label="Service (%)" value={dash(booking.service_charge_pct)} />
                  <DField label="VAT (%)" value={dash(booking.vat_pct)} />
                </GridRow>
                <div className="flex items-center gap-1.5 py-1 mt-0.5 px-1 bg-amber-50 border border-amber-200 rounded-sm">
                  <span className={LBL_WIDE + ' text-amber-900'}>Grand Total</span>
                  <span className="text-base font-bold text-amber-950">
                    {money(booking.grand_total || booking.total_price)}
                    <span className="text-xs font-medium text-amber-700 ml-1">(incl. tax)</span>
                  </span>
                  {booking.tax_amount && (
                    <span className="text-xs text-amber-700 ml-auto">Tax: {money(booking.tax_amount)}</span>
                  )}
                </div>
              </Section>

              <Section title="Payment &amp; Deposit">
                <GridRow>
                  <DField label="Total Price" value={money(booking.total_price)} />
                  <DField label="Deposit" value={money(booking.deposit_amount)} />
                </GridRow>
                <GridRow>
                  <DField label="Payment Status" value={<Badge text={booking.payment_status || 'UNPAID'} styles={PAY_STYLES} />} />
                  <DField label="Amount Paid" value={money(
                    booking.payments?.filter(p => p.status === 'COMPLETED')
                      .reduce((s, p) => s + parseFloat(p.amount), 0) || 0
                  )} />
                </GridRow>
              </Section>

              <Section title="Preferences &amp; Flags">
                <GridRow>
                  <DField label="DNM" value={ynFlag(booking.dnm)} />
                  <DField label="No Post" value={ynFlag(booking.no_post)} />
                </GridRow>
                <GridRow>
                  <DField label="Travel Agency" value={ynFlag(booking.is_travel_agency)} />
                  <DField label="Non Smoking" value={ynFlag(booking.non_smoking)} />
                </GridRow>
              </Section>

              {(booking.special_requests || booking.profile_note || booking.notes_internal) && (
                <Section title="Notes">
                  {booking.special_requests && <DField label="Special Requests" value={booking.special_requests} wide />}
                  {booking.profile_note && <DField label="Profile Note" value={booking.profile_note} wide />}
                  {booking.notes_internal && <DField label="Internal Notes" value={booking.notes_internal} wide />}
                </Section>
              )}

              {booking.status === 'CANCELLED' && (
                <Section title="Cancellation">
                  <GridRow>
                    <DField label="Cancelled At" value={booking.cancelled_at ? new Date(booking.cancelled_at).toLocaleString() : '—'} />
                    <DField label="Reason" value={dash(booking.cancellation_reason)} />
                  </GridRow>
                </Section>
              )}

              {/* status actions */}
              {(statusFlow[booking.status] || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {statusFlow[booking.status]?.map(s => (
                    <button key={s} type="button" onClick={() => updateStatus(s)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-semibold border transition ${
                        s === 'CANCELLED'
                          ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                          : 'bg-blue-600 text-slate-800 border-blue-700 hover:bg-blue-700'
                      }`}>
                      {s === 'CHECKED_IN' && <MdLogin size={14} />}
                      {s === 'CHECKED_OUT' && <MdLogout size={14} />}
                      {s === 'CONFIRMED' && <MdCheck size={14} />}
                      {s === 'CHECKED_IN' ? 'Check In' : s === 'CHECKED_OUT' ? 'Check Out' : s === 'CONFIRMED' ? 'Confirm' : 'Cancel'}
                    </button>
                  ))}
                </div>
              )}

              {/* room assignment */}
              <Section title="Room Assignment">
                <div className="flex items-center justify-between gap-2">
                  <DField label="Assigned Room" value={dash(booking.room_number || 'Not assigned')} compact />
                  <button type="button" onClick={() => setShowAssignRoom(v => !v)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 shrink-0">
                    {showAssignRoom ? 'Cancel' : (booking.room_number ? 'Reassign' : 'Assign Room')}
                  </button>
                </div>
                {showAssignRoom && (
                  <div className="flex gap-2 mt-2">
                    <select value={assignRoomId} onChange={e => setAssignRoomId(e.target.value)}
                      className="flex-1 h-7 bg-white border border-slate-300 rounded-sm px-2 text-sm font-medium text-slate-800
                                 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-500/35">
                      <option value="">Select room…</option>
                      {availableRooms.map(r => (
                        <option key={r.id} value={r.id}>Room {r.room_number} ({r.status})</option>
                      ))}
                    </select>
                    <button type="button" onClick={handleAssignRoom}
                      className="px-3 py-1 bg-blue-600 text-slate-800 text-xs font-semibold rounded-sm hover:bg-blue-700">
                      Assign
                    </button>
                  </div>
                )}
              </Section>

              {/* payments */}
              <Section title={`Payments (${booking.payments?.length || 0})`}>
                <div className="flex justify-end mb-2">
                  <button type="button" onClick={() => setShowPayForm(v => !v)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900">
                    {showPayForm ? 'Cancel' : '+ Record Payment'}
                  </button>
                </div>
                {booking.payments && booking.payments.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {booking.payments.map(p => (
                      <div key={p.id} className="bg-white border border-slate-200 rounded-sm px-3 py-2 text-xs">
                        <div className="flex justify-between font-medium text-slate-800 mb-1">
                          <span>{p.payment_method} — BDT {p.amount}</span>
                          <span className={p.status === 'COMPLETED' ? 'text-green-700' : p.status === 'REFUNDED' ? 'text-slate-500' : 'text-amber-700'}>
                            {p.status}
                          </span>
                        </div>
                        {p.transaction_id && <div className="text-slate-500">Tran: <span className="font-mono text-slate-700">{p.transaction_id}</span></div>}
                        {p.card_type && <div className="text-slate-500">Card: {p.card_type} {p.card_no} ({p.card_brand})</div>}
                        {p.bank_tran_id && <div className="text-slate-500">Bank: <span className="font-mono">{p.bank_tran_id}</span></div>}
                        {p.paid_at && <div className="text-slate-400 mt-1">{new Date(p.paid_at).toLocaleString()}</div>}
                        {p.status === 'COMPLETED' && p.bank_tran_id && (
                          <button type="button"
                            onClick={async () => {
                              const amt = prompt('Refund amount:', p.amount);
                              if (!amt) return;
                              const remarks = prompt('Refund remarks:', 'Admin refund') || 'Admin refund';
                              try {
                                await api.post('/admin/payment-gateway/refund/', {
                                  payment_id: p.id, refund_amount: amt, refund_remarks: remarks,
                                });
                                toast.success('Refund initiated');
                                load();
                                onRefresh();
                              } catch (e: unknown) {
                                const err = e as { response?: { data?: { detail?: string } } };
                                toast.error(err?.response?.data?.detail || 'Refund failed');
                              }
                            }}
                            className="mt-1.5 px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-sm text-xs hover:bg-red-100">
                            Refund via Gateway
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showPayForm && (
                  <div className="space-y-2 bg-white border border-slate-200 rounded-sm p-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (BDT)</label>
                        <input type="number" value={payForm.amount}
                          onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-full h-7 bg-white border border-slate-300 rounded-sm px-2 text-sm focus:outline-none focus:border-blue-600" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Method</label>
                        <select value={payForm.payment_method}
                          onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}
                          className="w-full h-7 bg-white border border-slate-300 rounded-sm px-2 text-sm focus:outline-none focus:border-blue-600">
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card</option>
                          <option value="ONLINE">Online</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Transaction ID (optional)</label>
                      <input type="text" value={payForm.transaction_id}
                        onChange={e => setPayForm(f => ({ ...f, transaction_id: e.target.value }))}
                        className="w-full h-7 bg-white border border-slate-300 rounded-sm px-2 text-sm focus:outline-none focus:border-blue-600" />
                    </div>
                    <button type="button" onClick={handlePaymentSubmit}
                      className="w-full py-1.5 bg-blue-600 text-slate-800 text-xs font-semibold rounded-sm hover:bg-blue-700">
                      Record Payment
                    </button>
                  </div>
                )}
              </Section>
            </div>

            {/* footer */}
            <div className="shrink-0 px-3 py-2 bg-slate-200/80 border-t border-slate-300 flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenFolio(booking)}
                className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-sm bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                <MdReceipt size={14} /> Folio
              </button>
              <button type="button" onClick={() => onOpenRegistration(booking.id)}
                className="flex items-center gap-1 px-3 py-1.5 border border-purple-300 rounded-sm bg-purple-50 text-purple-800 text-xs font-semibold hover:bg-purple-100">
                <MdBadge size={14} /> Registration
              </button>
              <button type="button" onClick={() => {
                api.get(`/admin/bookings/${booking.id}/invoice/pdf/`, { responseType: 'blob' })
                  .then(res => {
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement('a'); a.href = url;
                    a.download = `invoice_${booking.booking_ref}.pdf`; a.click();
                    window.URL.revokeObjectURL(url);
                  }).catch(() => toast.error('Failed to download invoice'));
              }}
                className="flex items-center gap-1 px-3 py-1.5 border border-green-300 rounded-sm bg-green-50 text-green-800 text-xs font-semibold hover:bg-green-100">
                <MdDownload size={14} /> Invoice PDF
              </button>
              <button type="button" onClick={handleDelete}
                className="px-3 py-1.5 border border-red-300 rounded-sm bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 ml-auto">
                Delete
              </button>
              <button type="button" onClick={onClose}
                className="px-3 py-1.5 border border-slate-300 rounded-sm bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50">
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
