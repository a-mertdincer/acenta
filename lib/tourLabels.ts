import type { TourWithOptions } from '@/app/actions/tours';
import type { SiteLocale } from '@/lib/i18n';

export function tourTitle(t: Pick<TourWithOptions, 'titleEn' | 'titleTr' | 'titleZh'>, lang: SiteLocale): string {
  if (lang === 'tr') return t.titleTr;
  if (lang === 'zh') return t.titleZh;
  return t.titleEn;
}

export function tourDescription(t: Pick<TourWithOptions, 'descEn' | 'descTr' | 'descZh'>, lang: SiteLocale): string {
  if (lang === 'tr') return t.descTr;
  if (lang === 'zh') return t.descZh;
  return t.descEn;
}
