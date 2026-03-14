export type PriceTier = { minPax: number; maxPax: number; price: number };

export function parsePriceTiers(value: unknown): PriceTier[] | null {
  if (!Array.isArray(value)) return null;
  const rows = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const rec = item as Record<string, unknown>;
      const minPax = Number(rec.minPax);
      const maxPax = Number(rec.maxPax);
      const price = Number(rec.price);
      if (!Number.isFinite(minPax) || !Number.isFinite(maxPax) || !Number.isFinite(price)) return null;
      return { minPax, maxPax, price };
    })
    .filter((item): item is PriceTier => item !== null);
  return rows.length > 0 ? rows : null;
}

export function validateContinuousPriceTiers(tiers: PriceTier[]): { ok: boolean; error?: string } {
  if (tiers.length === 0) return { ok: true };
  const sorted = [...tiers].sort((a, b) => a.minPax - b.minPax);
  for (let i = 0; i < sorted.length; i += 1) {
    const tier = sorted[i];
    if (!Number.isInteger(tier.minPax) || !Number.isInteger(tier.maxPax)) {
      return { ok: false, error: 'Kademelerde min/max kişi tam sayı olmalıdır.' };
    }
    if (tier.minPax < 1 || tier.maxPax < 1) {
      return { ok: false, error: 'Kademelerde kişi sayısı en az 1 olmalıdır.' };
    }
    if (tier.minPax >= tier.maxPax) {
      return { ok: false, error: 'Kademe için Min kişi, Max kişiden küçük olmalıdır.' };
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
        return { ok: false, error: 'Kademeler arasında boşluk olmamalı (ör. 4 -> 5).'};
      }
    }
  }
  return { ok: true };
}

export function resolveTierPrice(tiers: PriceTier[] | null | undefined, pax: number): number | null {
  if (!tiers || tiers.length === 0) return null;
  const normalizedPax = Math.max(1, pax);
  const match = tiers.find((tier) => normalizedPax >= tier.minPax && normalizedPax <= tier.maxPax);
  return match ? match.price : null;
}
