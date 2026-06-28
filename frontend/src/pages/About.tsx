import PageHero from '../components/PageHero';
import { hotelImages } from '../constants/images';
import SectionHeading from '../components/SectionHeading';
import { FiPhone, FiMail } from 'react-icons/fi';
import { FaCar, FaParking, FaConciergeBell, FaWifi, FaCoffee, FaSpa } from 'react-icons/fa';

const facilities = [
  { icon: <FaCar size={28} />, title: 'Pick Up & Drop Off' },
  { icon: <FaParking size={28} />, title: 'Basement Parking' },
  { icon: <FaConciergeBell size={28} />, title: '24 Hours Room Service' },
  { icon: <FaWifi size={28} />, title: 'High Speed Wi-fi' },
  { icon: <FaCoffee size={28} />, title: 'Buffet Breakfast' },
  { icon: <FaSpa size={28} />, title: 'Spa Treatment' },
];

export default function About() {
  return (
    <>
      <PageHero
        title="About Hotel"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'About' }]}
      />

      {/* About Content */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="HOTEL CROWN" title="Experience Comfort, Luxury & Hospitality" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[var(--color-body)] leading-relaxed mb-6">
                Discover a world of comfort and refined hospitality. Ideally located in Padma Abasik,
                Rajshahi, Hotel Crown offers elegant accommodations, contemporary facilities, and
                attentive service in a welcoming environment. From relaxing stays to business visits,
                every detail is thoughtfully designed to provide an exceptional guest experience.
              </p>
              <p className="text-[var(--color-body)] leading-relaxed mb-6">
                Our hotel features modern rooms, premium services, delicious cuisine, versatile event
                spaces, and a relaxing spa — everything you need for a memorable stay in Rajshahi city.
              </p>
              <p className="text-[var(--color-body)] leading-relaxed mb-8">
                House# 310, Road 2, Padma housing state, Padma abasik, Boalia, Rajshahi city,
                Rajshahi, Bangladesh (Rajshahi - 6200).
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px] shrink-0">
                    Front Office
                  </span>
                  <a
                    href="tel:01334945375"
                    className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-[var(--color-dark)] hover:text-[var(--color-primary)]"
                  >
                    <FiPhone className="text-[var(--color-primary)]" />
                    01334 945 375
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px] shrink-0">
                    Reservations
                  </span>
                  <a
                    href="tel:01334945376"
                    className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-[var(--color-dark)] hover:text-[var(--color-primary)]"
                  >
                    <FiPhone className="text-[var(--color-primary)]" />
                    01334 945 376, 01334 945 377
                  </a>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px] shrink-0">
                    Email
                  </span>
                  <a
                    href="mailto:hotelcrownbd@gmail.com"
                    className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-[var(--color-dark)] hover:text-[var(--color-primary)]"
                  >
                    <FiMail className="text-[var(--color-primary)]" />
                    hotelcrownbd@gmail.com
                  </a>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {hotelImages.aboutGrid.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`Hotel Crown ${i + 1}`}
                  className={`w-full h-[250px] object-cover${i % 2 === 1 ? ' mt-8' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="py-20 bg-[var(--color-light)]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="HOTEL CROWN" title="Amenities & Facilities" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {facilities.map((item, i) => (
              <div key={i} className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-[var(--color-primary)] mb-3 inline-block">{item.icon}</div>
                <h4 className="font-[var(--font-heading)] text-sm text-[var(--color-dark)]">
                  {item.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section
        className="relative py-20 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url(${hotelImages.aboutCta})`,
        }}
      >
        <div className="overlay" />
        <div className="relative z-10 max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '4', label: 'Room Categories' },
              { number: '24/7', label: 'Front Office' },
              { number: '5+', label: 'Core Services' },
              { number: '100%', label: 'Guest Focused' },
            ].map((stat, i) => (
              <div key={i}>
                <h3 className="text-4xl md:text-5xl font-[var(--font-heading)] text-slate-800 mb-2">
                  {stat.number}
                </h3>
                <p className="text-[var(--color-primary)] font-[var(--font-condensed)] uppercase tracking-[3px] text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
