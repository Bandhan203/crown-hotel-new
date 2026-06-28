import { useState, useEffect } from 'react';
import { MdNightsStay, MdPlayArrow, MdHistory, MdWarning, MdCheckCircle, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface RoomCharge {
  booking_id: number;
  booking_ref: string;
  guest_name: string;
  room_number: string;
  nightly_rate: number;
  already_posted: boolean;
}

interface NoShow {
  booking_id: number;
  booking_ref: string;
  guest_name: string;
  room_type: string;
}

interface OverdueCheckout {
  booking_id: number;
  booking_ref: string;
  guest_name: string;
  room_number: string;
  check_out_date: string;
}

interface AuditPreview {
  audit_date: string;
  already_run: boolean;
  total_rooms: number;
  rooms_sold: number;
  occupancy_rate: number;
  room_charges: RoomCharge[];
  no_shows: NoShow[];
  overdue_checkouts: OverdueCheckout[];
  revenue_preview: { room: number; fnb: number; other: number; total: number };
}

interface AuditLog {
  id: number;
  audit_date: string;
  occupancy_rate: number;
  total_revenue: number;
  room_revenue: number;
  fnb_revenue: number;
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
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);
  const [preview, setPreview] = useState<AuditPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState('');
  const [lastResult, setLastResult] = useState<AuditLog | null>(null);

  const [history, setHistory] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchPreview = async () => {
    setPreviewLoading(true);
    try {
      const res = await api.get('/admin/night-audit/preview/', { params: { date: auditDate } });
      setPreview(res.data);
      setLastResult(null);
    } catch { toast.error('Failed to load preview'); }
    setPreviewLoading(false);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/admin/night-audit/');
      setHistory(res.data);
    } catch { toast.error('Failed to load audit history'); }
    setHistoryLoading(false);
  };

  useEffect(() => { fetchPreview(); }, [auditDate]);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab]);

  const runAudit = async () => {
    if (!preview || preview.already_run) return;
    setRunning(true);
    try {
      const res = await api.post('/admin/night-audit/run/', { date: auditDate, notes });
      setLastResult(res.data);
      setPreview(p => p ? { ...p, already_run: true } : p);
      toast.success('Night audit completed successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Audit failed');
    }
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MdNightsStay className="text-teal-700" /> Night Audit
          </h1>
          <p className="text-gray-500 text-sm mt-1">Daily close process — post charges, mark no-shows, generate reports</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button onClick={() => setTab('run')}
          className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'run' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-slate-800'}`}>
          <MdPlayArrow size={18} /> Run Audit
        </button>
        <button onClick={() => setTab('history')}
          className={`px-5 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${tab === 'history' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-gray-500 hover:text-slate-800'}`}>
          <MdHistory size={18} /> History
        </button>
      </div>

      {/* RUN TAB */}
      {tab === 'run' && (
        <div className="space-y-6">
          {/* Date Selector */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-500">Audit Date:</label>
            <input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
            <button onClick={fetchPreview} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:text-slate-800">
              <MdRefresh size={18} />
            </button>
          </div>

          {previewLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : preview && !lastResult ? (
            <>
              {/* Status Banner */}
              {preview.already_run && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                  <MdCheckCircle className="text-green-400" size={24} />
                  <p className="text-green-400 text-sm">Night audit has already been run for {preview.audit_date}.</p>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Rooms Sold" value={`${preview.rooms_sold} / ${preview.total_rooms}`} sub={`${preview.occupancy_rate}% occupancy`} />
                <StatCard label="Room Charges" value={`BDT ${preview.revenue_preview.room.toLocaleString()}`} sub="To post" />
                <StatCard label="No-Shows" value={String(preview.no_shows.length)} sub="To mark" color={preview.no_shows.length > 0 ? 'text-red-400' : undefined} />
                <StatCard label="Overdue C/O" value={String(preview.overdue_checkouts.length)} sub="Need attention" color={preview.overdue_checkouts.length > 0 ? 'text-yellow-400' : undefined} />
              </div>

              {/* Room Charges */}
              <Section title="Room Charges to Post">
                {preview.room_charges.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">No room charges to post</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-gray-500 text-xs border-b border-gray-200">
                        <th className="py-2 text-left">Booking</th><th className="text-left">Guest</th><th className="text-left">Room</th><th className="text-right">Rate</th><th className="text-center">Status</th>
                      </tr></thead>
                      <tbody>
                        {preview.room_charges.map(c => (
                          <tr key={c.booking_id} className="border-b border-white/5">
                            <td className="py-2 font-mono text-xs text-teal-700">{c.booking_ref}</td>
                            <td className="text-gray-600">{c.guest_name}</td>
                            <td className="text-gray-600">{c.room_number}</td>
                            <td className="text-right text-slate-800">BDT {c.nightly_rate.toLocaleString()}</td>
                            <td className="text-center">
                              {c.already_posted
                                ? <span className="text-green-400 text-xs">Posted</span>
                                : <span className="text-yellow-400 text-xs">Pending</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* No-Shows */}
              {preview.no_shows.length > 0 && (
                <Section title="No-Shows to Mark">
                  <div className="space-y-2">
                    {preview.no_shows.map(n => (
                      <div key={n.booking_id} className="flex items-center justify-between bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <div>
                          <span className="font-mono text-xs text-teal-700">{n.booking_ref}</span>
                          <span className="text-gray-600 text-sm ml-3">{n.guest_name}</span>
                        </div>
                        <span className="text-gray-500 text-xs">{n.room_type}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Overdue Checkouts */}
              {preview.overdue_checkouts.length > 0 && (
                <Section title="Overdue Checkouts">
                  <div className="space-y-2">
                    {preview.overdue_checkouts.map(o => (
                      <div key={o.booking_id} className="flex items-center justify-between bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                        <div>
                          <span className="font-mono text-xs text-teal-700">{o.booking_ref}</span>
                          <span className="text-gray-600 text-sm ml-3">{o.guest_name}</span>
                          <span className="text-gray-500 text-sm ml-2">Room {o.room_number}</span>
                        </div>
                        <span className="text-yellow-400 text-xs">Due: {o.check_out_date}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Revenue Preview */}
              <Section title="Revenue Summary">
                <div className="grid grid-cols-4 gap-4">
                  <div><p className="text-gray-500 text-xs">Room</p><p className="text-slate-800 text-lg font-semibold">BDT {preview.revenue_preview.room.toLocaleString()}</p></div>
                  <div><p className="text-gray-500 text-xs">F&B</p><p className="text-slate-800 text-lg font-semibold">BDT {preview.revenue_preview.fnb.toLocaleString()}</p></div>
                  <div><p className="text-gray-500 text-xs">Other</p><p className="text-slate-800 text-lg font-semibold">BDT {preview.revenue_preview.other.toLocaleString()}</p></div>
                  <div><p className="text-gray-500 text-xs">Total</p><p className="text-teal-700 text-lg font-bold">BDT {preview.revenue_preview.total.toLocaleString()}</p></div>
                </div>
              </Section>

              {/* Run Button */}
              {!preview.already_run && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-4">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Audit notes (optional)..."
                    rows={2} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
                  <button onClick={runAudit} disabled={running}
                    className="w-full py-3 bg-teal-700 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    <MdPlayArrow size={20} /> {running ? 'Running Night Audit...' : 'Run Night Audit'}
                  </button>
                </div>
              )}
            </>
          ) : lastResult ? (
            /* Audit Result */
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 space-y-6">
              <div className="flex items-start gap-3">
                <MdCheckCircle className="text-green-400 mt-1" size={24} />
                <div>
                  <h3 className="text-slate-800 font-semibold">Night Audit Completed</h3>
                  <p className="text-gray-500 text-sm">Audit for {lastResult.audit_date} ran at {new Date(lastResult.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Occupancy" value={`${lastResult.occupancy_rate}%`} sub={`${lastResult.total_rooms_sold} rooms`} />
                <StatCard label="Revenue" value={`BDT ${lastResult.total_revenue.toLocaleString()}`} sub="Total" />
                <StatCard label="No-Shows" value={String(lastResult.no_show_count)} sub="Marked" />
                <StatCard label="Check-ins" value={String(lastResult.check_ins)} sub={`${lastResult.check_outs} check-outs`} />
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Room Revenue:</span> <span className="text-slate-800 ml-2">BDT {lastResult.room_revenue.toLocaleString()}</span></div>
                <div><span className="text-gray-500">F&B Revenue:</span> <span className="text-slate-800 ml-2">BDT {lastResult.fnb_revenue.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Other Revenue:</span> <span className="text-slate-800 ml-2">BDT {lastResult.other_revenue.toLocaleString()}</span></div>
                <div><span className="text-gray-500">New Bookings:</span> <span className="text-slate-800 ml-2">{lastResult.new_bookings}</span></div>
                <div><span className="text-gray-500">Performed by:</span> <span className="text-slate-800 ml-2">{lastResult.performed_by}</span></div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        historyLoading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : history.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No audit history yet. Run your first night audit to get started.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs border-b border-gray-200">
                  <th className="py-2 text-left">Date</th>
                  <th className="text-right">Occupancy</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-center">Rooms</th>
                  <th className="text-center">No-Shows</th>
                  <th className="text-center">C/I</th>
                  <th className="text-center">C/O</th>
                  <th className="text-left">Run By</th>
                </tr></thead>
                <tbody>
                  {history.map(l => (
                    <tr key={l.id} className="border-b border-white/5 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(l)}>
                      <td className="py-2.5 text-slate-800 font-medium">{l.audit_date}</td>
                      <td className="text-right text-teal-700 font-semibold">{l.occupancy_rate}%</td>
                      <td className="text-right text-slate-800">BDT {l.total_revenue.toLocaleString()}</td>
                      <td className="text-center text-gray-600">{l.total_rooms_sold}/{l.total_rooms_available}</td>
                      <td className="text-center">{l.no_show_count > 0 ? <span className="text-red-400">{l.no_show_count}</span> : <span className="text-gray-600">0</span>}</td>
                      <td className="text-center text-gray-600">{l.check_ins}</td>
                      <td className="text-center text-gray-600">{l.check_outs}</td>
                      <td className="text-gray-500">{l.performed_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
                <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-slate-800 font-bold text-lg">Audit — {selectedLog.audit_date}</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <AField label="Occupancy" value={`${selectedLog.occupancy_rate}%`} />
                    <AField label="Rooms Sold" value={`${selectedLog.total_rooms_sold} / ${selectedLog.total_rooms_available}`} />
                    <AField label="Room Revenue" value={`BDT ${selectedLog.room_revenue.toLocaleString()}`} />
                    <AField label="F&B Revenue" value={`BDT ${selectedLog.fnb_revenue.toLocaleString()}`} />
                    <AField label="Other Revenue" value={`BDT ${selectedLog.other_revenue.toLocaleString()}`} />
                    <AField label="Total Revenue" value={`BDT ${selectedLog.total_revenue.toLocaleString()}`} highlight />
                    <AField label="No-Shows" value={String(selectedLog.no_show_count)} />
                    <AField label="New Bookings" value={String(selectedLog.new_bookings)} />
                    <AField label="Check-ins" value={String(selectedLog.check_ins)} />
                    <AField label="Check-outs" value={String(selectedLog.check_outs)} />
                    <AField label="Performed By" value={selectedLog.performed_by || '—'} />
                    <AField label="Run At" value={new Date(selectedLog.created_at).toLocaleString()} />
                  </div>
                  {selectedLog.notes && (
                    <div><p className="text-gray-500 text-xs mb-1">Notes</p><p className="text-gray-600 text-sm">{selectedLog.notes}</p></div>
                  )}
                  <button onClick={() => setSelectedLog(null)} className="w-full py-2 text-gray-500 hover:text-slate-800 text-sm border border-gray-200 rounded-lg">Close</button>
                </div>
              </div>
            )}
          </div>
        )
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
