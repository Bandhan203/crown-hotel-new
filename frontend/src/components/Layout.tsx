import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { captureBookingAttribution } from '../utils/bookingChannel';

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    captureBookingAttribution();
  }, [location.search]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
