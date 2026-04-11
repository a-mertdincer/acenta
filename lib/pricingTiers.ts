export type LegacyPriceTier = { minPax: number; maxPax: number; price: number };
export type PaxPriceTier = { pax: number; totalPrice: number };
export type PriceTier = LegacyPriceTier | PaxPriceTier;

function isPaxTier(tier: PriceTier): tier is PaxPriceTier {
  return 'pax' in tier && 'totalPrice' in tier;
}

function sortTiers(tiers: PriceTier[]): PriceTier[] {
  return [...tiers].sort((a, b) => {
    const aPax = isPaxTier(a) ? a.pax : a.maxPax;
    const bPax = isPaxTier(b) ? b.pax : b.maxPax;
    return aPax - bPax;
  });
}

export function parsePriceTiers(value: unknown): PriceTier[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      if ('pax' in rec || 'totalPrice' in rec) {
        const pax = Number(rec.pax);
        const totalPrice = Number(rec.totalPrice);
        if (!Number.isFinite(pax) || !Number.isFinite(totalPrice)) return null;
        return { pax, totalPrice } as PaxPriceTier;
      }
      const minPax = Number(rec.minPax);
      const maxPax = Number(rec.maxPax);
      const price = Number(rec.price);
      if (!Number.isFinite(minPax) || !Number.isFinite(maxPax) || !Number.isFinite(price)) return null;
      return { minPax, maxPax, price } as LegacyPriceTier;
    })
    .filter((item): item is PriceTier => item !== null);
  return rows.length > 0 ? sortTiers(rows) : null;
}

export function validateContinuousPriceTiers(tiers: PriceTier[]): { ok: boolean; error?: string } {
  if (tiers.length === 0) return { ok: true };
  const hasPaxTiers = tiers.some((tier) => isPaxTier(tier));
  const hasLegacyTiers = tiers.some((tier) => !isPaxTier(tier));
  if (hasPaxTiers && hasLegacyTiers) {
    return { ok: false, error: 'Aynı varyantta eski ve yeni kademe formatı birlikte kullanılamaz.' };
  }
  if (hasPaxTiers) {
    const sorted = sortTiers(tiers) as PaxPriceTier[];
    const seen = new Set<number>();
    for (const tier of sorted) {
      if (!Number.isInteger(tier.pax) || tier.pax < 1) {
        return { ok: false, error: 'Kişi sayısı tam sayı ve en az 1 olmalıdır.' };
      }
      if (seen.has(tier.pax)) {
        return { ok: false, error: 'Aynı kişi sayısı için birden fazla kademe girilemez.' };
      }
      if (tier.totalPrice < 0) {
        return { ok: false, error: 'Kademe fiyatı negatif olamaz.' };
      }
      seen.add(tier.pax);
    }
    return { ok: true };
  }

  const sorted = sortTiers(tiers) as LegacyPriceTier[];
  for (let i = 0; i < sorted.length; i += 1) {
    const tier = sorted[i];
    if (!Number.isInteger(tier.minPax) || !Number.isInteger(tier.maxPax)) {
      return { ok: false, error: 'Kademelerde min/max kişi tam sayı olmalıdır.' };
    }
    if (tier.minPax < 1 || tier.maxPax < 1) {
      return { ok: false, error: 'Kademelerde kişi sayısı en az 1 olmalıdır.' };
    }
    if (tier.minPax > tier.maxPax) {
      return { ok: false, error: 'Kademe için Min kişi, Max kişiden büyük olamaz.' };
    }
    if (tier.price < 0) {
      return { ok: false, error: 'Kademe fiyatı negatif olamaz.' };
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      if (tier.minPax <= prev.maxPax) {
        return { ok: false, error: 'Kademeler birbiriyle örtüşemez.' };
      }
      if (tier.minPax !== prev.maxPax + 1) {
        return { ok: false, error: 'Kademeler arasında boşluk olmamalı (ör. 4 -> 5).' };
      }
    }
  }
  return { ok: true };
}

export function resolveTierPrice(tiers: PriceTier[] | null | undefined, pax: number): number | null {
  if (!tiers || tiers.length === 0) return null;
  const normalizedPax = Math.max(1, pax);

  const paxTiers = tiers.filter((tier): tier is PaxPriceTier => isPaxTier(tier));
  if (paxTiers.length > 0) {
    const sorted = sortTiers(paxTiers) as PaxPriceTier[];
    const exact = sorted.find((tier) => tier.pax === normalizedPax);
    if (exact) return exact.totalPrice;
    const last = sorted[sorted.length - 1];
    const perPerson = last.totalPrice / Math.max(1, last.pax);
    return Math.round(perPerson * normalizedPax * 100) / 100;
  }

  const legacyTiers = tiers.filter((tier): tier is LegacyPriceTier => !isPaxTier(tier));
  if (legacyTiers.length === 0) return null;
  const sorted = sortTiers(legacyTiers) as LegacyPriceTier[];
  const match = sorted.find((tier) => normalizedPax >= tier.minPax && normalizedPax <= tier.maxPax);
  if (match) return match.price;
  const last = sorted[sorted.length - 1];
  const perPerson = last.price / Math.max(1, last.maxPax);
  return Math.round(perPerson * normalizedPax * 100) / 100;
}

export function getTierFromPrice(tiers: PriceTier[] | null | undefined): number | null {
  if (!tiers || tiers.length === 0) return null;
  const paxTiers = tiers.filter((tier): tier is PaxPriceTier => isPaxTier(tier));
  if (paxTiers.length > 0) {
    return Math.min(...paxTiers.map((tier) => tier.totalPrice));
  }
  const legacyTiers = tiers.filter((tier): tier is LegacyPriceTier => !isPaxTier(tier));
  if (legacyTiers.length === 0) return null;
  return Math.min(...legacyTiers.map((tier) => tier.price));
}

export function getLastTierPax(tiers: PriceTier[] | null | undefined): number | null {
  if (!tiers || tiers.length === 0) return null;
  const sorted = sortTiers(tiers);
  const last = sorted[sorted.length - 1];
  return isPaxTier(last) ? last.pax : last.maxPax;
}

export function toPaxPriceRows(tiers: PriceTier[] | null | undefined): PaxPriceTier[] {
  if (!tiers || tiers.length === 0) return [];
  const paxTiers = tiers.filter((tier): tier is PaxPriceTier => isPaxTier(tier));
  if (paxTiers.length > 0) {
    return sortTiers(paxTiers) as PaxPriceTier[];
  }
  const legacyTiers = sortTiers(tiers.filter((tier): tier is LegacyPriceTier => !isPaxTier(tier))) as LegacyPriceTier[];
  const expanded: PaxPriceTier[] = [];
  legacyTiers.forEach((tier) => {
    for (let pax = tier.minPax; pax <= tier.maxPax; pax += 1) {
      expanded.push({ pax, totalPrice: tier.price });
    }
  });
  return sortTiers(expanded) as PaxPriceTier[];
}
