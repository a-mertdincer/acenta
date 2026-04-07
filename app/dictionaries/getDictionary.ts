import 'server-only';
import { normalizeLocale, type SiteLocale } from '@/lib/i18n';

const dictionaries = {
    en: () => import('./en.json').then((module) => module.default),
    tr: () => import('./tr.json').then((module) => module.default),
    zh: () => import('./zh.json').then((module) => module.default),
    es: () => import('./es.json').then((module) => module.default),
    it: () => import('./it.json').then((module) => module.default),
    ru: () => import('./ru.json').then((module) => module.default),
    de: () => import('./de.json').then((module) => module.default),
    fr: () => import('./fr.json').then((module) => module.default),
    ko: () => import('./ko.json').then((module) => module.default),
    ja: () => import('./ja.json').then((module) => module.default),
    nl: () => import('./nl.json').then((module) => module.default),
    pl: () => import('./pl.json').then((module) => module.default),
    ro: () => import('./ro.json').then((module) => module.default),
};

export const getDictionary = async (locale: SiteLocale | string) => {
    const normalized = normalizeLocale(locale);
    return dictionaries[normalized]?.() ?? dictionaries.en();
};
