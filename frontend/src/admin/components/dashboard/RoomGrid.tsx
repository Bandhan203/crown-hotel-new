import { useState } from 'react';
import RoomCard from './RoomCard';

interface RoomGridProps {
  rooms: any[];
  selectedRoomId: number | null;
  onSelectRoom: (id: number | null) => void;
}

type FilterStatus = 'all' | 'vacant' | 'occupied' | 'dirty' | 'reserved' | 'ooo';

const FILTERS: { label: string; value: FilterStatus; dirtyAccent?: string }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Vacant',   value: 'vacant'   },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Dirty',    value: 'dirty',   dirtyAccent: 'text-orange-600 border-orange-300 hover:bg-orange-50' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'OOO',      value: 'ooo'      },
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
      <div className="shrink-0 bg-white px-5 py-3 border-b border-gray-200 flex items-center gap-3 flex-wrap">
        {FILTERS.map(f => {
          const count = getCount(f.value);
          const active = filterStatus === f.value;
          const dirtyClass = f.dirtyAccent || '';
          return (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`
                px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                ${ active
                    ? 'bg-teal-900 text-white'
                    : f.dirtyAccent
                      ? `bg-white border border-orange-300 ${dirtyClass}`
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }
              `}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Scrollable room floors — grouped by floor as vertical columns */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 bg-gray-50">
        <div className="grid grid-cols-6 gap-0">
          {floors.map(floor => {
            const floorRooms = filteredRooms.filter(r => r.floor === floor);
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor} className="border-r border-gray-300 last:border-r-0 pr-1">
                {/* Floor label */}
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase ml-2">Floor {floor}</p>
                </div>
                {/* Room cards stacked vertically inside a bordered container */}
                <div className="border border-gray-200 rounded-sm bg-white overflow-hidden">
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
