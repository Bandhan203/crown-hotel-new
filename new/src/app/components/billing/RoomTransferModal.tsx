import { useState } from 'react';
import { useRooms } from '../../contexts/RoomsContext';
import { useHotel } from '../../contexts/HotelContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { Folio } from '../../data/types';
import { X, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Props { folio: Folio; onClose: () => void; }

export function RoomTransferModal({ folio, onClose }: Props) {
  const { rooms, updateFolio, updateRoomStatus } = useRooms();
  const { config } = useHotel();
  const { colors } = useTheme();
  const [targetRoomId, setTargetRoomId] = useState('');

  const currentRoom = rooms.find(r => r.id === folio.roomId);
  const vacantRooms = rooms.filter(r => r.status === 'vacant' && r.id !== folio.roomId);

  const handleTransfer = () => {
    if (!targetRoomId) { toast.error('Select a target room'); return; }
    const targetRoom = rooms.find(r => r.id === targetRoomId);
    if (!targetRoom) return;

    updateFolio(folio.id, { roomId: targetRoomId });
    updateRoomStatus(folio.roomId, 'dirty');
    updateRoomStatus(targetRoomId, 'occupied');
    toast.success(`Room transfer: ${currentRoom?.number} → ${targetRoom.number}`);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: 12, width: 440, padding: 24, boxShadow: colors.shadow }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ArrowRightLeft size={16} color={colors.primary} />
          <h3 style={{ margin: 0, color: colors.text, flex: 1 }}>Room Transfer</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ background: colors.bgSecondary, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
          <div style={{ color: colors.textMuted, marginBottom: 4 }}>Current Room</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: colors.primary, fontFamily: 'monospace' }}>{currentRoom?.number}</div>
          <div style={{ color: colors.textSecondary }}>{currentRoom?.type} — ৳{currentRoom?.ratePerNight.toLocaleString()}/night</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: colors.textMuted, display: 'block', marginBottom: 6 }}>Transfer To (Vacant Rooms)</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 6, maxHeight: 200, overflow: 'auto' }}>
            {vacantRooms.map(r => (
              <button key={r.id} onClick={() => setTargetRoomId(r.id)}
                style={{ background: targetRoomId === r.id ? colors.successBg : colors.bgSecondary, border: `2px solid ${targetRoomId === r.id ? colors.success : colors.border}`, borderRadius: 7, padding: '8px', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: colors.success, fontFamily: 'monospace' }}>{r.number}</div>
                <div style={{ fontSize: 9, color: colors.textMuted }}>{r.type} · Floor {r.floor}</div>
                <div style={{ fontSize: 9, color: colors.textSecondary }}>৳{r.ratePerNight.toLocaleString()}</div>
              </button>
            ))}
          </div>
          {vacantRooms.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: colors.textMuted, fontSize: 12 }}>No vacant rooms available</div>}
        </div>

        <div style={{ background: colors.warningBg, border: `1px solid ${colors.warning}44`, borderRadius: 6, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: colors.warning }}>
          ⚠️ Current room will be marked Dirty. All charges stay on the same folio.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, background: colors.bgSecondary, color: colors.textSecondary, border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={handleTransfer} disabled={!targetRoomId}
            style={{ flex: 2, background: colors.primary, color: '#fff', border: 'none', borderRadius: 6, padding: '10px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: !targetRoomId ? 0.4 : 1 }}>
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>
  );
}
