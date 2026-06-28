import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '../SectionHeading';
import api from '../../services/api';
import { toMediaUrl } from '../../utils/mediaUrl';
import { hotelImages } from '../../constants/images';
import { unwrapList } from '../../utils/cmsList';

type GalleryItem = {
  id: number;
  image: string;
  title: string;
  alt_text: string;
};

export default function GallerySection() {
  const [images, setImages] = useState<GalleryItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadGallery(): Promise<void> {
      try {
        const res = await api.get<GalleryItem[] | { results: GalleryItem[] }>('/gallery/');
        const data = unwrapList(res.data).slice(0, 6);
        if (mounted) {
          setImages(data);
        }
      } catch {
        if (mounted) setImages([]);
      }
    }

    void loadGallery();
    return () => {
      mounted = false;
    };
  }, []);

  if (images.length === 0) return null;

  return (
    <section className="py-20 bg-[var(--color-light)]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <SectionHeading subtitle="HOTEL GALLERY" title="Our Gallery" />
          <Link to="/gallery" className="btn-primary text-xs !py-2 !px-5 self-start md:self-auto">
            VIEW ALL
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="overflow-hidden group cursor-pointer relative">
              <img
                src={toMediaUrl(img.image, hotelImages.galleryFallback)}
                alt={img.alt_text || img.title || 'Gallery image'}
                className="w-full h-75 object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <span className="text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity font-[var(--font-condensed)] uppercase tracking-[2px] text-sm text-center px-3">
                  {img.title || 'Hotel Crown'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
