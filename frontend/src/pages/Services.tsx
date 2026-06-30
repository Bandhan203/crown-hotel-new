import { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import api from '../services/api';
import { renderServiceIcon } from '../utils/serviceIcons';

interface HotelService {
  id: number;
  name: string;
  description: string;
  icon: string;
}

const FALLBACK: HotelService[] = [
  { id: 1, name: 'Pick Up & Drop', description: "We'll pick up from airport while you comfy on your ride.", icon: 'FaCar' },
  { id: 2, name: 'Parking Space', description: 'Complimentary valet and self-parking available.', icon: 'MdLocalParking' },
  { id: 3, name: 'Room Service', description: '24/7 in-room dining with extensive menu options.', icon: 'FaConciergeBell' },
  { id: 4, name: 'Swimming Pool', description: 'Indoor and outdoor pools with poolside service.', icon: 'MdPool' },
  { id: 5, name: 'Fibre Internet', description: 'High-speed internet throughout the entire property.', icon: 'FaWifi' },
  { id: 6, name: 'Breakfast', description: 'Full buffet breakfast included with your stay.', icon: 'FaCoffee' },
];

export default function Services() {
  const [services, setServices] = useState<HotelService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/services/')
      .then(res => {
        const rows = res.data.results ?? res.data ?? [];
        setServices(rows.length ? rows : FALLBACK);
      })
      .catch(() => setServices(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const display = services.length ? services : FALLBACK;

  return (
    <>
      <PageHero title="Our Services" breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Services' }]} />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="WHAT WE OFFER" title="Hotel Services" />
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {display.map(item => (
                <div key={item.id} className="text-center p-8 bg-[var(--color-light)] hover:shadow-lg transition-all group">
                  <div className="text-[var(--color-primary)] mb-5 inline-block group-hover:scale-110 transition-transform">
                    {renderServiceIcon(item.icon, 32)}
                  </div>
                  <h4 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-3">{item.name}</h4>
                  <p className="text-sm text-[var(--color-body)] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
