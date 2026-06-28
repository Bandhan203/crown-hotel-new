import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import { hotelImages } from '../constants/images';

export default function Restaurant() {
  return (
    <>
      <PageHero
        title="Restaurant"
        breadcrumbs={[{ name: 'Home', path: '/' }, { name: 'Restaurant' }]}
        backgroundImage={hotelImages.restaurant.hero}
      />

      {/* About Restaurant */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="FLAVORS OF LUXURY" title="The Restaurant" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[var(--color-body)] leading-relaxed mb-6">
                A perfect destination for delightful flavors, memorable meals, and exceptional dining
                experiences. Hotel Crown&apos;s multicuisine restaurant brings together local and
                international dishes in an elegant setting.
              </p>
              <p className="text-[var(--color-body)] leading-relaxed mb-8">
                From buffet breakfast to private dining and out/industrial catering, our culinary
                team is committed to quality service and a delightful dining experience for every guest.
              </p>
              <button className="btn-primary">VIEW MENU</button>
            </div>
            <img
              src={hotelImages.restaurant.main}
              alt="Restaurant"
              className="w-full h-[400px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* Menu Highlights */}
      <section className="py-20 bg-[var(--color-light)]">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="OUR MENU" title="Menu Highlights" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
            {[
              { name: 'Grilled Salmon', desc: 'Fresh Atlantic salmon, lemon butter sauce', price: 'BDT 32' },
              { name: 'Beef Tenderloin', desc: 'Prime cut, truffle mashed potatoes', price: 'BDT 45' },
              { name: 'Lobster Bisque', desc: 'Classic bisque, cream, herbs', price: 'BDT 18' },
              { name: 'Caesar Salad', desc: 'Romaine, parmesan, croutons, anchovy', price: 'BDT 14' },
              { name: 'Duck Confit', desc: 'Slow cooked leg, seasonal vegetables', price: 'BDT 38' },
              { name: 'Tiramisu', desc: 'Classic Italian dessert, espresso, mascarpone', price: 'BDT 12' },
              { name: 'Wine Selection', desc: 'Curated selection of fine wines', price: 'BDT 15+' },
              { name: 'Tasting Menu', desc: '7-course chef special tasting menu', price: 'BDT 85' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-start border-b border-gray-200 pb-4">
                <div>
                  <h4 className="font-[var(--font-heading)] text-lg text-[var(--color-dark)]">
                    {item.name}
                  </h4>
                  <p className="text-sm text-[var(--color-body)]">{item.desc}</p>
                </div>
                <span className="text-[var(--color-primary)] font-[var(--font-heading)] text-lg shrink-0 ml-4">
                  {item.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <SectionHeading subtitle="GALLERY" title="Restaurant Gallery" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {hotelImages.restaurant.gallery.map((img, i) => (
              <div key={i} className="overflow-hidden">
                <img
                  src={img}
                  alt={`Restaurant ${i + 1}`}
                  className="w-full h-[250px] object-cover hover:scale-110 transition-transform duration-700"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
