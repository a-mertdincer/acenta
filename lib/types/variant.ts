import { resolveTierPrice, type PriceTier } from '@/lib/pricingTiers';
/**
 * Types for the product page variant system (Eco/Plus, Regular/Private, Airport).
 */

export type TourTypeVariant = 'eco' | 'plus';
export type ReservationTypeVariant = 'regular' | 'private' | 'option1' | 'option2' | 'option3' | 'option4';
export type AirportVariant = 'NAV' | 'ASR';
export type ReservationTypeMode = 'private_regular' | 'option2' | 'option3' | 'option4' | 'none';

export interface VariantSelection {
  tourType: TourTypeVariant | null;       // eco | plus; null when product has no Tour Type
  reservationType: ReservationTypeVariant | null;
  airport: AirportVariant | null;         // NAV | ASR; null when not transfer
}

export type TourVariantExtendedLocales = Partial<
  Record<
    | 'titleEs'
    | 'titleIt'
    | 'titleFr'
    | 'titleDe'
    | 'titleNl'
    | 'titleRo'
    | 'titleRu'
    | 'titlePl'
    | 'titleKo'
    | 'titleJa'
    | 'descEs'
    | 'descIt'
    | 'descFr'
    | 'descDe'
    | 'descNl'
    | 'descRo'
    | 'descRu'
    | 'descPl'
    | 'descKo'
    | 'descJa',
    string | undefined
  >
>;

/** Display shape for a single variant (from DB or API). */
export interface TourVariantDisplay extends TourVariantExtendedLocales {
  id: string;
  tourId: string;
  tourType: string | null;
  reservationType: string | null;
  airport: string | null;
  titleEn: string;
  titleTr: string;
  titleZh: string;
  descEn: string;
  descTr: string;
  descZh: string;
  includes: string[];
  excludes: string[];
  duration: string | null;
  languages: string[] | null;
  vehicleType: string | null;
  maxGroupSize: number | null;
  routeStops: string[] | null;
  adultPrice: number;
  childPrice: number | null;
  pricingType: 'per_person' | 'per_vehicle';
  privatePriceTiers?: PriceTier[] | null;
  sortOrder: number;
  isActive: boolean;
  isRecommended: boolean;
}

function normalizeNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.toLowerCase();
}

/** Find the active variant from list by selection. */
export function getActiveVariant(
  variants: TourVariantDisplay[],
  selection: VariantSelection
): TourVariantDisplay | null {
  const selectedTourType = normalizeNullable(selection.tourType);
  const selectedAirport = normalizeNullable(selection.airport);
  const selectedReservationType = normalizeNullable(selection.reservationType);
  const active = variants.filter((v) => v.isActive).filter((v) => {
    const variantTourType = normalizeNullable(v.tourType);
    const variantAirport = normalizeNullable(v.airport);
    const tourTypeMatch = selectedTourType == null || variantTourType === selectedTourType || variantTourType == null;
    const airportMatch = selectedAirport == null || variantAirport === selectedAirport || variantAirport == null;
    return tourTypeMatch && airportMatch;
  });
  if (active.length === 0) return null;
  const sameReservationType = selectedReservationType == null
    ? active
    : active.filter((v) => normalizeNullable(v.reservationType) === selectedReservationType);
  const candidates = sameReservationType.length > 0 ? sameReservationType : active;
  const exact = candidates.find((v) => normalizeNullable(v.tourType) === selectedTourType && normalizeNullable(v.airport) === selectedAirport);
  if (exact) return exact;
  const wildcardAirport = candidates.find((v) => normalizeNullable(v.tourType) === selectedTourType && normalizeNullable(v.airport) == null);
  if (wildcardAirport) return wildcardAirport;
  const wildcardTourType = candidates.find((v) => normalizeNullable(v.airport) === selectedAirport && normalizeNullable(v.tourType) == null);
  if (wildcardTourType) return wildcardTourType;
  const recommended = candidates.find((v) => v.isRecommended);
  if (recommended) return recommended;
  return [...candidates].sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
}

/** Default selection for a tour: hasTourType → eco, hasAirportSelect → NAV, reservationType → regular. */
export function getDefaultVariantSelection(
  hasTourType: boolean,
  hasAirportSelect: boolean,
  hasReservationType = true,
  reservationTypeMode: ReservationTypeMode = 'private_regular'
): VariantSelection {
  const defaultReservationType: ReservationTypeVariant | null =
    hasReservationType
      ? reservationTypeMode === 'option2' || reservationTypeMode === 'option3' || reservationTypeMode === 'option4'
        ? 'option1'
        : 'regular'
      : null;
  return {
    tourType: hasTourType ? 'eco' : null,
    reservationType: defaultReservationType,
    airport: hasAirportSelect ? 'NAV' : null,
  };
}

/**
 * Calculate total price for a variant with age policy: 0-3 free, 4-7 child price (or adult if null), 7+ adult.
 */
export function calculateVariantTotal(
  variant: TourVariantDisplay,
  adults: number,
  children: number,
  infants: number,
  direction?: 'arrival' | 'departure' | 'roundtrip'
): number {
  let total = 0;
  const totalPax = Math.max(1, adults + children + infants);
  const tieredPrice = variant.privatePriceTiers && variant.privatePriceTiers.length > 0
    ? resolveTierPrice(variant.privatePriceTiers, totalPax)
    : null;
  if (variant.pricingType === 'per_person') {
    if (variant.reservationType === 'private' && tieredPrice != null) {
      total = tieredPrice;
    } else {
    total += variant.adultPrice * adults;
    total += (variant.childPrice ?? variant.adultPrice) * children;
    }
    // infants (0-3) free
  } else {
    total = tieredPrice ?? variant.adultPrice; // per_vehicle
  }
  if (direction === 'roundtrip') {
    total = total * 2 * 0.9; // 10% off
  }
  return total;
}
