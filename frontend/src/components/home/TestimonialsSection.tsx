import { useEffect, useState } from 'react';
import SectionHeading from '../SectionHeading';
import { hotelImages } from '../../constants/images';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import api from '../../services/api';
import { toMediaUrl } from '../../utils/mediaUrl';
import { unwrapList } from '../../utils/cmsList';
import 'swiper/css';
import 'swiper/css/pagination';

type Testimonial = {
  id: number;
  guest_name: string;
  guest_role: string;
  content: string;
  avatar: string | null;
  rating: number;
};

const FALLBACK = [
  {
    guest_name: 'Rahim Uddin',
    guest_role: 'Business Guest',
    content:
      'Hotel Crown exceeded my expectations. The room was spotless, staff were courteous, and the location in Padma Abasik is very convenient.',
    avatar: hotelImages.testimonials[0],
  },
  {
    guest_name: 'Nusrat Jahan',
    guest_role: 'Family Stay',
    content:
      'We stayed with family and loved the warm hospitality. Breakfast was excellent and the front office team was very helpful.',
    avatar: hotelImages.testimonials[1],
  },
  {
    guest_name: 'Karim Hassan',
    guest_role: 'Event Organizer',
    content:
      'We hosted a corporate dinner in the banquet hall. Professional service, elegant setup, and smooth coordination throughout.',
    avatar: hotelImages.testimonials[2],
  },
];

export default function TestimonialsSection() {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    let mounted = true;

    async function loadTestimonials(): Promise<void> {
      try {
        const res = await api.get<Testimonial[] | { results: Testimonial[] }>('/testimonials/');
        const data = unwrapList(res.data);
        if (mounted && data.length > 0) {
          setItems(
            data.map((item, index) => ({
              guest_name: item.guest_name,
              guest_role: item.guest_role || 'Guest review',
              content: item.content,
              avatar: toMediaUrl(item.avatar, hotelImages.testimonials[index % hotelImages.testimonials.length]),
            })),
          );
        }
      } catch {
        // keep fallback
      }
    }

    void loadTestimonials();
    return () => {
      mounted = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <SectionHeading subtitle="TESTIMONIALS" title="What Client's Say?" />
        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          loop
          className="pb-12"
        >
          {items.map((item, i) => (
            <SwiperSlide key={i}>
              <div className="text-center px-6 py-8 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all mx-4">
                <img
                  src={item.avatar}
                  alt={item.guest_name}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-6 border-2 border-[var(--color-primary)]"
                />
                <p className="text-[var(--color-body)] leading-relaxed mb-6 italic max-w-2xl mx-auto">
                  {item.content}
                </p>
                <h5 className="font-[var(--font-heading)] text-lg text-[var(--color-dark)]">
                  {item.guest_name}
                </h5>
                <span className="text-sm text-[var(--color-primary)] font-[var(--font-condensed)] uppercase tracking-[2px]">
                  {item.guest_role}
                </span>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
