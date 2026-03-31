export const SUPPORTED_LOCALES = [
  'en',
  'tr',
  'zh',
  'es',
  'it',
  'ru',
  'de',
  'fr',
  'ko',
  'ja',
  'nl',
  'pl',
  'ro',
] as const;

export type SiteLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SiteLocale = 'en';

export function normalizeLocale(input: string | null | undefined): SiteLocale {
  if (!input) return DEFAULT_LOCALE;
  const lower = input.toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(lower) ? (lower as SiteLocale) : DEFAULT_LOCALE;
}
