import { Link, useLocation } from 'react-router-dom';
import { MdCheckCircle } from 'react-icons/md';

export default function BookingConfirmation() {
  const { state } = useLocation();
  const booking = state?.booking;

  return (
    <section className="min-h-screen bg-[#f9f6f1] flex items-center justify-center px-4 py-20">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <MdCheckCircle className="text-green-500" size={72} />
        </div>
        <h1 className="text-3xl font-[var(--font-heading)] text-[var(--color-dark)] mb-2">
          Booking Confirmed!
        </h1>
        <p className="text-[var(--color-body)] mb-8">
          Your reservation has been placed. We look forward to welcoming you.
        </p>

        {booking && (
          <div className="bg-[var(--color-light)] rounded-xl p-6 text-left space-y-3 mb-8 text-sm">
            <Detail label="Booking Ref" value={booking.booking_ref} mono />
            <Detail label="Room Type" value={booking.room_type_detail?.name || '—'} />
            {booking.room_number && <Detail label="Room" value={`Room ${booking.room_number}`} />}
            <Detail label="Check-in" value={formatDate(booking.check_in_date)} />
            <Detail label="Check-out" value={formatDate(booking.check_out_date)} />
            <Detail
              label="Guests"
              value={`${booking.adults} adult${booking.adults > 1 ? 's' : ''}${booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}`}
            />
            <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
              <span className="text-[var(--color-dark)]">Total</span>
              <span className="text-[var(--color-primary)] text-base">BDT {booking.total_price}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/my-bookings" className="flex-1 btn-primary text-center text-xs !py-3">
            VIEW MY BOOKINGS
          </Link>
          <Link to="/rooms" className="flex-1 py-3 border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-center hover:bg-[var(--color-light)] transition-colors rounded">
            BROWSE ROOMS
          </Link>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className={`text-[var(--color-dark)] font-medium ${mono ? 'font-mono text-[var(--color-primary)]' : ''}`}>{value}</span>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}
