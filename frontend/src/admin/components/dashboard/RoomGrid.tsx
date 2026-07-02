import { useMemo, useState } from 'react';
import RoomCard from './RoomCard';
import { isDirtyHk } from '../../utils/housekeepingStatus';

interface RoomGridProps {
  rooms: {
    id: number;
    room_number: string;
    floor: number;
    status: string;
    housekeeping_status: string;
    guest_name?: string | null;
  }[];
  selectedRoomId: number | null;
  onSelectRoom: (id: number | null) => void;
}

const LEGEND = [
  { label: 'Vacant', color: 'bg-status-available' },
  { label: 'Occupied', color: 'bg-status-occupied' },
  { label: 'Expected', color: 'bg-status-reserved' },
  { label: 'Dirty', color: 'bg-status-dirty' },
  { label: 'OOO', color: 'bg-status-ooo' },
] as const;

export default function RoomGrid({ rooms, selectedRoomId, onSelectRoom }: RoomGridProps) {
  const floors = useMemo(
    () => [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b),
    [rooms],
  );
  const [floor, setFloor] = useState<number | 'all'>('all');

  const floorRooms = useMemo(() => {
    const list = floor === 'all' ? rooms : rooms.filter(r => r.floor === floor);
    return [...list].sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
  }, [rooms, floor]);

  const dirtyCount = useMemo(
    () => rooms.filter(r => isDirtyHk(r.housekeeping_status)).length,
    [rooms],
  );

  const floorLabel = (f: number) => {
    if (f === 1) return `Floor ${f} (Reception)`;
    if (f === 2) return `Floor ${f} (Standard)`;
    if (f === 3) return `Floor ${f} (Executive)`;
    if (f >= 4) return `Floor ${f} (Suites)`;
    return `Floor ${f}`;
  };

  return (
    <div className="flex flex-col gap-3 min-w-0 max-w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-on-surface shrink-0">Floor Grid</h3>
          <div className="flex items-center gap-2 sm:gap-3 bg-surface-container-low px-3 sm:px-4 py-1.5 rounded-full border border-outline-variant min-w-0">
            <label htmlFor="floor-select" className="text-xs font-bold text-on-surface-variant shrink-0">Floor:</label>
            <select
              id="floor-select"
              value={floor === 'all' ? '' : floor}
              onChange={e => setFloor(e.target.value ? Number(e.target.value) : 'all')}
              className="bg-transparent border-none text-xs font-extrabold text-primary focus:ring-0 p-0 cursor-pointer outline-none max-w-[8rem] sm:max-w-none"
            >
              <option value="">All Floors</option>
              {floors.map(f => (
                <option key={f} value={f}>{floorLabel(f)}</option>
              ))}
            </select>
          </div>
          {dirtyCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-status-dirty/15 border border-status-dirty/30 text-[10px] font-bold uppercase text-status-dirty shrink-0">
              <span className="w-2 h-2 rounded-full bg-status-dirty" />
              {dirtyCount} dirty
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] sm:text-[10px] font-bold uppercase text-on-surface-variant">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1 shrink-0">
              <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${l.color} rounded-full`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-2.5 min-w-0">
        {floorRooms.map(room => (
          <RoomCard
            key={room.id}
            room={room}
            selected={selectedRoomId === room.id}
            onClick={() => onSelectRoom(selectedRoomId === room.id ? null : room.id)}
          />
        ))}
        {floorRooms.length === 0 && (
          <p className="col-span-full text-sm text-on-surface-variant py-8 text-center">No rooms on this floor</p>
        )}
      </div>
    </div>
  );
}
