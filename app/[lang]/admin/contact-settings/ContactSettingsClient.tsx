'use client';

import { useState, useTransition, type FormEvent } from 'react';
import {
  updateMessagingSettings,
  updateSocialSettings,
  updateContactInfo,
} from '@/app/actions/siteSettings';
import type { MessagingLinks, SocialLinks, ContactInfo } from '@/lib/messagingSettings';

type Props = {
  initialMessaging: MessagingLinks;
  initialSocial: SocialLinks;
  initialContact: ContactInfo;
};

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'url' | 'email' | 'tel';
  hint?: string;
}) {
  return (
    <label className="admin-contact-settings-label">
      <span>{label}</span>
      <input
        type={type}
        className="admin-contact-settings-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {hint ? <small style={{ color: 'var(--color-text-muted)' }}>{hint}</small> : null}
    </label>
  );
}

export function ContactSettingsClient({ initialMessaging, initialSocial, initialContact }: Props) {
  const [messaging, setMessaging] = useState<MessagingLinks>(initialMessaging);
  const [social, setSocial] = useState<SocialLinks>(initialSocial);
  const [contact, setContact] = useState<ContactInfo>(initialContact);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const [m, s, c] = await Promise.all([
        updateMessagingSettings(messaging),
        updateSocialSettings(social),
        updateContactInfo(contact),
      ]);
      if (!m.ok) return setError(m.error ?? 'Mesajlaşma ayarları kaydedilemedi');
      if (!s.ok) return setError(s.error ?? 'Sosyal medya ayarları kaydedilemedi');
      if (!c.ok) return setError(c.error ?? 'İletişim bilgileri kaydedilemedi');
      setMessage('Kaydedildi.');
    });
  };

  return (
    <form onSubmit={submit} className="admin-contact-settings-form" style={{ display: 'grid', gap: 'var(--space-xl)' }}>
      <section>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Mesajlaşma uygulamaları</h2>
        <div className="admin-contact-settings-fields">
          <Field
            label="WhatsApp linki"
            type="url"
            value={messaging.whatsapp_link}
            onChange={(v) => setMessaging((p) => ({ ...p, whatsapp_link: v }))}
            placeholder="https://wa.me/..."
          />
          <Field
            label="WeChat ID"
            value={messaging.wechat_id}
            onChange={(v) => setMessaging((p) => ({ ...p, wechat_id: v }))}
            placeholder="kullanıcı adı"
            hint="Doğrudan bağlantı yok; ziyaretçiye ID gösterilir."
          />
          <Field
            label="LINE linki"
            type="url"
            value={messaging.line_link}
            onChange={(v) => setMessaging((p) => ({ ...p, line_link: v }))}
            placeholder="https://line.me/..."
          />
          <Field
            label="Telegram linki"
            type="url"
            value={messaging.telegram_link}
            onChange={(v) => setMessaging((p) => ({ ...p, telegram_link: v }))}
            placeholder="https://t.me/..."
          />
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>Sosyal medya</h2>
        <div className="admin-contact-settings-fields">
          <Field
            label="Instagram"
            type="url"
            value={social.instagram_link}
            onChange={(v) => setSocial((p) => ({ ...p, instagram_link: v }))}
            placeholder="https://instagram.com/..."
          />
          <Field
            label="Facebook"
            type="url"
            value={social.facebook_link}
            onChange={(v) => setSocial((p) => ({ ...p, facebook_link: v }))}
            placeholder="https://facebook.com/..."
          />
          <Field
            label="TripAdvisor"
            type="url"
            value={social.tripadvisor_link}
            onChange={(v) => setSocial((p) => ({ ...p, tripadvisor_link: v }))}
            placeholder="https://tripadvisor.com/..."
          />
          <Field
            label="Rednote (Xiaohongshu)"
            type="url"
            value={social.rednote_link}
            onChange={(v) => setSocial((p) => ({ ...p, rednote_link: v }))}
            placeholder="https://xiaohongshu.com/..."
          />
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>İletişim bilgileri</h2>
        <div className="admin-contact-settings-fields">
          <Field
            label="Adres"
            value={contact.contact_address}
            onChange={(v) => setContact((p) => ({ ...p, contact_address: v }))}
            placeholder="İsali-Gaferli-Avcılar Mah. ..."
          />
          <Field
            label="Telefon"
            type="tel"
            value={contact.contact_phone}
            onChange={(v) => setContact((p) => ({ ...p, contact_phone: v }))}
            placeholder="+90 536 211 59 93"
          />
          <Field
            label="E-posta"
            type="email"
            value={contact.contact_email}
            onChange={(v) => setContact((p) => ({ ...p, contact_email: v }))}
            placeholder="info@kismetgoremetravel.com"
          />
          <Field
            label="TÜRSAB No"
            value={contact.contact_tursab}
            onChange={(v) => setContact((p) => ({ ...p, contact_tursab: v }))}
            placeholder="18701"
          />
          <Field
            label="Google Maps embed URL"
            type="url"
            value={contact.contact_maps_embed_url}
            onChange={(v) => setContact((p) => ({ ...p, contact_maps_embed_url: v }))}
            placeholder="https://www.google.com/maps/embed?..."
            hint="Google Maps'ten 'Paylaş → Harita yerleştir' seçeneğinden alınan iframe src'si."
          />
        </div>
      </section>

      <p className="admin-contact-settings-help">
        Boş bırakılan alanlar sitede gösterilmez. Mesajlaşma/sosyal medya simgeleri yalnızca link girildiğinde görünür.
      </p>
      {message ? <p className="admin-contact-settings-success">{message}</p> : null}
      {error ? <p className="admin-contact-settings-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={pending} style={{ justifySelf: 'start' }}>
        {pending ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  );
}
