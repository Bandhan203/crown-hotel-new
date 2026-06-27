import { useState } from 'react';
import type { Guest } from '../../data/types';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { X, Star, Phone, CreditCard, Globe, Home, Mail } from 'lucide-react';

interface Props { guest: Guest; onClose: () => void; }

export function GuestProfileModal({ guest, onClose }: Props) {
  const { folios, transactions } = useRooms();
  const { updateGuest } = useGuests();
  const [editing, setEditing] = useState(false);
  const [prefs, setPrefs] = useState(guest.preferences || '');
  const [vip, setVip] = useState(guest.vipLevel);

  const guestFolios = folios.filter(f => f.guestId === guest.id).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const totalSpend = guestFolios.map(f =>
    transactions.filter(t => t.folioId === f.id && t.amount > 0 && t.type !== 'void').reduce((s, t) => s + t.amount, 0)
  ).reduce((s, n) => s + n, 0);

  const vipColors = ['#64748b', '#22c55e', '#3b82f6', '#f59e0b'];
  const vipLabels = ['Regular', 'Silver', 'Gold', 'Platinum'];

  const saveEdits = () => {
    updateGuest(guest.id, { preferences: prefs, vipLevel: vip as 0|1|2|3 });
    setEditing(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 12, width: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3f6a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, background: '#1e3a5f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#93c5fd', fontWeight: 700 }}>
            {guest.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{guest.name}</span>
              {Array.from({ length: guest.vipLevel }).map((_, i) => (
                <Star key={i} size={12} fill={vipColors[guest.vipLevel]} color={vipColors[guest.vipLevel]} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>গেস্ট আইডি: {guest.id} · সদস্য {new Date(guest.createdAt).toLocaleDateString('bn-BD')}</span>
          </div>
          <button onClick={() => setEditing(e => !e)} style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>
            {editing ? 'বাতিল' : 'এডিট'}
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Contact info */}
          <div style={{ background: '#0f1623', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoItem icon={<Phone size={12} />} label="ফোন" value={guest.phone} />
            <InfoItem icon={<CreditCard size={12} />} label="NID" value={guest.nid || '—'} />
            <InfoItem icon={<CreditCard size={12} />} label="পাসপোর্ট" value={guest.passport || '—'} />
            <InfoItem icon={<Globe size={12} />} label="জাতীয়তা" value={guest.nationality} />
            <InfoItem icon={<Home size={12} />} label="ঠিকানা" value={guest.address || '—'} />
            <InfoItem icon={<Mail size={12} />} label="ইমেইল" value={guest.email || '—'} />
            {guest.fatherName && <InfoItem icon={null} label="পিতার নাম" value={guest.fatherName} />}
            {guest.motherName && <InfoItem icon={null} label="মাতার নাম" value={guest.motherName} />}
          </div>

          {/* VIP & Preferences */}
          <div style={{ background: '#0f1623', borderRadius: 8, padding: 14 }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>VIP স্তর</label>
                  <select value={vip} onChange={e => setVip(Number(e.target.value) as 0|1|2|3)}
                    style={{ background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 5, padding: '6px 10px', color: '#e2e8f0', fontSize: 13, width: '100%' }}>
                    {[0, 1, 2, 3].map(v => <option key={v} value={v}>{vipLabels[v]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>বিশেষ পছন্দ/নোট</label>
                  <textarea value={prefs} onChange={e => setPrefs(e.target.value)} rows={3}
                    style={{ width: '100%', background: '#1a2235', border: '1px solid #2d3f6a', borderRadius: 5, padding: '8px 10px', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <button onClick={saveEdits} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>সংরক্ষণ করুন</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>VIP স্তর:</span>
                  <span style={{ fontSize: 12, color: vipColors[guest.vipLevel], fontWeight: 600 }}>{vipLabels[guest.vipLevel]}</span>
                </div>
                {guest.preferences && (
                  <div style={{ fontSize: 12, color: '#fbbf24', background: '#2d2100', padding: '8px 10px', borderRadius: 6, borderLeft: '2px solid #f59e0b' }}>
                    ⭐ {guest.preferences}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <StatCard label="মোট স্টে" value={guestFolios.length} color="#3b82f6" />
            <StatCard label="সম্পন্ন স্টে" value={guestFolios.filter(f => f.status === 'checkedout').length} color="#22c55e" />
            <StatCard label="মোট ব্যয় (৳)" value={totalSpend.toLocaleString()} color="#f59e0b" />
          </div>

          {/* Stay history */}
          {guestFolios.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>স্টে হিস্ট্রি</div>
              {guestFolios.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#0f1623', borderRadius: 6, marginBottom: 4, fontSize: 12 }}>
                  <div>
                    <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 11 }}>{f.referenceNo}</span>
                    <span style={{ color: '#64748b', marginLeft: 8 }}>{f.checkIn} → {f.checkOut}</span>
                  </div>
                  <span style={{ color: f.status === 'inhouse' ? '#22c55e' : '#64748b', fontSize: 11 }}>
                    {f.status === 'inhouse' ? 'ইন-হাউস' : f.status === 'reserved' ? 'রিজার্ভড' : 'চেক-আউট'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>{icon}{label}</span>
      <span style={{ color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#0f1623', borderRadius: 8, padding: '10px 12px', textAlign: 'center', border: `1px solid ${color}33` }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}
