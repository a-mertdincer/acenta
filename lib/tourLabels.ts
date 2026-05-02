import type { TourWithOptions } from '@/app/actions/tours';
import type { SiteLocale } from '@/lib/i18n';
import { pickTourField } from '@/lib/pickContentLang';

export function tourTitle(t: Pick<TourWithOptions, 'titleEn' | 'titleTr' | 'titleZh'>, lang: SiteLocale): string {
  return pickTourField(t as Record<string, unknown>, 'title', lang) ?? t.titleEn;
}

export function tourDescription(t: Pick<TourWithOptions, 'descEn' | 'descTr' | 'descZh'>, lang: SiteLocale): string {
  return pickTourField(t as Record<string, unknown>, 'desc', lang) ?? t.descEn;
}
