import { useEffect, useMemo, useState } from 'react';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import api from '../services/api';
import { toMediaUrl } from '../utils/mediaUrl';
import { hotelImages } from '../constants/images';

type Category = 'ROOMS' | 'RESTAURANT' | 'SPA' | 'POOL' | 'EXTERIOR';
type FilterCategory = 'ALL' | Category;

type GalleryItem = {
  id: number;
  image: string;
  category: Category;
  title: string;
  description: string;
  alt_text: string;
};

type CategoryOption = { key: FilterCategory; label: string };

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ROOMS', label: 'Rooms' },
  { key: 'RESTAURANT', label: 'Restaurant' },
  { key: 'SPA', label: 'Spa' },
  { key: 'POOL', label: 'Pool' },
  { key: 'EXTERIOR', label: 'Exterior' },
];

function toAbsoluteMediaUrl(path: string | null | undefined): string {
  return toMediaUrl(path, hotelImages.galleryFallback);
}

export default function Gallery() {
  const [active, setActive] = useState<FilterCategory>('ALL');
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadGallery(): Promise<void> {
      try {
        setLoading(true);
        setError('');
        const res = await api.get<GalleryItem[]>('/gallery/');
        if (mounted) {
          setImages(res.data || []);
        }
      } catch {
        if (mounted) {
          setError('Failed to load gallery images.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadGallery();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (active === 'ALL') return images;
    return images.filter((img) => img.category === active);
  }, [images, active]);

  function categoryLabel(value: Category): string {
    return CATEGORY_OPTIONS.find((c) => c.key === value)?.label || value;
  }

  return (
    <>
      <PageHero
        title="Gallery"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Gallery' }]}
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="HOTEL GALLERY" title="Our Gallery" />

          {/* Filter buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActive(cat.key)}
                className={`px-5 py-2 text-xs font-(--font-condensed) uppercase tracking-[2px] border transition-all ${
                  active === cat.key
                    ? 'bg-teal-700 text-white border-transparent shadow-sm'
                    : 'bg-white text-dark border-gray-200 hover:border-primary hover:text-primary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery grid */}
          {loading && <p className="text-body text-center">Loading gallery...</p>}
          {!loading && error && <p className="text-red-600 text-center">{error}</p>}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-body text-center">No images found for this category.</p>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((img) => (
              <div key={img.id} className="overflow-hidden group cursor-pointer relative">
                <img
                  src={toAbsoluteMediaUrl(img.image)}
                  alt={img.alt_text || img.title || 'Gallery image'}
                  className="w-full h-75 object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <span className="text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity font-(--font-condensed) uppercase tracking-[2px] text-sm text-center px-3">
                    {img.title || categoryLabel(img.category)}
                  </span>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
