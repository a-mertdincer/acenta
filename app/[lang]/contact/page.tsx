import { getDictionary } from '../../dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';

export default async function ContactPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = (params.lang || 'en') as SiteLocale;
  const dict = await getDictionary(lang);

  return (
    <section className="page-section">
      <div className="container contact-page">
        <h1>{dict.navigation.contact ?? 'Contact'}</h1>
        <p className="contact-page-intro">
          {lang === 'tr'
            ? 'Sorulariniz ve ozel talepleriniz icin bizimle iletisime gecin.'
            : lang === 'zh'
              ? '如有问题或特殊需求，请联系我们。'
              : 'Reach us for any questions or custom travel requests.'}
        </p>
        <div className="contact-page-grid">
          <div className="contact-page-card">
            <h2>{lang === 'tr' ? 'Telefon' : lang === 'zh' ? '电话' : 'Phone'}</h2>
            <a href="tel:+903842123456">+90 384 212 34 56</a>
          </div>
          <div className="contact-page-card">
            <h2>{lang === 'tr' ? 'E-posta' : lang === 'zh' ? '电子邮件' : 'Email'}</h2>
            <a href="mailto:info@kismetgoreme.com">info@kismetgoreme.com</a>
          </div>
          <div className="contact-page-card">
            <h2>{lang === 'tr' ? 'Adres' : lang === 'zh' ? '地址' : 'Address'}</h2>
            <p>Goreme, Nevsehir, Turkiye</p>
          </div>
        </div>
      </div>
    </section>
  );
}
