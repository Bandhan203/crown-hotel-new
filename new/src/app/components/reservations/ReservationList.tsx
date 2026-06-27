import { useState } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import type { Folio } from '../../data/types';
import { Plus, Eye, CalendarDays, Plane, Bus } from 'lucide-react';
import { ReservationForm } from './ReservationForm';
import { ReservationDetail } from './ReservationDetail';

export function ReservationList() {
  const { folios, rooms } = useRooms();
  const { guests } = useGuests();
  const { config } = useHotel();
  const [showForm, setShowForm] = useState(false);
  const [selectedFolio, setSelectedFolio] = useState<Folio | null>(null);
  const [tab, setTab] = useState<'all' | 'reserved' | 'inhouse' | 'checkedout'>('all');

  const filtered = folios.filter(f => tab === 'all' ? true : f.status === tab)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const getGuest = (id: string) => guests.find(g => g.id === id);
  const getRoom = (id: string) => rooms.find(r => r.id === id);

  const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
    reserved: { bg: '#0c1c3b', color: '#3b82f6', label: 'রিজার্ভড' },
    inhouse: { bg: '#0f2d1a', color: '#22c55e', label: 'ইন-হাউস' },
    checkedout: { bg: '#1e293b', color: '#64748b', label: 'চেক-আউট' },
  };

  const tabs = [
    { key: 'all', label: 'সব', count: folios.length },
    { key: 'reserved', label: 'রিজার্ভড', count: folios.filter(f => f.status === 'reserved').length },
    { key: 'inhouse', label: 'ইন-হাউস', count: folios.filter(f => f.status === 'inhouse').length },
    { key: 'checkedout', label: 'চেক-আউট', count: folios.filter(f => f.status === 'checkedout').length },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#fff', flex: 1 }}>রিজার্ভেশন ম্যানেজমেন্ট</h2>
        <button onClick={() => setShowForm(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Plus size={13} /> নতুন রিজার্ভেশন
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ background: tab === t.key ? '#2563eb' : '#1e293b', color: tab === t.key ? '#fff' : '#94a3b8', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Today highlights */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'আজ আগমন', count: folios.filter(f => f.checkIn === config.systemDate).length, color: '#22c55e' },
          { label: 'আজ প্রস্থান', count: folios.filter(f => f.checkOut === config.systemDate && f.status === 'inhouse').length, color: '#ef4444' },
          { label: 'পিকআপ প্রয়োজন', count: folios.filter(f => f.pickupRequired && f.checkIn === config.systemDate).length, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a2235', border: `1px solid ${s.color}33`, borderRadius: 8, padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.count}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1.5fr 0.8fr 1fr 1fr 0.7fr 0.7fr 60px', padding: '10px 14px', background: '#111827', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
          <span>রেফারেন্স</span><span>গেস্ট</span><span>রুম</span><span>চেক-ইন</span><span>চেক-আউট</span><span>মিল</span><span>স্ট্যাটাস</span><span></span>
        </div>
        {filtered.map((f, i) => {
          const guest = getGuest(f.guestId);
          const room = getRoom(f.roomId);
          const ss = statusStyle[f.status];
          return (
            <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '140px 1.5fr 0.8fr 1fr 1fr 0.7fr 0.7fr 60px', padding: '10px 14px', borderTop: '1px solid #1e293b', gap: 8, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : '#0f1623' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{f.referenceNo}</span>
              <div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>{guest?.name || '—'}</div>
                <div style={{ fontSize: 10, color: '#475569', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {f.arrivalMode === 'Flight' ? <Plane size={9} /> : f.arrivalMode === 'Bus' ? <Bus size={9} /> : null}
                  {f.flightBusNo || guest?.phone || ''}
                </div>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{room?.number || '—'}</span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{f.checkIn}</span>
              <span style={{ fontSize: 12, color: f.checkOut === config.systemDate ? '#ef4444' : '#94a3b8' }}>{f.checkOut}</span>
              <span style={{ fontSize: 11, background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: 4 }}>{f.mealPlan}</span>
              <span style={{ fontSize: 10, background: ss.bg, color: ss.color, padding: '2px 8px', borderRadius: 4, border: `1px solid ${ss.color}33` }}>{ss.label}</span>
              <button onClick={() => setSelectedFolio(f)} style={{ background: '#1e3a5f', color: '#93c5fd', border: 'none', borderRadius: 5, padding: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Eye size={12} />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>কোনো রিজার্ভেশন নেই</div>}
      </div>

      {showForm && <ReservationForm onClose={() => setShowForm(false)} />}
      {selectedFolio && <ReservationDetail folio={selectedFolio} onClose={() => setSelectedFolio(null)} />}
    </div>
  );
}
