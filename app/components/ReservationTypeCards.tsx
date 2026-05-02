'use client';

import type { TourVariantDisplay } from '@/lib/types/variant';
import { getTierFromPrice } from '@/lib/pricingTiers';
import { pickTourField } from '@/lib/pickContentLang';

export function ReservationTypeCards({
  variants,
  value,
  onChange,
  lang,
  labels,
  showTypeMeta = true,
}: {
  variants: TourVariantDisplay[];
  value: string;
  onChange: (variantId: string) => void;
  lang: string;
  labels: { regular: string; private: string; group: string; onlyYou: string; perPerson: string; perVehicle: string; recommended: string };
  showTypeMeta?: boolean;
}) {
  const cards = variants.filter((v) => Boolean(v.reservationType));

  const title = (v: TourVariantDisplay) =>
    pickTourField(v as unknown as Record<string, unknown>, 'title', lang) ?? v.titleEn;
  const priceLabel = (v: TourVariantDisplay) => {
    if ((v.privatePriceTiers?.length ?? 0) > 0) {
      const fromTier = getTierFromPrice(v.privatePriceTiers ?? null);
      if (fromTier != null) return `From €${fromTier}`;
    }
    return v.pricingType === 'per_person' ? `${labels.perPerson} €${v.adultPrice}` : `${labels.perVehicle} €${v.adultPrice}`;
  };
  const subtitleFor = (reservationType: string | null) => {
    if (!showTypeMeta) return null;
    if (reservationType === 'regular') return `(${labels.group})`;
    if (reservationType === 'private') return `(${labels.onlyYou})`;
    return null;
  };
  const ctaFor = (reservationType: string | null) => {
    if (!showTypeMeta) return null;
    if (reservationType === 'regular') return labels.regular;
    if (reservationType === 'private') return labels.private;
    return null;
  };

  return (
    <div className="reservation-cards">
      {cards.map((variant) => (
        <button
          key={variant.id}
          type="button"
          className={`reservation-card ${variant.isRecommended ? 'recommended' : ''} ${value === variant.id ? 'selected' : ''}`}
          onClick={() => onChange(variant.id)}
        >
          {variant.isRecommended && <span className="recommended-badge">★ {labels.recommended}</span>}
          <strong className="reservation-card-title">{title(variant)}</strong>
          {subtitleFor(variant.reservationType) && <span className="reservation-card-subtitle">{subtitleFor(variant.reservationType)}</span>}
          <span className="reservation-card-price">{priceLabel(variant)}</span>
          {showTypeMeta && variant.maxGroupSize != null && (
            <span className="reservation-card-meta">Max {variant.maxGroupSize} {labels.perPerson.replace(/\/.*/, '')}</span>
          )}
          {ctaFor(variant.reservationType) && <span className="reservation-card-cta">{ctaFor(variant.reservationType)}</span>}
        </button>
      ))}
    </div>
  );
}
