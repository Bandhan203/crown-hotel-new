import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MdNightsStay, MdPlayArrow, MdHistory, MdCheckCircle, MdRefresh,
  MdLock, MdWarning, MdOpenInNew,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface RoomCharge {
  booking_id: number;
  booking_ref: string;
  guest_name: string;
  room_number: string;
  room_amount: number;
  service_charge: number;
  tax: number;
  nightly_total: number;
  rate_plan: string | null;
  already_posted: boolean;
}

interface NoShow {
  booking_id: number;
  booking_ref: string;
  guest_name: string;
  room_type: string;
  room_number: string | null;
}

interface OverdueCheckout {
  booking_id: number;
  booking_ref: string;
  guest_name: string;
  room_number: string | null;
  room_id: number | null;
  check_out_date: string;
}

interface AuditPreview {
  business_date: string;
  audit_date: string;
  already_run: boolean;
  pin_required: boolean;
  can_run: boolean;
  blocked_by_overdue: boolean;
  total_rooms: number;
  rooms_sold: number;
  occupancy_rate: number;
  room_charges: RoomCharge[];
  projected_charges: { room: number; tax: number; service_charge: number; total: number };
  no_shows: NoShow[];
  overdue_checkouts: OverdueCheckout[];
  revenue_preview: {
    room: number; fnb: number; tax: number; service_charge: number; other: number; total: number;
  };
}

interface AuditLog {
  id: number;
  audit_date: string;
  occupancy_rate: number;
  total_revenue: number;
  room_revenue: number;
  fnb_revenue: number;
  tax_revenue?: number;
  service_charge_revenue?: number;
  other_revenue: number;
  no_show_count: number;
  new_bookings: number;
  check_ins: number;
  check_outs: number;
  total_rooms_sold: number;
  total_rooms_available: number;
  performed_by: string | null;
  notes: string;
  created_at: string;
}

export default function NightAudit() {
  const [tab, setTab] = useState<'run' | 'history'>('run');
  const [businessDate, setBusinessDate] = useState('');
  const [preview, setPreview] = useState<AuditPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState('');
  const [lastResult, setLastResult] = useState<AuditLog | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [nightAuditPin, setNightAuditPin] = useState('');
  const [managerOverridePin, setManagerOverridePin] = useState('');
  const [useManagerOverride, setUseManagerOverride] = useState(false);

  const [history, setHistory] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadBusinessDate = useCallback(async () => {
    try {
      const res = await api.get('/admin/config/');
      setBusinessDate(res.data.business_date ?? '');
    } catch {
      toast.error('Failed to load hotel business date');
    }
  }, []);

  const fetchPreview = useCallback(async (date?: string) => {
    setPreviewLoading(true);
    try {
      const params = date ? { date } : {};
      const res = await api.get('/admin/night-audit/preview/', { params });
      setPreview(res.data);
      if (!date && res.data.business_date) {
        setBusinessDate(res.data.business_date);
      }
      setLastResult(null);
    } catch {
      toast.error('Failed to load preview');
    }
    setPreviewLoading(false);
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/admin/night-audit/');
      setHistory(res.data);
    } catch {
      toast.error('Failed to load audit history');
    }
    setHistoryLoading(false);
  };

  useEffect(() => { loadBusinessDate(); }, [loadBusinessDate]);
  useEffect(() => {
    if (businessDate) fetchPreview(businessDate);
  }, [businessDate, fetchPreview]);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab]);

  const openRunModal = () => {
    if (!preview || preview.already_run) return;
    setNightAuditPin('');
    setManagerOverridePin('');
    setUseManagerOverride(preview.blocked_by_overdue);
    setShowPinModal(true);
  };

  const runAudit = async () => {
    if (!preview || preview.already_run || !businessDate) return;
    if (!nightAuditPin.trim()) {
      toast.error('Night audit PIN is required');
      return;
    }
    setRunning(true);
    try {
      const payload: Record<string, string> = {
        date: businessDate,
        notes,
        night_audit_pin: nightAuditPin.trim(),
      };
      if (useManagerOverride && managerOverridePin.trim()) {
        payload.manager_override_pin = managerOverridePin.trim();
      }
      const res = await api.post('/admin/night-audit/run/', payload);
      setLastResult(res.data);
      setShowPinModal(false);
      setPreview(p => p ? { ...p, already_run: true, can_run: false } : p);
      const cfg = await api.get('/admin/config/');
      setBusinessDate(cfg.data.business_date ?? '');
      toast.success('Night audit completed — business date advanced');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string; code?: string } } };
      toast.error(e.response?.data?.detail || 'Audit failed');
    }
    setRunning(false);
  };

  const auditDateLabel = preview?.audit_date ?? businessDate;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MdNightsStay className="text-teal-700" /> Night Audit
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Daily close — post locked folio charges, process no-shows, roll business date
          </p>
        </div>
        {businessDate && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Business Date</p>
            <p className="text-lg font-extrabold text-teal-700">{businessDate}</p>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        <button type="button" onClick={() => setTab('run')}
          className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'run' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-slate-800'}`}>
          <MdPlayArrow size={18} /> Run Audit
        </button>
        <button type="button" onClick={() => setTab('history')}
          className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'history' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-slate-800'}`}>
          <MdHistory size={18} /> History
        </button>
      </div>

      {tab === 'run' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Audit for:</span>
            <span className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-sm font-semibold">
              {auditDateLabel || '—'}
            </span>
            <button type="button" onClick={() => fetchPreview(businessDate)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-slate-800">
              <MdRefresh size={18} />
            </button>
          </div>

          {previewLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : preview && !lastResult ? (
            <>
              {preview.already_run && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                  <MdCheckCircle className="text-green-600 shrink-0" size={24} />
                  <div>
                    <p className="text-green-700 text-sm font-semibold">Audit completed for {preview.audit_date}</p>
                    <p className="text-green-600/80 text-xs mt-0.5">Business date has been advanced. No further run is allowed for this date.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Rooms Sold" value={`${preview.rooms_sold} / ${preview.total_rooms}`} sub={`${preview.occupancy_rate}% occupancy`} />
                <StatCard label="Projected Room" value={`BDT ${preview.projected_charges.room.toLocaleString()}`} sub="Pending post" />
                <StatCard label="No-Shows" value={String(preview.no_shows.length)} sub="To mark & release" color={preview.no_shows.length > 0 ? 'text-red-500' : undefined} />
                <StatCard label="Overdue C/O" value={String(preview.overdue_checkouts.length)} sub={preview.blocked_by_overdue ? 'Blocks audit' : 'Clear'} color={preview.overdue_checkouts.length > 0 ? 'text-amber-600' : undefined} />
              </div>

              {preview.overdue_checkouts.length > 0 && (
                <Section title="Overdue Checkouts — Action Required">
                  <p className="text-amber-700 text-xs mb-3 flex items-center gap-1">
                    <MdWarning size={16} /> These guests must check out before night audit, or use manager override PIN.
                  </p>
                  <div className="space-y-2">
                    {preview.overdue_checkouts.map(o => (
                      <div key={o.booking_id} className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div>
                          <span className="font-mono text-xs text-teal-700">{o.booking_ref}</span>
                          <span className="text-gray-700 text-sm ml-3">{o.guest_name}</span>
                          {o.room_number && <span className="text-gray-500 text-sm ml-2">Room {o.room_number}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-700 text-xs font-medium">Due: {o.check_out_date}</span>
                          <Link
                            to="/admin/checkout"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-700 text-white text-xs font-semibold rounded-lg hover:bg-teal-600"
                          >
                            Check Out <MdOpenInNew size={14} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Room Charges (Dynamic Rate Plan)">
                {preview.room_charges.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No in-house guests for this date</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-500 text-xs border-b border-gray-200">
                          <th className="py-2 text-left">Booking</th>
                          <th className="text-left">Guest</th>
                          <th className="text-left">Room</th>
                          <th className="text-left">Plan</th>
                          <th className="text-right">Room</th>
                          <th className="text-right">Svc</th>
                          <th className="text-right">Tax</th>
                          <th className="text-right">Total</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.room_charges.map(c => (
                          <tr key={c.booking_id} className="border-b border-gray-100">
                            <td className="py-2 font-mono text-xs text-teal-700">{c.booking_ref}</td>
                            <td className="text-gray-600">{c.guest_name}</td>
                            <td className="text-gray-600">{c.room_number}</td>
                            <td className="text-gray-400 text-xs">{c.rate_plan || '—'}</td>
                            <td className="text-right text-slate-800">{c.room_amount.toLocaleString()}</td>
                            <td className="text-right text-gray-500">{c.service_charge.toLocaleString()}</td>
                            <td className="text-right text-gray-500">{c.tax.toLocaleString()}</td>
                            <td className="text-right font-medium text-slate-800">{c.nightly_total.toLocaleString()}</td>
                            <td className="text-center">
                              {c.already_posted ? (
                                <span className="inline-flex items-center gap-0.5 text-green-600 text-xs"><MdLock size={12} /> Posted</span>
                              ) : (
                                <span className="text-amber-600 text-xs">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {preview.no_shows.length > 0 && (
                <Section title="No-Shows (will cancel & release room)">
                  <div className="space-y-2">
                    {preview.no_shows.map(n => (
                      <div key={n.booking_id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded-lg p-3">
                        <div>
                          <span className="font-mono text-xs text-teal-700">{n.booking_ref}</span>
                          <span className="text-gray-600 text-sm ml-3">{n.guest_name}</span>
                        </div>
                        <span className="text-gray-500 text-xs">{n.room_type}{n.room_number ? ` · ${n.room_number}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section title="Revenue Summary (folio snapshot)">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <RevCell label="Room" value={preview.revenue_preview.room} />
                  <RevCell label="F&B" value={preview.revenue_preview.fnb} />
                  <RevCell label="Tax" value={preview.revenue_preview.tax} />
                  <RevCell label="Service" value={preview.revenue_preview.service_charge} />
                  <RevCell label="Other" value={preview.revenue_preview.other} />
                  <RevCell label="Total" value={preview.revenue_preview.total} highlight />
                </div>
              </Section>

              {!preview.already_run && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Audit notes (optional)..."
                    rows={2} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                  <button type="button" onClick={openRunModal} disabled={running}
                    className="w-full py-3 bg-teal-700 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <MdLock size={18} /> {preview.blocked_by_overdue ? 'Run with Manager Override' : 'Run Night Audit'}
                  </button>
                  {preview.blocked_by_overdue && (
                    <p className="text-xs text-amber-700 text-center">Resolve overdue checkouts first, or provide manager override at PIN prompt.</p>
                  )}
                </div>
              )}
            </>
          ) : lastResult ? (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 space-y-6">
              <div className="flex items-start gap-3">
                <MdCheckCircle className="text-green-600 mt-1" size={24} />
                <div>
                  <h3 className="text-slate-800 font-semibold">Night Audit Completed</h3>
                  <p className="text-gray-500 text-sm">Audit for {lastResult.audit_date} · Business date is now {businessDate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Occupancy" value={`${lastResult.occupancy_rate}%`} sub={`${lastResult.total_rooms_sold} rooms`} />
                <StatCard label="Revenue" value={`BDT ${lastResult.total_revenue.toLocaleString()}`} sub="Total" />
                <StatCard label="No-Shows" value={String(lastResult.no_show_count)} sub="Marked" />
                <StatCard label="Check-ins" value={String(lastResult.check_ins)} sub={`${lastResult.check_outs} check-outs`} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Room:</span> <span className="text-slate-800 ml-2">BDT {lastResult.room_revenue.toLocaleString()}</span></div>
                <div><span className="text-gray-500">F&B:</span> <span className="text-slate-800 ml-2">BDT {lastResult.fnb_revenue.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Tax:</span> <span className="text-slate-800 ml-2">BDT {(lastResult.tax_revenue ?? 0).toLocaleString()}</span></div>
                <div><span className="text-gray-500">Service:</span> <span className="text-slate-800 ml-2">BDT {(lastResult.service_charge_revenue ?? 0).toLocaleString()}</span></div>
                <div><span className="text-gray-500">Performed by:</span> <span className="text-slate-800 ml-2">{lastResult.performed_by}</span></div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'history' && (
        historyLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : history.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No audit history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-200">
                  <th className="py-2 text-left">Date</th>
                  <th className="text-right">Occupancy</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-center">Rooms</th>
                  <th className="text-center">No-Shows</th>
                  <th className="text-center">C/I</th>
                  <th className="text-center">C/O</th>
                  <th className="text-left">Run By</th>
                </tr>
              </thead>
              <tbody>
                {history.map(l => (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(l)}>
                    <td className="py-2.5 text-slate-800 font-medium">{l.audit_date}</td>
                    <td className="text-right text-teal-700 font-semibold">{l.occupancy_rate}%</td>
                    <td className="text-right text-slate-800">BDT {l.total_revenue.toLocaleString()}</td>
                    <td className="text-center text-gray-600">{l.total_rooms_sold}/{l.total_rooms_available}</td>
                    <td className="text-center">{l.no_show_count > 0 ? <span className="text-red-500">{l.no_show_count}</span> : '0'}</td>
                    <td className="text-center text-gray-600">{l.check_ins}</td>
                    <td className="text-center text-gray-600">{l.check_outs}</td>
                    <td className="text-gray-500">{l.performed_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {selectedLog && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
                <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-slate-800 font-bold text-lg">Audit — {selectedLog.audit_date}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <AField label="Occupancy" value={`${selectedLog.occupancy_rate}%`} />
                    <AField label="Total Revenue" value={`BDT ${selectedLog.total_revenue.toLocaleString()}`} highlight />
                    <AField label="Room" value={`BDT ${selectedLog.room_revenue.toLocaleString()}`} />
                    <AField label="Tax" value={`BDT ${(selectedLog.tax_revenue ?? 0).toLocaleString()}`} />
                    <AField label="Service" value={`BDT ${(selectedLog.service_charge_revenue ?? 0).toLocaleString()}`} />
                    <AField label="No-Shows" value={String(selectedLog.no_show_count)} />
                  </div>
                  <button type="button" onClick={() => setSelectedLog(null)} className="w-full py-2 text-gray-500 hover:text-slate-800 text-sm border border-gray-200 rounded-lg">Close</button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !running && setShowPinModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MdLock className="text-teal-700" /> Authorize Night Audit
            </h3>
            <p className="text-sm text-gray-500">
              Closing <strong>{auditDateLabel}</strong>. All folio charges will be locked. This cannot be undone.
            </p>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Night Audit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={nightAuditPin}
                onChange={e => setNightAuditPin(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg focus:border-teal-600 focus:outline-none"
                placeholder="Enter PIN"
              />
            </div>
            {(preview?.blocked_by_overdue || useManagerOverride) && (
              <div>
                <label className="text-xs font-semibold text-amber-700 uppercase flex items-center gap-1">
                  <MdWarning size={14} /> Manager Override PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={managerOverridePin}
                  onChange={e => setManagerOverridePin(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-amber-200 rounded-lg focus:border-amber-500 focus:outline-none"
                  placeholder="Required to bypass overdue checkouts"
                />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" disabled={running} onClick={() => setShowPinModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button type="button" disabled={running} onClick={runAudit}
                className="flex-1 py-2.5 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-600 disabled:opacity-50">
                {running ? 'Running…' : 'Confirm & Run'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || 'text-slate-800'}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-1">{sub}</p>
    </div>
  );
}

function RevCell({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-teal-700' : 'text-slate-800'}`}>
        BDT {value.toLocaleString()}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <h3 className="text-slate-800 font-semibold text-sm mb-4">{title}</h3>
      {children}
    </div>
  );
}

function AField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-teal-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}
