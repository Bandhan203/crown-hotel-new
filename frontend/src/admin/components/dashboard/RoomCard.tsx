import {
  MdPerson, MdCheckCircle, MdCleaningServices, MdConstruction,
} from 'react-icons/md';

interface RoomCardProps {
  room: {
    id: number;
    room_number: string;
    status: string;
    housekeeping_status: string;
    guest_name?: string | null;
  };
  selected: boolean;
  onClick: () => void;
}

type VisualStatus = 'available' | 'occupied' | 'dirty' | 'ooo' | 'reserved';

function resolveStatus(status: string, hkStatus: string): VisualStatus {
  if (status === 'MAINTENANCE' || hkStatus === 'OUT_OF_ORDER') return 'ooo';
  if (status === 'OCCUPIED') return 'occupied';
  if (['DIRTY', 'OD', 'VD'].includes(hkStatus)) return 'dirty';
  if (status === 'RESERVED') return 'reserved';
  return 'available';
}

const BORDER: Record<VisualStatus, string> = {
  available: 'border-status-available',
  occupied: 'border-status-occupied',
  dirty: 'border-status-dirty',
  ooo: 'border-status-ooo',
  reserved: 'border-primary',
};

const ICON: Record<VisualStatus, React.ReactNode> = {
  available: <MdCheckCircle className="text-sm text-status-available" />,
  occupied: <MdPerson className="text-sm text-primary" />,
  dirty: <MdCleaningServices className="text-sm text-status-dirty" />,
  ooo: <MdConstruction className="text-sm text-error" />,
  reserved: <MdPerson className="text-sm text-primary" />,
};

function guestLabel(name: string | null | undefined) {
  if (!name) return '-';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

export default function RoomCard({ room, selected, onClick }: RoomCardProps) {
  const visual = resolveStatus(room.status, room.housekeeping_status);
  const border = BORDER[visual];
  const isOoo = visual === 'ooo';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        room-card group cursor-pointer p-2 border-t-4 rounded-lg shadow-sm
        border-x border-b border-outline-variant/30 bg-white text-left w-full
        ${border}
        ${selected ? 'ring-2 ring-primary ring-offset-1' : ''}
        ${isOoo ? 'opacity-60' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-bold text-sm text-on-surface">{room.room_number}</span>
        {ICON[visual]}
      </div>
      <p className="text-[10px] font-bold text-on-surface-variant truncate uppercase">
        {visual === 'occupied' || visual === 'reserved'
          ? guestLabel(room.guest_name)
          : visual === 'ooo' ? 'Maint.' : '-'}
      </p>
    </button>
  );
}
