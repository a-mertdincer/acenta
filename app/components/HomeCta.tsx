import Link from 'next/link';

type Lang = 'en' | 'tr' | 'zh';

interface HomeCtaProps {
  lang: Lang;
  title: string;
  buttonLabel: string;
}

export function HomeCta({ lang, title, buttonLabel }: HomeCtaProps) {
  return (
    <section className="home-cta page-section section-alt">
      <div className="container">
        <p className="home-cta-title">{title}</p>
        <div className="home-cta-actions">
          <Link href={`/${lang}/tours`} className="btn btn-primary btn-lg">
            {buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
