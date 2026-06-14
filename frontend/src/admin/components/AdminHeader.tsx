import { MdMenu, MdNotifications } from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

export default function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const { getSetting } = useSiteSettings();
  const accentColor = getSetting('admin_accent_color', '#aa8453');

  return (
    <header className="sticky top-0 z-30 h-11 bg-[#1a1a1a] border-b border-white/10 flex items-center justify-between px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden text-gray-300 hover:text-white p-1.5">
        <MdMenu size={22} />
      </button>

      <div className="hidden lg:block text-sm leading-none">
        <span className="text-gray-400">Welcome back, </span>
        <span className="text-white font-semibold">{user?.full_name}</span>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/5">
          <MdNotifications size={20} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
        </button>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: accentColor }}>
          {user?.full_name?.[0]}
        </div>
      </div>
    </header>
  );
}

