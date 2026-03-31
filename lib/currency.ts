import type { SiteLocale } from './i18n';

export type SiteLang = SiteLocale;

export function formatEur(amount: number, lang: SiteLang): string {
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
}

export function formatTry(amount: number): string {
  // Display-only rounding rule for TR locale: always round up to nearest 5 TRY.
  const rounded = Math.ceil(amount / 5) * 5;
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(rounded);
}

export function formatPriceByLang(amountEur: number, lang: SiteLang, eurTryRate: number | null): { primary: string; secondary: string | null } {
  if (lang === 'tr' && eurTryRate && Number.isFinite(eurTryRate) && eurTryRate > 0) {
    const tryAmount = amountEur * eurTryRate;
    return {
      primary: formatTry(tryAmount),
      secondary: `≈ ${formatEur(amountEur, lang)}`,
    };
  }
  return { primary: formatEur(amountEur, lang), secondary: null };
}
