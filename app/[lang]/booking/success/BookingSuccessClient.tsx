'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ResItem = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  date: string;
  pax: number;
  totalPrice: number;
  tourTitle: string;
  displayNotes: string;
  transferAirport: string | null;
  createdAt: string;
  optionsParsed: { title: string; price: number }[];
};

export function BookingSuccessClient({
  lang,
  reservations,
  skipLoading = false,
}: {
  lang: string;
  reservations: ResItem[];
  skipLoading?: boolean;
}) {
  const [showContent, setShowContent] = useState(skipLoading);

  useEffect(() => {
    if (skipLoading) return;
    const t = setTimeout(() => setShowContent(true), 2500);
    return () => clearTimeout(t);
  }, [skipLoading]);

  if (!showContent) {
    return (
      <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" style={{ width: 48, height: 48, marginBottom: 'var(--space-lg)' }} />
        <p style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)' }}>Rezervasyonunuz işleniyor...</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>Lütfen bekleyin.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0', maxWidth: 720 }}>
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h1 style={{ marginBottom: 'var(--space-md)', fontSize: '1.5rem' }}>
          {skipLoading ? 'Rezervasyon detayı' : 'Rezervasyon talebiniz alındı'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
          {skipLoading ? 'Rezervasyonunuzun özeti aşağıdadır.' : 'Admin ekibimiz en kısa sürede sizinle iletişime geçecek.'}
        </p>

        {reservations.map((r) => (
          <div key={r.id} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ marginBottom: 'var(--space-sm)', fontWeight: 'bold', color: 'var(--color-primary)' }}>
              Rezervasyon no: {r.id.slice(0, 8)}
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-sm)', fontSize: '0.95rem' }}>
              <div><strong>Tur / Hizmet:</strong> {r.tourTitle}</div>
              <div><strong>Tur tarihi:</strong> {r.date}</div>
              <div><strong>Rezervasyon tarihi:</strong> {new Date(r.createdAt).toLocaleString('tr-TR')}</div>
              <div><strong>Kişi sayısı:</strong> {r.pax}</div>
              <div><strong>Toplam:</strong> €{r.totalPrice.toFixed(2)}</div>
              {r.displayNotes && <div><strong>Notlar:</strong> {r.displayNotes}</div>}
              <div><strong>E-posta:</strong> {r.guestEmail}</div>
              <div><strong>Telefon:</strong> {r.guestPhone}</div>
              {r.transferAirport && (
                <div><strong>Transfer havalimanı:</strong> {r.transferAirport === 'ASR' ? 'Kayseri (ASR)' : r.transferAirport === 'NAV' ? 'Nevşehir (NAV)' : r.transferAirport}</div>
              )}
              {r.optionsParsed.length > 0 && (
                <div><strong>Seçilen opsiyonlar:</strong>{' '}
                  {r.optionsParsed.map((o, i) => (
                    <span key={i}>{o.title}{o.price ? ` (+€${o.price})` : ''}{i < r.optionsParsed.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {!skipLoading && (
          <p style={{ marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Sorularınız için bize ulaşabilirsiniz. Rezervasyon talebiniz alındı.
          </p>
        )}

        <Link
          href={skipLoading ? `/${lang}/account` : `/${lang}/booking/done`}
          className="btn btn-primary"
          style={{
            display: 'inline-block',
            padding: 'var(--space-lg) var(--space-2xl)',
            fontSize: skipLoading ? '1rem' : '1.1rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          {skipLoading ? 'Hesabıma dön' : 'REZERVASYON TALEBİN ALINDI — Tamamlandı ✓'}
        </Link>
      </div>
    </div>
  );
}
