import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardQuickBar from '../components/dashboard/DashboardQuickBar';
import RoomGrid from '../components/dashboard/RoomGrid';
import GuestPanel from '../components/dashboard/GuestPanel';
import FolioGrid from '../components/dashboard/FolioGrid';
import CompliancePanel from '../components/dashboard/CompliancePanel';
import GuestFolio from '../components/GuestFolio';
import { isDirtyHk } from '../utils/housekeepingStatus';

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
  housekeeping_label?: string;
  is_dirty?: boolean;
  pending_hk_task?: {
    id: number;
    status: string;
    priority: string;
    booking_ref?: string | null;
    notes?: string;
  } | null;
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
  const [auditStatus, setAuditStatus] = useState<'ready' | 'pending' | 'completed'>('ready');
  const [loading, setLoading] = useState(true);

  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomContext, setRoomContext] = useState<RoomContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [showFolio, setShowFolio] = useState(false);
  const [folioRefreshKey, setFolioRefreshKey] = useState(0);
  const [hkLoading, setHkLoading] = useState(false);

  const refreshRoomContext = useCallback(() => {
    if (!selectedRoomId) return;
    setContextLoading(true);
    api.get(`/dashboard/admin/room-grid/${selectedRoomId}/context/`)
      .then(res => setRoomContext(res.data))
      .catch(() => toast.error('Failed to refresh room context'))
      .finally(() => setContextLoading(false));
  }, [selectedRoomId]);

  const refreshRooms = useCallback(() => {
    api.get('/dashboard/admin/room-grid/')
      .then(res => setRooms(res.data.rooms ?? []))
      .catch(() => {});
  }, []);

  const handleHousekeepingUpdate = useCallback(() => {
    refreshRooms();
    refreshRoomContext();
  }, [refreshRooms, refreshRoomContext]);

  const handleRequestCleaning = useCallback(async () => {
    if (!selectedRoomId) return;
    setHkLoading(true);
    try {
      const res = await api.post(`/admin/rooms/${selectedRoomId}/request-cleaning/`);
      toast.success(res.data.detail || 'Sent to housekeeping');
      handleHousekeepingUpdate();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to request cleaning');
    }
    setHkLoading(false);
  }, [selectedRoomId, handleHousekeepingUpdate]);

  const handleMarkReady = useCallback(async () => {
    if (!selectedRoomId) return;
    setHkLoading(true);
    try {
      const res = await api.post(`/admin/rooms/${selectedRoomId}/room-ready/`);
      toast.success(res.data.detail || 'Room marked ready');
      handleHousekeepingUpdate();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail || 'Failed to update room');
    }
    setHkLoading(false);
  }, [selectedRoomId, handleHousekeepingUpdate]);

  const handleFolioChanged = useCallback(() => {
    setFolioRefreshKey(k => k + 1);
    refreshRoomContext();
  }, [refreshRoomContext]);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/admin/'),
      api.get('/dashboard/admin/room-grid/'),
      api.get('/admin/config/'),
      api.get('/admin/night-audit/preview/'),
    ])
      .then(([dashRes, gridRes, cfgRes, auditRes]) => {
        setData(dashRes.data);
        setRooms(gridRes.data.rooms ?? []);
        setBusinessDate(cfgRes.data.business_date ?? '');
        const ap = auditRes.data;
        if (ap?.already_run) setAuditStatus('completed');
        else if (ap?.blocked_by_overdue) setAuditStatus('pending');
        else setAuditStatus('ready');
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshRooms, 30000);
    const onFocus = () => refreshRooms();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshRooms]);

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
  const dirtyCount = rooms.filter(r => isDirtyHk(r.housekeeping_status)).length;

  const selectedRoomQuick = (() => {
    if (roomContext) {
      return {
        id: roomContext.room_id,
        room_number: roomContext.room_number,
        status: roomContext.status,
        housekeeping_status: roomContext.housekeeping_status,
        is_dirty: roomContext.is_dirty,
        occupant: roomContext.occupant,
      };
    }
    if (!selectedRoomId) return null;
    const r = rooms.find(room => room.id === selectedRoomId);
    if (!r) return null;
    return {
      id: r.id,
      room_number: r.room_number,
      status: r.status,
      housekeeping_status: r.housekeeping_status,
      occupant: null as RoomContext['occupant'],
    };
  })();

  return (
    <div className="flex flex-col min-h-full bg-surface max-w-full overflow-x-hidden">
      <div className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant shrink-0">
        <DashboardHeader
          businessDate={businessDate}
          mtdRevenue={data.revenue_month}
          occupancyPct={data.occupancy_rate}
          arrivals={data.arrivals_today}
          departures={data.departures_today}
          embedded
        />

        <div className="border-t border-outline-variant/50 bg-surface-container-lowest/80 px-3 sm:px-4 py-2 max-w-full">
          <DashboardQuickBar
            dirtyCount={dirtyCount}
            selectedRoom={selectedRoomQuick}
            hkLoading={hkLoading}
            onRequestCleaning={handleRequestCleaning}
            onMarkReady={handleMarkReady}
            onOpenFolio={bookingId ? () => setShowFolio(true) : undefined}
          />
        </div>
      </div>

      <div className="p-3 sm:p-4 pb-6 max-w-full min-w-0">
        <div className="grid grid-cols-12 gap-4 items-start">
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-4">
            <RoomGrid
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={setSelectedRoomId}
            />
            <FolioGrid
              bookingId={bookingId}
              refreshKey={folioRefreshKey}
              onOpenFolio={bookingId ? () => setShowFolio(true) : undefined}
            />
          </div>

          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            <GuestPanel
              roomContext={roomContext}
              loading={contextLoading && selectedRoomId !== null}
              onOpenFolio={bookingId ? () => setShowFolio(true) : undefined}
            />
            <CompliancePanel businessDate={businessDate} auditStatus={auditStatus} />
          </div>
        </div>
      </div>

      {showFolio && roomContext?.occupant && (
        <GuestFolio
          bookingId={roomContext.occupant.booking_id}
          bookingRef={roomContext.occupant.booking_ref}
          onFolioChanged={handleFolioChanged}
          onClose={() => {
            setShowFolio(false);
            handleFolioChanged();
          }}
        />
      )}
    </div>
  );
}
