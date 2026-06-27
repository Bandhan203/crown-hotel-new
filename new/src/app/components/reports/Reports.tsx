import { useState } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import { FileText, Printer, Download } from 'lucide-react';

type ReportType = 'daily-guest' | 'arrivals' | 'departures' | 'revenue' | 'occupancy' | 'guest-history';

const REPORT_TYPES = [
  { key: 'daily-guest', label: 'ডেইলি গেস্ট লিস্ট', desc: 'বর্তমান ইন-হাউস গেস্টদের তালিকা' },
  { key: 'arrivals', label: 'আগমন তালিকা', desc: 'তারিখ অনুযায়ী আগমন' },
  { key: 'departures', label: 'প্রস্থান তালিকা', desc: 'তারিখ অনুযায়ী প্রস্থান' },
  { key: 'revenue', label: 'রাজস্ব রিপোর্ট', desc: 'বিভাগ ভিত্তিক আয়ের হিসাব' },
  { key: 'occupancy', label: 'অকুপেন্সি রিপোর্ট', desc: 'রুম দখলের হার' },
  { key: 'guest-history', label: 'গেস্ট হিস্ট্রি', desc: 'গেস্টের পূর্ববর্তী স্টে' },
];

export function Reports() {
  const { folios, rooms, transactions } = useRooms();
  const { guests } = useGuests();
  const { config, dayCloseRecords } = useHotel();
  const [activeReport, setActiveReport] = useState<ReportType>('daily-guest');
  const [fromDate, setFromDate] = useState(config.systemDate);
  const [toDate, setToDate] = useState(config.systemDate);
  const [guestSearch, setGuestSearch] = useState('');

  const inHouseFolios = folios.filter(f => f.status === 'inhouse');
  const arrivals = folios.filter(f => f.checkIn >= fromDate && f.checkIn <= toDate);
  const departures = folios.filter(f => f.checkOut >= fromDate && f.checkOut <= toDate && f.status === 'checkedout');

  const getGuest = (id: string) => guests.find(g => g.id === id);
  const getRoom = (id: string) => rooms.find(r => r.id === id);

  const revenueTxs = transactions.filter(t => t.date >= fromDate && t.date <= toDate && t.amount > 0 && t.type !== 'void');
  const revenueByCategory: Record<string, number> = revenueTxs.reduce((acc: Record<string, number>, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const filteredGuests = guests.filter(g =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.phone.includes(guestSearch)
  );

  const handlePrint = () => window.print();

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left panel: report selector */}
      <div style={{ width: 240, background: '#111827', borderRight: '1px solid #1e293b', padding: '16px 12px', flexShrink: 0, overflow: 'auto' }}>
        <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>রিপোর্ট তালিকা</div>
        {REPORT_TYPES.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key as ReportType)}
            style={{ width: '100%', background: activeReport === r.key ? '#1e3a5f' : 'transparent', border: 'none', borderRadius: 6, padding: '10px 12px', cursor: 'pointer', textAlign: 'left', marginBottom: 3, borderLeft: activeReport === r.key ? '3px solid #3b82f6' : '3px solid transparent' }}>
            <div style={{ fontSize: 12, color: activeReport === r.key ? '#93c5fd' : '#94a3b8', fontWeight: 600 }}>{r.label}</div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{r.desc}</div>
          </button>
        ))}
      </div>

      {/* Right: Report content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: '#fff', flex: 1, fontSize: 17 }}>
            {REPORT_TYPES.find(r => r.key === activeReport)?.label}
          </h2>
          <button onClick={handlePrint} style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb33', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
            <Printer size={13} /> A4 প্রিন্ট
          </button>
          <button style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #33415533', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 5, alignItems: 'center' }}>
            <Download size={13} /> CSV ডাউনলোড
          </button>
        </div>

        {/* Date filter */}
        {activeReport !== 'daily-guest' && activeReport !== 'guest-history' && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>তারিখ:</span>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: 12 }} />
            <span style={{ fontSize: 12, color: '#64748b' }}>থেকে</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 6, padding: '6px 10px', color: '#e2e8f0', fontSize: 12 }} />
          </div>
        )}

        {/* Print-ready report area */}
        <div className="print-area" style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
          {/* Report header */}
          <div style={{ padding: '14px 20px', background: '#111827', borderBottom: '1px solid #2d3f6a' }}>
            <div style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>{config.hotelName}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{config.hotelAddress} | তারিখ: {config.systemDate}</div>
          </div>

          {/* DAILY GUEST LIST */}
          {activeReport === 'daily-guest' && (
            <ReportTable
              headers={['রুম', 'গেস্ট নাম', 'জাতীয়তা', 'চেক-ইন', 'চেক-আউট', 'মিল', 'ব্যালেন্স']}
              rows={inHouseFolios.map(f => {
                const g = getGuest(f.guestId);
                const r = getRoom(f.roomId);
                const bal = transactions.filter(t => t.folioId === f.id).reduce((s, t) => s + t.amount, 0);
                return [r?.number || '—', g?.name || '—', g?.nationality || '—', f.checkIn, f.checkOut, f.mealPlan, `৳${bal.toLocaleString()}`];
              })}
              footer={`মোট ইন-হাউস: ${inHouseFolios.length} জন`}
            />
          )}

          {/* ARRIVALS */}
          {activeReport === 'arrivals' && (
            <ReportTable
              headers={['রেফারেন্স', 'গেস্ট নাম', 'রুম', 'চেক-ইন', 'চেক-আউট', 'আগমন মাধ্যম', 'স্ট্যাটাস']}
              rows={arrivals.map(f => {
                const g = getGuest(f.guestId);
                const r = getRoom(f.roomId);
                return [f.referenceNo, g?.name || '—', r?.number || '—', f.checkIn, f.checkOut, `${f.arrivalMode || '—'} ${f.flightBusNo || ''}`, f.status];
              })}
              footer={`মোট আগমন: ${arrivals.length}`}
            />
          )}

          {/* DEPARTURES */}
          {activeReport === 'departures' && (
            <ReportTable
              headers={['রেফারেন্স', 'গেস্ট নাম', 'রুম', 'চেক-ইন', 'চেক-আউট', 'মিল']}
              rows={departures.map(f => {
                const g = getGuest(f.guestId);
                const r = getRoom(f.roomId);
                return [f.referenceNo, g?.name || '—', r?.number || '—', f.checkIn, f.checkOut, f.mealPlan];
              })}
              footer={`মোট প্রস্থান: ${departures.length}`}
            />
          )}

          {/* REVENUE */}
          {activeReport === 'revenue' && (
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 14 }}>
                {Object.entries(revenueByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                  <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #1e293b', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>{cat}</span>
                    <span style={{ fontFamily: 'monospace', color: '#fbbf24' }}>৳{amt.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#0f1623', borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: '#e2e8f0' }}>মোট রাজস্ব</span>
                <span style={{ fontFamily: 'monospace', color: '#22c55e' }}>৳{Object.values(revenueByCategory).reduce((s, v) => s + v, 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* OCCUPANCY */}
          {activeReport === 'occupancy' && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {dayCloseRecords.slice().reverse().map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#0f1623', borderRadius: 6, fontSize: 12, alignItems: 'center' }}>
                  <span style={{ color: '#64748b', width: 120 }}>{r.date}</span>
                  <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, margin: '0 12px' }}>
                    <div style={{ width: `${Math.round(r.occupiedRooms / r.totalRooms * 100)}%`, height: '100%', background: '#3b82f6', borderRadius: 3 }} />
                  </div>
                  <span style={{ color: '#3b82f6', fontFamily: 'monospace', width: 50, textAlign: 'right' }}>{Math.round(r.occupiedRooms / r.totalRooms * 100)}%</span>
                  <span style={{ color: '#64748b', width: 80, textAlign: 'right' }}>{r.occupiedRooms}/{r.totalRooms} রুম</span>
                </div>
              ))}
              {dayCloseRecords.length === 0 && <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: 16 }}>কোনো ডে ক্লোজ রেকর্ড নেই</div>}
            </div>
          )}

          {/* GUEST HISTORY */}
          {activeReport === 'guest-history' && (
            <div>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #2d3f6a' }}>
                <input value={guestSearch} onChange={e => setGuestSearch(e.target.value)} placeholder="গেস্ট নাম বা ফোন..."
                  style={{ width: '100%', background: '#0f1623', border: '1px solid #2d3f6a', borderRadius: 6, padding: '7px 10px', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              {filteredGuests.map(g => {
                const gFolios = folios.filter(f => f.guestId === g.id);
                if (gFolios.length === 0) return null;
                return (
                  <div key={g.id} style={{ padding: '10px 16px', borderTop: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{g.name} <span style={{ fontSize: 11, color: '#475569' }}>· {g.phone}</span></div>
                    {gFolios.map(f => (
                      <div key={f.id} style={{ display: 'flex', gap: 20, fontSize: 11, color: '#64748b', marginTop: 3, paddingLeft: 12 }}>
                        <span>{f.referenceNo}</span>
                        <span>{f.checkIn} → {f.checkOut}</span>
                        <span>রুম {getRoom(f.roomId)?.number}</span>
                        <span style={{ color: f.status === 'inhouse' ? '#22c55e' : '#475569' }}>{f.status}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportTable({ headers, rows, footer }: { headers: string[]; rows: string[][]; footer?: string }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${headers.length}, 1fr)`, padding: '8px 14px', background: '#0f1623', fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, gap: 4 }}>
        {headers.map(h => <span key={h}>{h}</span>)}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${headers.length}, 1fr)`, padding: '8px 14px', borderTop: '1px solid #1e293b', fontSize: 11, gap: 4, background: i % 2 === 0 ? 'transparent' : '#0f1623' }}>
          {row.map((cell, j) => <span key={j} style={{ color: '#94a3b8' }}>{cell}</span>)}
        </div>
      ))}
      {rows.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#475569', fontSize: 12 }}>কোনো ডেটা নেই</div>}
      {footer && (
        <div style={{ padding: '8px 14px', borderTop: '2px solid #2d3f6a', fontSize: 11, color: '#64748b', textAlign: 'right' }}>{footer}</div>
      )}
    </div>
  );
}
