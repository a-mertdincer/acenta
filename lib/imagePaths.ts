/**
 * Image paths for mockup/hero images.
 * Place your images in public/images/ as per docs plan; fallbacks used if local file missing.
 */
const FALLBACKS = {
  home: {
    balloon: 'https://images.unsplash.com/photo-1579728343161-4deabf523f2f?q=80&w=800&auto=format&fit=crop',
    'green-tour': 'https://images.unsplash.com/photo-1563222384-5f12a20a4b0d?q=80&w=800&auto=format&fit=crop',
    transfer: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800&auto=format&fit=crop',
  },
  tours: {
    balloon: 'https://images.unsplash.com/photo-1579728343161-4deabf523f2f?q=80&w=800&auto=format&fit=crop',
    'green-tour': 'https://images.unsplash.com/photo-1563222384-5f12a20a4b0d?q=80&w=800&auto=format&fit=crop',
    transfer: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=800&auto=format&fit=crop',
  },
  hero: 'https://images.unsplash.com/photo-1579728343161-4deabf523f2f?q=80&w=1920&auto=format&fit=crop',
} as const;

export type HomeImageKey = keyof typeof FALLBACKS.home;
export type TourImageKey = keyof typeof FALLBACKS.tours;

export function getHomeImagePath(key: HomeImageKey): string {
  return `/images/home/${key}.jpg`;
}

const TOUR_IMAGE_KEYS: Record<string, keyof typeof FALLBACKS.tours> = {
  BALLOON: 'balloon', TOUR: 'green-tour', TRANSFER: 'transfer', CONCIERGE: 'green-tour', PACKAGE: 'green-tour',
};
export function getTourImagePath(type: string): string {
  const key = TOUR_IMAGE_KEYS[type] ?? 'green-tour';
  return `/images/tours/${key}.jpg`;
}

export function getHomeImageFallback(key: HomeImageKey): string {
  return FALLBACKS.home[key];
}

export function getTourImageFallback(type: string): string {
  const key = TOUR_IMAGE_KEYS[type] ?? 'green-tour';
  return FALLBACKS.tours[key];
}

export function getHeroPath(): string {
  return '/images/hero.jpg';
}

export function getHeroFallback(): string {
  return FALLBACKS.hero;
}
