import { Link, useSearchParams } from 'react-router-dom';
import { MdCancel } from 'react-icons/md';

export default function PaymentCancel() {
  const [params] = useSearchParams();
  const bookingRef = params.get('booking_ref') || '';

  return (
    <section className="min-h-screen bg-[#f9f6f1] flex items-center justify-center px-4 py-20">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <MdCancel className="text-yellow-500" size={72} />
        </div>
        <h1 className="text-3xl font-[var(--font-heading)] text-[var(--color-dark)] mb-2">
          Payment Cancelled
        </h1>
        <p className="text-[var(--color-body)] mb-4">
          You cancelled the payment. Your booking is saved and you can pay later from My Bookings.
        </p>

        {bookingRef && (
          <div className="bg-yellow-50 rounded-xl p-4 mb-8">
            <span className="text-gray-500 text-sm">Booking Reference</span>
            <p className="font-mono text-yellow-600 text-lg font-semibold">{bookingRef}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/my-bookings" className="flex-1 btn-primary text-center text-xs !py-3">
            MY BOOKINGS
          </Link>
          <Link to="/rooms" className="flex-1 py-3 border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-center hover:bg-[var(--color-light)] transition-colors rounded">
            BROWSE ROOMS
          </Link>
        </div>
      </div>
    </section>
  );
}
