import { TbWifiOff } from 'react-icons/tb';

interface RoomCardProps {
  room: any;
  selected: boolean;
  onClick: () => void;
}

const getStatusConfig = (status: string, hkStatus: string) => {
  if (status === 'MAINTENANCE' || hkStatus === 'OUT_OF_ORDER') {
    return { accent: '#a78bfa', label: 'OOO', isOOO: true };
  }
  if (status === 'OCCUPIED') {
    return { accent: '#ef4444', label: 'OCCUPIED', isOOO: false };
  }
  if (['DIRTY', 'OD', 'VD'].includes(hkStatus)) {
    return { accent: '#f97316', label: 'DIRTY', isOOO: false };
  }
  if (status === 'RESERVED') {
    return { accent: '#3b82f6', label: 'RESERVED', isOOO: false };
  }
  return { accent: '#22c55e', label: 'AVAILABLE', isOOO: false };
};

export default function RoomCard({ room, selected, onClick }: RoomCardProps) {
  const cfg = getStatusConfig(room.status, room.housekeeping_status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative w-[72px] h-[52px] rounded-md cursor-pointer
        flex flex-col items-center justify-center gap-0.5
        border transition-all duration-150 outline-none
        ${selected
          ? 'bg-[#1e3a5f] border-[#60a5fa] ring-2 ring-[#60a5fa]/30 scale-105 z-10'
          : 'bg-[#141416] border-white/[0.06] hover:border-white/15 hover:bg-[#1a1a1e]'}
      `}
      style={!selected ? { borderLeftColor: cfg.accent, borderLeftWidth: 3 } : undefined}
    >
      {cfg.isOOO && (
        <TbWifiOff size={8} className="absolute top-1 right-1 text-[#a78bfa] opacity-60" />
      )}

      <span
        className="text-[13px] font-bold font-mono leading-none"
        style={{ color: selected ? '#93c5fd' : cfg.accent }}
      >
        {room.room_number}
      </span>

      <span
        className="text-[7px] font-semibold uppercase tracking-widest leading-none"
        style={{ color: selected ? '#93c5fd' : `${cfg.accent}99` }}
      >
        {cfg.label}
      </span>
    </button>
  );
}
