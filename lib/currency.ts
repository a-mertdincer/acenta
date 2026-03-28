export type SiteLang = 'en' | 'tr' | 'zh';

export function formatEur(amount: number, lang: SiteLang): string {
  const locale = lang === 'tr' ? 'tr-TR' : lang === 'zh' ? 'zh-CN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
}

export function formatTry(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(amount);
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
