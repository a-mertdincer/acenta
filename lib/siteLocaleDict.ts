import type { SiteLocale } from '@/lib/i18n';
import { normalizeLocale } from '@/lib/i18n';

import en from '@/app/dictionaries/en.json';
import tr from '@/app/dictionaries/tr.json';
import zh from '@/app/dictionaries/zh.json';
import es from '@/app/dictionaries/es.json';
import it from '@/app/dictionaries/it.json';
import ru from '@/app/dictionaries/ru.json';
import de from '@/app/dictionaries/de.json';
import fr from '@/app/dictionaries/fr.json';
import ko from '@/app/dictionaries/ko.json';
import ja from '@/app/dictionaries/ja.json';
import nl from '@/app/dictionaries/nl.json';
import pl from '@/app/dictionaries/pl.json';
import ro from '@/app/dictionaries/ro.json';

export type SiteDictionary = typeof en;

const MAP: Record<SiteLocale, SiteDictionary> = {
  en,
  tr,
  zh,
  es,
  it,
  ru,
  de,
  fr,
  ko,
  ja,
  nl,
  pl,
  ro,
};

export function siteDictionary(locale: SiteLocale | string): SiteDictionary {
  return MAP[normalizeLocale(locale)] ?? en;
}

function mergeFlatStrings(base: Record<string, string>, override: Record<string, string> | undefined): Record<string, string> {
  return { ...base, ...(override ?? {}) };
}

export function tourDetailUi(locale: SiteLocale | string): typeof en.tourDetail {
  const dict = siteDictionary(locale);
  return mergeFlatStrings(en.tourDetail as Record<string, string>, dict.tourDetail as Record<string, string>) as typeof en.tourDetail;
}

export function variantUi(locale: SiteLocale | string): typeof en.variant {
  const dict = siteDictionary(locale);
  return mergeFlatStrings(en.variant as Record<string, string>, dict.variant as Record<string, string>) as typeof en.variant;
}

export function promotionUi(locale: SiteLocale | string): typeof en.promotion {
  const dict = siteDictionary(locale);
  return mergeFlatStrings(en.promotion as Record<string, string>, dict.promotion as Record<string, string>) as typeof en.promotion;
}

export function whyBookUi(locale: SiteLocale | string): typeof en.whyBook {
  const dict = siteDictionary(locale);
  return { ...en.whyBook, ...dict.whyBook };
}

export function tourCancellationUi(locale: SiteLocale | string): typeof en.tourCancellation {
  const dict = siteDictionary(locale);
  return { ...en.tourCancellation, ...dict.tourCancellation };
}

export function navigationUi(locale: SiteLocale | string): typeof en.navigation {
  const dict = siteDictionary(locale);
  return mergeFlatStrings(en.navigation as Record<string, string>, dict.navigation as Record<string, string>) as typeof en.navigation;
}

export function askForPriceUi(locale: SiteLocale | string): typeof en.askForPrice {
  const dict = siteDictionary(locale);
  return mergeFlatStrings(en.askForPrice as Record<string, string>, dict.askForPrice as Record<string, string>) as typeof en.askForPrice;
}

export function reviewsUi(locale: SiteLocale | string): typeof en.reviews {
  const dict = siteDictionary(locale);
  return mergeFlatStrings(en.reviews as Record<string, string>, dict.reviews as Record<string, string>) as typeof en.reviews;
}
