/**
 * Types for the product page variant system (Eco/Plus, Regular/Private, Airport).
 */

export type TourTypeVariant = 'eco' | 'plus';
export type ReservationTypeVariant = 'regular' | 'private';
export type AirportVariant = 'NAV' | 'ASR';

export interface VariantSelection {
  tourType: TourTypeVariant | null;       // eco | plus; null when product has no Tour Type
  reservationType: ReservationTypeVariant;
  airport: AirportVariant | null;         // NAV | ASR; null when not transfer
}

/** Display shape for a single variant (from DB or API). */
export interface TourVariantDisplay {
  id: string;
  tourId: string;
  tourType: string | null;
  reservationType: string;
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
  privatePriceTiers?: { minPax: number; maxPax: number; price: number }[] | null;
  sortOrder: number;
  isActive: boolean;
  isRecommended: boolean;
}

/** Find the active variant from list by selection. */
export function getActiveVariant(
  variants: TourVariantDisplay[],
  selection: VariantSelection
): TourVariantDisplay | null {
  const active = variants.filter((v) => v.isActive).find((v) => {
    const tourTypeMatch = (v.tourType ?? null) === selection.tourType;
    const resMatch = v.reservationType === selection.reservationType;
    const airportMatch = (v.airport ?? null) === selection.airport;
    return tourTypeMatch && resMatch && airportMatch;
  });
  return active ?? null;
}

/** Default selection for a tour: hasTourType → eco, hasAirportSelect → NAV, reservationType → regular. */
export function getDefaultVariantSelection(hasTourType: boolean, hasAirportSelect: boolean): VariantSelection {
  return {
    tourType: hasTourType ? 'eco' : null,
    reservationType: 'regular',
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
  const tieredVehiclePrice =
    variant.reservationType === 'private' && variant.privatePriceTiers && variant.privatePriceTiers.length > 0
      ? variant.privatePriceTiers.find((tier) => totalPax >= tier.minPax && totalPax <= tier.maxPax)?.price ?? null
      : null;
  if (variant.pricingType === 'per_person') {
    total += variant.adultPrice * adults;
    total += (variant.childPrice ?? variant.adultPrice) * children;
    // infants (0-3) free
  } else {
    total = tieredVehiclePrice ?? variant.adultPrice; // per_vehicle
  }
  if (direction === 'roundtrip') {
    total = total * 2 * 0.9; // 10% off
  }
  return total;
}
