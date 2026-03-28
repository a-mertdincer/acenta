type CachedRate = { rate: number; updatedAt: string; expiresAt: number };

let cache: CachedRate | null = null;
const FALLBACK_RATE = 38.5;
const CACHE_MS = 60 * 60 * 1000;

export async function getEurTryRate(): Promise<{ rate: number; updatedAt: string }> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return { rate: cache.rate, updatedAt: cache.updatedAt };
  }
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/EUR', { cache: 'no-store' });
    if (!res.ok) throw new Error('Rate request failed');
    const data = (await res.json()) as { rates?: Record<string, number>; time_last_updated_utc?: string };
    const nextRate = data?.rates?.TRY;
    if (!nextRate || !Number.isFinite(nextRate)) throw new Error('TRY rate missing');
    const updatedAt = data.time_last_updated_utc ?? new Date().toISOString();
    cache = { rate: nextRate, updatedAt, expiresAt: now + CACHE_MS };
    return { rate: nextRate, updatedAt };
  } catch {
    const updatedAt = new Date().toISOString();
    cache = { rate: FALLBACK_RATE, updatedAt, expiresAt: now + 15 * 60 * 1000 };
    return { rate: FALLBACK_RATE, updatedAt };
  }
}
