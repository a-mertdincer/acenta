import type { Tour, TourOption } from '@prisma/client';

const CATALOG_BASES = ['title', 'desc'] as const;

const DETAIL_CONTENT_BASES = [
  'title',
  'desc',
  'highlights',
  'itinerary',
  'knowBefore',
  'notSuitable',
  'notAllowed',
  'whatsIncluded',
  'notIncluded',
  'cancellationNote',
  'ageRestriction',
] as const;

const LOCALE_SUFFIXES = ['En', 'Tr', 'Zh', 'Es', 'It', 'Fr', 'De', 'Nl', 'Ro', 'Ru', 'Pl', 'Ko', 'Ja'] as const;

/** Title + desc columns for listing cards / related tours */
export function sliceTourCatalogLocales(tour: Tour): Record<string, string | null | undefined> {
  const out: Record<string, string | null | undefined> = {};
  for (const base of CATALOG_BASES) {
    for (const suf of LOCALE_SUFFIXES) {
      const key = `${base}${suf}` as keyof Tour;
      const val = tour[key];
      out[`${base}${suf}`] = typeof val === 'string' ? val : val == null ? null : undefined;
    }
  }
  return out;
}

/** All localized rich-text columns + FAQs for detail / API payloads */
export function sliceTourDetailLocales(tour: Tour): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const base of DETAIL_CONTENT_BASES) {
    for (const suf of LOCALE_SUFFIXES) {
      const key = `${base}${suf}` as keyof Tour;
      out[key as string] = tour[key];
    }
  }
  for (const suf of LOCALE_SUFFIXES) {
    const key = `faqs${suf}` as keyof Tour;
    out[key as string] = tour[key];
  }
  return out;
}

const VARIANT_LOCALE_BASES = ['title', 'desc'] as const;

/** Variant title/desc localized columns */
export function sliceTourVariantLocales(row: Record<string, unknown>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const base of VARIANT_LOCALE_BASES) {
    for (const suf of LOCALE_SUFFIXES) {
      const key = `${base}${suf}`;
      const raw = row[key];
      if (typeof raw === 'string') out[key] = raw;
    }
  }
  return out;
}

/** Localized option titles for booking UI */
export function sliceTourOptionLocales(opt: TourOption): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const suf of LOCALE_SUFFIXES) {
    const key = `title${suf}` as keyof TourOption;
    const val = opt[key];
    if (typeof val === 'string') out[`title${suf}`] = val;
  }
  return out;
}
