/**
 * Kategori slug → görsel URL eşlemesi (Unsplash, başlıklara uygun mockup görseller).
 * Kart üstünde gösterilir.
 */
const BASE = 'https://images.unsplash.com';

export const ACTIVITY_CATEGORY_IMAGES: Record<string, string> = {
  'hot-air-balloon': `${BASE}/photo-1579728343161-4deabf523f2f?w=440&q=80`,
  'daily-tours': `${BASE}/photo-1563222384-5f12a20a4b0d?w=440&q=80`,
  'adventure-activities': `${BASE}/photo-1551632811-561732d1e306?w=440&q=80`,
  'cultural-experiences': `${BASE}/photo-1547471080-7cc2caa01a7e?w=440&q=80`,
  'private-tours': `${BASE}/photo-1549317661-bd32c8ce0db2?w=440&q=80`,
  'transfers': `${BASE}/photo-1449965408869-eaa3f722e40d?w=440&q=80`,
  'workshops': `${BASE}/photo-1578749556568-bc2c40e68b61?w=440&q=80`,
  'boat-tours': `${BASE}/photo-1544551763-46a013bb70d5?w=440&q=80`,
};

const FALLBACK = `${BASE}/photo-1523531294919-e4d64d080819?w=440&q=80`;

export function getActivityCategoryImage(slug: string): string {
  return ACTIVITY_CATEGORY_IMAGES[slug] ?? FALLBACK;
}
