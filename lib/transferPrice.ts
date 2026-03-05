/** Pure helper: get transfer price for pax and airport. Not a Server Action. */

export type TransferTier = { minPax: number; maxPax: number; price: number };
export type TransferAirportTiers = { ASR?: TransferTier[]; NAV?: TransferTier[] };

export interface TourTransferPricing {
  basePrice: number;
  transferTiers: TransferTier[] | null;
  transferAirportTiers: TransferAirportTiers | null;
}

export function getTransferPriceForPaxAndAirport(
  tour: TourTransferPricing,
  pax: number,
  airport: 'ASR' | 'NAV'
): number {
  const tiers = tour.transferAirportTiers?.[airport] ?? (airport === 'ASR' ? tour.transferTiers : null);
  if (tiers?.length) {
    const tier = tiers.find((t) => pax >= t.minPax && pax <= t.maxPax);
    if (tier) return tier.price;
  }
  return tour.basePrice;
}
