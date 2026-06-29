import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdRefresh, MdInfo, MdAttachMoney, MdClose, MdPictureAsPdf,
} from 'react-icons/md';
import api from '../../services/api';
import ReservationModal from '../components/ReservationModal';

interface ControlCell {
  date: string;
  physical: number;
  ooo: number;
  committed: number;
  available: number;
  status: 'available' | 'sold_out' | 'overbooked';
  offer_rate: number;
  is_weekend: boolean;
}

interface RoomTypeRow {
  room_type_id: number;
  room_type_name: string;
  rack_rate: number;
  physical_rooms: number;
  ooo_rooms: number;
  sellable_rooms: number;
  cells: ControlCell[];
}

interface DailySummary {
  occupancy_pct: number;
  arrivals: number;
  departures: number;
  stayovers: number;
  vip_count: number;
  vvip_count: number;
  rooms_sold: number;
  physical_rooms: number;
}

interface ControlData {
  business_date: string;
  start_date: string;
  end_date: string;
  dates: string[];
  weekend_weekdays: number[];
  include_overbooking: boolean;
  overbooking_pct: number;
  room_types: RoomTypeRow[];
  daily_summary: Record<string, DailySummary>;
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatShortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function cellClass(status: ControlCell['status']) {
  if (status === 'sold_out') return 'bg-red-100 border-red-300 text-red-900';
  if (status === 'overbooked') return 'bg-amber-100 border-amber-400 text-amber-900';
  return 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100';
}

function daysBetween(start: string, end: string) {
  const a = new Date(start + 'T12:00:00').getTime();
  const b = new Date(end + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000) + 1;
}

export default function ReservationControl() {
  const [data, setData] = useState<ControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState<'preset' | 'custom'>('preset');
  const [days, setDays] = useState(14);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showRates, setShowRates] = useState(false);
  const [includeOverbooking, setIncludeOverbooking] = useState(false);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [showReservation, setShowReservation] = useState(false);
  const [prefill, setPrefill] = useState<{ room_type: string; check_in_date: string; check_out_date: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const buildQueryParams = useCallback((): Record<string, string> | null => {
    const params: Record<string, string> = {
      include_overbooking: includeOverbooking ? 'true' : 'false',
    };
    if (rangeMode === 'custom') {
      if (!customStart || !customEnd) {
        toast.error('Please select start and end dates');
        return null;
      }
      if (customEnd < customStart) {
        toast.error('End date must be on or after start date');
        return null;
      }
      if (daysBetween(customStart, customEnd) > 30) {
        toast.error('Maximum custom range is 30 days');
        return null;
      }
      params.start_date = customStart;
      params.end_date = customEnd;
    } else if (data?.start_date && data?.end_date) {
      params.start_date = data.start_date;
      params.end_date = data.end_date;
    } else {
      params.days = String(days);
    }
    return params;
  }, [rangeMode, days, customStart, customEnd, includeOverbooking, data?.start_date, data?.end_date]);

  const fetchData = useCallback(async () => {
    const params = buildQueryParams();
    if (!params) return;

    setLoading(true);
    try {
      const res = await api.get<ControlData>('/admin/reports/reservation-control/', { params });
      setData(res.data);
    } catch {
      toast.error('Failed to load reservation control chart');
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  const printPdf = useCallback(async () => {
    const params = buildQueryParams();
    if (!params) return;

    setPdfLoading(true);
    try {
      const res = await api.get('/admin/reports/reservation-control/', {
        params: { ...params, format: 'pdf' },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `reservation-control_${params.start_date || 'report'}.pdf`;
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    if (rangeMode === 'preset') void fetchData();
  }, [rangeMode, days, includeOverbooking, fetchData]);

  useEffect(() => {
    if (data?.business_date && !customStart) {
      setCustomStart(data.business_date);
      setCustomEnd(addDays(data.business_date, 13));
    }
  }, [data?.business_date, customStart]);

  useEffect(() => {
    const id = window.setInterval(() => { void fetchData(); }, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'F5' || e.key === 'F7') {
        e.preventDefault();
        setShowRates(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onCellClick = (roomTypeId: number, cell: ControlCell) => {
    if (cell.available <= 0) {
      toast.error('No vacant rooms for this category on this date');
      return;
    }
    setPrefill({
      room_type: String(roomTypeId),
      check_in_date: cell.date,
      check_out_date: addDays(cell.date, 1),
    });
    setShowReservation(true);
  };

  const detail = detailDate && data?.daily_summary[detailDate];

  return (
    <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-4 bg-gray-50">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reservation Control Chart</h1>
          <p className="text-sm text-slate-500 mt-1">
            Room forecast matrix · Business date:{' '}
            <span className="font-semibold text-teal-700">
              {data?.business_date ? formatShortDate(data.business_date) : '—'}
            </span>
            {' · '}Press <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">F11</kbd> to open ·{' '}
            <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">F5</kbd> rate query
            {data?.start_date && data?.end_date && (
              <>
                {' · '}Showing{' '}
                <span className="font-medium text-slate-700">
                  {formatShortDate(data.start_date)} – {formatShortDate(data.end_date)}
                </span>
                {' '}({data.dates.length} days)
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={rangeMode === 'custom' ? 'custom' : String(days)}
            onChange={e => {
              const v = e.target.value;
              if (v === 'custom') {
                setRangeMode('custom');
                const base = data?.business_date || customStart || new Date().toISOString().split('T')[0];
                setCustomStart(prev => prev || data?.start_date || base);
                setCustomEnd(prev => prev || data?.end_date || addDays(base, 13));
              } else {
                setRangeMode('preset');
                setDays(Number(v));
              }
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value={14}>14 days</option>
            <option value={21}>21 days</option>
            <option value={30}>30 days</option>
            <option value="custom">Custom range</option>
          </select>

          {rangeMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <label className="text-xs text-slate-500 font-medium">From</label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              />
              <label className="text-xs text-slate-500 font-medium">To</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={e => setCustomEnd(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => void fetchData()}
                className="px-3 py-1.5 bg-teal-700 text-white rounded text-sm font-medium hover:bg-teal-800"
              >
                Apply
              </button>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showRates}
              onChange={e => setShowRates(e.target.checked)}
              className="rounded border-gray-300"
            />
            Rate Query (F5)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeOverbooking}
              onChange={e => setIncludeOverbooking(e.target.checked)}
              className="rounded border-gray-300"
            />
            Include overbooking (+{data?.overbooking_pct ?? 10}%)
          </label>
          <button
            type="button"
            onClick={() => void printPdf()}
            disabled={pdfLoading || !data}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <MdPictureAsPdf size={18} className="text-red-600" />
            {pdfLoading ? 'Generating…' : 'Print PDF'}
          </button>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium hover:bg-teal-800"
          >
            <MdRefresh size={18} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-50 border border-emerald-200" /> Vacant</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-100 border border-red-300" /> Sold out</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-100 border border-amber-400" /> Overbooked</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-slate-200 border border-slate-300" /> Weekend</span>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 min-w-[140px]">
                    Room Category
                  </th>
                  {data.dates.map(d => (
                    <th
                      key={d}
                      className={`px-2 py-3 text-center font-semibold text-xs min-w-[72px] ${
                        data.weekend_weekdays.includes(new Date(d + 'T12:00:00').getDay())
                          ? 'bg-slate-200/80 text-slate-800'
                          : 'text-slate-600'
                      }`}
                    >
                      <div>{formatShortDate(d)}</div>
                      <button
                        type="button"
                        onClick={() => setDetailDate(d)}
                        className="mt-1 text-[10px] text-teal-700 hover:underline font-normal"
                      >
                        Details
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.room_types.map(row => (
                  <tr key={row.room_type_id} className="border-b border-gray-100 hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-100">
                      <div className="font-semibold text-slate-800">{row.room_type_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {row.physical_rooms} phys · {row.ooo_rooms} OOO
                      </div>
                    </td>
                    {row.cells.map(cell => (
                      <td key={cell.date} className="p-1">
                        <button
                          type="button"
                          disabled={cell.available <= 0}
                          onClick={() => onCellClick(row.room_type_id, cell)}
                          title={`${row.room_type_name} · ${cell.date}: ${cell.available} vacant (${cell.committed} sold)`}
                          className={`w-full min-h-[52px] rounded border px-1 py-1.5 text-center transition-colors disabled:cursor-default ${
                            data.weekend_weekdays.includes(new Date(cell.date + 'T12:00:00').getDay())
                              ? 'ring-1 ring-inset ring-slate-300/60 '
                              : ''
                          }${cellClass(cell.status)}`}
                        >
                          <div className="text-lg font-bold leading-none">
                            {cell.available}
                          </div>
                          {showRates && (
                            <div className="text-[10px] mt-1 opacity-80 flex items-center justify-center gap-0.5">
                              <MdAttachMoney size={10} />
                              {cell.offer_rate.toLocaleString()}
                            </div>
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50/50 border-t-2 border-teal-200">
                  <td className="sticky left-0 z-10 bg-teal-50/80 px-4 py-2 font-bold text-teal-900 text-xs uppercase">
                    Occupancy %
                  </td>
                  {data.dates.map(d => (
                    <td key={d} className="px-1 py-2 text-center text-xs font-bold text-teal-800">
                      {data.daily_summary[d]?.occupancy_pct ?? 0}%
                    </td>
                  ))}
                </tr>
                <tr className="bg-white border-t border-gray-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-600 text-xs">Arrivals</td>
                  {data.dates.map(d => (
                    <td key={d} className="px-1 py-2 text-center text-xs text-slate-700">
                      {data.daily_summary[d]?.arrivals ?? 0}
                    </td>
                  ))}
                </tr>
                <tr className="bg-white border-t border-gray-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-600 text-xs">Departures</td>
                  {data.dates.map(d => (
                    <td key={d} className="px-1 py-2 text-center text-xs text-slate-700">
                      {data.daily_summary[d]?.departures ?? 0}
                    </td>
                  ))}
                </tr>
                <tr className="bg-white border-t border-gray-100">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 font-semibold text-slate-600 text-xs">VIP / VVIP</td>
                  {data.dates.map(d => (
                    <td key={d} className="px-1 py-2 text-center text-xs text-slate-700">
                      {data.daily_summary[d]?.vip_count ?? 0} / {data.daily_summary[d]?.vvip_count ?? 0}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      {detailDate && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDetailDate(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MdInfo className="text-teal-700" />
                  Day Detail — {formatShortDate(detailDate)}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Operational snapshot for planning</p>
              </div>
              <button type="button" onClick={() => setDetailDate(null)} className="text-slate-400 hover:text-slate-600">
                <MdClose size={22} />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Occupancy', `${detail.occupancy_pct}%`],
                ['Rooms Sold', String(detail.rooms_sold)],
                ['Physical Rooms', String(detail.physical_rooms)],
                ['Expected Arrivals', String(detail.arrivals)],
                ['Expected Departures', String(detail.departures)],
                ['Stayovers', String(detail.stayovers)],
                ['VIP Guests', String(detail.vip_count)],
                ['VVIP Guests', String(detail.vvip_count)],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 rounded-lg p-3">
                  <dt className="text-[10px] uppercase text-slate-400 font-semibold">{label}</dt>
                  <dd className="text-lg font-bold text-slate-800 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => setDetailDate(null)}
              className="mt-6 w-full py-2.5 bg-teal-700 text-white rounded-lg font-medium text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showReservation && (
        <ReservationModal
          initialValues={prefill ?? undefined}
          onClose={() => { setShowReservation(false); setPrefill(null); }}
          onSuccess={() => {
            setShowReservation(false);
            setPrefill(null);
            void fetchData();
          }}
        />
      )}
    </div>
  );
}
