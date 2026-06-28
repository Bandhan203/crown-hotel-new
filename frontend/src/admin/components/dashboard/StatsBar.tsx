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
    { label: 'Total Rooms', value: total,                            icon: MdHotel,        accent: '#0f766e' },
    { label: 'Occupied',    value: occupied,                         icon: MdPeople,       accent: '#dc2626' },
    { label: 'Vacant',      value: vacant,                           icon: MdHotel,        accent: '#16a34a' },
    { label: 'Dirty',       value: dirty,                            icon: FaWrench,       accent: '#ea580c' },
    { label: 'OOO / Maint', value: maintenance,                      icon: TbWifiOff,      accent: '#7c3aed' },
    { label: 'Occupancy %', value: `${occupancyPct}%`,               icon: MdTrendingUp,   accent: '#0284c7' },
    { label: 'In-House',    value: inHouseCount,                     icon: MdPeople,       accent: '#2563eb' },
    { label: 'Arrivals',    value: arrivalsToday,                    icon: MdFlightLand,   accent: '#16a34a' },
    { label: 'Departures',  value: departuresToday,                  icon: MdFlightTakeoff,accent: '#ea580c' },
    { label: 'MTD Revenue', value: `৳${revenueMonth.toLocaleString()}`, icon: MdAttachMoney, accent: '#0f766e' },
  ];

  return (
    <div className="w-full shrink-0 px-5 py-3">
      <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-10 gap-2">
        {stats.map(stat => (
          <div
            key={stat.label}
            className="bg-white p-3 rounded-md border border-gray-200 min-w-[90px]"
          >
            <p className="text-[9px] font-bold text-gray-500 uppercase">{stat.label}</p>
            <p
              className="text-xl font-bold mt-0.5"
              style={{ color: stat.label === 'MTD Revenue' ? '#0f766e' : '#1e293b' }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
