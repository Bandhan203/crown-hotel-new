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
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant px-4 h-16 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-8 min-w-0">
        <div>
          <h2 className="text-xl font-semibold text-primary">Hotel Dashboard</h2>
          <p className="text-xs text-on-surface-variant font-medium">
            Business Date: <span className="text-primary font-bold">{formatBusinessDate(businessDate)}</span>
          </p>
        </div>
        <div className="hidden xl:flex items-center gap-6 pl-8 border-l border-outline-variant">
          {[
            { label: 'MTD Revenue', value: formatRevenue(mtdRevenue) },
            { label: 'Occupancy %', value: `${occupancyPct.toFixed(1)}%` },
            { label: 'Arrivals', value: String(arrivals) },
            { label: 'Departures', value: String(departures) },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-[10px] uppercase text-on-surface-variant font-bold tracking-wider">{s.label}</p>
              <p className="text-lg font-extrabold text-primary">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
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
    </header>
  );
}
