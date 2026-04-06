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
        <div className="about-page-hero">
          <img src="/images/activities/culture-placeholder.svg" alt="About Kismet Goreme Travel" />
        </div>
        <div className="about-page-card">
          <h2>{home.welcomeHeading ?? 'Welcome to Kismet Goreme'}</h2>
          <p>{home.welcomeBody1 ?? ''}</p>
          <p>{home.welcomeBody2 ?? ''}</p>
          <p>
            {lang === 'tr'
              ? 'Yerel rehberlerle calisiyor, guvenli ulasim ve net fiyat politikasi ile misafirlerimize sorunsuz bir deneyim sunuyoruz.'
              : lang === 'zh'
                ? '我们与本地向导合作，提供安全交通与透明价格，让每位客人都能安心出行。'
                : 'We work with local experts and trusted partners to deliver safe transportation, transparent pricing, and memorable experiences.'}
          </p>
        </div>
        <div className="about-page-stats">
          <div><strong>10+</strong><span>{lang === 'tr' ? 'Yil Tecrube' : lang === 'zh' ? '年经验' : 'Years'}</span></div>
          <div><strong>500+</strong><span>{lang === 'tr' ? 'Mutlu Misafir' : lang === 'zh' ? '满意客人' : 'Guests'}</span></div>
          <div><strong>24/7</strong><span>{lang === 'tr' ? 'Destek' : lang === 'zh' ? '支持' : 'Support'}</span></div>
        </div>
        <a className="btn btn-primary" href="https://wa.me/905551234567" target="_blank" rel="noopener noreferrer">
          {lang === 'tr' ? 'WhatsApp ile iletisime gec' : lang === 'zh' ? 'WhatsApp 联系我们' : 'Contact via WhatsApp'}
        </a>
      </div>
    </section>
  );
}
