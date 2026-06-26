import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SectionHeading from '../SectionHeading';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import api from '../../services/api';
import { toMediaUrl } from '../../utils/mediaUrl';
import { unwrapList } from '../../utils/cmsList';
import { hotelImages } from '../../constants/images';
import 'swiper/css';
import 'swiper/css/navigation';

type RoomType = {
  id: number;
  name: string;
  slug: string;
  price_per_night: string;
  max_guests: number;
  beds: number;
  size: number;
  view_type: string;
  is_featured: boolean;
  primary_image: string | null;
  description?: string;
};

export default function RoomsSection() {
  const [rooms, setRooms] = useState<RoomType[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadRooms() {
      try {
        const res = await api.get('/rooms/');
        if (mounted) {
          // Filter to featured rooms if possible, or just slice top 6
          const items = unwrapList(res.data);
          const featured = items.filter((r: RoomType) => r.is_featured);
          setRooms(featured.length > 0 ? featured : items.slice(0, 6));
        }
      } catch {
        // Silently fail
      }
    }

    void loadRooms();
    return () => {
      mounted = false;
    };
  }, []);

  if (rooms.length === 0) return null;

  return (
    <section className="py-20 bg-[var(--color-light)]">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading subtitle="HOTEL CROWN" title="Rooms & Suites" />
        <Swiper
          modules={[Autoplay, Navigation]}
          spaceBetween={30}
          slidesPerView={1}
          navigation
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
        >
          {rooms.map((room) => {
            const bdt = Math.round(parseFloat(room.price_per_night || '0'));
            const usd = Math.round(bdt / 115);
            return (
              <SwiperSlide key={room.id}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 group h-full overflow-hidden transition-all hover:shadow-md">
                  <div className="relative overflow-hidden">
                    <img
                      src={toMediaUrl(room.primary_image, hotelImages.roomsFallback)}
                      alt={room.name}
                      className="w-full h-[300px] object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-[var(--color-dark)] px-3 py-1 text-xs font-bold rounded-md">
                      {room.max_guests} Guests
                    </div>
                    <div className="absolute top-4 right-4 bg-[var(--color-dark)] text-white px-4 py-1.5 text-sm font-semibold rounded-full shadow-lg">
                      BDT {bdt.toLocaleString()} / USD {usd}
                    </div>
                  </div>
                  <div className="p-6 text-left">
                    <h3 className="text-xl font-[var(--font-heading)] text-[var(--color-dark)] font-semibold mb-3">
                      {room.name}
                    </h3>
                    <p className="text-sm text-[var(--color-body)] leading-relaxed mb-4 line-clamp-4">
                      {room.description || 'Experience ultimate comfort and luxury in this beautifully designed room, perfectly suited for your stay in Rajshahi.'}
                    </p>
                    <div className="flex justify-start gap-3">
                      <Link
                        to={`/room-details/${room.slug}`}
                        className="btn-primary text-xs !py-2 !px-5"
                      >
                        Details
                      </Link>
                      <Link
                        to={`/room-details/${room.slug}`}
                        className="btn-primary text-xs !py-2 !px-5"
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}
