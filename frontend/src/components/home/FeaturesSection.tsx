import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hotelImages } from '../../constants/images';
import api from '../../services/api';
import { toMediaUrl } from '../../utils/mediaUrl';
import { unwrapList } from '../../utils/cmsList';

type FeatureFacility = {
  id: number;
  name: string;
  description: string;
  image: string | null;
  category: string;
  subtitle: string;
  link: string;
};

const FALLBACK_FEATURES = [
  {
    subtitle: 'WELCOME',
    title: 'Elegant Lobby',
    description:
      'A welcoming lobby blending elegance, comfort, and sophistication for every guest\'s arrival.',
    link: '/about',
    image: hotelImages.features.lobby,
    imageRight: false,
  },
  {
    subtitle: 'EVENTS',
    title: 'Banquet Hall',
    description:
      'Our elegant banquet hall is perfect for weddings, receptions, and corporate events.',
    link: '/facilities',
    image: hotelImages.features.banquet,
    imageRight: true,
  },
  {
    subtitle: 'DINING',
    title: 'Restaurant',
    description:
      'A perfect destination for delightful flavors, memorable meals, and exceptional dining experiences.',
    link: '/restaurant',
    image: hotelImages.features.restaurant,
    imageRight: false,
  },
  {
    subtitle: 'CONVENIENCE',
    title: 'Spacious Garage',
    description:
      'Spacious and secure parking facilities designed for your convenience and peace of mind.',
    link: '/facilities',
    image: hotelImages.features.garage,
    imageRight: true,
  },
  {
    subtitle: 'WELLNESS',
    title: 'Spa Treatment',
    description:
      'Indulge in a world of relaxation with our premium spa treatments designed to restore balance and rejuvenate both body and mind.',
    link: '/spa',
    image: hotelImages.features.spa,
    imageRight: false,
  },
];

type FeatureBlock = {
  subtitle: string;
  title: string;
  description: string;
  link: string;
  image: string;
  imageRight: boolean;
};

export default function FeaturesSection() {
  const [features, setFeatures] = useState<FeatureBlock[]>(FALLBACK_FEATURES);

  useEffect(() => {
    let mounted = true;

    async function loadFeatures(): Promise<void> {
      try {
        const res = await api.get<FeatureFacility[] | { results: FeatureFacility[] }>('/facilities/');
        const data = unwrapList(res.data).filter((item) => item.category === 'FEATURE');
        if (mounted && data.length > 0) {
          setFeatures(
            data.map((item, index) => ({
              subtitle: item.subtitle || 'HOTEL CROWN',
              title: item.name,
              description: item.description,
              link: item.link || '/facilities',
              image: toMediaUrl(item.image, FALLBACK_FEATURES[index % FALLBACK_FEATURES.length].image),
              imageRight: index % 2 === 1,
            })),
          );
        }
      } catch {
        // keep fallback
      }
    }

    void loadFeatures();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-0">
      {features.map((feature, i) => (
        <div key={`${feature.title}-${i}`} className={`${i % 2 === 0 ? 'bg-white' : 'bg-[var(--color-light)]'}`}>
          <div className="max-w-7xl mx-auto">
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 min-h-[500px] ${
                feature.imageRight ? '' : 'lg:[direction:rtl]'
              }`}
            >
              <div
                className="h-[400px] lg:h-auto bg-cover bg-center"
                style={{ backgroundImage: `url(${feature.image})` }}
              />
              <div className="p-12 lg:p-16 flex flex-col justify-center lg:[direction:ltr]">
                <span className="section-subtitle">{feature.subtitle}</span>
                <div className="star-divider !justify-start mt-4 mb-4">
                  <span>★ ★ ★ ★ ★</span>
                </div>
                <h2 className="font-[var(--font-heading)] text-3xl md:text-4xl text-[var(--color-dark)] mb-6">
                  {feature.title}
                </h2>
                <p className="text-[var(--color-body)] leading-relaxed mb-8">{feature.description}</p>
                <div>
                  <Link to={feature.link} className="btn-primary">
                    LEARN MORE
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
