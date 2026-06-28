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

export default function Home() {
  return (
    <>
      <HeroSlider />
      <AboutSection />
      <RoomsSection />
      <PricingSection />
      <VideoSection />
      <FacilitiesSection />
      <TestimonialsSection />
      <FeaturesSection />
      <NewsSection />
      <GallerySection />
      <BookingSection />
    </>
  );
}
