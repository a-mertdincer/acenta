import Link from 'next/link';

type Lang = 'en' | 'tr' | 'zh';

interface HomeCtaProps {
  lang: Lang;
  title: string;
  buttonLabel: string;
  subtitle?: string;
}

export function HomeCta({ lang, title, buttonLabel, subtitle }: HomeCtaProps) {
  return (
    <section className="home-cta page-section">
      <div className="container">
        <h2 className="home-cta-title">{title}</h2>
        {subtitle && <p className="home-cta-subtitle">{subtitle}</p>}
        <div className="home-cta-actions">
          <Link href={`/${lang}/tours`} className="btn btn-primary btn-lg">
            {buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
