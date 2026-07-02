import { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import { Link } from 'react-router-dom';
import { hotelImages } from '../constants/images';
import api from '../services/api';
import { toMediaUrl } from '../utils/mediaUrl';

interface SpaService {
  id: number;
  name: string;
  description: string;
  price: string;
  duration: number;
  image?: string | null;
  image_url?: string | null;
}

const FALLBACK_SERVICES: SpaService[] = [
  { id: 1, name: 'Massage Therapy', description: 'Full body relaxation massage with essential oils.', price: '2500', duration: 60 },
  { id: 2, name: 'Facial Treatment', description: 'Deep cleansing and rejuvenating facial treatments.', price: '1800', duration: 45 },
  { id: 3, name: 'Body Scrub', description: 'Exfoliating body scrub for glowing skin.', price: '2000', duration: 50 },
  { id: 4, name: 'Aromatherapy', description: 'Relaxing aromatherapy session with natural essences.', price: '1500', duration: 40 },
];

export default function Spa() {
  const [services, setServices] = useState<SpaService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/spa/services/')
      .then(res => {
        const rows = res.data.results ?? res.data ?? [];
        setServices(rows.length ? rows : FALLBACK_SERVICES);
      })
      .catch(() => setServices(FALLBACK_SERVICES))
      .finally(() => setLoading(false));
  }, []);

  const display = services.length ? services : FALLBACK_SERVICES;

  return (
    <>
      <PageHero
        title="Spa & Wellness"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Spa & Wellness' }]}
        backgroundImage={hotelImages.spa.hero}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="EXPERIENCES" title="Spa Center" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <img src={hotelImages.spa.main} alt="Spa" className="w-full h-[220px] sm:h-[320px] lg:h-[400px] object-cover" />
            <div>
              <p className="text-[var(--color-body)] leading-relaxed mb-6">
                Indulge in a world of relaxation with our premium spa treatments at Hotel Crown.
                Designed to restore balance and rejuvenate both body and mind, each therapy offers
                a peaceful escape and a refreshing wellness experience.
              </p>
              <p className="text-[var(--color-body)] leading-relaxed mb-8">
                Whether you are unwinding after a long journey or treating yourself during your stay
                in Rajshahi, our spa team delivers attentive care in a calm and welcoming setting.
              </p>
              <Link to="/contact" className="btn-primary">BOOK A SESSION</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[var(--color-light)]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="OUR SERVICES" title="Spa Services" />
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {display.map((service, i) => (
                <div key={service.id ?? i} className="bg-white rounded-xl shadow-sm border border-gray-100 group overflow-hidden transition-all hover:shadow-md">
                  <div className="overflow-hidden">
                    <img
                      src={toMediaUrl(service.image_url || service.image, hotelImages.spa.services[i % hotelImages.spa.services.length])}
                      alt={service.name}
                      className="w-full h-[180px] sm:h-[220px] lg:h-[250px] object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-6 text-center">
                    <h4 className="font-[var(--font-heading)] text-lg text-[var(--color-dark)] mb-2">{service.name}</h4>
                    <p className="text-sm text-[var(--color-body)] mb-2">{service.description}</p>
                    {service.duration ? (
                      <p className="text-xs text-gray-500 mb-2">{service.duration} min</p>
                    ) : null}
                    <span className="text-[var(--color-primary)] font-[var(--font-heading)] text-xl">
                      ৳{Number(service.price).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="h-[240px] sm:h-[320px] lg:h-auto bg-cover bg-center" style={{ backgroundImage: `url(${hotelImages.spa.pool})` }} />
          <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-[var(--color-dark)]">
            <span className="section-subtitle text-white/80">MODERN</span>
            <div className="star-divider !justify-start mt-4 mb-4"><span>★ ★ ★ ★ ★</span></div>
            <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl md:text-4xl text-white mb-6">The Health Club & Pool</h2>
            <p className="text-white/75 leading-relaxed mb-8">
              Relax and unwind with health club access and premium comfort facilities at Hotel Crown.
            </p>
            <Link to="/contact" className="btn-primary">LEARN MORE</Link>
          </div>
        </div>
      </section>
    </>
  );
}
