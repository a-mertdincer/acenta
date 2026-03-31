import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SiteLocale } from './lib/i18n';

export const locales = [...SUPPORTED_LOCALES];
export const defaultLocale = DEFAULT_LOCALE;

function getLocale(request: NextRequest): SiteLocale {
  const acceptLanguage = request.headers.get('accept-language') ?? '';
  const languageTags = acceptLanguage
    .split(',')
    .map((part) => part.split(';')[0]?.trim().toLowerCase())
    .filter(Boolean);

  for (const tag of languageTags) {
    if (tag.startsWith('tr')) return 'tr';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('it')) return 'it';
    if (tag.startsWith('ru')) return 'ru';
    if (tag.startsWith('de')) return 'de';
    if (tag.startsWith('fr')) return 'fr';
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('ja')) return 'ja';
    if (tag.startsWith('nl')) return 'nl';
    if (tag.startsWith('pl')) return 'pl';
    if (tag.startsWith('ro')) return 'ro';
    if (tag.startsWith('en')) return 'en';
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public files and API routes
  if (
    pathname.includes('.') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return;
  }

  // Check if there is any supported locale in the pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Admin panel is intentionally Turkish-only.
    const currentLocale = pathname.split('/')[1];
    if (currentLocale !== 'tr' && (pathname === `/${currentLocale}/admin` || pathname.startsWith(`/${currentLocale}/admin/`))) {
      request.nextUrl.pathname = pathname.replace(`/${currentLocale}/admin`, '/tr/admin');
      return NextResponse.redirect(request.nextUrl);
    }
    return;
  }

  // Redirect if there is no locale
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next)
    '/((?!_next|favicon.ico).*)',
    // Optional: only run on root (/) URL
    // '/'
  ],
};
