import { useEffect, useState } from 'react';
import PageHero from '../components/PageHero';
import { hotelImages } from '../constants/images';
import SectionHeading from '../components/SectionHeading';
import api from '../services/api';
import { renderServiceIcon } from '../utils/serviceIcons';
import { toMediaUrl } from '../utils/mediaUrl';

interface Facility {
  id: number;
  name: string;
  description: string;
  icon: string;
  image?: string | null;
  image_url?: string | null;
  category: string;
}

export default function Facilities() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/facilities/')
      .then(res => setFacilities(res.data.results ?? res.data ?? []))
      .catch(() => setFacilities([]))
      .finally(() => setLoading(false));
  }, []);

  const featured = facilities.filter(f => f.category === 'FEATURE' || f.category === 'GENERAL').slice(0, 4);
  const complimentary = facilities.filter(f => f.category === 'COMPLIMENTARY');

  return (
    <>
      <PageHero title="Facilities" breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Facilities' }]} />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="OUR AMENITIES" title="Hotel Facilities" />
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : featured.length === 0 && complimentary.length === 0 ? (
            <p className="text-center text-[var(--color-body)]">Facilities will be listed here soon.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featured.map((item, i) => (
                <div key={item.id} className="group">
                  <div className="overflow-hidden mb-6">
                    <img
                      src={toMediaUrl(item.image_url || item.image, hotelImages.facilities[i % hotelImages.facilities.length])}
                      alt={item.name}
                      className="w-full h-[300px] object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-[var(--color-primary)] shrink-0">{renderServiceIcon(item.icon, 36)}</div>
                    <div>
                      <h3 className="font-[var(--font-heading)] text-xl text-[var(--color-dark)] mb-2">{item.name}</h3>
                      <p className="text-[var(--color-body)] text-sm leading-relaxed">{item.description || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {complimentary.length > 0 && (
        <section className="py-16 bg-[var(--color-light)]">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeading subtitle="INCLUDED" title="Complimentary Services" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {complimentary.map(item => (
                <div key={item.id} className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-[var(--color-primary)] mb-3 inline-block">{renderServiceIcon(item.icon, 28)}</div>
                  <h4 className="font-[var(--font-heading)] text-sm text-[var(--color-dark)]">{item.name}</h4>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
