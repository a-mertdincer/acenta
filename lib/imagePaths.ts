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
  BALLOON: 'balloon',
  TOUR: 'green-tour',
  TRANSFER: 'transfer',
  ACTIVITY: 'green-tour',
  CONCIERGE: 'green-tour',
  PACKAGE: 'green-tour',
};

/** Local raster files under public/ (nested paths; not flat key.jpg) */
const TOUR_TYPE_LOCAL_PATH: Record<keyof typeof FALLBACKS.tours, string> = {
  balloon: '/images/tours/balloon/balon-goreme/ballom-flight.jpg',
  'green-tour': '/images/tours/daily-tours/green-tour/1105287.jpg',
  transfer: '/images/tours/transfer/airport-transfer/8-1-768x576.jpg',
};

export function getTourImagePath(type: string): string {
  const key = TOUR_IMAGE_KEYS[type] ?? 'green-tour';
  return TOUR_TYPE_LOCAL_PATH[key] ?? TOUR_TYPE_LOCAL_PATH['green-tour'];
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
