import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import RoomGrid from '../components/dashboard/RoomGrid';
import GuestPanel from '../components/dashboard/GuestPanel';
import FolioGrid from '../components/dashboard/FolioGrid';
import CompliancePanel from '../components/dashboard/CompliancePanel';
import GuestFolio from '../components/GuestFolio';

interface DashboardData {
  occupancy_rate: number;
  revenue_month: number;
  arrivals_today: number;
  departures_today: number;
}

interface RoomGridData {
  id: number;
  room_number: string;
  floor: number;
  status: string;
  housekeeping_status: string;
  guest_name?: string | null;
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
    guest_preferences?: string;
    phone?: string;
    company_name?: string;
    dob?: string | null;
    gender?: string;
    adults?: number;
    children?: number;
    infants?: number;
    place_of_issue?: string;
    visa_no?: string;
    id_expiry?: string | null;
    arrival_time?: string | null;
    departure_time?: string | null;
    parent_booking_ref?: string | null;
    arrival_mode?: string;
    vehicle_assigned?: string;
    meal_plan?: string;
    meal_plan_label?: string;
    market_code?: string;
    advance_paid?: number;
    special_requests?: string;
    internal_notes?: string;
  } | null;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [rooms, setRooms] = useState<RoomGridData[]>([]);
  const [businessDate, setBusinessDate] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomContext, setRoomContext] = useState<RoomContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [showFolio, setShowFolio] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/admin/'),
      api.get('/dashboard/admin/room-grid/'),
      api.get('/admin/config/'),
    ])
      .then(([dashRes, gridRes, cfgRes]) => {
        setData(dashRes.data);
        setRooms(gridRes.data.rooms ?? []);
        setBusinessDate(cfgRes.data.business_date ?? '');
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      setRoomContext(null);
      return;
    }
    setContextLoading(true);
    api.get(`/dashboard/admin/room-grid/${selectedRoomId}/context/`)
      .then(res => setRoomContext(res.data))
      .catch(() => toast.error('Failed to load room context'))
      .finally(() => setContextLoading(false));
  }, [selectedRoomId]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const bookingId = roomContext?.occupant?.booking_id ?? null;

  return (
    <div className="flex flex-col min-h-full bg-surface">
      <DashboardHeader
        businessDate={businessDate}
        mtdRevenue={data.revenue_month}
        occupancyPct={data.occupancy_rate}
        arrivals={data.arrivals_today}
        departures={data.departures_today}
      />

      <div className="p-4 pb-6">
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
            <RoomGrid
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
            <FolioGrid
              bookingId={bookingId}
              onOpenFolio={bookingId ? () => setShowFolio(true) : undefined}
            />
          </div>

          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            <GuestPanel
              roomContext={roomContext}
              loading={contextLoading && selectedRoomId !== null}
              onOpenFolio={bookingId ? () => setShowFolio(true) : undefined}
            />
            <CompliancePanel businessDate={businessDate} />
          </div>
        </div>
      </div>

      {showFolio && roomContext?.occupant && (
        <GuestFolio
          bookingId={roomContext.occupant.booking_id}
          bookingRef={roomContext.occupant.booking_ref}
          onClose={() => setShowFolio(false)}
        />
      )}
    </div>
  );
}
