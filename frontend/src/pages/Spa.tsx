import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import { Link } from 'react-router-dom';
import { hotelImages } from '../constants/images';

const spaServices = [
  {
    title: 'Massage Therapy',
    desc: 'Full body relaxation massage with essential oils.',
    image: hotelImages.spa.services[0],
    price: 'BDT 120',
  },
  {
    title: 'Facial Treatment',
    desc: 'Deep cleansing and rejuvenating facial treatments.',
    image: hotelImages.spa.services[1],
    price: 'BDT 80',
  },
  {
    title: 'Body Scrub',
    desc: 'Exfoliating body scrub for glowing skin.',
    image: hotelImages.spa.services[2],
    price: 'BDT 95',
  },
  {
    title: 'Aromatherapy',
    desc: 'Relaxing aromatherapy session with natural essences.',
    image: hotelImages.spa.services[3],
    price: 'BDT 75',
  },
];

export default function Spa() {
  return (
    <>
      <PageHero
        title="Spa & Wellness"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Spa & Wellness' }]}
        backgroundImage={hotelImages.spa.hero}
      />

      {/* About Spa */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="EXPERIENCES" title="Spa Center" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <img
              src={hotelImages.spa.main}
              alt="Spa"
              className="w-full h-[400px] object-cover"
            />
            <div>
              <p className="text-[var(--color-body)] leading-relaxed mb-6">
                Indulge in a world of relaxation with our premium spa treatments at Hotel Crown.
                Designed to restore balance and rejuvenate both body and mind, each therapy offers
                a peaceful escape and a refreshing wellness experience.
              </p>
              <p className="text-[var(--color-body)] leading-relaxed mb-8">
                Whether you are unwinding after a long journey or treating yourself during your stay
                in Rajshahi, our spa team delivers attentive care in a calm and welcoming setting.
              </p>
              <Link to="/contact" className="btn-primary">
                BOOK A SESSION
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-[var(--color-light)]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="OUR SERVICES" title="Spa Services" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {spaServices.map((service, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 group overflow-hidden transition-all hover:shadow-md">
                <div className="overflow-hidden">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-[250px] object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                <div className="p-6 text-center">
                  <h4 className="font-[var(--font-heading)] text-lg text-[var(--color-dark)] mb-2">
                    {service.title}
                  </h4>
                  <p className="text-sm text-[var(--color-body)] mb-3">{service.desc}</p>
                  <span className="text-[var(--color-primary)] font-[var(--font-heading)] text-xl">
                    {service.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pool & Fitness */}
      <section className="py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div
            className="h-[400px] lg:h-auto bg-cover bg-center"
            style={{
              backgroundImage: `url(${hotelImages.spa.pool})`,
            }}
          />
          <div className="p-12 lg:p-16 flex flex-col justify-center bg-[var(--color-dark)]">
            <span className="section-subtitle">MODERN</span>
            <div className="star-divider !justify-start mt-4 mb-4">
              <span>★ ★ ★ ★ ★</span>
            </div>
            <h2 className="font-[var(--font-heading)] text-3xl md:text-4xl text-slate-800 mb-6">
              The Health Club & Pool
            </h2>
            <p className="text-slate-800/70 leading-relaxed mb-8">
              Relax and unwind with health club access and premium comfort facilities at Hotel Crown.
              A peaceful space designed for rejuvenation during your stay in Padma Abasik, Rajshahi.
            </p>
            <div>
              <Link to="/contact" className="btn-primary">
                LEARN MORE
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
