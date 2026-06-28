interface SectionHeadingProps {
  subtitle: string;
  title: string;
  light?: boolean;
}

export default function SectionHeading({ subtitle, title, light }: SectionHeadingProps) {
  return (
    <div className="text-center mb-12">
      <span className="section-subtitle">{subtitle}</span>
      <div className="star-divider">
        <span>★ ★ ★ ★ ★</span>
      </div>
      <h2
        className={`section-title text-3xl md:text-4xl lg:text-[48px] ${
          light ? '!text-slate-800' : ''
        }`}
      >
        {title}
      </h2>
    </div>
  );
}
