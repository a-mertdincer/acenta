/** Default when category slug is unknown or image fails to load */
export const DEFAULT_ACTIVITY_CARD_IMAGE = '/images/tours/daily-tours/green-tour/1105287.jpg';

export const ACTIVITY_CATEGORY_IMAGES: Record<string, string> = {
  'hot-air-balloon': '/images/tours/balloon/balon-goreme/ballom-flight.jpg',
  'daily-tours': '/images/tours/daily-tours/green-tour/1105287.jpg',
  'adventure-activities': '/images/tours/adventures-activities/atv/98.jpg',
  'cultural-experiences': '/images/tours/cultural-activities/dervis-ceremony/dervish-2.jpg',
  'private-tours': '/images/tours/daily-tours/mix-tour/zelve-open-air-museum-1.jpg',
  'transfers': '/images/tours/transfer/airport-transfer/8-1-768x576.jpg',
  'workshops': '/images/tours/workshops/local-cooking-class/aa.jpg',
  'boat-tours': '/images/tours/daily-tours/blue-tour/67585.jpg',
  'packages': '/images/tours/daily-tours/mix-tour/fairy-cappadocia-slider.jpg',
  'concierge': '/images/tours/concierge/phtosooting-with-professional-photpgarepher/148.jpg',
};

export function getActivityCategoryImage(slug: string): string {
  return ACTIVITY_CATEGORY_IMAGES[slug] ?? DEFAULT_ACTIVITY_CARD_IMAGE;
}
