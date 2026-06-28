import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import { FaCar, FaParking, FaConciergeBell, FaSwimmingPool, FaWifi, FaCoffee, FaDumbbell, FaSpa, FaGlassMartiniAlt, FaShieldAlt, FaTshirt, FaBabyCarriage } from 'react-icons/fa';

const services = [
  { icon: <FaCar size={32} />, title: 'Pick Up & Drop', desc: "We'll pick up from airport while you comfy on your ride." },
  { icon: <FaParking size={32} />, title: 'Parking Space', desc: 'Complimentary valet and self-parking available.' },
  { icon: <FaConciergeBell size={32} />, title: 'Room Service', desc: '24/7 in-room dining with extensive menu options.' },
  { icon: <FaSwimmingPool size={32} />, title: 'Swimming Pool', desc: 'Indoor and outdoor pools with poolside service.' },
  { icon: <FaWifi size={32} />, title: 'Fibre Internet', desc: 'High-speed internet throughout the entire property.' },
  { icon: <FaCoffee size={32} />, title: 'Breakfast', desc: 'Full buffet breakfast included with your stay.' },
  { icon: <FaDumbbell size={32} />, title: 'Fitness Center', desc: 'State of the art gym with personal trainers.' },
  { icon: <FaSpa size={32} />, title: 'Spa & Wellness', desc: 'Full service spa with variety of treatments.' },
  { icon: <FaGlassMartiniAlt size={32} />, title: 'Bar & Lounge', desc: 'Premium cocktails and wines in elegant setting.' },
  { icon: <FaShieldAlt size={32} />, title: '24/7 Security', desc: 'Round the clock security for your peace of mind.' },
  { icon: <FaTshirt size={32} />, title: 'Laundry Service', desc: 'Same-day laundry and dry cleaning service.' },
  { icon: <FaBabyCarriage size={32} />, title: 'Childcare', desc: 'Professional babysitting services available.' },
];

export default function Services() {
  return (
    <>
      <PageHero
        title="Our Services"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Services' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="WHAT WE OFFER" title="Hotel Services" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((item, i) => (
              <div key={i} className="text-center p-8 bg-[var(--color-light)] hover:shadow-lg transition-all group">
                <div className="text-[var(--color-primary)] mb-5 inline-block group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h4 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-3">{item.title}</h4>
                <p className="text-sm text-[var(--color-body)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
