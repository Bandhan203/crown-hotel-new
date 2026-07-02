import { FaPlay } from 'react-icons/fa';
import { hotelImages } from '../../constants/images';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { toMediaUrl } from '../../utils/mediaUrl';

export default function VideoSection() {
  const { getSetting } = useSiteSettings();

  const videoUrl = getSetting('home_video_url', 'https://youtu.be/7BGNAGahig8');
  const videoTitle = getSetting('home_video_title', 'Experience Rajshahi');
  const videoImage = toMediaUrl(getSetting('home_video_image', ''), hotelImages.video);

  return (
    <section
      className="relative h-[50vh] min-h-[280px] sm:min-h-[400px] md:h-[70vh] bg-cover bg-center max-md:bg-scroll md:bg-fixed flex items-center justify-center"
      style={{ backgroundImage: `url(${videoImage})` }}
    >
      <div className="overlay" />
      <div className="relative z-10 text-center text-slate-800">
        <span className="font-[var(--font-condensed)] text-sm tracking-[6px] uppercase text-[var(--color-primary)]">
          HOTEL CROWN
        </span>
        <h2 className="font-[var(--font-heading)] text-3xl md:text-5xl text-slate-800 mt-4 mb-8">
          {videoTitle}
        </h2>
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-white/50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)] transition-all group"
        >
          <FaPlay className="text-slate-800 ml-1 group-hover:scale-110 transition-transform" size={20} />
        </a>
      </div>
    </section>
  );
}
