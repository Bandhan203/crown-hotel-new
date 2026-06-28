import PageHero from '../components/PageHero';
import { hotelImages } from '../constants/images';
import SectionHeading from '../components/SectionHeading';
import { FaCar, FaParking, FaConciergeBell, FaSwimmingPool, FaWifi, FaCoffee, FaDumbbell, FaSpa } from 'react-icons/fa';

const facilities = [
  {
    icon: <FaSwimmingPool size={36} />,
    title: 'Swimming Pool',
    desc: 'Indoor and outdoor swimming pools open daily from 6 AM to 10 PM.',
    image: hotelImages.facilities[0],
  },
  {
    icon: <FaDumbbell size={36} />,
    title: 'Fitness Center',
    desc: 'State of the art fitness center with the latest equipment.',
    image: hotelImages.facilities[1],
  },
  {
    icon: <FaSpa size={36} />,
    title: 'Spa & Wellness',
    desc: 'Rejuvenate your body and mind with our spa treatments.',
    image: hotelImages.facilities[2],
  },
  {
    icon: <FaCoffee size={36} />,
    title: 'Restaurant & Bar',
    desc: 'Fine dining restaurant and rooftop bar with panoramic views.',
    image: hotelImages.facilities[3],
  },
];

const moreFeatures = [
  { icon: <FaCar size={28} />, title: 'Airport Transfer' },
  { icon: <FaParking size={28} />, title: 'Free Parking' },
  { icon: <FaConciergeBell size={28} />, title: 'Concierge' },
  { icon: <FaWifi size={28} />, title: 'Free Wi-Fi' },
];

export default function Facilities() {
  return (
    <>
      <PageHero
        title="Facilities"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Facilities' }]}
      />

      {/* Main Facilities */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="OUR AMENITIES" title="Hotel Facilities" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {facilities.map((item, i) => (
              <div key={i} className="group">
                <div className="overflow-hidden mb-6">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-[300px] object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-[var(--color-primary)] shrink-0">{item.icon}</div>
                  <div>
                    <h3 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-2">
                      {item.title}
                    </h3>
                    <p className="text-[var(--color-body)] text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* More Features */}
      <section className="py-16 bg-[var(--color-light)]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {moreFeatures.map((item, i) => (
              <div key={i} className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-[var(--color-primary)] mb-3 inline-block">{item.icon}</div>
                <h4 className="font-[var(--font-heading)] text-sm text-[var(--color-dark)]">{item.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
