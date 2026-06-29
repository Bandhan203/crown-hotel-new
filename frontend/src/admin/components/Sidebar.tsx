import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  MdDashboard, MdHotel, MdBookOnline, MdPeople, MdBadge,
  MdArticle, MdSettings, MdExpandMore, MdExpandLess, MdLogout,
  MdNewspaper, MdQuiz, MdStar, MdGroups, MdPhotoLibrary, MdViewCarousel,
  MdTune, MdRestaurant, MdSpa, MdRoomService, MdMessage,
  MdDesktopWindows, MdCalendarMonth, MdDiscount, MdCleaningServices,
  MdNightsStay, MdBarChart, MdPalette, MdReceipt, MdInventory, MdBusiness, MdGridOn,
} from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

const linkBase = 'flex items-center gap-3 px-4 rounded-lg text-sm font-medium transition-colors';
const linkInactive = 'py-2.5 text-gray-600 hover:bg-gray-50';
const linkActive = 'py-3 bg-teal-700 text-white';

interface NavItem {
  to?: string;
  icon: React.ReactNode;
  label: string;
  children?: { to: string; icon: React.ReactNode; label: string }[];
}

const navItems: NavItem[] = [
  { to: '/admin', icon: <MdDashboard size={20} />, label: 'Dashboard' },
  { to: '/admin/front-desk', icon: <MdDesktopWindows size={20} />, label: 'Front Desk' },
  { to: '/admin/checkout', icon: <MdLogout size={20} />, label: 'Check-out' },
  { to: '/admin/reservations/calendar', icon: <MdCalendarMonth size={20} />, label: 'Calendar' },
  { to: '/admin/reservation-control', icon: <MdGridOn size={20} />, label: 'Res. Control' },
  { to: '/admin/rooms', icon: <MdHotel size={20} />, label: 'Rooms' },
  { to: '/admin/bookings', icon: <MdBookOnline size={20} />, label: 'Bookings' },
  { to: '/admin/rate-plans', icon: <MdDiscount size={20} />, label: 'Rate Plans' },
  { to: '/admin/guests', icon: <MdPeople size={20} />, label: 'Guests' },
  { to: '/admin/housekeeping', icon: <MdCleaningServices size={20} />, label: 'Housekeeping' },
  { to: '/admin/night-audit', icon: <MdNightsStay size={20} />, label: 'Night Audit' },
  { to: '/admin/reports', icon: <MdBarChart size={20} />, label: 'Reports' },
  { to: '/admin/service-entry', icon: <MdReceipt size={20} />, label: 'Service Entry' },
  { to: '/admin/inventory', icon: <MdInventory size={20} />, label: 'Inventory' },
  { to: '/admin/corporate', icon: <MdBusiness size={20} />, label: 'Corporate CRM' },
  { to: '/admin/staff', icon: <MdBadge size={20} />, label: 'Staff' },
  { to: '/admin/restaurant', icon: <MdRestaurant size={20} />, label: 'Restaurant' },
  { to: '/admin/spa', icon: <MdSpa size={20} />, label: 'Spa' },
  { to: '/admin/services', icon: <MdRoomService size={20} />, label: 'Services' },
  { to: '/admin/messages', icon: <MdMessage size={20} />, label: 'Messages' },
  {
    icon: <MdArticle size={20} />, label: 'CMS', children: [
      { to: '/admin/cms/pages', icon: <MdArticle size={18} />, label: 'Pages Layout' },
      { to: '/admin/cms/news', icon: <MdNewspaper size={18} />, label: 'News' },
      { to: '/admin/cms/faq', icon: <MdQuiz size={18} />, label: 'FAQ' },
      { to: '/admin/cms/testimonials', icon: <MdStar size={18} />, label: 'Testimonials' },
      { to: '/admin/cms/team', icon: <MdGroups size={18} />, label: 'Team' },
      { to: '/admin/cms/gallery', icon: <MdPhotoLibrary size={18} />, label: 'Gallery' },
      { to: '/admin/cms/hero-slides', icon: <MdViewCarousel size={18} />, label: 'Hero Slides' },
      { to: '/admin/cms/site-settings', icon: <MdTune size={18} />, label: 'Global Settings' },
    ],
  },
  { to: '/admin/branding', icon: <MdPalette size={20} />, label: 'Branding' },
  { to: '/admin/settings', icon: <MdSettings size={20} />, label: 'Settings' },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [cmsOpen, setCmsOpen] = useState(location.pathname.startsWith('/admin/cms'));
  const { getSetting } = useSiteSettings();

  const hotelName = getSetting('site_name', 'Hotel Crown');
  const accentColor = getSetting('admin_accent_color', '#aa8453');
  const adminTagline = getSetting('admin_tagline', 'Hotel Management System');

  return (
    <>
      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}

      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0
        transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Branding */}
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-teal-900 leading-none">
            {hotelName}
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1 font-semibold">{adminTagline}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label}>
                <button
                  onClick={() => setCmsOpen(!cmsOpen)}
                  className={`${linkBase} ${linkInactive} w-full`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {cmsOpen ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
                </button>
                {cmsOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `${linkBase} text-xs ${isActive ? linkActive : linkInactive}`
                        }
                      >
                        {child.icon}
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to!}
                end={item.to === '/admin'}
                onClick={onClose}
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold text-sm">
            <MdLogout size={20} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
