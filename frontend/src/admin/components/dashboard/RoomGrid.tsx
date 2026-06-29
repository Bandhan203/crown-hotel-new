import { useMemo, useState } from 'react';
import RoomCard from './RoomCard';

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

  const floorLabel = (f: number) => {
    if (f === 1) return `Floor ${f} (Reception)`;
    if (f === 2) return `Floor ${f} (Standard)`;
    if (f === 3) return `Floor ${f} (Executive)`;
    if (f >= 4) return `Floor ${f} (Suites)`;
    return `Floor ${f}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold text-on-surface">Floor Grid</h3>
          <div className="flex items-center gap-3 bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant">
            <label htmlFor="floor-select" className="text-xs font-bold text-on-surface-variant">Floor:</label>
            <select
              id="floor-select"
              value={floor === 'all' ? '' : floor}
              onChange={e => setFloor(e.target.value ? Number(e.target.value) : 'all')}
              className="bg-transparent border-none text-xs font-extrabold text-primary focus:ring-0 p-0 cursor-pointer outline-none"
            >
              <option value="">All Floors</option>
              {floors.map(f => (
                <option key={f} value={f}>{floorLabel(f)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase text-on-surface-variant">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 ${l.color} rounded-full`} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 xl:grid-cols-9 gap-3">
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
