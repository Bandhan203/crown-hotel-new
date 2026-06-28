import { useEffect, useState } from 'react';
import { FiPhone } from 'react-icons/fi';
import api from '../../services/api';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { renderServiceIcon } from '../../utils/serviceIcons';
import { unwrapList } from '../../utils/cmsList';

type HotelService = {
  id: number;
  name: string;
  description: string;
  icon: string;
};

const FALLBACK_SERVICES: HotelService[] = [
  {
    id: 1,
    name: 'Elegant Lobby',
    description: 'A welcoming lobby blending elegance, comfort, and sophistication for every guest\'s arrival.',
    icon: 'MdMeetingRoom',
  },
  {
    id: 2,
    name: 'Banquet Hall',
    description: 'Our elegant banquet hall is perfect for weddings, receptions, and corporate events.',
    icon: 'FaGlassCheers',
  },
  {
    id: 3,
    name: 'Restaurant',
    description: 'A perfect destination for delightful flavors, memorable meals, and exceptional dining experiences.',
    icon: 'MdRestaurant',
  },
  {
    id: 4,
    name: 'Spacious Garage',
    description: 'Spacious and secure parking facilities designed for your convenience and peace of mind.',
    icon: 'MdLocalParking',
  },
  {
    id: 5,
    name: 'Spa Treatment',
    description:
      'Indulge in a world of relaxation with our premium spa treatments. Designed to restore balance and rejuvenate both body and mind, each therapy offers a peaceful escape and a refreshing wellness experience.',
    icon: 'MdSpa',
  },
];

export default function PricingSection() {
  const { getSetting } = useSiteSettings();
  const [services, setServices] = useState<HotelService[]>(FALLBACK_SERVICES);

  const intro = getSetting(
    'home_services_intro',
    'From elegant arrivals to memorable dining and rejuvenating spa experiences, Hotel Crown offers thoughtfully curated services designed for comfort, convenience, and exceptional hospitality throughout your stay in Rajshahi.',
  );
  const reservationsPhone = getSetting('contact_phone_reservations', '01334 945 376');
  const reservationsHref = getSetting('contact_phone_reservations_href', '01334945376');

  useEffect(() => {
    let mounted = true;

    async function loadServices(): Promise<void> {
      try {
        const res = await api.get<HotelService[] | { results: HotelService[] }>('/services/');
        const data = unwrapList(res.data);
        if (mounted && data.length > 0) {
          setServices(data);
        }
      } catch {
        // keep fallback
      }
    }

    void loadServices();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <span className="section-subtitle">CORE SERVICES</span>
            <h2 className="section-title text-3xl md:text-4xl mt-4 mb-6">Our Premium Services</h2>
            <p className="text-[var(--color-body)] mb-6 leading-relaxed">{intro}</p>
            <div className="flex items-center gap-3">
              <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px]">
                Reservations
              </span>
              <a
                href={`tel:${reservationsHref}`}
                className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-[var(--color-dark)] hover:text-[var(--color-primary)]"
              >
                <FiPhone className="text-[var(--color-primary)]" />
                {reservationsPhone}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="group p-6 border border-gray-100 hover:border-[var(--color-primary)] transition-all"
              >
                <div className="text-[var(--color-primary)] mb-4">{renderServiceIcon(service.icon)}</div>
                <h4 className="font-[var(--font-heading)] text-lg text-[var(--color-dark)] mb-3">
                  {service.name}
                </h4>
                <p className="text-sm text-[var(--color-body)] leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
