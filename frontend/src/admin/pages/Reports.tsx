import { useState } from 'react';
import { MdBarChart, MdTrendingUp, MdFlightLand, MdFlightTakeoff, MdPersonOff, MdCancel, MdAccountBalance, MdBookOnline, MdSecurity, MdDownload } from 'react-icons/md';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

type ReportType = 'occupancy' | 'revenue' | 'arrivals' | 'no-shows' | 'cancellations' | 'guest-ledger' | 'recent-bookings' | 'police-export';

const REPORTS: { key: ReportType; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'occupancy', label: 'Occupancy', icon: <MdBarChart size={20} />, desc: 'Daily occupancy rates' },
  { key: 'revenue', label: 'Revenue', icon: <MdTrendingUp size={20} />, desc: 'Revenue breakdown' },
  { key: 'arrivals', label: 'Arrivals / Departures', icon: <MdFlightLand size={20} />, desc: 'Daily movement' },
  { key: 'no-shows', label: 'No-Shows', icon: <MdPersonOff size={20} />, desc: 'Missed reservations' },
  { key: 'cancellations', label: 'Cancellations', icon: <MdCancel size={20} />, desc: 'Cancelled bookings' },
  { key: 'guest-ledger', label: 'Guest Ledger', icon: <MdAccountBalance size={20} />, desc: 'Outstanding balances' },
  { key: 'recent-bookings', label: 'Recent Bookings', icon: <MdBookOnline size={20} />, desc: 'Latest reservations' },
  { key: 'police-export', label: 'Police Export', icon: <MdSecurity size={20} />, desc: 'BD Police portal format' },
];

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 8) + '01';

  const [active, setActive] = useState<ReportType>('occupancy');
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const needsRange = ['occupancy', 'revenue', 'no-shows', 'cancellations'].includes(active);

  const fetchReport = async () => {
    setLoading(true);
    setData(null);
    try {
      let params: any = {};
      if (active === 'arrivals' || active === 'police-export') {
        params.date = singleDate;
      } else if (active === 'guest-ledger' || active === 'recent-bookings') {
        // no params
      } else {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const endpoint = active === 'police-export' ? '/admin/reports/police-export/' : `/admin/reports/${active}/`;
      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch { toast.error('Failed to load report'); }
    setLoading(false);
  };

  const downloadCSV = async () => {
    try {
      const res = await api.get('/admin/reports/police-export/', { params: { date: singleDate, format: 'csv' }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `police_export_${singleDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('CSV download failed'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MdBarChart className="text-teal-700" /> Reports
        </h1>
        <p className="text-gray-500 text-sm mt-1">Analytics and operational reports</p>
      </div>

      {/* Report Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {REPORTS.map(r => (
          <button key={r.key} onClick={() => { setActive(r.key); setData(null); }}
            className={`p-3 rounded-xl text-left transition-all ${active === r.key ? 'bg-teal-50 border-teal-600 border' : 'bg-gray-50 border border-gray-200 hover:border-gray-300'}`}>
            <div className={`${active === r.key ? 'text-teal-700' : 'text-gray-500'}`}>{r.icon}</div>
            <p className={`text-sm font-medium mt-1 ${active === r.key ? 'text-teal-700' : 'text-slate-800'}`}>{r.label}</p>
            <p className="text-gray-500 text-xs mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        {needsRange ? (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
            </div>
          </>
        ) : (active === 'arrivals' || active === 'police-export') ? (
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Date</label>
            <input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-sm focus:outline-none focus:border-teal-600" />
          </div>
        ) : null}
        <button onClick={fetchReport} disabled={loading}
          className="px-5 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg hover:bg-teal-600 disabled:opacity-50">
          {loading ? 'Loading...' : 'Generate'}
        </button>
        {active === 'police-export' && (
          <button onClick={downloadCSV}
            className="px-4 py-2 bg-green-600/20 text-green-400 border border-green-500/30 text-sm font-medium rounded-lg hover:bg-green-600/30 flex items-center gap-2">
            <MdDownload size={16} /> Export CSV
          </button>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : data ? (
        <div className="space-y-6">
          {active === 'occupancy' && <OccupancyReport data={data} />}
          {active === 'revenue' && <RevenueReport data={data} />}
          {active === 'arrivals' && <ArrivalsReport data={data} />}
          {active === 'no-shows' && <NoShowReport data={data} />}
          {active === 'cancellations' && <CancellationReport data={data} />}
          {active === 'guest-ledger' && <GuestLedgerReport data={data} />}
          {active === 'recent-bookings' && <RecentBookingsReport data={data} />}
          {active === 'police-export' && <PoliceExportReport data={data} />}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">Select a report and click Generate to view results.</p>
      )}
    </div>
  );
}

/* ── Individual Report Components ── */

function OccupancyReport({ data }: { data: any[] }) {
  const avgOccupancy = data.length ? (data.reduce((s, d) => s + d.occupancy_rate, 0) / data.length).toFixed(1) : '0';
  const avgSold = data.length ? Math.round(data.reduce((s, d) => s + d.rooms_sold, 0) / data.length) : 0;

  const chartData = {
    labels: data.map(d => d.date.slice(5)),
    datasets: [{
      label: 'Occupancy %',
      data: data.map(d => d.occupancy_rate),
      borderColor: '#aa8453',
      backgroundColor: 'rgba(170,132,83,0.1)',
      fill: true,
      tension: 0.3,
    }],
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Avg Occupancy" value={`${avgOccupancy}%`} />
        <SummaryCard label="Avg Rooms Sold" value={String(avgSold)} />
        <SummaryCard label="Period" value={`${data.length} days`} />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5" style={{ height: 320 }}>
        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100, ticks: { color: '#666' } }, x: { ticks: { color: '#666' } } } }} />
      </div>
      <DataTable headers={['Date', 'Total', 'Sold', 'Available', 'Occupancy']}
        rows={data.map(d => [d.date, d.total_rooms, d.rooms_sold, d.rooms_available, `${d.occupancy_rate}%`])} />
    </>
  );
}

function RevenueReport({ data }: { data: any }) {
  const chartData = {
    labels: data.daily.map((d: any) => d.date.slice(5)),
    datasets: [{
      label: 'Revenue',
      data: data.daily.map((d: any) => d.revenue),
      borderColor: '#aa8453',
      backgroundColor: 'rgba(170,132,83,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#aa8453',
    }],
  };

  const donutData = {
    labels: data.by_type.map((t: any) => t.charge_type),
    datasets: [{
      data: data.by_type.map((t: any) => t.total),
      backgroundColor: ['#aa8453', '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#34d399'],
    }],
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Grand Total" value={`BDT ${data.grand_total.toLocaleString()}`} highlight />
        {data.by_type.slice(0, 3).map((t: any) => (
          <SummaryCard key={t.charge_type} label={t.charge_type} value={`BDT ${t.total.toLocaleString()}`} />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5" style={{ height: 300 }}>
          <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#666' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#666' }, grid: { display: false } } } }} />
        </div>
        {data.by_type.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-center justify-center" style={{ height: 300 }}>
            <Doughnut data={donutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#999', font: { size: 11 } } } } }} />
          </div>
        )}
      </div>
    </>
  );
}

function ArrivalsReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Date" value={data.date} />
        <SummaryCard label="Arrivals" value={String(data.arrival_count)} />
        <SummaryCard label="Departures" value={String(data.departure_count)} />
      </div>
      {data.arrivals.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-slate-800 font-semibold text-sm mb-3 flex items-center gap-2"><MdFlightLand className="text-green-400" /> Arrivals</h3>
          <DataTable headers={['Booking', 'Guest', 'Room Type', 'Room', 'Status', 'Amount']}
            rows={data.arrivals.map((b: any) => [b.booking_ref, b.guest_name, b.room_type, b.room_number || '—', b.status, `BDT ${b.total_price.toLocaleString()}`])} />
        </div>
      )}
      {data.departures.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <h3 className="text-slate-800 font-semibold text-sm mb-3 flex items-center gap-2"><MdFlightTakeoff className="text-red-400" /> Departures</h3>
          <DataTable headers={['Booking', 'Guest', 'Room Type', 'Room', 'Status', 'Amount']}
            rows={data.departures.map((b: any) => [b.booking_ref, b.guest_name, b.room_type, b.room_number || '—', b.status, `BDT ${b.total_price.toLocaleString()}`])} />
        </div>
      )}
      {data.arrivals.length === 0 && data.departures.length === 0 && (
        <p className="text-gray-500 text-center py-8">No arrivals or departures for this date.</p>
      )}
    </>
  );
}

function NoShowReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Period" value={`${data.start_date} — ${data.end_date}`} />
        <SummaryCard label="No-Shows" value={String(data.count)} />
        <SummaryCard label="Lost Revenue" value={`BDT ${data.bookings.reduce((s: number, b: any) => s + b.total_price, 0).toLocaleString()}`} />
      </div>
      {data.bookings.length > 0 ? (
        <DataTable headers={['Booking', 'Guest', 'Room Type', 'Check-in', 'Amount']}
          rows={data.bookings.map((b: any) => [b.booking_ref, b.guest_name, b.room_type, b.check_in_date, `BDT ${b.total_price.toLocaleString()}`])} />
      ) : (
        <p className="text-gray-500 text-center py-8">No no-shows in this period.</p>
      )}
    </>
  );
}

function CancellationReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Period" value={`${data.start_date} — ${data.end_date}`} />
        <SummaryCard label="Cancellations" value={String(data.count)} />
        <SummaryCard label="Lost Revenue" value={`BDT ${data.bookings.reduce((s: number, b: any) => s + b.total_price, 0).toLocaleString()}`} />
      </div>
      {data.bookings.length > 0 ? (
        <DataTable headers={['Booking', 'Guest', 'Room Type', 'Dates', 'Amount', 'Reason']}
          rows={data.bookings.map((b: any) => [b.booking_ref, b.guest_name, b.room_type, `${b.check_in_date} → ${b.check_out_date}`, `BDT ${b.total_price.toLocaleString()}`, b.cancellation_reason || '—'])} />
      ) : (
        <p className="text-gray-500 text-center py-8">No cancellations in this period.</p>
      )}
    </>
  );
}

function GuestLedgerReport({ data }: { data: any }) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="In-House Guests" value={String(data.count)} />
        <SummaryCard label="Total Outstanding" value={`BDT ${data.total_outstanding.toLocaleString()}`} highlight />
        <SummaryCard label="Report" value="Live" />
      </div>
      {data.guests.length > 0 ? (
        <DataTable headers={['Booking', 'Guest', 'Room', 'Dates', 'Charges', 'Payments', 'Balance']}
          rows={data.guests.map((g: any) => [
            g.booking_ref, g.guest_name, g.room_number,
            `${g.check_in_date} → ${g.check_out_date}`,
            `BDT ${g.total_charges.toLocaleString()}`,
            `BDT ${g.total_payments.toLocaleString()}`,
            g.balance > 0 ? `BDT ${g.balance.toLocaleString()}` : 'BDT 0',
          ])} />
      ) : (
        <p className="text-gray-500 text-center py-8">No in-house guests currently.</p>
      )}
    </>
  );
}

/* ── Shared Components ── */

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-gray-500 text-xs">{label}</p>
      <p className={`text-lg font-bold mt-1 ${highlight ? 'text-teal-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-gray-500 text-xs border-b border-gray-200">
          {headers.map(h => <th key={h} className="py-2.5 px-3 text-left">{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              {row.map((cell, j) => (
                <td key={j} className={`py-2 px-3 ${j === 0 ? 'font-mono text-xs text-teal-700' : 'text-gray-600'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentBookingsReport({ data }: { data: any }) {
  const statusColor: Record<string, string> = {
    PENDING: 'bg-yellow-500/20 text-yellow-400',
    CONFIRMED: 'bg-blue-500/20 text-blue-400',
    CHECKED_IN: 'bg-green-500/20 text-green-400',
    CHECKED_OUT: 'bg-gray-500/20 text-gray-500',
    CANCELLED: 'bg-red-500/20 text-red-400',
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Total Recent Bookings" value={String(data.count)} />
        <SummaryCard label="Report" value="Latest 100" />
      </div>
      {data.bookings.length > 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-gray-500 text-xs border-b border-gray-200">
              <th className="py-2.5 px-3 text-left">Ref</th>
              <th className="py-2.5 px-3 text-left">Guest</th>
              <th className="py-2.5 px-3 text-left">Room Type</th>
              <th className="py-2.5 px-3 text-left">Check-in</th>
              <th className="py-2.5 px-3 text-left">Check-out</th>
              <th className="py-2.5 px-3 text-left">Amount</th>
              <th className="py-2.5 px-3 text-left">Status</th>
            </tr></thead>
            <tbody>
              {data.bookings.map((b: any, i: number) => (
                <tr key={i} className="border-b border-white/5">
                  <td className="py-2 px-3 font-mono text-xs text-teal-700">{b.booking_ref}</td>
                  <td className="py-2 px-3 text-gray-600">{b.guest_name}</td>
                  <td className="py-2 px-3 text-gray-600">{b.room_type}</td>
                  <td className="py-2 px-3 text-gray-600">{b.check_in}</td>
                  <td className="py-2 px-3 text-gray-600">{b.check_out}</td>
                  <td className="py-2 px-3 text-gray-600">BDT {b.total_price.toLocaleString()}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider ${statusColor[b.status] || 'bg-white/10 text-slate-800'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No recent bookings found.</p>
      )}
    </>
  );
}

function PoliceExportReport({ data }: { data: any }) {
  if (!data) return null;
  const records: any[] = data.records || [];
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="Export Date" value={data.date} />
        <SummaryCard label="Total Guests" value={String(data.total_guests)} highlight />
        <SummaryCard label="Format" value="BD Police Portal" />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MdSecurity className="text-green-400" size={16} />
          <span className="text-sm text-slate-800 font-semibold">Guest List — Police Portal Format</span>
        </div>
        {records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  {['#', 'Room', 'Name', 'NID/Passport', 'Nationality', 'Phone', 'Check-in', 'Check-out', 'Purpose', 'From'].map(h => (
                    <th key={h} className="py-2 px-2 text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r: any, i: number) => (
                  <tr key={i} className={`border-b border-white/5 ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}>
                    <td className="py-1.5 px-2 text-gray-500">{r.sl_no}</td>
                    <td className="py-1.5 px-2 text-teal-700 font-mono">{r.room_number}</td>
                    <td className="py-1.5 px-2 text-slate-800 font-medium">{r.guest_name}</td>
                    <td className="py-1.5 px-2 text-gray-600">{r.nid_passport || '—'} <span className="text-gray-600">({r.id_type || '—'})</span></td>
                    <td className="py-1.5 px-2 text-gray-600">{r.nationality || '—'}</td>
                    <td className="py-1.5 px-2 text-gray-600">{r.phone}</td>
                    <td className="py-1.5 px-2 text-gray-500">{r.check_in_date}</td>
                    <td className="py-1.5 px-2 text-gray-500">{r.check_out_date}</td>
                    <td className="py-1.5 px-2 text-gray-500">{r.purpose_of_visit || '—'}</td>
                    <td className="py-1.5 px-2 text-gray-500">{r.coming_from || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-6 text-sm">No guests checked in on this date.</p>
        )}
      </div>
    </>
  );
}
