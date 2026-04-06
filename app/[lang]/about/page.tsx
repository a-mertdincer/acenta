import { getDictionary } from '../../dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';

export default async function AboutPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = (params.lang || 'en') as SiteLocale;
  const dict = await getDictionary(lang);
  const home = dict.home as Record<string, string>;

  return (
    <section className="page-section">
      <div className="container about-page">
        <h1>{dict.navigation.aboutUs ?? 'About Us'}</h1>
        <p className="about-page-intro">{home.welcomeTagline ?? 'Your trusted travel partner in Cappadocia'}</p>
        <div className="about-page-card">
          <h2>{home.welcomeHeading ?? 'Welcome to Kismet Goreme'}</h2>
          <p>{home.welcomeBody1 ?? ''}</p>
          <p>{home.welcomeBody2 ?? ''}</p>
        </div>
      </div>
    </section>
  );
}
