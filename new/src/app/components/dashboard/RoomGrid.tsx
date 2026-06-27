import { useState } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { initialHKRecords } from '../../data/mockData';
import type { HousekeepingRecord } from '../../data/extendedTypes';
import { RoomCard } from './RoomCard';
import { GuestPanel } from './GuestPanel';
import type { Room, RoomStatus } from '../../data/types';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { Filter } from 'lucide-react';

const FILTERS: { label: string; value: RoomStatus | 'all' | 'ooo' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Vacant', value: 'vacant' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Dirty', value: 'dirty' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'OOO', value: 'ooo' },
];

export function RoomGrid() {
  const { rooms } = useRooms();
  const { colors, theme } = useTheme();
  const { t } = useLang();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterStatus, setFilterStatus] = useState<RoomStatus | 'all' | 'ooo'>('all');
  const [hkRecords] = useLocalStorage<HousekeepingRecord[]>('hotel_hk_records', initialHKRecords);

  const today = new Date().toISOString().split('T')[0];

  const isOOO = (roomId: string) => {
    const rec = hkRecords.find(r => r.roomId === roomId && r.date === today);
    return rec?.amStatus === 'ooo';
  };

  const filteredRooms = rooms.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'ooo') return isOOO(r.id);
    return r.status === filterStatus && !isOOO(r.id);
  });

  const floors = [...new Set(rooms.map(r => r.floor))].sort() as number[];

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(prev => prev?.id === room.id ? null : room);
  };

  const filterBtnStyle = (active: boolean) => ({
    background: active ? colors.primary : (theme === 'light' ? '#fff' : colors.bgCard),
    color: active ? '#fff' : colors.textSecondary,
    border: `1px solid ${active ? colors.primary : colors.border}`,
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.13s',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
      {/* Grid area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={13} color={colors.textMuted} />
          {FILTERS.map(f => {
            const count = f.value === 'all' ? rooms.length
              : f.value === 'ooo' ? rooms.filter(r => isOOO(r.id)).length
              : rooms.filter(r => r.status === f.value && !isOOO(r.id)).length;
            return (
              <button key={f.value} onClick={() => setFilterStatus(f.value)} style={filterBtnStyle(filterStatus === f.value)}>
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Color legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { color: '#22c55e', label: t('vacant') },
            { color: '#ef4444', label: t('occupied') },
            { color: '#f97316', label: t('dirty') },
            { color: '#3b82f6', label: t('reserved') },
            { color: '#a78bfa', label: 'Maintenance' },
            { color: '#818cf8', label: 'OOO' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: colors.textMuted }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Floors */}
        {floors.map(floor => {
          const floorRooms = filteredRooms.filter(r => r.floor === floor);
          if (floorRooms.length === 0) return null;
          return (
            <div key={floor}>
              <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: colors.primary, fontWeight: 700 }}>{t('floor')} {floor}</span>
                <div style={{ flex: 1, height: 1, background: colors.borderLight }} />
                <span style={{ fontSize: 10 }}>{floorRooms.length} {t('room')}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
                {floorRooms.map(room => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    selected={selectedRoom?.id === room.id}
                    isOOO={isOOO(room.id)}
                    onClick={() => handleRoomClick(room)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guest panel */}
      {selectedRoom && (
        <GuestPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} />
      )}
    </div>
  );
}
