import type { Prisma } from '@prisma/client';

export type PromotionRowLite = {
  id: string;
  discountType: string;
  discountValue: number;
  applicableTourIds: Prisma.JsonValue | null;
};

/** Null / missing JSON = all tours. Empty array = none. */
export function isPromotionApplicableToTour(applicableTourIds: Prisma.JsonValue | null, tourId: string): boolean {
  if (applicableTourIds === null || applicableTourIds === undefined) return true;
  if (!Array.isArray(applicableTourIds)) return false;
  if (applicableTourIds.length === 0) return false;
  return applicableTourIds.some((x) => typeof x === 'string' && x === tourId);
}

export function discountAmountForPromotion(
  rackPrice: number,
  p: Pick<PromotionRowLite, 'discountType' | 'discountValue'>
): number {
  if (rackPrice <= 0) return 0;
  if (p.discountType === 'percentage') {
    return Math.min(rackPrice, rackPrice * (p.discountValue / 100));
  }
  return Math.min(p.discountValue, rackPrice);
}

export function pickBestPromotionForLine(
  rackPrice: number,
  tourId: string,
  promotions: PromotionRowLite[]
): { discount: number; promotionId: string | null } {
  let best = 0;
  let bestId: string | null = null;
  for (const p of promotions) {
    if (!isPromotionApplicableToTour(p.applicableTourIds, tourId)) continue;
    const d = discountAmountForPromotion(rackPrice, p);
    if (d > best) {
      best = d;
      bestId = p.id;
    }
  }
  return { discount: best, promotionId: bestId };
}

export const PRICE_TOLERANCE = 0.06;

export function pricesNearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= PRICE_TOLERANCE;
}
