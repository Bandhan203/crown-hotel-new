import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdExpandMore, MdHotel, MdEventAvailable } from 'react-icons/md';
import GuestFolio from '../GuestFolio';

export interface OccupantContext {
  booking_id: number;
  guest_name: string;
  phone?: string;
  company_name?: string;
  dob?: string | null;
  gender?: string;
  adults?: number;
  children?: number;
  infants?: number;
  place_of_issue?: string;
  visa_no?: string;
  id_expiry?: string | null;
  check_in: string;
  check_out: string;
  arrival_time?: string | null;
  departure_time?: string | null;
  booking_ref: string;
  parent_booking_ref?: string | null;
  arrival_mode?: string;
  vehicle_assigned?: string;
  meal_plan?: string;
  meal_plan_label?: string;
  market_code?: string;
  advance_paid?: number;
  balance_due: number;
  guest_preferences?: string;
  special_requests?: string;
  internal_notes?: string;
}

interface RoomContext {
  room_id: number;
  room_number: string;
  status: string;
  housekeeping_status: string;
  notes: string;
  room_type: string;
  occupant: OccupantContext | null;
}

interface GuestPanelProps {
  roomContext: RoomContext | null;
  loading: boolean;
  onOpenFolio?: () => void;
}

function nightsBetween(a: string, b: string) {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function formatShortDate(iso: string) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

function formatDobGender(dob?: string | null, gender?: string) {
  const dobPart = dob ? formatShortDate(dob) : '—';
  const genderPart = gender ? gender.charAt(0) + gender.slice(1).toLowerCase() : '—';
  return `${dobPart} / ${genderPart}`;
}

function formatTime(t?: string | null) {
  if (!t) return '';
  try {
    const [h, m] = t.split(':');
    return `${h}:${m}`;
  } catch {
    return t;
  }
}

function formatStayRange(occ: OccupantContext) {
  const inDate = formatShortDate(occ.check_in);
  const outDate = formatShortDate(occ.check_out);
  const inTime = formatTime(occ.arrival_time);
  const outTime = formatTime(occ.departure_time);
  const inPart = inTime ? `${inDate}, ${inTime}` : inDate;
  const outPart = outTime ? `${outDate}, ${outTime}` : outDate;
  return `${inPart} – ${outPart}`;
}

function InfoRow({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] opacity-60">{label}</span>
      <span className={`text-sm font-bold ${valueClass}`}>{value || '—'}</span>
    </div>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-bold text-primary-fixed uppercase tracking-widest opacity-80 border-b border-white/10 pb-1 mb-1.5">
        {title}
      </p>
      {children}
    </section>
  );
}

function parseServiceTags(...sources: (string | undefined)[]) {
  const tags: string[] = [];
  for (const src of sources) {
    if (!src?.trim()) continue;
    src.split(/[,;|]/).forEach(part => {
      const t = part.trim();
      if (t && !tags.includes(t)) tags.push(t);
    });
  }
  return tags.slice(0, 6);
}

export default function GuestPanel({ roomContext, loading, onOpenFolio }: GuestPanelProps) {
  const navigate = useNavigate();
  const [showFolio, setShowFolio] = useState(false);
  const [flash, setFlash] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    if (!roomContext) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 150);
    return () => clearTimeout(t);
  }, [roomContext?.room_id]);

  if (loading) {
    return (
      <div className="bg-primary-container/20 border border-outline-variant rounded-xl flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!roomContext) {
    return (
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-8 text-center">
        <MdHotel size={32} className="mx-auto text-on-surface-variant mb-3" />
        <p className="text-sm text-on-surface-variant">Select a room from the grid to view stay details</p>
      </div>
    );
  }

  const occ = roomContext.occupant;
  const isOccupied = !!occ;
  const nights = occ ? nightsBetween(occ.check_in, occ.check_out) : 0;
  const statusLabel = roomContext.status.replace(/_/g, ' ');
  const serviceTags = parseServiceTags(occ?.special_requests, occ?.guest_preferences);

  const openFolio = () => {
    if (onOpenFolio) onOpenFolio();
    else if (occ) setShowFolio(true);
  };

  return (
    <>
      <div id="stay-summary">
        <div
          className={`bg-primary text-white rounded-xl shadow-lg shadow-primary/10 p-4 transition-transform duration-100 ${
            flash ? 'scale-[0.98]' : 'scale-100'
          }`}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <p className="text-xs font-bold text-primary-fixed uppercase tracking-widest opacity-80 mb-1">
                Current Selection
              </p>
              <h2 className="text-3xl font-extrabold">Room {roomContext.room_number}</h2>
              <p className="text-[10px] font-bold text-primary-fixed opacity-60">
                {occ ? `Conf. No: ${occ.booking_ref}` : roomContext.room_type}
              </p>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-md capitalize">
              {statusLabel}
            </span>
          </div>

          {isOccupied && occ ? (
            <div className="space-y-3">
              <SectionBlock title="Guest Information">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <InfoRow label="Title / Name" value={occ.guest_name} />
                  <InfoRow label="Contact Number" value={occ.phone || '—'} />
                  <InfoRow label="Company Name" value={occ.company_name || '—'} />
                  <InfoRow label="DOB / Gender" value={formatDobGender(occ.dob, occ.gender)} />
                  <div className="col-span-2">
                    <InfoRow
                      label="PAX Breakdown"
                      value={`Adults: ${occ.adults ?? 1} | Children: ${occ.children ?? 0} | Infants: ${occ.infants ?? 0}`}
                    />
                  </div>
                  <InfoRow label="Place of Issue" value={occ.place_of_issue || '—'} />
                  <InfoRow
                    label="Visa No / Expiry"
                    value={
                      occ.visa_no
                        ? `${occ.visa_no}${occ.id_expiry ? ` / ${formatShortDate(occ.id_expiry)}` : ''}`
                        : '—'
                    }
                  />
                </div>
              </SectionBlock>

              <SectionBlock title="Stay & Logistics">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <InfoRow label="Arrival / Departure" value={formatStayRange(occ)} />
                  <InfoRow label="Duration" value={`${nights} Night${nights !== 1 ? 's' : ''}`} />
                  <InfoRow label="Parent Booking ID" value={occ.parent_booking_ref || '—'} />
                  <InfoRow label="Arrival Mode" value={occ.arrival_mode || '—'} />
                  <div className="col-span-2">
                    <InfoRow label="Vehicle Assigned" value={occ.vehicle_assigned || '—'} />
                  </div>
                </div>
              </SectionBlock>

              <SectionBlock title="Demographics & Services">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] opacity-60">Meal Plan</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold">{occ.meal_plan_label || occ.meal_plan || '—'}</span>
                      <MdExpandMore className="text-xs opacity-60" />
                    </div>
                  </div>
                  <InfoRow label="Market Code" value={occ.market_code || '—'} />
                  <InfoRow
                    label="Total Advance Paid"
                    value={`৳${(occ.advance_paid ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    valueClass="text-status-available"
                  />
                  <InfoRow
                    label="Folio Balance"
                    value={`৳${occ.balance_due.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    valueClass="text-primary-fixed"
                  />
                  <div className="col-span-2 flex flex-col">
                    <span className="text-[10px] opacity-60">Reason for Adjustment (Audit)</span>
                    <input
                      className="bg-white/10 border border-white/20 rounded px-2 py-1 text-[10px] mt-1 focus:ring-0 focus:border-white/40 outline-none"
                      placeholder="Enter reason..."
                      type="text"
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                    />
                  </div>
                </div>

                {serviceTags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] font-bold text-primary-fixed uppercase opacity-60 mb-2">
                      Complementary Services
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {serviceTags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-white/10 rounded text-[10px] font-bold border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionBlock>

              {(occ.internal_notes || roomContext.notes) && (
                <section className="mt-2">
                  <p className="text-xs font-bold text-primary-fixed uppercase tracking-widest opacity-80 border-b border-white/10 pb-1 mb-1.5">
                    Internal Remarks / Notes
                  </p>
                  <div className="p-3 bg-white/10 border border-white/10 rounded-lg">
                    <p className="text-[10px] leading-relaxed italic opacity-80">
                      {occ.internal_notes || roomContext.notes}
                    </p>
                  </div>
                </section>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/front-desk?tab=departures')}
                  className="py-2.5 bg-white text-primary rounded-lg font-bold text-sm shadow-md hover:bg-surface-container transition-colors"
                >
                  Check-Out
                </button>
                <button
                  type="button"
                  onClick={openFolio}
                  className="py-2.5 bg-white/10 text-white border border-white/20 rounded-lg font-bold text-sm hover:bg-white/20 transition-colors"
                >
                  Modify Stay
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <p className="text-sm opacity-80">Room is {statusLabel.toLowerCase()}</p>
              <button
                type="button"
                onClick={() => navigate('/admin/front-desk?action=walkin')}
                className="w-full py-2.5 bg-white text-primary rounded-lg font-bold text-sm flex items-center justify-center gap-2"
              >
                <MdEventAvailable size={18} /> Walk-in Booking
              </button>
            </div>
          )}
        </div>
      </div>

      {showFolio && occ && (
        <GuestFolio
          bookingId={occ.booking_id}
          bookingRef={occ.booking_ref}
          onClose={() => setShowFolio(false)}
        />
      )}
    </>
  );
}
