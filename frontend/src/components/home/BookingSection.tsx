import { FiPhone } from 'react-icons/fi';
import SectionHeading from '../SectionHeading';
import { hotelImages } from '../../constants/images';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { toMediaUrl } from '../../utils/mediaUrl';

export default function BookingSection() {
  const { getSetting } = useSiteSettings();

  const bookingImage = toMediaUrl(getSetting('home_booking_image', ''), hotelImages.booking);
  const tagline = getSetting(
    'home_booking_tagline',
    'Experience Comfort, Luxury & Hospitality at Hotel Crown, Padma Abasik, Rajshahi.',
  );
  const frontPhone = getSetting('contact_phone', '01334 945 375');
  const frontHref = getSetting('contact_phone_href', '01334945375');
  const reservationsPhone = getSetting('contact_phone_reservations', '01334 945 376, 01334 945 377');
  const reservationsHref = getSetting('contact_phone_reservations_href', '01334945376');
  const email = getSetting('contact_email', 'hotelcrownbd@gmail.com');
  const website = getSetting('contact_website', 'www.hotelcrownbd.com');

  return (
    <section
      className="relative py-20 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `url(${bookingImage})` }}
    >
      <div className="overlay" />
      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <SectionHeading subtitle="HOTEL CROWN" title="Book Your Stay" light />

        <div className="bg-white/95 backdrop-blur-sm p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                Check-in Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                Check-out Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                Adults
              </label>
              <select className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] transition-colors bg-white">
                <option>1</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-[var(--font-condensed)] uppercase tracking-[2px] text-[var(--color-dark)] mb-2">
                Children
              </label>
              <select className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)] transition-colors bg-white">
                <option>0</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
              </select>
            </div>
          </div>
          <button className="btn-primary w-full !py-4 font-bold text-sm uppercase tracking-widest mt-4">
            Check Availability
          </button>
        </div>

        <div className="text-center mt-8">
          <p className="text-slate-800 italic font-[var(--font-heading)] text-lg mb-3">{tagline}</p>
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="flex items-center justify-center gap-3">
              <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px]">
                Front Office
              </span>
              <a
                href={`tel:${frontHref}`}
                className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-slate-800 hover:text-[var(--color-primary)] transition-colors"
              >
                <FiPhone className="text-[var(--color-primary)]" />
                {frontPhone}
              </a>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px]">
                Reservations
              </span>
              <a
                href={`tel:${reservationsHref}`}
                className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-slate-800 hover:text-[var(--color-primary)] transition-colors"
              >
                <FiPhone className="text-[var(--color-primary)]" />
                {reservationsPhone}
              </a>
            </div>
          </div>
          <p className="text-slate-800/60 text-sm mt-2">
            {email} | {website}
          </p>
        </div>
      </div>
    </section>
  );
}
