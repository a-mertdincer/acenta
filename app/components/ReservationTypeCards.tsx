'use client';

import type { TourVariantDisplay } from '@/lib/types/variant';

type ReservationTypeVariant = 'regular' | 'private';

export function ReservationTypeCards({
  variants,
  value,
  onChange,
  lang,
  labels,
}: {
  variants: TourVariantDisplay[];
  value: ReservationTypeVariant;
  onChange: (v: ReservationTypeVariant) => void;
  lang: 'en' | 'tr' | 'zh';
  labels: { regular: string; private: string; group: string; onlyYou: string; perPerson: string; perVehicle: string };
}) {
  const regular = variants.find((v) => v.reservationType === 'regular');
  const privateV = variants.find((v) => v.reservationType === 'private');

  const title = (v: TourVariantDisplay) => (lang === 'tr' ? v.titleTr : lang === 'zh' ? v.titleZh : v.titleEn);
  const priceLabel = (v: TourVariantDisplay) =>
    v.pricingType === 'per_person' ? `${labels.perPerson} €${v.adultPrice}` : `${labels.perVehicle} €${v.adultPrice}`;

  return (
    <div className="reservation-cards">
      {regular && (
        <button
          type="button"
          className={`reservation-card ${value === 'regular' ? 'selected' : ''}`}
          onClick={() => onChange('regular')}
        >
          <span className="reservation-card-icon" aria-hidden>🚐</span>
          <strong className="reservation-card-title">{title(regular)}</strong>
          <span className="reservation-card-subtitle">({labels.group})</span>
          <span className="reservation-card-price">{priceLabel(regular)}</span>
          {regular.maxGroupSize != null && (
            <span className="reservation-card-meta">Max {regular.maxGroupSize} {labels.perPerson.replace(/\/.*/, '')}</span>
          )}
          <span className="reservation-card-cta">{labels.regular}</span>
        </button>
      )}
      {privateV && (
        <button
          type="button"
          className={`reservation-card ${privateV.isRecommended ? 'recommended' : ''} ${value === 'private' ? 'selected' : ''}`}
          onClick={() => onChange('private')}
        >
          {privateV.isRecommended && <span className="recommended-badge">★ Recommended</span>}
          <span className="reservation-card-icon" aria-hidden>🚗</span>
          <strong className="reservation-card-title">{title(privateV)}</strong>
          <span className="reservation-card-subtitle">({labels.onlyYou})</span>
          <span className="reservation-card-price">{priceLabel(privateV)}</span>
          <span className="reservation-card-cta">{labels.private}</span>
        </button>
      )}
    </div>
  );
}
