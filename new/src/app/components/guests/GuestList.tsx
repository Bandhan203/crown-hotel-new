import { useState } from 'react';
import { useGuests } from '../../contexts/GuestContext';
import { useRooms } from '../../contexts/RoomsContext';
import type { Guest } from '../../data/types';
import { Search, Plus, Star, Download, Eye } from 'lucide-react';
import { GuestProfileModal } from './GuestProfileModal';
import { GuestFormModal } from './GuestFormModal';

export function GuestList() {
  const { guests } = useGuests();
  const { folios } = useRooms();
  const [query, setQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(query.toLowerCase()) ||
    g.phone.includes(query) ||
    (g.nid && g.nid.includes(query)) ||
    (g.passport && g.passport.toLowerCase().includes(query.toLowerCase()))
  );

  const getStayCount = (guestId: string) =>
    folios.filter(f => f.guestId === guestId && f.status === 'checkedout').length;

  const isInHouse = (guestId: string) =>
    folios.some(f => f.guestId === guestId && f.status === 'inhouse');

  const exportPoliceFormat = () => {
    const data = filtered.map(g => ({
      'নাম': g.name,
      'পিতার নাম': g.fatherName || '',
      'মাতার নাম': g.motherName || '',
      'NID': g.nid || '',
      'পাসপোর্ট': g.passport || '',
      'জাতীয়তা': g.nationality,
      'ঠিকানা': g.address || '',
      'ফোন': g.phone,
    }));
    const csv = [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'guest_police_report.csv'; a.click();
  };

  const vipColors = ['#64748b', '#22c55e', '#3b82f6', '#f59e0b'];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: '#fff', flex: 1 }}>গেস্ট প্রোফাইল ও CRM</h2>
        <button onClick={exportPoliceFormat} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Download size={13} /> পুলিশ ফরম্যাট এক্সপোর্ট
        </button>
        <button onClick={() => setShowNewForm(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Plus size={13} /> নতুন গেস্ট
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="নাম, ফোন, NID বা পাসপোর্ট দিয়ে খুঁজুন..."
          style={{ width: '100%', background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 8, padding: '10px 12px 10px 36px', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }}
          autoFocus
        />
      </div>

      {/* Table */}
      <div style={{ background: '#1a2235', borderRadius: 10, border: '1px solid #2d3f6a', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 1fr 80px', padding: '10px 16px', background: '#111827', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, gap: 8 }}>
          <span>নাম</span><span>ফোন</span><span>জাতীয়তা</span><span>ID নম্বর</span><span>ভিজিট</span><span>স্ট্যাটাস</span><span>অ্যাকশন</span>
        </div>
        {filtered.map((g, i) => (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 0.8fr 1fr 80px', padding: '12px 16px', borderTop: '1px solid #1e293b', gap: 8, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : '#0f1623' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, background: '#1e3a5f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#93c5fd', fontWeight: 700, flexShrink: 0 }}>
                {g.name.charAt(0)}
              </div>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {g.name}
                  {g.vipLevel > 0 && <Star size={10} fill={vipColors[g.vipLevel]} color={vipColors[g.vipLevel]} />}
                </div>
                {g.preferences && <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{g.preferences}</div>}
              </div>
            </div>
            <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{g.phone}</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{g.nationality}</span>
            <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{g.nid || g.passport || '—'}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>{getStayCount(g.id)}</span>
            <span>
              {isInHouse(g.id) ? (
                <span style={{ fontSize: 10, background: '#0f2d1a', color: '#22c55e', padding: '2px 8px', borderRadius: 4, border: '1px solid #22c55e44' }}>ইন-হাউস</span>
              ) : (
                <span style={{ fontSize: 10, background: '#1e293b', color: '#64748b', padding: '2px 8px', borderRadius: 4 }}>চেক-আউট</span>
              )}
            </span>
            <button
              onClick={() => setSelectedGuest(g)}
              style={{ background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb33', borderRadius: 5, padding: '5px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Eye size={11} /> দেখুন
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>কোনো গেস্ট পাওয়া যায়নি</div>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>মোট {filtered.length} জন গেস্ট</div>

      {selectedGuest && <GuestProfileModal guest={selectedGuest} onClose={() => setSelectedGuest(null)} />}
      {showNewForm && <GuestFormModal onClose={() => setShowNewForm(false)} />}
    </div>
  );
}
