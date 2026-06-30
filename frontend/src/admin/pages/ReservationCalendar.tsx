import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { MdChevronLeft, MdChevronRight, MdRefresh } from 'react-icons/md';
import api from '../../services/api';
import BookingViewModal from '../components/BookingViewModal';

interface CalendarRoom {
  id: number;
  room_number: string;
  room_type: string;
  room_type_id: number;
  floor: number;
  status: string;
  housekeeping_status: string;
}

interface CalendarBooking {
  id: number;
  booking_ref: string;
  guest_name: string;
  room: number | null;
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  status: string;
}

const statusColors: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  CHECKED_IN: '#22c55e',
  CHECKED_OUT: '#6b7280',
  CANCELLED: '#ef4444',
};

function getDatesArray(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString('en', { day: 'numeric', weekday: 'short' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ReservationCalendar() {
  const [rooms, setRooms] = useState<CalendarRoom[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewDays, setViewDays] = useState(14);
  const [viewBookingId, setViewBookingId] = useState<number | null>(null);

  const endDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + viewDays - 1);
    return d;
  }, [startDate, viewDays]);

  const dates = useMemo(() => getDatesArray(startDate, endDate), [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reservations/calendar/', {
        params: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
      });
      setRooms(res.data.rooms || []);
      setBookings(res.data.bookings || []);
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, viewDays]);

  const navigate = (direction: number) => {
    setStartDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direction * viewDays);
      return d;
    });
  };

  const goToToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  // For each room, find bookings that overlap this date range
  const getBookingsForRoom = (roomId: number) => {
    return bookings.filter(b => b.room === roomId);
  };

  const unassignedBookings = useMemo(
    () => bookings.filter(b => !b.room),
    [bookings],
  );

  const renderBookingBar = (booking: CalendarBooking, rowKey: string) => {
    const bar = getBookingBar(booking);
    if (bar.span <= 0) return null;
    const color = statusColors[booking.status] || '#6b7280';
    return (
      <div
        key={`${rowKey}-${booking.id}`}
        className="absolute top-1 h-7 rounded-md flex items-center px-2 text-slate-800 text-[10px] font-medium overflow-hidden cursor-pointer hover:brightness-110 transition-all"
        style={{
          left: `${bar.startCol * 96}px`,
          width: `${bar.span * 96 - 4}px`,
          backgroundColor: color,
        }}
        title={`${booking.booking_ref}: ${booking.guest_name} (${booking.status}) ${booking.check_in_date} → ${booking.check_out_date}`}
        onClick={() => setViewBookingId(booking.id)}
      >
        <span className="truncate">{booking.guest_name} ({bar.span}N)</span>
      </div>
    );
  };

  // Calculate the column span and offset for a booking bar
  const getBookingBar = (booking: CalendarBooking) => {
    const bStart = new Date(booking.check_in_date);
    const bEnd = new Date(booking.check_out_date);

    const barStart = bStart < startDate ? startDate : bStart;
    const barEnd = bEnd > endDate ? new Date(endDate.getTime() + 86400000) : bEnd;

    const startCol = Math.floor((barStart.getTime() - startDate.getTime()) / 86400000);
    const endCol = Math.floor((barEnd.getTime() - startDate.getTime()) / 86400000);
    const span = endCol - startCol;

    return { startCol, span };
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: '"Gilda Display", serif' }}>Reservation Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Room availability overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewDays}
            onChange={e => setViewDays(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:outline-none"
          >
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
          <button onClick={goToToday} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm hover:bg-white/10 transition">
            Today
          </button>
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-white/10 transition">
            <MdChevronLeft size={20} />
          </button>
          <button onClick={() => navigate(1)} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-white/10 transition">
            <MdChevronRight size={20} />
          </button>
          <button onClick={fetchData} className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-white/10 transition">
            <MdRefresh size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(statusColors).map(([s, c]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
            <span className="text-gray-500">{s.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-600" style={{ backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(255,255,255,0.1) 2px,rgba(255,255,255,0.1) 4px)' }} />
          <span className="text-gray-500">Maintenance</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-auto">
          <div className="min-w-max">
            {/* Date header */}
            <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
              <div className="w-40 min-w-40 flex-shrink-0 px-3 py-2 text-xs text-gray-500 font-medium border-r border-gray-200">
                Room
              </div>
              {dates.map((d, i) => (
                <div
                  key={i}
                  className={`w-24 min-w-24 flex-shrink-0 px-2 py-2 text-center text-xs border-r border-white/5 ${
                    isSameDay(d, today) ? 'bg-teal-50 text-teal-700 font-bold' : 'text-gray-500'
                  } ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-white/3' : ''}`}
                >
                  {formatShortDate(d)}
                </div>
              ))}
            </div>

            {/* Unassigned reservations */}
            {unassignedBookings.length > 0 && (
              <div className="flex border-b border-amber-200 bg-amber-50/40 relative" style={{ minHeight: '40px' }}>
                <div className="w-40 min-w-40 flex-shrink-0 px-3 py-2 border-r border-gray-200 flex items-center gap-2">
                  <span className="text-amber-800 text-xs font-semibold">Unassigned</span>
                  <span className="text-amber-600 text-[10px]">({unassignedBookings.length})</span>
                </div>
                <div className="flex flex-1 relative">
                  {dates.map((d, i) => (
                    <div
                      key={i}
                      className={`w-24 min-w-24 flex-shrink-0 border-r border-white/5 ${
                        isSameDay(d, today) ? 'bg-teal-50/50' : ''
                      }`}
                    />
                  ))}
                  {unassignedBookings.map(b => renderBookingBar(b, 'unassigned'))}
                </div>
              </div>
            )}

            {/* Rows */}
            {rooms.map(room => {
              const roomBookings = getBookingsForRoom(room.id);
              return (
                <div key={room.id} className="flex border-b border-white/5 relative" style={{ minHeight: '40px' }}>
                  {/* Room label */}
                  <div className="w-40 min-w-40 flex-shrink-0 px-3 py-2 border-r border-gray-200 flex items-center gap-2">
                    <span className="text-slate-800 text-xs font-medium">{room.room_number}</span>
                    <span className="text-gray-500 text-xs truncate">{room.room_type}</span>
                    {room.status === 'MAINTENANCE' && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px]">OOS</span>
                    )}
                  </div>

                  {/* Grid cells */}
                  <div className="flex flex-1 relative">
                    {dates.map((d, i) => (
                      <div
                        key={i}
                        className={`w-24 min-w-24 flex-shrink-0 border-r border-white/5 ${
                          room.status === 'MAINTENANCE' ? 'bg-gray-800/50' : ''
                        } ${isSameDay(d, today) ? 'bg-teal-50/50' : ''}`}
                      />
                    ))}

                    {/* Booking bars */}
                    {roomBookings.map(booking => renderBookingBar(booking, `room-${room.id}`))}
                  </div>
                </div>
              );
            })}

            {rooms.length === 0 && (
              <div className="text-center py-16 text-gray-500 text-sm">No rooms found</div>
            )}
          </div>
        </div>
      )}

      {viewBookingId && (
        <BookingViewModal
          bookingId={viewBookingId}
          onClose={() => setViewBookingId(null)}
          onRefresh={fetchData}
          onDeleted={() => { setViewBookingId(null); fetchData(); }}
          onOpenFolio={() => {}}
          onOpenRegistration={() => {}}
        />
      )}
    </div>
  );
}
