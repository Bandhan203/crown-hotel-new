import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MdLogin, MdLogout, MdPersonAdd, MdDoNotDisturb, MdRefresh, MdBadge, MdEventAvailable } from 'react-icons/md';
import api from '../../services/api';
import CheckOutModal from '../components/CheckOutModal';
import WalkInModal from '../components/WalkInModal';
import RegistrationModule from '../components/GuestRegistrationModal';
import ReservationModal from '../components/ReservationModal';

interface Booking {
  id: number;
  booking_ref: string;
  guest_name: string;
  guest_email?: string;
  room_type?: number;
  room_type_detail?: { name: string };
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  adults?: number;
  children?: number;
  total_price?: string;
  status?: string;
  booking_source?: string;
  nights?: number;
}

const statusBadge: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  CHECKED_IN: 'bg-green-500/20 text-green-400',
  CHECKED_OUT: 'bg-gray-500/20 text-gray-500',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

function formatStatus(status?: string | null): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ');
}

export default function FrontDesk() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [arrivals, setArrivals] = useState<Booking[]>([]);
  const [departures, setDepartures] = useState<Booking[]>([]);
  const [inHouse, setInHouse] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<'arrivals' | 'departures' | 'inhouse'>(
    initialTab === 'departures' ? 'departures' : initialTab === 'inhouse' ? 'inhouse' : 'arrivals',
  );

  // Modals
  const [checkOutBooking, setCheckOutBooking] = useState<Booking | null>(null);
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [regBookingId, setRegBookingId] = useState<number | null>(null);
  const [regCheckInMode, setRegCheckInMode] = useState(false);
  const [businessDate, setBusinessDate] = useState('');

  const fetchData = async (bizDate?: string) => {
    setLoading(true);
    const dateParam = bizDate || businessDate;
    try {
      const [cfgRes, arrRes, depRes, ihRes] = await Promise.all([
        dateParam ? Promise.resolve({ data: { business_date: dateParam } }) : api.get('/admin/config/'),
        api.get('/admin/reservations/arrivals/', { params: dateParam ? { date: dateParam } : {} }),
        api.get('/admin/reservations/departures/', { params: dateParam ? { date: dateParam } : {} }),
        api.get('/admin/reservations/in-house/'),
      ]);
      const biz = cfgRes.data.business_date || dateParam || '';
      if (biz) setBusinessDate(biz);
      setArrivals(arrRes.data.results ?? arrRes.data);
      setDepartures(depRes.data.results ?? depRes.data);
      setInHouse(ihRes.data.results ?? ihRes.data);
    } catch {
      toast.error('Failed to load front desk data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    const tabParam = searchParams.get('tab');

    if (action === 'reservation') setShowReservation(true);
    if (action === 'walkin') setShowWalkIn(true);
    if (tabParam === 'arrivals' || tabParam === 'departures' || tabParam === 'inhouse') {
      setTab(tabParam);
    }

    if (action || tabParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleNoShow = async (id: number) => {
    if (!window.confirm('Mark this booking as No-Show?')) return;
    try {
      await api.patch(`/admin/reservations/${id}/no-show/`);
      toast.success('Marked as no-show');
      fetchData();
    } catch {
      toast.error('Failed to mark no-show');
    }
  };

  const tabs = [
    { key: 'arrivals' as const, label: 'Arrivals', count: arrivals.length, icon: <MdLogin size={18} /> },
    { key: 'departures' as const, label: 'Departures', count: departures.length, icon: <MdLogout size={18} /> },
    { key: 'inhouse' as const, label: 'In-House', count: inHouse.length, icon: <MdPersonAdd size={18} /> },
  ];

  const currentList = tab === 'arrivals' ? arrivals : tab === 'departures' ? departures : inHouse;

  const isOverdueDeparture = (b: Booking) =>
    tab === 'departures'
    && businessDate
    && b.check_out_date < businessDate
    && b.status === 'CHECKED_IN';

  const renderBookingActions = (b: Booking) => (
    <div className="flex flex-wrap gap-1">
      {(b.status === 'PENDING' || b.status === 'CONFIRMED') && (
        <>
          <button
            onClick={() => { setRegBookingId(b.id); setRegCheckInMode(true); }}
            className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition"
            title="Check In (Registration)"
          >
            <MdLogin size={16} />
          </button>
          <button
            onClick={() => handleNoShow(b.id)}
            className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition"
            title="No Show"
          >
            <MdDoNotDisturb size={16} />
          </button>
        </>
      )}
      {b.status === 'CHECKED_IN' && (
        <button
          onClick={() => setCheckOutBooking(b)}
          className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs hover:bg-orange-500/30 transition"
          title="Check Out"
        >
          <MdLogout size={16} />
        </button>
      )}
      <button
        onClick={() => { setRegBookingId(b.id); setRegCheckInMode(false); }}
        className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30 transition"
        title="Registration Module"
      >
        <MdBadge size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="admin-page-header">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>Front Desk</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage arrivals, departures, and in-house guests
            {businessDate && (
              <span className="ml-2 text-teal-700 font-medium">· Business date: {businessDate}</span>
            )}
          </p>
        </div>
        <div className="admin-action-bar">
          <button onClick={() => void fetchData()} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-white/10 transition text-sm">
            <MdRefresh size={18} /> <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => setShowReservation(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition text-sm">
            <MdEventAvailable size={18} /> <span className="hidden sm:inline">Reservation</span>
          </button>
          <button onClick={() => navigate('/admin/checkout')} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-orange-600 rounded-lg text-white hover:bg-orange-700 transition text-sm font-medium">
            <MdLogout size={18} /> <span className="hidden sm:inline">Check-out</span>
          </button>
          <button onClick={() => setShowWalkIn(true)} className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-container rounded-lg text-white hover:brightness-110 transition text-sm font-semibold shadow-sm">
            <MdPersonAdd size={18} /> <span className="hidden sm:inline">New Registration</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-teal-700 text-white' : 'text-gray-500 hover:text-slate-800 hover:bg-gray-50'
            }`}
          >
            {t.icon} <span className="truncate">{t.label}</span>
            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${
              tab === t.key ? 'bg-white/20' : 'bg-gray-100'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No {tab === 'arrivals' ? 'expected arrivals' : tab === 'departures' ? 'departures' : 'in-house guests'}
          {businessDate ? ` for ${businessDate}` : ''}
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {currentList.map(b => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-teal-700">{b.booking_ref}</p>
                    <p className="font-semibold text-slate-800 truncate">{b.guest_name}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                    isOverdueDeparture(b)
                      ? 'bg-red-500/20 text-red-500'
                      : statusBadge[b.status ?? ''] || 'bg-gray-100 text-gray-500'
                  }`}>
                    {isOverdueDeparture(b) ? 'OVERDUE' : formatStatus(b.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div><span className="text-gray-400">Room:</span> {b.room_number ?? '—'}</div>
                  <div><span className="text-gray-400">Type:</span> {b.room_type_detail?.name ?? '—'}</div>
                  <div><span className="text-gray-400">In:</span> {b.check_in_date}</div>
                  <div><span className="text-gray-400">Out:</span> {b.check_out_date}</div>
                  <div><span className="text-gray-400">Nights:</span> {b.nights ?? '—'}</div>
                </div>
                {renderBookingActions(b)}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50">
                <tr className="text-gray-500 text-left">
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Room Type</th>
                  <th className="px-4 py-3 font-medium">Room</th>
                  <th className="px-4 py-3 font-medium">Check-in</th>
                  <th className="px-4 py-3 font-medium">Check-out</th>
                  <th className="px-4 py-3 font-medium">Nights</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentList.map(b => (
                  <tr key={b.id} className="text-gray-600 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-teal-700">{b.booking_ref}</td>
                    <td className="px-4 py-3">{b.guest_name}</td>
                    <td className="px-4 py-3">{b.room_type_detail?.name ?? '—'}</td>
                    <td className="px-4 py-3">{b.room_number ?? '—'}</td>
                    <td className="px-4 py-3">{b.check_in_date}</td>
                    <td className="px-4 py-3">{b.check_out_date}</td>
                    <td className="px-4 py-3">{b.nights ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isOverdueDeparture(b)
                          ? 'bg-red-500/20 text-red-500'
                          : statusBadge[b.status ?? ''] || 'bg-gray-100 text-gray-500'
                      }`}>
                        {isOverdueDeparture(b) ? 'OVERDUE' : formatStatus(b.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {renderBookingActions(b)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Modals */}
      {checkOutBooking && (
        <CheckOutModal
          booking={checkOutBooking}
          onClose={() => setCheckOutBooking(null)}
          onSuccess={() => { setCheckOutBooking(null); fetchData(); }}
        />
      )}
      {showWalkIn && (
        <WalkInModal
          onClose={() => setShowWalkIn(false)}
          onSuccess={() => { setShowWalkIn(false); fetchData(); }}
        />
      )}
      {showReservation && (
        <ReservationModal
          onClose={() => setShowReservation(false)}
          onSuccess={() => { setShowReservation(false); fetchData(); }}
        />
      )}
      {regBookingId && (
        <RegistrationModule
          mode="advance"
          bookingId={regBookingId}
          checkInMode={regCheckInMode}
          onClose={() => { setRegBookingId(null); setRegCheckInMode(false); }}
          onRefresh={fetchData}
          onSuccess={() => { setRegBookingId(null); setRegCheckInMode(false); fetchData(); }}
        />
      )}
    </div>
  );
}
