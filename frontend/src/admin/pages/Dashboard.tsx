import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import StatsBar from '../components/dashboard/StatsBar';
import RoomGrid from '../components/dashboard/RoomGrid';
import GuestPanel from '../components/dashboard/GuestPanel';
import QuickActions from '../components/QuickActions';

interface DashboardData {
  total_rooms: number;
  occupied_rooms: number;
  occupancy_rate: number;
  bookings_today: number;
  revenue_month: number;
  total_guests: number;
  pending_checkouts_today: number;
  arrivals_today: number;
  departures_today: number;
  in_house_count: number;
  revenue_chart: { date: string; revenue: number }[];
}

interface RoomGridData {
  id: number;
  room_number: string;
  floor: number;
  status: string;
  housekeeping_status: string;
  is_public_area: boolean;
  area_type: string;
}

interface GridResponse {
  rooms: RoomGridData[];
  public_areas: RoomGridData[];
}

interface RoomContext {
  room_id: number;
  room_number: string;
  status: string;
  housekeeping_status: string;
  notes: string;
  room_type: string;
  occupant: {
    booking_id: number;
    guest_name: string;
    check_in: string;
    check_out: string;
    booking_ref: string;
    balance_due: number;
    guest_preferences: string;
  } | null;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [gridData, setGridData] = useState<GridResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomContext, setRoomContext] = useState<RoomContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/admin/'),
      api.get('/dashboard/admin/room-grid/')
    ])
      .then(([res, gridRes]) => {
        setData(res.data);
        setGridData(gridRes.data);
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedRoomId) {
      setContextLoading(true);
      api.get(`/dashboard/admin/room-grid/${selectedRoomId}/context/`)
        .then(res => setRoomContext(res.data))
        .catch(() => toast.error("Failed to load room context"))
        .finally(() => setContextLoading(false));
    } else {
      setRoomContext(null);
    }
  }, [selectedRoomId]);

  if (loading || !data || !gridData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const drawerOpen = selectedRoomId !== null;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* KPI Stats Grid — shrink-0 keeps it pinned */}
      <StatsBar data={data} gridData={gridData} />

      {/* Quick Actions action bar */}
      <div className="shrink-0 px-5 py-3 bg-white border-b border-gray-200">
        <QuickActions />
      </div>

      {/* ── 12-Column CSS Grid: Room Grid + Drawer ── */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden h-full min-h-0 gap-0">
        {/* Left: Room grid — dynamically takes 9 or 12 cols */}
        <div className={`${drawerOpen ? 'col-span-9' : 'col-span-12'} h-full overflow-y-auto overflow-x-hidden transition-all duration-200`}>
          <RoomGrid
            rooms={gridData.rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
          />
        </div>

        {/* Right: Drawer — exactly col-span-3, integrated grid column */}
        {drawerOpen && (
          <div className="col-span-3 h-full overflow-hidden">
            <GuestPanel
              roomContext={roomContext}
              loading={contextLoading}
              onClose={() => setSelectedRoomId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
