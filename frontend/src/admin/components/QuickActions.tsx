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
  MdAdd,
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
      icon: <MdAdd size={18} />,
      onClick: frontDesk('reservation'),
      className: 'bg-[#784018] text-white',
    },
    {
      label: 'Walk-in',
      icon: <MdPersonAdd size={16} />,
      onClick: frontDesk('walkin'),
      className: 'bg-[#1f56b9] text-white',
    },
    {
      label: 'Quick Check-in',
      icon: <MdLogin size={16} />,
      onClick: go('/admin/front-desk?tab=arrivals'),
      className: 'bg-[#0f8a48] text-white',
    },
    {
      label: 'Quick Check-out',
      icon: <MdLogout size={16} />,
      onClick: go('/admin/front-desk?tab=departures'),
      className: 'bg-[#bc2323] text-white',
    },
  ];

  /* ── Group 2: Operational & Views ── */
  const secondaryActions: ActionBtn[] = [
    {
      label: 'Housekeeping',
      icon: <MdCleaningServices size={16} />,
      onClick: go('/admin/housekeeping'),
      className: 'bg-[#e4e9f0] text-gray-700 hover:bg-gray-200',
    },
    {
      label: 'Maintenance',
      icon: <FaWrench size={14} />,
      onClick: go('/admin/rooms'),
      className: 'bg-[#e4e9f0] text-gray-700 hover:bg-gray-200',
    },
    {
      label: 'Night Audit',
      icon: <MdNightsStay size={16} />,
      onClick: go('/admin/night-audit'),
      className: 'bg-[#e4e9f0] text-gray-700 hover:bg-gray-200',
    },
    {
      label: 'Calendar',
      icon: <MdCalendarMonth size={16} />,
      onClick: go('/admin/reservations/calendar'),
      className: 'bg-[#e4e9f0] text-gray-700 hover:bg-gray-200',
    },
    {
      label: 'Billing',
      icon: <MdReceipt size={16} />,
      onClick: go('/admin/service-entry'),
      className: 'bg-[#e4e9f0] text-gray-700 hover:bg-gray-200',
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {coreFrontDesk.map(btn => (
        <button
          key={btn.label}
          onClick={btn.onClick}
          className={`px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:opacity-90 ${btn.className}`}
        >
          {btn.icon} <span>{btn.label}</span>
        </button>
      ))}

      <div className="flex items-center gap-2 ml-auto flex-wrap mt-2 sm:mt-0">
        {secondaryActions.map(btn => (
          <button
            key={btn.label}
            onClick={btn.onClick}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${btn.className}`}
          >
            {btn.icon} <span>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
