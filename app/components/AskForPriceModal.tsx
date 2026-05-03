'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { submitPriceInquiry } from '@/app/actions/priceInquiry';

export type AskForPriceStrings = {
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

const DIAL_DEFAULTS = ['+90', '+1', '+44', '+49', '+33', '+86', '+81', '+82'];

export type AskForPricePrefill = {
  preferredDate?: string;
  people?: number;
  message?: string;
  hotelOrCruise?: string;
};

export function AskForPriceModal({
  tourId,
  strings,
  isOpen,
  onClose,
  initialPrefill,
}: {
  tourId: string;
  strings: AskForPriceStrings;
  isOpen: boolean;
  onClose: () => void;
  initialPrefill?: AskForPricePrefill | null;
}) {
  const a = strings;
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
  const [mounted, setMounted] = useState(false);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEsc);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const justOpened = isOpen && !prevIsOpen.current;
    prevIsOpen.current = isOpen;
    if (!justOpened || !initialPrefill) return;
    const p = initialPrefill;
    if (p.preferredDate) setPreferredDate(p.preferredDate);
    if (p.people != null && p.people >= 1) setPeople(Math.min(20, Math.max(1, p.people)));
    setMessage(p.message ?? '');
    setHotelOrCruise(p.hotelOrCruise ?? '');
  }, [isOpen, initialPrefill]);

  if (!isOpen || !mounted) return null;

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

  return createPortal(
    <div className="ask-for-price-overlay" role="presentation" onClick={handleClose}>
      <div
        className="ask-for-price-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-for-price-title"
        onClick={(e) => e.stopPropagation()}
      >
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
                  className="ask-for-price-input ask-for-price-textarea"
                  value={message}
                  onChange={(ev) => setMessage(ev.target.value)}
                  rows={4}
                />
              </label>
            </div>
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
    </div>,
    document.body
  );
}

export function AskForPriceBookingBlock({
  tourId,
  strings,
}: {
  tourId: string;
  strings: AskForPriceStrings;
}) {
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const a = useMemo(() => strings, [strings]);
  return (
    <>
      <button type="button" className="btn btn-primary ask-for-price-open-btn" onClick={handleOpen}>
        {a.button}
      </button>
      <AskForPriceModal tourId={tourId} strings={strings} isOpen={open} onClose={handleClose} />
    </>
  );
}
