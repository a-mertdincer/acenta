import Link from 'next/link';
import type { SiteLocale } from '@/lib/i18n';
import { WHATSAPP_CONTACT_HREF } from '@/lib/contact';

interface HomeCtaProps {
  lang: SiteLocale;
  line1: string;
  line2: string;
  line3: string;
  exploreLabel: string;
  whatsappLabel: string;
}

export function HomeCta({ lang, line1, line2, line3, exploreLabel, whatsappLabel }: HomeCtaProps) {
  return (
    <section className="home-cta page-section" aria-labelledby="home-cta-heading">
      <div className="container">
        <h2 id="home-cta-heading" className="home-cta-title">
          {line1}
        </h2>
        <p className="home-cta-subtitle">{line2}</p>
        <p className="home-cta-line-muted">{line3}</p>
        <div className="home-cta-actions">
          <Link href={`/${lang}/tours`} className="btn btn-primary btn-lg">
            {exploreLabel}
          </Link>
          <a href={WHATSAPP_CONTACT_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg home-cta-wa">
            {whatsappLabel}
          </a>
        </div>
      </div>
    </section>
  );
}
