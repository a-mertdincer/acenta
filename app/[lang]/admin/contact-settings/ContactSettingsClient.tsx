'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { updateMessagingSettings } from '@/app/actions/siteSettings';

type Props = {
  initial: {
    whatsapp_link: string;
    wechat_id: string;
    line_link: string;
  };
};

export function ContactSettingsClient({ initial }: Props) {
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp_link);
  const [wechat, setWechat] = useState(initial.wechat_id);
  const [line, setLine] = useState(initial.line_link);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await updateMessagingSettings({
        whatsapp_link: whatsapp,
        wechat_id: wechat,
        line_link: line,
      });
      if (res.ok) {
        setMessage('Kaydedildi.');
      } else {
        setError(res.error ?? 'Kayıt başarısız');
      }
    });
  };

  return (
    <form onSubmit={submit} className="admin-contact-settings-form">
      <div className="admin-contact-settings-fields">
        <label className="admin-contact-settings-label">
          <span>WhatsApp linki</span>
          <input
            type="url"
            name="whatsapp_link"
            className="admin-contact-settings-input"
            value={whatsapp}
            onChange={(ev) => setWhatsapp(ev.target.value)}
            placeholder="https://wa.me/..."
            autoComplete="off"
          />
        </label>
        <label className="admin-contact-settings-label">
          <span>WeChat ID</span>
          <input
            type="text"
            name="wechat_id"
            className="admin-contact-settings-input"
            value={wechat}
            onChange={(ev) => setWechat(ev.target.value)}
            placeholder="kullanıcı adı"
            autoComplete="off"
          />
        </label>
        <label className="admin-contact-settings-label">
          <span>LINE linki</span>
          <input
            type="url"
            name="line_link"
            className="admin-contact-settings-input"
            value={line}
            onChange={(ev) => setLine(ev.target.value)}
            placeholder="https://line.me/..."
            autoComplete="off"
          />
        </label>
      </div>
      <p className="admin-contact-settings-help">
        Boş bırakılan uygulama iletişim sayfasında gösterilmez. WeChat için doğrudan bağlantı yok; ziyaretçiye ID gösterilir.
      </p>
      {message ? <p className="admin-contact-settings-success">{message}</p> : null}
      {error ? <p className="admin-contact-settings-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Kaydet'}
      </button>
    </form>
  );
}
