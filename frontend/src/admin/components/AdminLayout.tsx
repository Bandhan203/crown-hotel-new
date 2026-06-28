import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminHeader from './AdminHeader';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Dashboard gets a special zero-padding layout; every other page gets standard padding
  const isDashboard = location.pathname === '/admin' || location.pathname === '/admin/';

  // Keyboard shortcuts: F1-F10 for quick navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/select/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      const shortcuts: Record<string, string> = {
        F1: '/admin',
        F2: '/admin/front-desk?action=walkin',
        F3: '/admin/front-desk?action=reserve',
        F4: '/admin/night-audit',
        F5: '/admin/bookings',
        F6: '/admin/guests',
        F7: '/admin/service-entry',
        F8: '/admin/reports',
        F9: '/admin/inventory',
        F10: '/admin/housekeeping',
      };
      if (shortcuts[e.key]) {
        e.preventDefault();
        navigate(shortcuts[e.key]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-gray-50 text-slate-700 overflow-hidden font-inter">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className={`flex-1 overflow-hidden ${isDashboard ? '' : 'overflow-y-auto overflow-x-hidden p-4 lg:p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
