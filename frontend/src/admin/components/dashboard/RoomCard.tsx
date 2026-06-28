import { MdInfoOutline } from 'react-icons/md';

interface RoomCardProps {
  room: any;
  selected: boolean;
  onClick: () => void;
}

const getStatusConfig = (status: string, hkStatus: string) => {
  if (status === 'MAINTENANCE' || hkStatus === 'OUT_OF_ORDER') {
    return { label: 'OOO',      labelClass: 'text-violet-600', rowClass: 'bg-violet-50 hover:bg-violet-100' };
  }
  if (status === 'OCCUPIED') {
    return { label: 'OCCUPIED', labelClass: 'text-red-600',    rowClass: 'bg-red-50 hover:bg-red-100' };
  }
  if (['DIRTY', 'OD', 'VD'].includes(hkStatus)) {
    return { label: 'DIRTY',    labelClass: 'text-orange-600', rowClass: 'hover:bg-gray-50' };
  }
  if (status === 'RESERVED') {
    return { label: 'RESV',     labelClass: 'text-blue-600',   rowClass: 'bg-blue-50 hover:bg-blue-100' };
  }
  return   { label: 'VAC',      labelClass: 'text-green-600',  rowClass: 'hover:bg-gray-50' };
};

export default function RoomCard({ room, selected, onClick }: RoomCardProps) {
  const cfg = getStatusConfig(room.status, room.housekeeping_status);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full p-4 border-b border-gray-100 last:border-b-0 relative group cursor-pointer text-left
        transition-colors
        ${selected ? 'bg-teal-50 ring-1 ring-inset ring-teal-400' : cfg.rowClass}
      `}
    >
      <div className="flex justify-between items-start">
        <span className={`text-sm font-bold ${selected ? 'text-teal-700' : 'text-slate-700'}`}>
          {room.room_number}
        </span>
        <MdInfoOutline className="w-3 h-3 text-gray-600 group-hover:text-gray-500" />
      </div>

      {room.status === 'OCCUPIED' ? (
        <div className="mt-1">
          {room.guest_name && (
            <p className={`text-[9px] font-extrabold tracking-wider uppercase ${cfg.labelClass}`}>
              {room.guest_name.split(' ')[0]}
            </p>
          )}
          {room.nights_remaining !== undefined && (
            <p className="text-[8px] text-gray-500 mt-0.5">
              {room.nights_remaining === 0 ? 'Dpt Today' : `${room.nights_remaining} Nts`}
            </p>
          )}
        </div>
      ) : (
        <p className={`text-[9px] font-extrabold mt-4 tracking-wider ${cfg.labelClass}`}>
          {cfg.label}
        </p>
      )}
    </button>
  );
}
