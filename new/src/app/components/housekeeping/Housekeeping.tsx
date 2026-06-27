import { useState } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { HousekeepingRecord, HKStatus } from '../../data/extendedTypes';
import { initialHKRecords } from '../../data/mockData';
import { Sparkles, WifiOff, CheckCircle, AlertTriangle, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const HK_STAFF = ['Amina Begum', 'Rina Akter', 'Fatema Khatun', 'Saleha Begum', 'Ruksana Parvin'];

const STATUS_OPTIONS: { value: HKStatus; label: string; color: string }[] = [
  { value: 'dirty', label: 'Dirty', color: '#f97316' },
  { value: 'clean', label: 'Clean', color: '#22c55e' },
  { value: 'inspected', label: 'Inspected', color: '#3b82f6' },
  { value: 'ooo', label: 'OOO', color: '#a78bfa' },
];

export function Housekeeping() {
  const { rooms } = useRooms();
  const { config, generateId } = useHotel();
  const { colors, theme } = useTheme();
  const { t } = useLang();
  const [hkRecords, setHKRecords] = useLocalStorage<HousekeepingRecord[]>('hotel_hk_records', initialHKRecords);
  const [editRoom, setEditRoom] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<HousekeepingRecord>>({});
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<HKStatus | 'all'>('all');

  const today = config.systemDate;
  const floors = [...new Set(rooms.map(r => r.floor))].sort() as number[];

  const getRecord = (roomId: string) =>
    hkRecords.find(r => r.roomId === roomId && r.date === today);

  const updateRecord = (roomId: string, updates: Partial<HousekeepingRecord>) => {
    setHKRecords(prev => {
      const existing = prev.find(r => r.roomId === roomId && r.date === today);
      if (existing) {
        return prev.map(r => r.roomId === roomId && r.date === today ? { ...r, ...updates } : r);
      }
      const newRec: HousekeepingRecord = {
        id: generateId('hk'),
        roomId,
        date: today,
        amStatus: 'dirty',
        pmStatus: 'dirty',
        eveStatus: 'dirty',
        ...updates,
      };
      return [...prev, newRec];
    });
  };

  const filteredRooms = rooms.filter(r => {
    if (filterFloor !== 'all' && r.floor !== filterFloor) return false;
    if (filterStatus !== 'all') {
      const rec = getRecord(r.id);
      if (!rec) return filterStatus === 'dirty';
      return rec.amStatus === filterStatus || rec.pmStatus === filterStatus || rec.eveStatus === filterStatus;
    }
    return true;
  });

  const stats = {
    clean: rooms.filter(r => getRecord(r.id)?.eveStatus === 'clean' || getRecord(r.id)?.eveStatus === 'inspected').length,
    dirty: rooms.filter(r => { const rec = getRecord(r.id); return !rec || rec.eveStatus === 'dirty'; }).length,
    ooo: rooms.filter(r => getRecord(r.id)?.amStatus === 'ooo').length,
    inspected: rooms.filter(r => getRecord(r.id)?.eveStatus === 'inspected').length,
  };

  const s = (v: HKStatus) => STATUS_OPTIONS.find(o => o.value === v) || STATUS_OPTIONS[0];

  const openEdit = (roomId: string) => {
    const rec = getRecord(roomId);
    setEditRoom(roomId);
    setEditData(rec || { amStatus: 'dirty', pmStatus: 'dirty', eveStatus: 'dirty' });
  };

  const saveEdit = () => {
    if (!editRoom) return;
    updateRecord(editRoom, editData);

    // Sync room status
    if (editData.amStatus === 'ooo') {
      // Mark room as maintenance
    } else if (editData.eveStatus === 'inspected' || editData.eveStatus === 'clean') {
      // Could update room to vacant if needed
    }
    setEditRoom(null);
    toast.success('Housekeeping status updated.');
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Sparkles size={18} color={colors.primary} />
        <h2 style={{ margin: 0, color: colors.text, fontSize: 17 }}>{t('housekeeping')}</h2>
        <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 4 }}>{today}</span>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Clean/Inspected', value: stats.clean + stats.inspected, color: colors.success, bg: colors.successBg },
          { label: 'Dirty', value: stats.dirty, color: colors.orange, bg: colors.orangeBg },
          { label: 'OOO', value: stats.ooo, color: colors.purple, bg: colors.purpleBg },
          { label: 'Inspected', value: stats.inspected, color: colors.primary, bg: colors.primaryBg },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: colors.textMuted }}>Floor:</span>
        {(['all', ...floors] as (number | 'all')[]).map(f => (
          <button key={f} onClick={() => setFilterFloor(f)}
            style={{ background: filterFloor === f ? colors.primary : colors.bgCard, color: filterFloor === f ? '#fff' : colors.textSecondary, border: `1px solid ${filterFloor === f ? colors.primary : colors.border}`, borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>
            {f === 'all' ? 'All' : `Floor ${f}`}
          </button>
        ))}
        <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>Status:</span>
        {(['all', 'dirty', 'clean', 'inspected', 'ooo'] as const).map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            style={{ background: filterStatus === f ? colors.primary : colors.bgCard, color: filterStatus === f ? '#fff' : colors.textSecondary, border: `1px solid ${filterStatus === f ? colors.primary : colors.border}`, borderRadius: 5, padding: '3px 10px', cursor: 'pointer', fontSize: 11 }}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Room table */}
      <div style={{ background: colors.bgCard, borderRadius: 10, border: `1px solid ${colors.border}`, overflow: 'hidden', boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '70px 100px 100px 130px 130px 130px 180px 70px', padding: '9px 14px', background: colors.bgSecondary, fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, gap: 8, borderBottom: `1px solid ${colors.border}` }}>
          <span>Room</span><span>Type</span><span>Hotel Status</span>
          <span>🌅 AM Status</span><span>☀️ PM Status</span><span>🌙 Eve Status</span>
          <span>Assigned To</span><span>Action</span>
        </div>

        {filteredRooms.map((room, i) => {
          const rec = getRecord(room.id);
          const amS = s(rec?.amStatus || 'dirty');
          const pmS = s(rec?.pmStatus || 'dirty');
          const eveS = s(rec?.eveStatus || 'dirty');

          return (
            <div key={room.id} style={{ display: 'grid', gridTemplateColumns: '70px 100px 100px 130px 130px 130px 180px 70px', padding: '9px 14px', borderTop: `1px solid ${colors.borderLight}`, gap: 8, alignItems: 'center', background: i % 2 === 0 ? 'transparent' : colors.tableAlt }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: colors.primary, fontFamily: 'monospace' }}>{room.number}</span>
              <span style={{ fontSize: 11, color: colors.textSecondary }}>{room.type}</span>
              <span style={{ fontSize: 10, color: colors.textSecondary }}>{room.status}</span>

              {[amS, pmS, eveS].map((s, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}

              <span style={{ fontSize: 11, color: colors.textSecondary }}>{rec?.assignedTo || '—'}</span>
              <button onClick={() => openEdit(room.id)}
                style={{ background: colors.primaryBg, color: colors.primary, border: `1px solid ${colors.primary}33`, borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 10, display: 'flex', gap: 3, alignItems: 'center' }}>
                <Edit2 size={10} /> Edit
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editRoom && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, width: 480, padding: 24, boxShadow: colors.shadow }}>
            <h3 style={{ margin: '0 0 16px', color: colors.text }}>Room {rooms.find(r => r.id === editRoom)?.number} — HK Update</h3>

            {[
              { shift: 'amStatus' as const, label: '🌅 AM Status' },
              { shift: 'pmStatus' as const, label: '☀️ PM Status' },
              { shift: 'eveStatus' as const, label: '🌙 Evening Status' },
            ].map(({ shift, label }) => (
              <div key={shift} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 5 }}>{label}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setEditData(p => ({ ...p, [shift]: opt.value }))}
                      style={{ flex: 1, background: editData[shift] === opt.value ? opt.color + '33' : colors.bgSecondary, color: editData[shift] === opt.value ? opt.color : colors.textSecondary, border: `1px solid ${editData[shift] === opt.value ? opt.color : colors.border}`, borderRadius: 6, padding: '7px 4px', cursor: 'pointer', fontSize: 11, fontWeight: editData[shift] === opt.value ? 700 : 400 }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {(editData.amStatus === 'ooo') && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>OOO Reason</label>
                <input value={editData.oooReason || ''} onChange={e => setEditData(p => ({ ...p, oooReason: e.target.value }))} placeholder="e.g. AC repair, plumbing issue..."
                  style={{ width: '100%', background: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', color: colors.text, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 4 }}>Assign To</label>
              <select value={editData.assignedTo || ''} onChange={e => setEditData(p => ({ ...p, assignedTo: e.target.value }))}
                style={{ width: '100%', background: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: 6, padding: '8px 10px', color: colors.text, fontSize: 13 }}>
                <option value="">— Unassigned —</option>
                {HK_STAFF.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditRoom(null)} style={{ flex: 1, background: colors.bgSecondary, color: colors.textSecondary, border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>{t('cancel')}</button>
              <button onClick={saveEdit} style={{ flex: 2, background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
