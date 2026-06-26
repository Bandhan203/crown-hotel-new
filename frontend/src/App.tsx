import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Rooms from './pages/Rooms';
import RoomDetails from './pages/RoomDetails';
import Restaurant from './pages/Restaurant';
import Spa from './pages/Spa';
import Services from './pages/Services';
import Facilities from './pages/Facilities';
import Gallery from './pages/Gallery';
import Contact from './pages/Contact';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import FAQ from './pages/FAQ';
import Login from './pages/Login';
import Registration from './pages/Registration';
import Team from './pages/Team';
import MyBookings from './pages/MyBookings';
import BookingConfirmation from './pages/BookingConfirmation';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import PaymentCancel from './pages/PaymentCancel';

// Admin
import ProtectedRoute from './admin/components/ProtectedRoute';
import AdminLayout from './admin/components/AdminLayout';
import AdminLogin from './admin/pages/AdminLogin';
import Dashboard from './admin/pages/Dashboard';
import RoomManagement from './admin/pages/RoomManagement';
import BookingManagement from './admin/pages/BookingManagement';
import GuestManagement from './admin/pages/GuestManagement';
import StaffManagement from './admin/pages/StaffManagement';
import RestaurantManagement from './admin/pages/RestaurantManagement';
import SpaManagement from './admin/pages/SpaManagement';
import ServicesManagement from './admin/pages/ServicesManagement';
import MessagesManagement from './admin/pages/MessagesManagement';
import CMSNews from './admin/pages/CMSNews';
import CMSFAQ from './admin/pages/CMSFAQ';
import CMSTestimonials from './admin/pages/CMSTestimonials';
import CMSTeam from './admin/pages/CMSTeam';
import CMSGallery from './admin/pages/CMSGallery';
import CMSHeroSlides from './admin/pages/CMSHeroSlides';
import CMSSiteSettings from './admin/pages/CMSSiteSettings';
import CMSPages from './admin/pages/CMSPages';
import Branding from './admin/pages/Branding';
import Settings from './admin/pages/Settings';
import FrontDesk from './admin/pages/FrontDesk';
import ReservationCalendar from './admin/pages/ReservationCalendar';
import RatePlanManagement from './admin/pages/RatePlanManagement';
import HousekeepingBoard from './admin/pages/HousekeepingBoard';
import NightAudit from './admin/pages/NightAudit';
import Reports from './admin/pages/Reports';

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
      }} />
      <Routes>
        {/* Public Routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/room-details/:id?" element={<RoomDetails />} />
          <Route path="/restaurant" element={<Restaurant />} />
          <Route path="/spa" element={<Spa />} />
          <Route path="/services" element={<Services />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Registration />} />
          <Route path="/team" element={<Team />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/booking-confirmation" element={<BookingConfirmation />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
        </Route>

        {/* Admin Login (no layout) */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/front-desk" element={<FrontDesk />} />
            <Route path="/admin/reservations/calendar" element={<ReservationCalendar />} />
            <Route path="/admin/rate-plans" element={<RatePlanManagement />} />
            <Route path="/admin/housekeeping" element={<HousekeepingBoard />} />
            <Route path="/admin/night-audit" element={<NightAudit />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/rooms" element={<RoomManagement />} />
            <Route path="/admin/bookings" element={<BookingManagement />} />
            <Route path="/admin/guests" element={<GuestManagement />} />
            <Route path="/admin/staff" element={<StaffManagement />} />
            <Route path="/admin/restaurant" element={<RestaurantManagement />} />
            <Route path="/admin/spa" element={<SpaManagement />} />
            <Route path="/admin/services" element={<ServicesManagement />} />
            <Route path="/admin/messages" element={<MessagesManagement />} />
            <Route path="/admin/cms/news" element={<CMSNews />} />
            <Route path="/admin/cms/faq" element={<CMSFAQ />} />
            <Route path="/admin/cms/testimonials" element={<CMSTestimonials />} />
            <Route path="/admin/cms/team" element={<CMSTeam />} />
            <Route path="/admin/cms/gallery" element={<CMSGallery />} />
            <Route path="/admin/cms/hero-slides" element={<CMSHeroSlides />} />
            <Route path="/admin/cms/site-settings" element={<CMSSiteSettings />} />
            <Route path="/admin/cms/pages" element={<CMSPages />} />
            <Route path="/admin/branding" element={<Branding />} />
            <Route path="/admin/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
