import { useEffect, useState } from 'react';
import { MdHotel, MdBookOnline, MdPeople, MdAttachMoney, MdLogout as MdCheckout, MdLogin, MdHome, MdRestaurant, MdLocalParking, MdCelebration, MdDeck, MdInfo } from 'react-icons/md';
import { TbCurrencyTaka } from 'react-icons/tb';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import api from '../../services/api';
import StatsCard from '../components/StatsCard';
import QuickActions from '../components/QuickActions';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

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

function getRoomBgColor(r: RoomGridData | RoomContext) {
  if (r.status === 'MAINTENANCE' || r.housekeeping_status === 'OUT_OF_ORDER') return 'bg-gray-800 border-gray-600 text-gray-400';
  if (r.status === 'OCCUPIED') return 'bg-red-500/80 border-red-500/50 text-white';
  if (r.status === 'RESERVED') return 'bg-blue-500/80 border-blue-500/50 text-white';
  if (['DIRTY', 'OD', 'VD'].includes(r.housekeeping_status)) return 'bg-yellow-500/80 border-yellow-500/50 text-white';
  return 'bg-green-500/80 border-green-500/50 text-white';
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#aa8453] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const revenueChartData = {
    labels: data.revenue_chart.map((d) => new Date(d.date).toLocaleDateString('en', { weekday: 'short' })),
    datasets: [{
      label: 'Revenue',
      data: data.revenue_chart.map((d) => d.revenue),
      borderColor: '#aa8453',
      backgroundColor: 'rgba(170,132,83,0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#aa8453',
    }],
  };

  const occupancyData = {
    labels: ['Occupied', 'Available'],
    datasets: [{
      data: [data.occupied_rooms, data.total_rooms - data.occupied_rooms],
      backgroundColor: ['#aa8453', '#2a2a2a'],
      borderWidth: 0,
    }],
  };

  const floors = [...new Set(gridData.rooms.map(r => r.floor))].sort((a, b) => b - a);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Live Dashboard</h1>
        <div className="flex gap-4">
          <StatsCard title="Arrivals" value={data.arrivals_today} icon={<MdLogin size={20} />} color="#22c55e" compact />
          <StatsCard title="Departures" value={data.departures_today} icon={<MdCheckout size={20} />} color="#f59e0b" compact />
          <StatsCard title="In-House" value={data.in_house_count} icon={<MdHome size={20} />} color="#3b82f6" compact />
        </div>
      </div>

      <QuickActions />

      {/* Two-Column Master-Detail Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column - 25% Width - Sticky Context Panel */}
        <div className="w-full lg:w-1/4 shrink-0 lg:sticky lg:top-4 space-y-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 min-h-[400px] flex flex-col">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
              <MdInfo className="text-[#aa8453]" /> Room Context
            </h3>
            
            {contextLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#aa8453] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : roomContext ? (
              <div className="space-y-4 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-white">{roomContext.room_number}</span>
                  <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider ${getRoomBgColor(roomContext)}`}>
                    {roomContext.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400 capitalize">{roomContext.room_type}</div>
                
                {roomContext.occupant ? (
                  <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
                    <div>
                      <div className="text-xs text-gray-500">Guest Name</div>
                      <div className="text-white font-medium">{roomContext.occupant.guest_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Checkout Date</div>
                      <div className="text-white">{roomContext.occupant.check_out}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Balance Due</div>
                      <div className={`font-semibold ${roomContext.occupant.balance_due > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        BDT {roomContext.occupant.balance_due.toLocaleString()}
                      </div>
                    </div>
                    {roomContext.occupant.guest_preferences && (
                      <div>
                        <div className="text-xs text-gray-500">Preferences</div>
                        <div className="text-amber-200 text-sm italic">{roomContext.occupant.guest_preferences}</div>
                      </div>
                    )}
                    <div className="pt-4 flex gap-2">
                      <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-xs py-2 rounded transition">Folio</button>
                      <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs py-2 rounded transition">Check Out</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col items-center justify-center flex-1 text-center space-y-3 border-t border-white/10 pt-6">
                    <MdHotel size={40} className="text-gray-600" />
                    <p className="text-sm text-gray-400">Room is currently Vacant.</p>
                    <button className="w-full bg-[#aa8453] hover:bg-[#8c6c44] text-white text-sm font-medium py-2 rounded transition mt-4">
                      Walk-in Booking
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                <MdHotel size={48} className="mb-4 text-gray-500" />
                <p className="text-sm text-gray-400">Select a room from the matrix<br/>to view details and actions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 75% Width - High-Density Minimalist Matrix */}
        <div className="w-full lg:w-3/4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">High-Density Matrix</h3>
              <div className="flex gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500"></span> Vacant Clean</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span> Occupied</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500"></span> Dirty</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Reserved</span>
              </div>
            </div>

            <div className="space-y-4">
              {floors.map(floor => (
                <div key={floor} className="flex items-start gap-4">
                  <div className="w-12 pt-1 text-right text-gray-500 font-bold text-xs shrink-0">
                    F{floor}
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {gridData.rooms.filter(r => r.floor === floor).map(room => (
                      <button
                        key={room.id}
                        onClick={() => setSelectedRoomId(room.id)}
                        className={`w-10 h-10 rounded shadow-sm border border-black/20 focus:outline-none focus:ring-2 focus:ring-white flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 ${getRoomBgColor(room)} ${selectedRoomId === room.id ? 'ring-2 ring-white scale-110 shadow-lg z-10' : ''}`}
                        title={`Room ${room.room_number}`}
                      >
                        {room.room_number}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts (Bottom Section - Scroll Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-white/10">
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Revenue (Last 7 Days)</h3>
          <div className="h-64">
            <Line
              data={revenueChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { ticks: { color: '#6b7280' }, grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 flex flex-col items-center">
          <h3 className="text-white font-semibold mb-4 self-start">Room Occupancy</h3>
          <div className="w-48 h-48">
            <Doughnut
              data={occupancyData}
              options={{
                responsive: true, maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div className="mt-4 text-center">
            <p className="text-3xl font-bold text-[#aa8453]">{data.occupancy_rate}%</p>
            <p className="text-xs text-gray-400">{data.occupied_rooms} of {data.total_rooms} rooms</p>
          </div>
        </div>
      </div>
    </div>
  );
}
