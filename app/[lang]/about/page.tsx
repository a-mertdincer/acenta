import { getDictionary } from '../../dictionaries/getDictionary';
import { normalizeLocale } from '@/lib/i18n';
import { WHATSAPP_CONTACT_HREF } from '@/lib/contact';

export default async function AboutPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = normalizeLocale(params?.lang);
  const dict = await getDictionary(lang);
  const about = (dict as { about?: Record<string, string> }).about ?? {};

  return (
    <section className="page-section">
      <div className="container about-page">
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
          <img src="/images/activities/culture-placeholder.svg" alt="" />
        </div>

        <div className="about-page-card">
          <h2>{about.welcomeTitle}</h2>
          <p>{about.body1}</p>
          <p>{about.body2}</p>
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
            <strong>24/7</strong>
            <span>{about.statSupport}</span>
          </div>
        </div>

        <p className="about-page-cta-wrap">
          <a className="btn btn-primary" href={WHATSAPP_CONTACT_HREF} target="_blank" rel="noopener noreferrer">
            {about.whatsappCta}
          </a>
        </p>
      </div>
    </section>
  );
}
