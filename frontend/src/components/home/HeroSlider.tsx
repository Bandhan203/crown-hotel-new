import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { hotelImages } from '../../constants/images';
import { toMediaUrl } from '../../utils/mediaUrl';
import { unwrapList } from '../../utils/cmsList';

type HeroSlide = {
  id: number;
  subtitle: string;
  title: string;
  background_image: string;
  cta_text: string;
  cta_link: string;
};

const FALLBACK_SLIDES = [
  {
    subtitle: 'Experience Comfort, Luxury & Hospitality',
    title: 'The Best Hotel Crown in Rajshahi City',
    image: hotelImages.hero[0],
    cta_text: 'Book Your Room',
    cta_link: '/rooms',
  },
  {
    subtitle: 'Padma Abasik, Rajshahi, Bangladesh',
    title: 'Refined Hospitality in the Heart of Rajshahi',
    image: hotelImages.hero[1],
    cta_text: 'Explore Facilities',
    cta_link: '/facilities',
  },
  {
    subtitle: 'Hotel Crown',
    title: 'Elegant Accommodations & Attentive Service',
    image: hotelImages.hero[2],
    cta_text: 'Book Your Room',
    cta_link: '/rooms',
  },
];

export default function HeroSlider() {
  const [slides, setSlides] = useState(FALLBACK_SLIDES);

  useEffect(() => {
    let mounted = true;

    async function loadSlides(): Promise<void> {
      try {
        const res = await api.get<HeroSlide[] | { results: HeroSlide[] }>('/hero-slides/');
        const items = unwrapList(res.data);
        if (mounted && items.length > 0) {
          setSlides(
            items.map((slide) => ({
              subtitle: slide.subtitle,
              title: slide.title,
              image: toMediaUrl(slide.background_image, hotelImages.hero[0]),
              cta_text: slide.cta_text || 'Book Your Room',
              cta_link: slide.cta_link || '/rooms',
            })),
          );
        }
      } catch {
        // keep fallback slides
      }
    }

    void loadSlides();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="relative h-screen">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div
              className="relative h-screen bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="overlay" />
              <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-slate-800 px-4">
                <p className="font-[var(--font-condensed)] text-sm tracking-[6px] uppercase text-[var(--color-primary)] mb-4">
                  {slide.subtitle}
                </p>
                <div className="star-divider mb-6">
                  <span className="!text-slate-800">★ ★ ★ ★ ★</span>
                </div>
                <h1 className="font-[var(--font-heading)] text-4xl md:text-5xl lg:text-7xl text-slate-800 mb-8 max-w-4xl leading-tight">
                  {slide.title}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link to={slide.cta_link} className="btn-white">
                    {slide.cta_text}
                  </Link>
                  <Link
                    to="/facilities"
                    className="inline-block border border-white/40 text-slate-800 text-xs font-[var(--font-condensed)] uppercase tracking-[3px] px-8 py-3 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    Explore Facilities
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-slate-800 text-xs font-[var(--font-condensed)] uppercase tracking-[2px]">
              Check-in
            </label>
            <input
              type="date"
              className="bg-transparent border border-white/30 text-slate-800 text-sm px-3 py-2 outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-slate-800 text-xs font-[var(--font-condensed)] uppercase tracking-[2px]">
              Check-out
            </label>
            <input
              type="date"
              className="bg-transparent border border-white/30 text-slate-800 text-sm px-3 py-2 outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-slate-800 text-xs font-[var(--font-condensed)] uppercase tracking-[2px]">
              Adults
            </label>
            <select className="bg-transparent border border-white/30 text-slate-800 text-sm px-3 py-2 outline-none">
              <option className="text-black">1</option>
              <option className="text-black">2</option>
              <option className="text-black">3</option>
              <option className="text-black">4</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-slate-800 text-xs font-[var(--font-condensed)] uppercase tracking-[2px]">
              Children
            </label>
            <select className="bg-transparent border border-white/30 text-slate-800 text-sm px-3 py-2 outline-none">
              <option className="text-black">0</option>
              <option className="text-black">1</option>
              <option className="text-black">2</option>
              <option className="text-black">3</option>
            </select>
          </div>
          <button className="btn-primary !px-8 !py-3">
            Check Now
          </button>
        </div>
      </div>
    </section>
  );
}
