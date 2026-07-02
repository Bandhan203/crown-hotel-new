import { MdNotifications, MdSearch, MdSettings } from 'react-icons/md';

interface Props {
  businessDate: string;
  mtdRevenue: number;
  occupancyPct: number;
  arrivals: number;
  departures: number;
}

function formatBusinessDate(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatRevenue(n: number) {
  if (n >= 1000) return `৳${(n / 1000).toFixed(1)}k`;
  return `৳${n.toLocaleString()}`;
}

export default function DashboardHeader({ businessDate, mtdRevenue, occupancyPct, arrivals, departures }: Props) {
  const stats = [
    { label: 'MTD Revenue', value: formatRevenue(mtdRevenue) },
    { label: 'Occupancy %', value: `${occupancyPct.toFixed(1)}%` },
    { label: 'Arrivals', value: String(arrivals) },
    { label: 'Departures', value: String(departures) },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant px-3 sm:px-4 h-auto min-h-16 flex flex-col justify-center shrink-0 py-2 sm:py-0 sm:h-16">
      <div className="flex items-center justify-between gap-3 min-w-0">
      <div className="flex items-center gap-4 sm:gap-8 min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-primary truncate">Hotel Dashboard</h2>
          <p className="text-xs text-on-surface-variant font-medium truncate">
            Business Date: <span className="text-primary font-bold">{formatBusinessDate(businessDate)}</span>
          </p>
        </div>
        <div className="hidden xl:flex items-center gap-6 pl-8 border-l border-outline-variant">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-wider">{s.label}</p>
              <p className="text-lg font-extrabold text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="relative w-64 hidden md:block">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            placeholder="Search guests, rooms..."
            type="text"
          />
        </div>
        <button type="button" className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative">
          <MdNotifications size={22} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
        </button>
        <button type="button" className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <MdSettings size={22} />
        </button>
      </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 xl:hidden">
        {stats.map(s => (
          <div key={s.label} className="text-center bg-surface-container-low rounded-lg px-2 py-1.5 border border-outline-variant/50">
            <p className="text-[9px] sm:text-[10px] uppercase text-on-surface-variant font-bold tracking-wider truncate">{s.label}</p>
            <p className="text-sm sm:text-lg font-extrabold text-primary">{s.value}</p>
          </div>
        ))}
      </div>
    </header>
  );
}
