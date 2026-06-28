import { Link, useSearchParams } from 'react-router-dom';
import { MdCheckCircle } from 'react-icons/md';

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const bookingRef = params.get('booking_ref') || '';

  return (
    <section className="min-h-screen bg-[#f9f6f1] flex items-center justify-center px-4 py-20">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <MdCheckCircle className="text-green-500" size={72} />
        </div>
        <h1 className="text-3xl font-[var(--font-heading)] text-[var(--color-dark)] mb-2">
          Payment Successful!
        </h1>
        <p className="text-[var(--color-body)] mb-4">
          Your payment has been processed and your booking is confirmed.
        </p>

        {bookingRef && (
          <div className="bg-[var(--color-light)] rounded-xl p-4 mb-8">
            <span className="text-gray-500 text-sm">Booking Reference</span>
            <p className="font-mono text-[var(--color-primary)] text-lg font-semibold">{bookingRef}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/my-bookings" className="flex-1 btn-primary text-center text-xs !py-3">
            VIEW MY BOOKINGS
          </Link>
          <Link to="/" className="flex-1 py-3 border border-[var(--color-primary)] text-[var(--color-primary)] text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-center hover:bg-[var(--color-light)] transition-colors rounded">
            BACK TO HOME
          </Link>
        </div>
      </div>
    </section>
  );
}
