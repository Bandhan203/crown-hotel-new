import type { Room } from '../../data/types';
import { useRooms } from '../../contexts/RoomsContext';
import { useGuests } from '../../contexts/GuestContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLang } from '../../contexts/LanguageContext';
import { Wrench, WifiOff } from 'lucide-react';

const getStatusConfig = (status: Room['status'], isLight: boolean) => ({
  vacant:      { bg: isLight ? '#dcfce7' : '#0f2d1a', border: isLight ? '#16a34a' : '#22c55e', text: isLight ? '#15803d' : '#22c55e', dot: '#22c55e' },
  occupied:    { bg: isLight ? '#fee2e2' : '#3b1111', border: isLight ? '#dc2626' : '#ef4444', text: isLight ? '#b91c1c' : '#ef4444', dot: '#ef4444' },
  dirty:       { bg: isLight ? '#ffedd5' : '#2d1a0a', border: isLight ? '#ea580c' : '#f97316', text: isLight ? '#c2410c' : '#f97316', dot: '#f97316' },
  reserved:    { bg: isLight ? '#dbeafe' : '#0c1c3b', border: isLight ? '#2563eb' : '#3b82f6', text: isLight ? '#1d4ed8' : '#3b82f6', dot: '#3b82f6' },
  maintenance: { bg: isLight ? '#ede9fe' : '#1e1040', border: isLight ? '#7c3aed' : '#a78bfa', text: isLight ? '#6d28d9' : '#a78bfa', dot: '#a78bfa' },
});

interface RoomCardProps {
  room: Room;
  selected: boolean;
  isOOO: boolean;
  onClick: () => void;
}

export function RoomCard({ room, selected, isOOO, onClick }: RoomCardProps) {
  const { folios, getFolioBalance } = useRooms();
  const { guests } = useGuests();
  const { config } = useHotel();
  const { theme } = useTheme();
  const { t } = useLang();
  const isLight = theme === 'light';
  const allCfg = getStatusConfig(room.status, isLight);
  const statusCfg = allCfg[room.status] || allCfg.vacant;

  const folio = folios.find(f => f.roomId === room.id && (f.status === 'inhouse' || f.status === 'reserved'));
  const guest = folio ? guests.find(g => g.id === folio.guestId) : undefined;
  const balance = folio ? getFolioBalance(folio.id) : 0;
  const isDueOut = folio?.checkOut === config.systemDate && folio.status === 'inhouse';

  const effectiveBg = isOOO ? (isLight ? '#e0e7ff' : '#1e1040') : statusCfg.bg;
  const effectiveBorder = isOOO ? (isLight ? '#6366f1' : '#818cf8') : statusCfg.border;
  const effectiveText = isOOO ? (isLight ? '#4338ca' : '#818cf8') : statusCfg.text;

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? (isLight ? '#dbeafe' : '#1e3a5f') : effectiveBg,
        border: `2px solid ${selected ? (isLight ? '#2563eb' : '#60a5fa') : effectiveBorder + '99'}`,
        borderRadius: 10,
        padding: '10px 10px 8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
        minHeight: 95,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        boxShadow: selected ? `0 0 0 3px ${effectiveBorder}44, 0 4px 12px rgba(0,0,0,0.2)` : isLight ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Due out badge */}
      {isDueOut && (
        <div style={{ position: 'absolute', top: -7, right: -7, background: '#eab308', color: '#000', fontSize: 8, padding: '2px 5px', borderRadius: 4, fontWeight: 800, letterSpacing: 0.5 }}>DUE OUT</div>
      )}

      {/* OOO / Maintenance icon */}
      {isOOO && (
        <div style={{ position: 'absolute', top: 5, right: 5 }}><WifiOff size={10} color={isLight ? '#6366f1' : '#818cf8'} /></div>
      )}
      {room.status === 'maintenance' && !isOOO && (
        <div style={{ position: 'absolute', top: 5, right: 5 }}><Wrench size={10} color={effectiveText} /></div>
      )}

      {/* Status dot + Room number */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: isOOO ? '#818cf8' : statusCfg.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 18, fontWeight: 800, color: effectiveText, lineHeight: 1, fontFamily: 'monospace' }}>{room.number}</span>
      </div>

      {/* Room type */}
      <div style={{ fontSize: 9, color: isLight ? '#64748b' : '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>{room.type}</div>

      {/* Status label */}
      <div style={{ fontSize: 9, color: effectiveText, fontWeight: 600 }}>
        {isOOO ? 'OOO' : t(room.status as any)}
      </div>

      {/* Guest name */}
      {guest && (
        <div style={{ fontSize: 9, color: isLight ? '#334155' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
          {guest.name}
        </div>
      )}

      {/* Balance */}
      {balance > 0 && (
        <div style={{ fontSize: 8, color: isLight ? '#dc2626' : '#ef4444', fontFamily: 'monospace', fontWeight: 700 }}>৳{balance.toLocaleString()}</div>
      )}

      {/* Rate */}
      <div style={{ fontSize: 8, color: isLight ? '#94a3b8' : '#334155', marginTop: 'auto' }}>৳{room.ratePerNight.toLocaleString()}/n</div>
    </div>
  );
}
