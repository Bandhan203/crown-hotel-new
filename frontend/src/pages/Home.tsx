import HeroSlider from '../components/home/HeroSlider';
import AboutSection from '../components/home/AboutSection';
import RoomsSection from '../components/home/RoomsSection';
import PricingSection from '../components/home/PricingSection';
import VideoSection from '../components/home/VideoSection';
import FacilitiesSection from '../components/home/FacilitiesSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import FeaturesSection from '../components/home/FeaturesSection';
import NewsSection from '../components/home/NewsSection';
import GallerySection from '../components/home/GallerySection';
import BookingSection from '../components/home/BookingSection';
import { useHomeCMS, type HomeSectionKey } from '../hooks/useHomeCMS';

export default function Home() {
  const { config, assets } = useHomeCMS();

  const renderSection = (key: HomeSectionKey) => {
    const section = config.sections[key];
    if (section.enabled === false) return null;

    switch (key) {
      case 'hero':
        return <HeroSlider key={key} config={section} />;
      case 'about':
        return <AboutSection key={key} config={section} asset={assets.about_image} />;
      case 'rooms':
        return <RoomsSection key={key} config={section} />;
      case 'services':
        return <PricingSection key={key} config={section} />;
      case 'video':
        return <VideoSection key={key} config={section} asset={assets.video_background_image} />;
      case 'facilities':
        return <FacilitiesSection key={key} config={section} />;
      case 'testimonials':
        return <TestimonialsSection key={key} config={section} />;
      case 'features':
        return <FeaturesSection key={key} config={section} />;
      case 'news':
        return <NewsSection key={key} config={section} />;
      case 'gallery':
        return <GallerySection key={key} config={section} />;
      case 'booking':
        return <BookingSection key={key} config={section} asset={assets.booking_background_image} />;
      default:
        return null;
    }
  };

  return <>{config.section_order.map(renderSection)}</>;
}
