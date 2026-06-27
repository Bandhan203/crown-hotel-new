import { useState } from 'react';
import RoomCard from './RoomCard';

interface RoomGridProps {
  rooms: any[];
  selectedRoomId: number | null;
  onSelectRoom: (id: number | null) => void;
}

type FilterStatus = 'all' | 'vacant' | 'occupied' | 'dirty' | 'reserved' | 'ooo';

const FILTERS: { label: string; value: FilterStatus; color: string }[] = [
  { label: 'All', value: 'all', color: '#aa8453' },
  { label: 'Vacant', value: 'vacant', color: '#22c55e' },
  { label: 'Occupied', value: 'occupied', color: '#ef4444' },
  { label: 'Dirty', value: 'dirty', color: '#f97316' },
  { label: 'Reserved', value: 'reserved', color: '#3b82f6' },
  { label: 'OOO', value: 'ooo', color: '#a78bfa' },
];

export default function RoomGrid({ rooms, selectedRoomId, onSelectRoom }: RoomGridProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  const isOOO = (r: any) => r.status === 'MAINTENANCE' || r.housekeeping_status === 'OUT_OF_ORDER';

  const filteredRooms = rooms.filter(r => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'ooo') return isOOO(r);
    if (filterStatus === 'dirty') return ['DIRTY', 'OD', 'VD'].includes(r.housekeeping_status) && !isOOO(r);
    return r.status === filterStatus.toUpperCase() && !isOOO(r);
  });

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => b - a);

  const getCount = (status: FilterStatus) => {
    if (status === 'all') return rooms.length;
    if (status === 'ooo') return rooms.filter(r => isOOO(r)).length;
    if (status === 'dirty') return rooms.filter(r => ['DIRTY', 'OD', 'VD'].includes(r.housekeeping_status) && !isOOO(r)).length;
    return rooms.filter(r => r.status === status.toUpperCase() && !isOOO(r)).length;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky filter bar */}
      <div className="shrink-0 bg-[#0c0c0e] px-5 py-2.5 border-b border-white/[0.04] flex items-center gap-5">
        <div className="flex gap-1.5 items-center flex-wrap">
          {FILTERS.map(f => {
            const count = getCount(f.value);
            const active = filterStatus === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={`
                  px-2.5 py-1 text-[11px] rounded-md transition-all duration-150 font-medium flex items-center gap-1.5
                  ${active
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}
                `}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                {f.label}
                <span className={`text-[9px] font-mono ${active ? 'text-gray-300' : 'text-gray-600'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable room floors — only this region scrolls */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-3 pr-2">
        <div className="flex flex-col gap-4">
          {floors.map(floor => {
            const floorRooms = filteredRooms.filter(r => r.floor === floor);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor}>
                {/* Floor label */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] text-[#aa8453] font-bold uppercase tracking-[0.15em]">Floor {floor}</span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                  <span className="text-[9px] text-gray-600 font-mono">{floorRooms.length}</span>
                </div>
                {/* Room cards — flex-wrap for graceful wrapping */}
                <div className="flex flex-wrap gap-2 w-full">
                  {floorRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      selected={selectedRoomId === room.id}
                      onClick={() => onSelectRoom(selectedRoomId === room.id ? null : room.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
