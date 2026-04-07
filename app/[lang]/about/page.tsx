import { getDictionary } from '../../dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';

export default async function AboutPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = (params.lang || 'en') as SiteLocale;
  const dict = await getDictionary(lang);
  const home = dict.home as Record<string, string>;
  const about = dict.about ?? {};

  return (
    <section className="page-section">
      <div className="container about-page">
        <h1>{about.title ?? dict.navigation.aboutUs ?? 'About Us'}</h1>
        <p className="about-page-intro">{about.tagline ?? home.welcomeTagline ?? 'Your trusted travel partner in Cappadocia'}</p>
        <div className="about-page-hero">
          <img src="/images/activities/culture-placeholder.svg" alt="About Kismet Goreme Travel" />
        </div>
        <div className="about-page-card">
          <h2>{home.welcomeHeading ?? 'Welcome to Kismet Goreme'}</h2>
          <p>{home.welcomeBody1 ?? ''}</p>
          <p>{home.welcomeBody2 ?? ''}</p>
          <p>{about.body3 ?? 'We work with local experts and trusted partners to deliver safe transportation, transparent pricing, and memorable experiences.'}</p>
        </div>
        <div className="about-page-stats">
          <div><strong>10+</strong><span>{about.statYears ?? 'Years'}</span></div>
          <div><strong>500+</strong><span>{about.statGuests ?? 'Guests'}</span></div>
          <div><strong>24/7</strong><span>{about.statSupport ?? 'Support'}</span></div>
        </div>
        <a className="btn btn-primary" href="https://wa.me/905551234567" target="_blank" rel="noopener noreferrer">
          {about.whatsappCta ?? 'Contact via WhatsApp'}
        </a>
      </div>
    </section>
  );
}
