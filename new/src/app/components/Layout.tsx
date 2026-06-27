import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router';
import {
  LayoutDashboard, CalendarDays, Users, Receipt, ClipboardList,
  Moon, FileText, Package, Settings, LogOut, ChevronLeft, ChevronRight,
  Hotel, Clock, Sparkles, Globe, Sun, Building2, DollarSign
} from 'lucide-react';
import { useHotel } from '../contexts/HotelContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLang } from '../contexts/LanguageContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { config } = useHotel();
  const { theme, toggleTheme, colors } = useTheme();
  const { lang, toggleLang, t } = useLang();
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); navigate('/'); }
      else if (e.key === 'F2') { e.preventDefault(); navigate('/reservations'); }
      else if (e.key === 'F3') { e.preventDefault(); navigate('/guests'); }
      else if (e.key === 'F4') { e.preventDefault(); navigate('/checkin'); }
      else if (e.key === 'F5') { e.preventDefault(); navigate('/service-entry'); }
      else if (e.key === 'F6') { e.preventDefault(); navigate('/night-audit'); }
      else if (e.key === 'F7') { e.preventDefault(); navigate('/reports'); }
      else if (e.key === 'F8') { e.preventDefault(); navigate('/inventory'); }
      else if (e.key === 'F9') { e.preventDefault(); navigate('/housekeeping'); }
      else if (e.key === 'F10') { e.preventDefault(); navigate('/corporate'); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigate]);

  const navItems = [
    { path: '/', label: t('dashboard'), icon: LayoutDashboard, shortcut: 'F1' },
    { path: '/reservations', label: t('reservations'), icon: CalendarDays, shortcut: 'F2' },
    { path: '/guests', label: t('guests'), icon: Users, shortcut: 'F3' },
    { path: '/checkin', label: t('checkin'), icon: Hotel, shortcut: 'F4' },
    { path: '/service-entry', label: t('serviceEntry'), icon: Receipt, shortcut: 'F5' },
    { path: '/night-audit', label: t('nightAudit'), icon: Moon, shortcut: 'F6' },
    { path: '/reports', label: t('reports'), icon: FileText, shortcut: 'F7' },
    { path: '/inventory', label: t('inventory'), icon: Package, shortcut: 'F8' },
    { path: '/housekeeping', label: t('housekeeping'), icon: Sparkles, shortcut: 'F9' },
    { path: '/corporate', label: t('corporateCRM'), icon: Building2, shortcut: 'F10' },
    { path: '/commissions', label: t('commissions'), icon: DollarSign, shortcut: '' },
    { path: '/settings', label: t('settings'), icon: Settings, shortcut: '' },
  ];

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: colors.bg,
      color: colors.text,
      fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <div style={{
        width: collapsed ? 60 : 220,
        background: colors.sidebar,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        borderRight: `1px solid ${theme === 'dark' ? '#2d3f6a' : '#1e3a5f33'}`,
        overflow: 'hidden',
        boxShadow: theme === 'light' ? '2px 0 12px rgba(0,0,0,0.15)' : 'none',
      }}>
        {/* Logo */}
        <div style={{ padding: '14px 12px', borderBottom: `1px solid ${theme === 'dark' ? '#2d3f6a' : '#ffffff22'}`, display: 'flex', alignItems: 'center', gap: 10, minHeight: 60 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}>N</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>{config.hotelName}</div>
              <div style={{ fontSize: 9, color: '#93c5fd', letterSpacing: 1, textTransform: 'uppercase' }}>ERP v2.0</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: collapsed ? '9px 0' : '8px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                margin: '1px 5px',
                borderRadius: 7,
                textDecoration: 'none',
                background: isActive ? 'rgba(59,130,246,0.25)' : 'transparent',
                color: isActive ? '#93c5fd' : '#94a3b8',
                transition: 'all 0.13s',
                fontSize: 12,
                borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
              })}
            >
              <item.icon size={16} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                  {item.shortcut && (
                    <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3, color: '#7dd3fc', fontFamily: 'monospace' }}>{item.shortcut}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom controls */}
        <div style={{ borderTop: `1px solid ${theme === 'dark' ? '#2d3f6a' : '#ffffff22'}`, padding: '8px 6px', display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', padding: '6px 8px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={toggleLang} title={`Switch to ${lang === 'bn' ? 'English' : 'বাংলা'}`}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', padding: '6px 8px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, transition: 'all 0.15s' }}>
            <Globe size={12} />{!collapsed && (lang === 'bn' ? 'EN' : 'বাং')}
          </button>
          <button onClick={() => setCollapsed(c => !c)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#64748b', padding: '6px 8px', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header */}
        <header style={{
          height: 50,
          background: colors.header,
          borderBottom: `1px solid ${theme === 'dark' ? '#2d3f6a' : '#1e3a5f33'}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 12,
          flexShrink: 0,
          boxShadow: theme === 'light' ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
        }}>
          <div style={{ flex: 1 }} />
          {/* System Date pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(251,191,36,0.3)' }}>
            <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>{t('systemDate')}</span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{config.systemDate}</span>
          </div>
          {/* Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
            <Clock size={12} />
            <span style={{ fontFamily: 'monospace' }}>{time.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
          {/* User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: `1px solid ${theme === 'dark' ? '#2d3f6a' : '#ffffff22'}`, paddingLeft: 14 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
              {config.currentUser.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 12 }}>{config.currentUser}</div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', color: '#64748b', letterSpacing: 1 }}>{config.currentRole}</div>
              </div>
            )}
            <LogOut size={13} style={{ cursor: 'pointer', color: '#475569', marginLeft: 4 }} />
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto', background: colors.bg }}>
          {children}
        </main>
      </div>
    </div>
  );
}
