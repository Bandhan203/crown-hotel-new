import SectionHeading from '../SectionHeading';
import { FiPhone } from 'react-icons/fi';
import { hotelImages } from '../../constants/images';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import { toMediaUrl } from '../../utils/mediaUrl';

const DEFAULT_BODY =
  'Discover a world of comfort and refined hospitality. Ideally located in Padma Abasik, Rajshahi, the hotel offers elegant accommodations, contemporary facilities, and attentive service in a welcoming environment. From relaxing stays to business visits, every detail is thoughtfully designed to provide an exceptional guest experience.';

export default function AboutSection() {
  const { getSetting } = useSiteSettings();

  const title = getSetting('about_title', 'Experience Comfort, Luxury & Hospitality');
  const body = getSetting('about_body', DEFAULT_BODY);
  const address = getSetting(
    'contact_address',
    'Padma Abasik, Rajshahi, Bangladesh (Rajshahi - 6200). House# 310, Road 7, Padma housing state, Padma abasik, Boalia, Rajshahi city, Rajshahi.',
  );
  const phone = getSetting('contact_phone', '01334 945 375');
  const phoneHref = getSetting('contact_phone_href', '01334945375');
  const aboutImage = toMediaUrl(getSetting('about_image', ''), hotelImages.about);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHeading subtitle="HOTEL CROWN" title={title} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[var(--color-body)] leading-relaxed mb-6 whitespace-pre-line">{body}</p>
            <p className="text-[var(--color-body)] leading-relaxed mb-8">{address}</p>
            <div className="flex items-center gap-4">
              <span className="text-[var(--color-primary)] text-sm font-[var(--font-condensed)] uppercase tracking-[3px]">
                Front Office
              </span>
              <a
                href={`tel:${phoneHref}`}
                className="flex items-center gap-2 text-lg font-[var(--font-heading)] text-[var(--color-dark)] hover:text-[var(--color-primary)]"
              >
                <FiPhone className="text-[var(--color-primary)]" />
                {phone}
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={aboutImage}
              alt="Hotel Crown"
              className="w-full h-[500px] object-cover"
            />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 border-2 border-[var(--color-primary)] hidden lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
