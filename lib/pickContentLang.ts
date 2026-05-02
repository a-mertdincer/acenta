import { normalizeLocale, type SiteLocale } from '@/lib/i18n';

export type FaqItem = { question: string; answer: string };

export interface ContentLangFields<T = string | null> {
  en?: T;
  tr?: T;
  zh?: T;
  es?: T;
  it?: T;
  fr?: T;
  de?: T;
  nl?: T;
  ro?: T;
  ru?: T;
  pl?: T;
  ko?: T;
  ja?: T;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Maps locale code → Prisma column suffix e.g. es → Es, zh → Zh */
export function localeFieldSuffix(locale: SiteLocale | string): string {
  const key = normalizeLocale(String(locale));
  return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
}

export function pickContentLang<T extends string | null>(
  fields: ContentLangFields<T>,
  lang: SiteLocale | string
): T | null {
  const key = normalizeLocale(String(lang)) as keyof ContentLangFields<T>;
  const preferred = fields[key];
  if (nonEmpty(preferred)) return preferred as T;
  if (nonEmpty(fields.en)) return fields.en as T;
  return null;
}

export function pickTourField(
  tour: Record<string, unknown>,
  baseField: string,
  lang: SiteLocale | string
): string | null {
  const suf = localeFieldSuffix(lang);
  const langKey = `${baseField}${suf}`;
  const raw = tour[langKey];
  if (nonEmpty(raw)) return String(raw);

  const enKey = `${baseField}En`;
  const enRaw = tour[enKey];
  if (nonEmpty(enRaw)) return String(enRaw);

  return null;
}

function normalizeFaqArray(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  const out: FaqItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const q = 'question' in item && typeof item.question === 'string' ? item.question : '';
    const a = 'answer' in item && typeof item.answer === 'string' ? item.answer : '';
    if (!q.trim() && !a.trim()) continue;
    out.push({ question: q, answer: a });
  }
  return out;
}

export function pickFaqs(tour: Record<string, unknown>, lang: SiteLocale | string): FaqItem[] {
  const suf = localeFieldSuffix(lang);
  const langKey = `faqs${suf}`;
  const localized = normalizeFaqArray(tour[langKey]);
  if (localized.length > 0) return localized;
  return normalizeFaqArray(tour.faqsEn);
}
