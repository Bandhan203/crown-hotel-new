import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiMenuAlt3, HiX } from 'react-icons/hi';
import { FiPhone } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
  {
    name: 'Rooms',
    path: '/rooms',
    submenu: [
      { name: 'Rooms & Suites', path: '/rooms' },
      { name: 'Room Details', path: '/room-details' },
    ],
  },
  {
    name: 'Facilities',
    path: '/facilities',
    submenu: [
      { name: 'Restaurant', path: '/restaurant' },
      { name: 'Spa & Wellness', path: '/spa' },
      { name: 'Services', path: '/services' },
      { name: 'Facilities', path: '/facilities' },
    ],
  },
  { name: 'Gallery', path: '/gallery' },
  { name: 'News', path: '/news' },
  { name: 'Contact', path: '/contact' },
  { name: 'FAQ', path: '/faq' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const location = useLocation();
  const prevPathname = useRef(location.pathname);
  const { user, logout } = useAuth();
  const { getSetting } = useSiteSettings();

  const siteName = getSetting('site_name', 'Hotel Crown');
  const contactPhone = getSetting('contact_phone', '01334 945 375');
  const contactPhoneHref = getSetting('contact_phone_href', '01334945375');
  const primaryCtaLabel = getSetting('primary_cta_label', 'Book Your Room');
  const primaryCtaLink = getSetting('primary_cta_link', '/rooms');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (prevPathname.current !== location.pathname) {
      setIsMobileOpen(false);
      setOpenSubmenu(null);
      prevPathname.current = location.pathname;
    }
  }, [location.pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white shadow-md py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span
            className={`font-(--font-heading) text-xl sm:text-[26px] font-bold tracking-[2px] sm:tracking-[3px] capitalize transition-colors ${
              isScrolled ? 'text-dark' : 'text-slate-800'
            }`}
          >
            {siteName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <div
              key={link.name}
              className="relative group"
              onMouseEnter={() => link.submenu && setOpenSubmenu(link.name)}
              onMouseLeave={() => setOpenSubmenu(null)}
            >
              <Link
                to={link.path}
                className={`px-4 py-2 text-[14px] tracking-wide capitalize font-body font-semibold transition-colors ${
                  isScrolled
                    ? location.pathname === link.path
                      ? 'text-primary'
                      : 'text-dark hover:text-primary'
                    : location.pathname === link.path
                    ? 'text-primary'
                    : 'text-slate-800 hover:text-primary'
                }`}
              >
                {link.name}
              </Link>
              {/* Dropdown */}
              {link.submenu && openSubmenu === link.name && (
                <div className="absolute top-full left-0 bg-white shadow-lg min-w-50 py-2 rounded-sm">
                  {link.submenu.map((sub) => (
                    <Link
                      key={sub.name}
                      to={sub.path}
                      className="block px-5 py-2 text-sm text-dark hover:text-primary hover:bg-light transition-colors"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden lg:flex items-center gap-4">
          <a
            href={`tel:${contactPhoneHref}`}
            className={`flex items-center gap-2 text-sm transition-colors ${
              isScrolled ? 'text-dark' : 'text-slate-800'
            }`}
          >
            <FiPhone className="text-primary" />
            {contactPhone}
          </a>
          {user ? (
            <>
              <Link to="/my-bookings"
                className={`text-[14px] tracking-wide capitalize font-body font-semibold transition-colors ${
                  isScrolled ? 'text-dark hover:text-primary' : 'text-slate-800 hover:text-primary'
                }`}>
                My Bookings
              </Link>
              <button onClick={logout}
                className={`text-[14px] tracking-wide capitalize font-body font-semibold transition-colors ${
                  isScrolled ? 'text-dark hover:text-primary' : 'text-slate-800/70 hover:text-slate-800'
                }`}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-xs py-2! px-5!">
              LOGIN
            </Link>
          )}
          <Link to={primaryCtaLink} className="btn-primary text-xs py-2! px-5!">
            {primaryCtaLabel}
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-2xl"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? (
            <HiX className={isScrolled ? 'text-dark' : 'text-slate-800'} />
          ) : (
            <HiMenuAlt3 className={isScrolled ? 'text-dark' : 'text-slate-800'} />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <div className="lg:hidden bg-white shadow-lg absolute top-full left-0 w-full border-t">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <div key={link.name}>
                <Link
                  to={link.path}
                  className={`block py-2 px-3 text-sm font-body font-medium capitalize tracking-wide ${
                    location.pathname === link.path
                      ? 'text-primary'
                      : 'text-dark hover:text-primary'
                  }`}
                >
                  {link.name}
                </Link>
                {link.submenu && (
                  <div className="pl-6">
                    {link.submenu.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.path}
                        className="block py-1 text-sm text-body hover:text-primary"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link to={primaryCtaLink} className="btn-primary text-center mt-3 text-xs">
              {primaryCtaLabel}
            </Link>
            {user ? (
              <>
                <Link to="/my-bookings" className="block py-2 px-3 text-sm font-body font-medium capitalize tracking-wide text-dark hover:text-primary">
                  My Bookings
                </Link>
                <button onClick={logout} className="text-left block py-2 px-3 text-sm font-body font-medium capitalize tracking-wide text-body hover:text-primary">
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="block py-2 px-3 text-sm font-body font-medium capitalize tracking-wide text-dark hover:text-primary">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
