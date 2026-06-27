import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MdEventAvailable,
  MdPersonAdd,
  MdLogin,
  MdLogout,
  MdCalendarMonth,
  MdCleaningServices,
  MdNightsStay,
  MdReceipt,
  MdBarChart,
} from 'react-icons/md';
import { FaWrench } from 'react-icons/fa';

type ActionBtn = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className: string;
};

export default function QuickActions() {
  const navigate = useNavigate();

  const go = (path: string) => () => navigate(path);
  const frontDesk = (action?: string) => () => {
    navigate(action ? `/admin/front-desk?action=${action}` : '/admin/front-desk');
  };

  /* ── Group 1: Core Front Desk ── */
  const coreFrontDesk: ActionBtn[] = [
    {
      label: 'New Reservation',
      icon: <MdEventAvailable size={14} />,
      onClick: frontDesk('reservation'),
      className: 'bg-[#aa8453] hover:bg-[#c49b63] text-white border-[#aa8453]/40',
    },
    {
      label: 'Walk-in',
      icon: <MdPersonAdd size={14} />,
      onClick: frontDesk('walkin'),
      className: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600/40',
    },
    {
      label: 'Quick Check-in',
      icon: <MdLogin size={14} />,
      onClick: go('/admin/front-desk?tab=arrivals'),
      className: 'bg-emerald-600/80 hover:bg-emerald-600 text-white border-emerald-600/40',
    },
    {
      label: 'Quick Check-out',
      icon: <MdLogout size={14} />,
      onClick: go('/admin/front-desk?tab=departures'),
      className: 'bg-red-600/70 hover:bg-red-600 text-white border-red-600/40',
    },
  ];

  /* ── Group 2: Operational & Housekeeping ── */
  const operational: ActionBtn[] = [
    {
      label: 'Housekeeping',
      icon: <MdCleaningServices size={14} />,
      onClick: go('/admin/housekeeping'),
      className: 'bg-[#1a1a1e] hover:bg-[#222226] text-gray-300 border-gray-700/60',
    },
    {
      label: 'Maintenance',
      icon: <FaWrench size={12} />,
      onClick: go('/admin/rooms'),
      className: 'bg-[#1a1a1e] hover:bg-[#222226] text-gray-300 border-gray-700/60',
    },
    {
      label: 'Night Audit',
      icon: <MdNightsStay size={14} />,
      onClick: go('/admin/night-audit'),
      className: 'bg-[#1a1a1e] hover:bg-[#222226] text-gray-300 border-gray-700/60',
    },
  ];

  /* ── Group 3: Quick Views & Logs ── */
  const quickViews: ActionBtn[] = [
    {
      label: 'Calendar',
      icon: <MdCalendarMonth size={14} />,
      onClick: go('/admin/reservations/calendar'),
      className: 'bg-transparent hover:bg-white/[0.04] text-gray-500 hover:text-gray-300 border-white/[0.06]',
    },
    {
      label: 'Billing',
      icon: <MdReceipt size={14} />,
      onClick: go('/admin/service-entry'),
      className: 'bg-transparent hover:bg-white/[0.04] text-gray-500 hover:text-gray-300 border-white/[0.06]',
    },
    {
      label: 'Reports',
      icon: <MdBarChart size={14} />,
      onClick: go('/admin/reports'),
      className: 'bg-transparent hover:bg-white/[0.04] text-gray-500 hover:text-gray-300 border-white/[0.06]',
    },
  ];

  const renderGroup = (items: ActionBtn[]) => (
    <div className="flex flex-wrap gap-1.5 items-center">
      {items.map(btn => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.onClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium transition-all duration-150 shrink-0 ${btn.className}`}
        >
          {btn.icon}
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-wrap gap-4 items-center justify-between">
      {/* Core actions always prominent */}
      <div className="flex flex-wrap gap-3 items-center">
        {renderGroup(coreFrontDesk)}
        {/* Visual separator */}
        <div className="hidden sm:block w-px h-5 bg-white/[0.06]" />
        {renderGroup(operational)}
      </div>
      {/* Quick views pushed to right on wide screens, wraps underneath on narrow */}
      {renderGroup(quickViews)}
    </div>
  );
}
