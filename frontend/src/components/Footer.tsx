import { Link } from 'react-router-dom';
import { FiPhone, FiMail, FiMapPin } from 'react-icons/fi';
import { FaFacebookF, FaTwitter, FaInstagram, FaPinterestP, FaWhatsapp } from 'react-icons/fa';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export default function Footer() {
  const { getSetting } = useSiteSettings();

  const siteName = getSetting('site_name', 'Hotel Crown');
  const siteTagline = getSetting('site_tagline', 'Experience Comfort, Luxury & Hospitality. Ideally located in Padma Abasik, Rajshahi, Hotel Crown offers elegant accommodations and attentive service.');
  const contactAddress = getSetting('contact_address', 'House# 310, Road 2, Padma housing state, Padma abasik, Boalia, Rajshahi city, Rajshahi.');
  const contactPhone = getSetting('contact_phone', 'Front Office: 01334 945 375 | Reservations: 01334 945 376, 01334 945 377');
  const contactPhoneHref = getSetting('contact_phone_href', '01334945375');
  const contactEmail = getSetting('contact_email', 'hotelcrownbd@gmail.com');
  const facebookUrl = getSetting('social_facebook', 'https://facebook.com/hotelcrownbd');
  const twitterUrl = getSetting('social_twitter', 'https://twitter.com/hotelcrownbd');
  const instagramUrl = getSetting('social_instagram', 'https://instagram.com/hotelcrownbd');
  const pinterestUrl = getSetting('social_pinterest', 'https://pinterest.com/hotelcrownbd');
  const whatsappUrl = getSetting('social_whatsapp', 'https://wa.me/8801334945375');
  const copyrightText = getSetting('footer_copyright', `© Copyright ${new Date().getFullYear()} ${siteName}. All Rights Reserved.`);

  const socialLinks = [
    { Icon: FaFacebookF, href: facebookUrl, label: 'Facebook' },
    { Icon: FaTwitter, href: twitterUrl, label: 'Twitter' },
    { Icon: FaInstagram, href: instagramUrl, label: 'Instagram' },
    { Icon: FaPinterestP, href: pinterestUrl, label: 'Pinterest' },
    { Icon: FaWhatsapp, href: whatsappUrl, label: 'WhatsApp' },
  ];

  return (
    <footer className="bg-[var(--color-dark)] text-slate-800/70">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* About Hotel */}
          <div>
            <h3 className="text-slate-800 text-xl font-[var(--font-heading)] mb-6">About Hotel</h3>
            <p className="text-sm leading-relaxed mb-6">
              {siteTagline}
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ Icon, href, label }, i) => (
                  <a
                    key={i}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="w-10 h-10 border border-gray-300 flex items-center justify-center text-slate-800/50 hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] hover:text-slate-800 transition-all"
                  >
                    <Icon size={14} />
                  </a>
                ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-slate-800 text-xl font-[var(--font-heading)] mb-6">Explore</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Home', path: '/' },
                { name: 'Rooms & Suites', path: '/rooms' },
                { name: 'Restaurant', path: '/restaurant' },
                { name: 'Spa & Wellness', path: '/spa' },
                { name: 'About Hotel', path: '/about' },
                { name: 'Contact', path: '/contact' },
                { name: 'Gallery', path: '/gallery' },
                { name: 'News', path: '/news' },
              ].map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm hover:text-[var(--color-primary)] transition-colors py-1"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-slate-800 text-xl font-[var(--font-heading)] mb-6">Contact</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <FiMapPin className="text-[var(--color-primary)] mt-1 shrink-0" />
                <span className="text-sm whitespace-pre-line">{contactAddress}</span>
              </div>
              <div className="flex items-center gap-3">
                <FiPhone className="text-[var(--color-primary)] shrink-0" />
                <a href={`tel:${contactPhoneHref}`} className="text-sm hover:text-[var(--color-primary)]">
                  {contactPhone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <FiMail className="text-[var(--color-primary)] shrink-0" />
                <a href={`mailto:${contactEmail}`} className="text-sm hover:text-[var(--color-primary)]">
                  {contactEmail}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <FiMapPin className="text-[var(--color-primary)] shrink-0 opacity-0" />
                <a
                  href="https://www.hotelcrownbd.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm hover:text-[var(--color-primary)]"
                >
                  www.hotelcrownbd.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-800/40">
            {copyrightText}
          </p>
          <div className="flex gap-6">
            <Link to="/faq" className="text-xs text-slate-800/40 hover:text-[var(--color-primary)]">
              Terms & Conditions
            </Link>
            <Link to="/contact" className="text-xs text-slate-800/40 hover:text-[var(--color-primary)]">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
