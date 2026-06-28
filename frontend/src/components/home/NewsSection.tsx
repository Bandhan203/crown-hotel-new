import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SectionHeading from '../SectionHeading';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import api from '../../services/api';
import { toMediaUrl } from '../../utils/mediaUrl';
import { hotelImages } from '../../constants/images';
import 'swiper/css';
import 'swiper/css/navigation';

type NewsPost = {
  id: number;
  title: string;
  slug: string;
  category: string;
  image: string | null;
  published_at: string | null;
};

type PaginatedResponse<T> = {
  results: T[];
};

function formatDateShort(value: string | null): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }).toUpperCase();
}

function toAbsoluteMediaUrl(path: string | null): string {
  return toMediaUrl(path, hotelImages.newsFallback);
}

export default function NewsSection() {
  const [posts, setPosts] = useState<NewsPost[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadPosts(): Promise<void> {
      try {
        const res = await api.get<PaginatedResponse<NewsPost> | NewsPost[]>('/news/');
        const payload = res.data;
        const items = Array.isArray(payload) ? payload : payload.results;
        if (mounted) {
          setPosts((items ?? []).slice(0, 6));
        }
      } catch {
        if (mounted) {
          setPosts([]);
        }
      }
    }

    void loadPosts();
    return () => {
      mounted = false;
    };
  }, []);

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading subtitle="HOTEL BLOG" title="Our News" />
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
          {posts.map((post) => (
            <SwiperSlide key={post.id}>
              <div className="group cursor-pointer bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all pb-5 overflow-hidden h-full">
                <div className="relative overflow-hidden mb-4">
                  <img
                    src={toAbsoluteMediaUrl(post.image)}
                    alt={post.title}
                    className="w-full h-[250px] object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="bg-teal-700 text-white text-xs px-3 py-1 font-bold rounded shadow-sm">
                      {formatDateShort(post.published_at)}
                    </span>
                    <span className="bg-white/90 backdrop-blur-sm text-dark text-xs px-3 py-1 font-bold rounded">
                      {post.category || 'NEWS'}
                    </span>
                  </div>
                </div>
                <div className="px-5">
                  <Link
                    to={`/news/${post.slug}`}
                    className="font-heading text-lg text-dark hover:text-primary transition-colors font-semibold"
                  >
                    {post.title}
                  </Link>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
