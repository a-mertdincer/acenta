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
        <div className="contact-form-card">
          <h2>{lang === 'tr' ? 'Bize Mesaj Gonderin' : lang === 'zh' ? '给我们留言' : 'Send us a message'}</h2>
          <form className="contact-form-grid" action="#">
            <InputLike label={lang === 'tr' ? 'Ad Soyad' : lang === 'zh' ? '姓名' : 'Name'} />
            <InputLike label={lang === 'tr' ? 'E-posta' : lang === 'zh' ? '电子邮件' : 'Email'} />
            <SelectLike label={lang === 'tr' ? 'Konu' : lang === 'zh' ? '主题' : 'Subject'} />
            <TextareaLike label={lang === 'tr' ? 'Mesaj' : lang === 'zh' ? '消息' : 'Message'} />
            <button type="button" className="btn btn-primary">
              {lang === 'tr' ? 'Gonder' : lang === 'zh' ? '发送' : 'Send'}
            </button>
          </form>
        </div>
        <div className="contact-map-wrap">
          <iframe
            title="Kismet Goreme map"
            src="https://maps.google.com/maps?q=Goreme%20Nevsehir%20Turkey&t=&z=13&ie=UTF8&iwloc=&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function InputLike({ label }: { label: string }) {
  return (
    <label className="contact-form-field">
      <span>{label}</span>
      <input type="text" />
    </label>
  );
}

function SelectLike({ label }: { label: string }) {
  return (
    <label className="contact-form-field">
      <span>{label}</span>
      <select>
        <option value="">General</option>
        <option value="booking">Booking</option>
        <option value="support">Support</option>
      </select>
    </label>
  );
}

function TextareaLike({ label }: { label: string }) {
  return (
    <label className="contact-form-field contact-form-field-wide">
      <span>{label}</span>
      <textarea rows={4} />
    </label>
  );
}
