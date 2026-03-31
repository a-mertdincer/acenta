import 'server-only';
import { normalizeLocale, type SiteLocale } from '@/lib/i18n';

const dictionaries = {
    en: () => import('./en.json').then((module) => module.default),
    tr: () => import('./tr.json').then((module) => module.default),
    zh: () => import('./zh.json').then((module) => module.default),
    es: () => import('./en.json').then((module) => module.default),
    it: () => import('./en.json').then((module) => module.default),
    ru: () => import('./en.json').then((module) => module.default),
    de: () => import('./en.json').then((module) => module.default),
    fr: () => import('./en.json').then((module) => module.default),
    ko: () => import('./en.json').then((module) => module.default),
    ja: () => import('./en.json').then((module) => module.default),
    nl: () => import('./en.json').then((module) => module.default),
    pl: () => import('./en.json').then((module) => module.default),
    ro: () => import('./en.json').then((module) => module.default),
};

export const getDictionary = async (locale: SiteLocale | string) => {
    const normalized = normalizeLocale(locale);
    return dictionaries[normalized]?.() ?? dictionaries.en();
};
