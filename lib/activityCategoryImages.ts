export const ACTIVITY_CATEGORY_IMAGES: Record<string, string> = {
  'hot-air-balloon': '/images/activities/default-activity.svg',
  'daily-tours': '/images/activities/default-activity.svg',
  'adventure-activities': '/images/activities/default-activity.svg',
  'cultural-experiences': '/images/activities/default-activity.svg',
  'private-tours': '/images/activities/default-activity.svg',
  'transfers': '/images/activities/default-activity.svg',
  'workshops': '/images/activities/default-activity.svg',
  'boat-tours': '/images/activities/default-activity.svg',
  'packages': '/images/activities/default-activity.svg',
  'concierge': '/images/activities/default-activity.svg',
};

const FALLBACK = '/images/activities/default-activity.svg';

export function getActivityCategoryImage(slug: string): string {
  return ACTIVITY_CATEGORY_IMAGES[slug] ?? FALLBACK;
}
