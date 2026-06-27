import { MdHotel, MdPeople, MdTrendingUp, MdFlightLand, MdFlightTakeoff, MdAttachMoney } from 'react-icons/md';
import { TbWifiOff } from 'react-icons/tb';
import { FaWrench } from 'react-icons/fa';

interface StatsBarProps {
  data: any;
  gridData: any;
}

export default function StatsBar({ data, gridData }: StatsBarProps) {
  const rooms = gridData?.rooms || [];

  const occupied = rooms.filter((r: any) => r.status === 'OCCUPIED').length;
  const vacant = rooms.filter((r: any) => r.status === 'VACANT').length;
  const dirty = rooms.filter((r: any) => ['DIRTY', 'OD', 'VD'].includes(r.housekeeping_status)).length;
  const maintenance = rooms.filter((r: any) => r.status === 'MAINTENANCE' || r.housekeeping_status === 'OUT_OF_ORDER').length;

  const total = rooms.length;
  const occupancyPct = data?.occupancy_rate || 0;
  const arrivalsToday = data?.arrivals_today || 0;
  const departuresToday = data?.departures_today || 0;
  const revenueMonth = data?.revenue_month || 0;
  const inHouseCount = data?.in_house_count || 0;

  const stats = [
    { label: 'Total Rooms', value: total, icon: MdHotel, accent: '#aa8453' },
    { label: 'Occupied', value: occupied, icon: MdPeople, accent: '#ef4444' },
    { label: 'Vacant', value: vacant, icon: MdHotel, accent: '#22c55e' },
    { label: 'Dirty', value: dirty, icon: FaWrench, accent: '#f97316' },
    { label: 'OOO / Maint', value: maintenance, icon: TbWifiOff, accent: '#a78bfa' },
    { label: 'Occupancy', value: `${occupancyPct}%`, icon: MdTrendingUp, accent: '#38bdf8' },
    { label: 'In-House', value: inHouseCount, icon: MdPeople, accent: '#3b82f6' },
    { label: 'Arrivals', value: arrivalsToday, icon: MdFlightLand, accent: '#22c55e' },
    { label: 'Departures', value: departuresToday, icon: MdFlightTakeoff, accent: '#f97316' },
    { label: 'MTD Revenue', value: `৳${revenueMonth.toLocaleString()}`, icon: MdAttachMoney, accent: '#aa8453' },
  ];

  return (
    <div className="w-full shrink-0 px-5 py-3">
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-[#141416] rounded-lg px-3 py-2.5 flex items-center gap-2.5 border-l-[3px] transition-colors hover:bg-[#1a1a1e]"
            style={{ borderLeftColor: stat.accent }}
          >
            <stat.icon size={15} style={{ color: stat.accent }} className="shrink-0 opacity-70" />
            <div className="min-w-0">
              <div className="text-[13px] font-bold leading-tight font-mono text-white truncate">{stat.value}</div>
              <div className="text-[9px] text-gray-500 mt-0.5 whitespace-nowrap tracking-wider uppercase truncate">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
