import { MdNotifications, MdSearch, MdSettings } from 'react-icons/md';

interface Props {
  businessDate: string;
  mtdRevenue: number;
  occupancyPct: number;
  arrivals: number;
  departures: number;
  embedded?: boolean;
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

export default function DashboardHeader({ businessDate, mtdRevenue, occupancyPct, arrivals, departures, embedded = false }: Props) {
  const stats = [
    { label: 'MTD Revenue', value: formatRevenue(mtdRevenue) },
    { label: 'Occupancy %', value: `${occupancyPct.toFixed(1)}%` },
    { label: 'Arrivals', value: String(arrivals) },
    { label: 'Departures', value: String(departures) },
  ];

  return (
    <header className={`${embedded ? '' : 'sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-outline-variant'} px-3 sm:px-4 shrink-0`}>
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-h-14 py-2 min-w-0">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-primary truncate">Hotel Dashboard</h2>
            <p className="text-[10px] sm:text-xs text-on-surface-variant font-medium truncate">
              Business Date: <span className="text-primary font-bold">{formatBusinessDate(businessDate)}</span>
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 pl-4 xl:pl-8 border-l border-outline-variant shrink-0">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-wider whitespace-nowrap">{s.label}</p>
                <p className="text-base xl:text-lg font-extrabold text-primary">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative w-40 xl:w-64 hidden xl:block">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              className="w-full pl-9 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="Search guests, rooms..."
              type="text"
            />
          </div>
          <button type="button" className="p-1.5 sm:p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative">
            <MdNotifications size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          </button>
          <button type="button" className="p-1.5 sm:p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
            <MdSettings size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pb-3 lg:hidden">
        {stats.map(s => (
          <div key={s.label} className="text-center bg-surface-container-low rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 border border-outline-variant/50 min-w-0">
            <p className="text-[8px] sm:text-[9px] uppercase text-on-surface-variant font-bold tracking-wide truncate">{s.label}</p>
            <p className="text-xs sm:text-sm font-extrabold text-primary truncate">{s.value}</p>
          </div>
        ))}
      </div>
    </header>
  );
}
