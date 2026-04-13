'use client';

import { useState, useMemo } from 'react';
import { submitPriceInquiry } from '@/app/actions/priceInquiry';
import enDict from '@/app/dictionaries/en.json';
import trDict from '@/app/dictionaries/tr.json';
import zhDict from '@/app/dictionaries/zh.json';

type Lang = 'en' | 'tr' | 'zh';
type AskDict = {
  button: string;
  title: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  date: string;
  people: string;
  hotel: string;
  message: string;
  close: string;
  send: string;
  success: string;
};

const DICTS: Record<Lang, { askForPrice?: AskDict }> = {
  en: enDict as { askForPrice?: AskDict },
  tr: trDict as { askForPrice?: AskDict },
  zh: zhDict as { askForPrice?: AskDict },
};

const DIAL_DEFAULTS = ['+90', '+1', '+44', '+49', '+33', '+86', '+81', '+82'];

function getAskStrings(lang: Lang): AskDict {
  const from = DICTS[lang]?.askForPrice ?? DICTS.en.askForPrice;
  if (from) return from;
  return {
    button: 'Ask for Price',
    title: 'Ask for Price',
    name: 'Name Surname',
    email: 'E-mail',
    phone: 'Phone Number',
    country: 'Country',
    date: 'Choose date',
    people: 'Number of people',
    hotel: 'Hotel Name or Cruise',
    message: 'Forward your message',
    close: 'Close',
    send: 'Send',
    success: 'Your inquiry has been received. We will get back to you shortly.',
  };
}

export function AskForPriceModal({
  tourId,
  lang,
  isOpen,
  onClose,
}: {
  tourId: string;
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
}) {
  const a = useMemo(() => getAskStrings(lang), [lang]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneDial, setPhoneDial] = useState('+90');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [country, setCountry] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [people, setPeople] = useState(1);
  const [hotelOrCruise, setHotelOrCruise] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await submitPriceInquiry({
      tourId,
      name,
      email,
      phoneDial,
      phoneLocal,
      country,
      preferredDate,
      people,
      hotelOrCruise,
      message,
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      return;
    }
    setError(res.error);
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    setName('');
    setEmail('');
    setPhoneDial('+90');
    setPhoneLocal('');
    setCountry('');
    setPreferredDate('');
    setPeople(1);
    setHotelOrCruise('');
    setMessage('');
    onClose();
  };

  return (
    <div className="ask-for-price-backdrop" role="dialog" aria-modal="true" aria-labelledby="ask-for-price-title">
      <div className="ask-for-price-dialog">
        <div className="ask-for-price-dialog-header">
          <h2 id="ask-for-price-title" className="ask-for-price-dialog-title">
            {a.title}
          </h2>
          <button type="button" className="ask-for-price-dialog-close" onClick={handleClose} aria-label={a.close}>
            ×
          </button>
        </div>
        {success ? (
          <p className="ask-for-price-success">{a.success}</p>
        ) : (
          <form className="ask-for-price-form" onSubmit={handleSubmit}>
            <div className="ask-for-price-grid">
              <label className="ask-for-price-field">
                <span className="ask-for-price-label">{a.name} *</span>
                <input
                  className="ask-for-price-input"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  required
                  autoComplete="name"
                />
              </label>
              <label className="ask-for-price-field">
                <span className="ask-for-price-label">{a.email} *</span>
                <input
                  className="ask-for-price-input"
                  type="email"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label className="ask-for-price-field ask-for-price-field--phone">
                <span className="ask-for-price-label">{a.phone} *</span>
                <div className="ask-for-price-phone-row">
                  <select
                    className="ask-for-price-input ask-for-price-dial"
                    value={phoneDial}
                    onChange={(ev) => setPhoneDial(ev.target.value)}
                    aria-label="Dial code"
                  >
                    {DIAL_DEFAULTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    className="ask-for-price-input ask-for-price-phone-local"
                    value={phoneLocal}
                    onChange={(ev) => setPhoneLocal(ev.target.value)}
                    required
                    autoComplete="tel-national"
                    inputMode="tel"
                  />
                </div>
              </label>
              <label className="ask-for-price-field">
                <span className="ask-for-price-label">{a.country} *</span>
                <input
                  className="ask-for-price-input"
                  value={country}
                  onChange={(ev) => setCountry(ev.target.value)}
                  required
                  autoComplete="country-name"
                />
              </label>
              <label className="ask-for-price-field">
                <span className="ask-for-price-label">{a.date} *</span>
                <input
                  className="ask-for-price-input"
                  type="date"
                  value={preferredDate}
                  onChange={(ev) => setPreferredDate(ev.target.value)}
                  required
                />
              </label>
              <label className="ask-for-price-field">
                <span className="ask-for-price-label">{a.people}</span>
                <select
                  className="ask-for-price-input"
                  value={people}
                  onChange={(ev) => setPeople(Number(ev.target.value))}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="ask-for-price-field ask-for-price-field--full">
              <span className="ask-for-price-label">{a.hotel}</span>
              <input
                className="ask-for-price-input"
                value={hotelOrCruise}
                onChange={(ev) => setHotelOrCruise(ev.target.value)}
                autoComplete="organization"
              />
            </label>
            <label className="ask-for-price-field ask-for-price-field--full">
              <span className="ask-for-price-label">{a.message}</span>
              <textarea
                className="ask-for-price-textarea"
                value={message}
                onChange={(ev) => setMessage(ev.target.value)}
                rows={4}
              />
            </label>
            {error ? <p className="ask-for-price-error">{error}</p> : null}
            <div className="ask-for-price-actions">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                {a.close}
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {a.send}
              </button>
            </div>
          </form>
        )}
        {success ? (
          <div className="ask-for-price-actions">
            <button type="button" className="btn btn-primary" onClick={handleClose}>
              {a.close}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AskForPriceBookingBlock({ tourId, lang }: { tourId: string; lang: Lang }) {
  const a = useMemo(() => getAskStrings(lang), [lang]);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-primary ask-for-price-open-btn" onClick={() => setOpen(true)}>
        {a.button}
      </button>
      <AskForPriceModal tourId={tourId} lang={lang} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
