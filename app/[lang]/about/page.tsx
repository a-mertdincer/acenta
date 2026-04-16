import Link from 'next/link';
import type { ReactNode } from 'react';
import { getDictionary } from '../../dictionaries/getDictionary';
import { normalizeLocale } from '@/lib/i18n';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

function renderBody2(text: string): ReactNode[] {
  const parts = text.split(/(\{\{caveHouse\}\}|\{\{caveMansion\}\})/);
  return parts.map((part, i) => {
    if (part === '{{caveHouse}}') {
      return (
        <a key={`ch-${i}`} href="https://kismetcavehouse.com" target="_blank" rel="noopener noreferrer">
          Kismet Cave House (2006)
        </a>
      );
    }
    if (part === '{{caveMansion}}') {
      return (
        <a key={`cm-${i}`} href="https://kismetcavemansion.com" target="_blank" rel="noopener noreferrer">
          Kismet Cave Mansion (2025)
        </a>
      );
    }
    return <span key={`t-${i}`}>{part}</span>;
  });
}

export default async function AboutPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = normalizeLocale(params?.lang);
  const dict = await getDictionary(lang);
  const about = (dict as { about?: Record<string, string> }).about ?? {};
  const nav = (dict as { navigation?: Record<string, string> }).navigation ?? {};

  return (
    <section className="page-section">
      <div className="container about-page">
        <Breadcrumbs
          items={[
            { label: nav.home ?? 'Home', href: `/${lang}` },
            { label: about.title ?? nav.aboutUs ?? 'About Us' },
          ]}
        />
        <h1>{about.title ?? 'About Us'}</h1>

        <section className="about-badges-band" aria-label="Trust badges">
          <ul className="about-badges-row">
            <li className="about-badge-item">{about.badgeReliable}</li>
            <li className="about-badge-sep" aria-hidden>
              |
            </li>
            <li className="about-badge-item">{about.badgeGenerations}</li>
            <li className="about-badge-sep" aria-hidden>
              |
            </li>
            <li className="about-badge-item">{about.badgeSupport}</li>
          </ul>
          <p className="about-badges-tagline">{about.tagline}</p>
        </section>

        <div className="about-page-hero">
          <img
            src="/images/about-hero.png"
            alt={about.title ?? 'About'}
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="about-page-card">
          <h2>{about.welcomeTitle}</h2>
          <p>{about.body1}</p>
          <p>{about.body2 ? renderBody2(about.body2) : null}</p>
          <p>{about.body3}</p>
          <p>{about.body4}</p>

          <h3 className="about-difference-title">{about.differenceTitle}</h3>
          <ul className="about-difference-list">
            <li>{about.diff1}</li>
            <li>{about.diff2}</li>
            <li>{about.diff3}</li>
            <li>{about.diff4}</li>
            <li>{about.diff5}</li>
          </ul>

          <p className="about-closing">{about.closingText}</p>
        </div>

        <div className="about-page-stats">
          <div>
            <strong>10+</strong>
            <span>{about.statYears}</span>
          </div>
          <div>
            <strong>500+</strong>
            <span>{about.statGuests}</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>{about.statLocal ?? 'Local Experience'}</span>
          </div>
        </div>

        <div className="about-page-cta-wrap">
          <Link className="btn btn-primary" href={`/${lang}/tours`}>
            {about.exploreButton ?? 'Explore'}
          </Link>
          <Link className="btn btn-secondary" href={`/${lang}/contact`}>
            {about.contactButton ?? nav.contact ?? 'Contact'}
          </Link>
        </div>
      </div>
    </section>
  );
}
