'use client';

import { useEffect, useState, useTransition, type FormEvent } from 'react';
import {
  createPromotionAdmin,
  listPromotionsAdmin,
  listTourOptionsForPromotion,
  updatePromotionAdmin,
  deletePromotionAdmin,
} from '@/app/actions/promotions';

type PromoRow = {
  id: string;
  name: string;
  discountType: string;
  discountValue: number;
  discountCurrency: string | null;
  validFrom: Date;
  validUntil: Date;
  bookableFrom: Date;
  bookableUntil: Date;
  applicableTourIds: unknown;
  isActive: boolean;
};

function toLocalInput(d: Date): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

export function AdminPromotionsClient() {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [tours, setTours] = useState<{ id: string; titleEn: string; titleTr: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [bookableFrom, setBookableFrom] = useState('');
  const [bookableUntil, setBookableUntil] = useState('');
  const [selectedTours, setSelectedTours] = useState<Set<string>>(new Set());
  const [allToursScope, setAllToursScope] = useState(true);

  const load = () => {
    startTransition(async () => {
      const [p, t] = await Promise.all([listPromotionsAdmin(), listTourOptionsForPromotion()]);
      if (p.ok) setRows(p.promotions as PromoRow[]);
      if (t.ok) setTours(t.tours);
    });
  };

  useEffect(() => {
    load();
    const now = new Date();
    const month = new Date(now);
    month.setMonth(month.getMonth() + 2);
    setValidFrom(toLocalInput(now));
    setValidUntil(toLocalInput(month));
    setBookableFrom(toLocalInput(now));
    setBookableUntil(toLocalInput(month));
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!allToursScope && selectedTours.size === 0) {
      setMsg('Tüm turlar yerine en az bir tur seçin veya “Tüm turlar”a dönün.');
      return;
    }
    startTransition(async () => {
      const res = await createPromotionAdmin({
        name,
        discountType,
        discountValue,
        discountCurrency: discountType === 'fixed' ? 'EUR' : null,
        validFrom,
        validUntil,
        bookableFrom,
        bookableUntil,
        tourIds: allToursScope ? null : [...selectedTours],
        isActive: true,
      });
      if (res.ok) {
        setMsg('Kaydedildi.');
        setName('');
        load();
      } else setMsg(res.error ?? 'Hata');
    });
  };

  const toggleTour = (id: string) => {
    setSelectedTours((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllTours = () => {
    setAllToursScope(true);
    setSelectedTours(new Set());
  };

  const selectNone = () => {
    setAllToursScope(false);
    setSelectedTours(new Set());
  };

  return (
    <div>
      <h2 style={{ marginBottom: 'var(--space-md)' }}>Yeni promosyon</h2>
      <form onSubmit={submit} className="admin-promotion-form">
        <label className="admin-contact-settings-label">
          Ad
          <input className="admin-contact-settings-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="admin-contact-settings-label">
          İndirim tipi
          <select className="admin-contact-settings-input" value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}>
            <option value="percentage">Yüzde (%)</option>
            <option value="fixed">Sabit EUR</option>
          </select>
        </label>
        <label className="admin-contact-settings-label">
          Değer {discountType === 'percentage' ? '(%)' : '(EUR)'}
          <input
            type="number"
            className="admin-contact-settings-input"
            min={0}
            step={0.01}
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            required
          />
        </label>
        <label className="admin-contact-settings-label">
          Site görünürlük başlangıç
          <input type="datetime-local" className="admin-contact-settings-input" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
        </label>
        <label className="admin-contact-settings-label">
          Site görünürlük bitiş
          <input type="datetime-local" className="admin-contact-settings-input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
        </label>
        <label className="admin-contact-settings-label">
          Aktivite tarihi (başlangıç)
          <input type="datetime-local" className="admin-contact-settings-input" value={bookableFrom} onChange={(e) => setBookableFrom(e.target.value)} required />
        </label>
        <label className="admin-contact-settings-label">
          Aktivite tarihi (bitiş)
          <input type="datetime-local" className="admin-contact-settings-input" value={bookableUntil} onChange={(e) => setBookableUntil(e.target.value)} required />
        </label>
        <fieldset className="admin-promotion-tours-fieldset">
          <legend>Ürün kapsamı</legend>
          <button type="button" className="btn btn-secondary btn-sm" onClick={selectAllTours}>
            Tüm turlar
          </button>{' '}
          <button type="button" className="btn btn-secondary btn-sm" onClick={selectNone}>
            Seçili turlar (elle)
          </button>
          {!allToursScope && (
            <div className="admin-promotion-tour-checkboxes">
              {tours.map((t) => (
                <label key={t.id}>
                  <input type="checkbox" checked={selectedTours.has(t.id)} onChange={() => toggleTour(t.id)} /> {t.titleTr || t.titleEn}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        {msg ? <p className="admin-contact-settings-success">{msg}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </form>

      <h2 style={{ margin: 'var(--space-xl) 0 var(--space-md)' }}>Mevcut promosyonlar</h2>
      <ul className="admin-promotion-list">
        {rows.map((r) => (
          <li key={r.id} className="admin-promotion-card">
            <strong>{r.name}</strong>
            <div>
              {r.discountType === 'percentage' ? `%${r.discountValue}` : `${r.discountValue} ${r.discountCurrency ?? 'EUR'}`} —{' '}
              {r.isActive ? 'Aktif' : 'Pasif'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Site: {new Date(r.validFrom).toLocaleString('tr-TR')} – {new Date(r.validUntil).toLocaleString('tr-TR')}
              <br />
              Aktivite: {new Date(r.bookableFrom).toLocaleString('tr-TR')} – {new Date(r.bookableUntil).toLocaleString('tr-TR')}
            </div>
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await updatePromotionAdmin(r.id, { isActive: !r.isActive });
                    load();
                  })
                }
              >
                {r.isActive ? 'Devre dışı bırak' : 'Aktif et'}
              </button>{' '}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--color-error, #b91c1c)' }}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!window.confirm('Silinsin mi?')) return;
                    await deletePromotionAdmin(r.id);
                    load();
                  })
                }
              >
                Sil
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
