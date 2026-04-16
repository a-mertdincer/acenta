import { getDictionary } from '../../dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';
import { getMessagingLinks, getContactInfo } from '@/app/actions/siteSettings';
import { ContactMessagingSection } from '@/app/components/ContactMessagingSection';

export const dynamic = 'force-dynamic';

export default async function ContactPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = (params.lang || 'en') as SiteLocale;
  const dict = await getDictionary(lang);
  const c = dict.contactPage ?? {};
  const [messaging, contactInfo] = await Promise.all([getMessagingLinks(), getContactInfo()]);
  const phoneTel = `tel:${contactInfo.contact_phone.replace(/[^+\d]/g, '')}`;

  return (
    <section className="page-section">
      <div className="container contact-page">
        <h1>{c.pageTitle ?? dict.navigation.contact ?? 'Contact'}</h1>
        <p className="contact-page-intro">{c.pageDescription ?? 'Reach us for any questions or custom travel requests.'}</p>
        <div className="contact-page-grid">
          <div className="contact-page-card">
            <h2>{c.phone ?? (lang === 'zh' ? '电话' : 'Phone')}</h2>
            <a href={phoneTel}>{contactInfo.contact_phone}</a>
          </div>
          <div className="contact-page-card">
            <h2>{c.email ?? (lang === 'zh' ? '电子邮件' : 'Email')}</h2>
            <a href={`mailto:${contactInfo.contact_email}`}>{contactInfo.contact_email}</a>
          </div>
          <div className="contact-page-card">
            <h2>{c.addressLabel ?? (lang === 'zh' ? '地址' : 'Address')}</h2>
            <p>{contactInfo.contact_address}</p>
          </div>
        </div>
        <ContactMessagingSection
          whatsappLink={messaging.whatsapp_link}
          wechatId={messaging.wechat_id}
          lineLink={messaging.line_link}
          telegramLink={messaging.telegram_link}
          labels={{
            messagingTitle: c.messagingTitle ?? 'Chat with us',
            whatsapp: c.whatsapp ?? 'WhatsApp',
            wechat: c.wechat ?? 'WeChat',
            line: c.line ?? 'LINE',
            telegram: (c as { telegram?: string }).telegram ?? 'Telegram',
            chatNow: c.chatNow ?? 'Chat now',
            addUs: c.addUs ?? 'Add us',
            wechatHint: c.wechatHint ?? 'Add us on WeChat using this ID:',
            messagingClose: c.messagingClose ?? 'Close',
          }}
        />
        <div className="contact-form-card">
          <h2>{c.messageTitle ?? 'Send us a message'}</h2>
          <form className="contact-form-grid" action="#">
            <InputLike label={c.formName ?? 'Name'} />
            <InputLike label={c.formEmail ?? 'Email'} />
            <SelectLike label={c.formSubject ?? 'Subject'} general={c.subjectGeneral ?? 'General'} booking={c.subjectBooking ?? 'Booking'} support={c.subjectSupport ?? 'Support'} />
            <TextareaLike label={c.formMessage ?? 'Message'} />
            <button type="button" className="btn btn-primary">
              {c.formSend ?? 'Send'}
            </button>
          </form>
        </div>
        {contactInfo.contact_maps_embed_url ? (
          <div className="contact-map-wrap">
            <iframe
              title="Kismet Goreme map"
              src={contactInfo.contact_maps_embed_url}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : null}
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

function SelectLike({ label, general, booking, support }: { label: string; general: string; booking: string; support: string }) {
  return (
    <label className="contact-form-field">
      <span>{label}</span>
      <select>
        <option value="">{general}</option>
        <option value="booking">{booking}</option>
        <option value="support">{support}</option>
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
