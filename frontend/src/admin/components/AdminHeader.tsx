import { useEffect, useState } from 'react';
import { MdMenu, MdNotifications, MdEvent, MdSearch, MdHelpOutline, MdSettings } from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import api from '../../services/api';

export default function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const { getSetting } = useSiteSettings();
  const [businessDate, setBusinessDate] = useState<string>('');

  useEffect(() => {
    api.get('/admin/config/')
      .then(res => setBusinessDate(res.data.business_date))
      .catch(() => {});
  }, []);

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 flex-shrink-0 gap-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-teal-600 shrink-0">
          <MdMenu size={22} />
        </button>
        <span className="text-gray-500 text-sm hidden sm:inline">Welcome back,</span>
        <span className="font-bold text-gray-800 text-sm truncate">{user?.full_name || 'Admin User'}</span>
      </div>

      {/* Search Bar */}
      <div className="hidden lg:block max-w-xl w-full mx-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MdSearch className="h-5 w-5 text-gray-500" />
          </span>
          <input 
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full bg-gray-50 focus:bg-white focus:ring-teal-500 focus:border-teal-500 text-sm outline-none transition-colors" 
            placeholder="Search bookings, rooms, guests..." 
            type="text"
          />
        </div>
      </div>

      {/* Right Side Icons & Profile */}
      <div className="flex items-center gap-2 sm:gap-6 shrink-0">
        <div className="flex lg:hidden items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 max-w-[7rem] sm:max-w-none">
          <MdEvent size={14} className="text-teal-600 shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold text-gray-700 font-mono truncate">{businessDate || '...'}</span>
        </div>
        
        {/* Business Date — desktop */}
        <div className="hidden lg:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          <MdEvent size={16} className="text-teal-600" />
          <span className="text-[11px] text-gray-500 uppercase tracking-wider">Business Date:</span>
          <span className="text-sm font-bold text-gray-700 font-mono">{businessDate || '...'}</span>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-gray-500 border-r border-gray-200 pr-4">
          <button className="hover:text-teal-600 transition-colors relative">
            <MdNotifications size={22} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
          </button>
          <button className="hover:text-teal-600 transition-colors">
            <MdHelpOutline size={22} />
          </button>
          <button className="hover:text-teal-600 transition-colors">
            <MdSettings size={22} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-800 leading-none">{user?.full_name || 'Admin User'}</p>
            <p className="text-[11px] text-gray-500 mt-1 uppercase tracking-tight">{getSetting('admin_tagline', 'General Manager')}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg bg-teal-800 border border-teal-700 shadow-sm">
            {user?.full_name?.[0] || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}

