import { Link } from 'react-router-dom';
import { hotelImages } from '../constants/images';

interface PageHeroProps {
  title: string;
  breadcrumbs: { name: string; path?: string }[];
  backgroundImage?: string;
}

export default function PageHero({ title, breadcrumbs, backgroundImage }: PageHeroProps) {
  return (
    <section
      className="relative h-[60vh] min-h-[400px] flex items-center justify-center text-center bg-cover bg-center"
      style={{
        backgroundImage: backgroundImage
          ? `url(${backgroundImage})`
          : `url(${hotelImages.pageHero})`,
      }}
    >
      <div className="overlay" />
      <div className="relative z-10 text-slate-800">
        <div className="star-divider mb-4">
          <span>★ ★ ★ ★ ★</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-[var(--font-heading)] text-slate-800 mb-4">
          {title}
        </h1>
        <div className="flex items-center justify-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.name} className="flex items-center gap-2">
              {index > 0 && <span className="text-[var(--color-primary)]">/</span>}
              {crumb.path ? (
                <Link to={crumb.path} className="hover:text-[var(--color-primary)] transition-colors">
                  {crumb.name}
                </Link>
              ) : (
                <span className="text-[var(--color-primary)]">{crumb.name}</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
