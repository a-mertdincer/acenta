export const ACTIVITY_CATEGORY_IMAGES: Record<string, string> = {
  'hot-air-balloon': '/images/activities/balloon-placeholder.svg',
  'daily-tours': '/images/activities/tour-placeholder.svg',
  'adventure-activities': '/images/activities/adventure-placeholder.svg',
  'cultural-experiences': '/images/activities/culture-placeholder.svg',
  'private-tours': '/images/activities/tour-placeholder.svg',
  'transfers': '/images/activities/transfer-placeholder.svg',
  'workshops': '/images/activities/service-placeholder.svg',
  'boat-tours': '/images/activities/adventure-placeholder.svg',
  'packages': '/images/activities/service-placeholder.svg',
  'concierge': '/images/activities/service-placeholder.svg',
};

const FALLBACK = '/images/activities/default-activity.svg';

export function getActivityCategoryImage(slug: string): string {
  return ACTIVITY_CATEGORY_IMAGES[slug] ?? FALLBACK;
}
