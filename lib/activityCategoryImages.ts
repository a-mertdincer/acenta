/**
 * Kategori slug → görsel URL eşlemesi (picsum.photos, her kategori için sabit görsel).
 * Kart üstünde gösterilir. 440x330 (4:3) boyutunda.
 */
const W = 440;
const H = 330;

export const ACTIVITY_CATEGORY_IMAGES: Record<string, string> = {
  'hot-air-balloon': `https://picsum.photos/seed/balloon-cappadocia/${W}/${H}`,
  'daily-tours': `https://picsum.photos/seed/daily-tours-valley/${W}/${H}`,
  'adventure-activities': `https://picsum.photos/seed/adventure-hiking/${W}/${H}`,
  'cultural-experiences': `https://picsum.photos/seed/cultural-museum/${W}/${H}`,
  'private-tours': `https://picsum.photos/seed/private-tour/${W}/${H}`,
  'transfers': `https://picsum.photos/seed/transfer-car/${W}/${H}`,
  'workshops': `https://picsum.photos/seed/workshop-pottery/${W}/${H}`,
  'boat-tours': `https://picsum.photos/seed/boat-tour/${W}/${H}`,
};

const FALLBACK = `https://picsum.photos/seed/activity/${W}/${H}`;

export function getActivityCategoryImage(slug: string): string {
  return ACTIVITY_CATEGORY_IMAGES[slug] ?? FALLBACK;
}
