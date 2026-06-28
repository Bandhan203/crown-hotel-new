import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHero from '../components/PageHero';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Booking {
  id: number;
  booking_ref: string;
  room_type_name: string;
  room_number: string | null;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  total_price: string;
  status: string;
  payment_status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  CONFIRMED: 'bg-blue-100 text-blue-700 border-blue-200',
  CHECKED_IN: 'bg-green-100 text-green-700 border-green-200',
  CHECKED_OUT: 'bg-gray-100 text-gray-600 border-gray-200',
  CANCELLED: 'bg-red-100 text-red-600 border-red-200',
};

const paymentColors: Record<string, string> = {
  UNPAID: 'bg-red-100 text-red-600 border-red-200',
  PAID: 'bg-green-100 text-green-700 border-green-200',
  PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  REFUNDED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login?next=/my-bookings'); return; }
    api.get('/bookings/my/')
      .then(res => setBookings(res.data.results ?? res.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, [user, authLoading, navigate]);

  const cancelBooking = async (id: number) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/bookings/my/${id}/cancel/`);
      toast.success('Booking cancelled');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b));
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to cancel booking');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHero
        title="My Bookings"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'My Bookings' }]}
      />

      <section className="py-20 bg-[#f9f6f1] min-h-[60vh]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-[var(--font-heading)] text-[var(--color-dark)]">
              Your Reservations
            </h2>
            <Link to="/rooms"
              className="btn-primary text-xs !py-2 !px-5">
              Book a Room
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <p className="text-4xl mb-4">🏨</p>
              <h3 className="text-xl font-[var(--font-heading)] text-[var(--color-dark)] mb-2">No bookings yet</h3>
              <p className="text-[var(--color-body)] mb-6">You haven't made any reservations. Explore our rooms!</p>
              <Link to="/rooms" className="btn-primary text-sm">Explore Rooms</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => {
                const nights = Math.round(
                  (new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000
                );
                const canCancel = ['PENDING', 'CONFIRMED'].includes(b.status);
                return (
                  <div key={b.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm font-bold text-[var(--color-primary)]">
                            #{b.booking_ref}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[b.status] || ''}`}>
                            {b.status.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${paymentColors[b.payment_status] || ''}`}>
                            {b.payment_status}
                          </span>
                        </div>
                        <h3 className="text-lg font-[var(--font-heading)] text-[var(--color-dark)]">
                          {b.room_type_name}
                        </h3>
                        {b.room_number && (
                          <p className="text-xs text-[var(--color-body)] mt-0.5">Room {b.room_number}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-[var(--color-dark)]">BDT {b.total_price}</p>
                        <p className="text-xs text-[var(--color-body)]">{nights} night{nights > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-6 text-sm text-[var(--color-body)]">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Check-in</p>
                        <p className="font-medium text-[var(--color-dark)]">
                          {new Date(b.check_in_date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Check-out</p>
                        <p className="font-medium text-[var(--color-dark)]">
                          {new Date(b.check_out_date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-0.5">Guests</p>
                        <p className="font-medium text-[var(--color-dark)]">
                          {b.adults} adult{b.adults > 1 ? 's' : ''}{b.children > 0 ? `, ${b.children} child${b.children > 1 ? 'ren' : ''}` : ''}
                        </p>
                      </div>
                    </div>

                    {canCancel && (
                      <div className="mt-4 flex justify-end gap-2">
                        {b.payment_status === 'UNPAID' && b.status !== 'CANCELLED' && (
                          <button onClick={async () => {
                            try {
                              const res = await api.post('/payments/initiate/', { booking_id: b.id });
                              window.location.href = res.data.payment_url;
                            } catch {
                              toast.error('Failed to initiate payment');
                            }
                          }}
                            className="px-4 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors">
                            Pay Now
                          </button>
                        )}
                        <button onClick={() => cancelBooking(b.id)}
                          className="px-4 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          Cancel Booking
                        </button>
                      </div>
                    )}
                    {(b.status === 'CHECKED_OUT' || b.status === 'CANCELLED') && (
                      <div className="mt-4 flex justify-end">
                        <button onClick={() => {
                          api.get(`/bookings/my/${b.id}/invoice/pdf/`, { responseType: 'blob' })
                            .then(res => {
                              const url = window.URL.createObjectURL(new Blob([res.data]));
                              const a = document.createElement('a'); a.href = url;
                              a.download = `invoice_${b.booking_ref}.pdf`; a.click();
                              window.URL.revokeObjectURL(url);
                            }).catch(() => toast.error('Invoice not available yet'));
                        }}
                          className="px-4 py-1.5 text-sm border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download Invoice
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
