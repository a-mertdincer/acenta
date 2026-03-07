/**
 * Destinasyon → Kategori hiyerarşisi.
 * Yeni destinasyon/kategori eklemek için sadece bu dosyayı güncellemek yeterli.
 */

export type Lang = 'en' | 'tr' | 'zh';

export interface DestinationConfig {
  id: string;
  slug: string;
  nameEn: string;
  nameTr: string;
  nameZh: string;
  active: boolean;
  categories: CategoryConfig[];
}

export interface CategoryConfig {
  id: string;
  slug: string;
  labelEn: string;
  labelTr: string;
  labelZh: string;
}

const DESTINATIONS: DestinationConfig[] = [
  {
    id: 'cappadocia',
    slug: 'cappadocia',
    nameEn: 'Cappadocia',
    nameTr: 'Kapadokya',
    nameZh: '卡帕多奇亚',
    active: true,
    categories: [
      { id: 'hot-air-balloon', slug: 'hot-air-balloon', labelEn: 'Hot Air Balloon', labelTr: 'Balon Turu', labelZh: '热气球' },
      { id: 'daily-tours', slug: 'daily-tours', labelEn: 'Daily Tours', labelTr: 'Gün Turları', labelZh: '一日游' },
      { id: 'adventure-activities', slug: 'adventure-activities', labelEn: 'Adventure Activities', labelTr: 'Macera Aktiviteleri', labelZh: '探险活动' },
      { id: 'cultural-experiences', slug: 'cultural-experiences', labelEn: 'Cultural Experiences', labelTr: 'Kültürel Deneyimler', labelZh: '文化体验' },
      { id: 'private-tours', slug: 'private-tours', labelEn: 'Private Tours', labelTr: 'Özel Turlar', labelZh: '私人游' },
      { id: 'transfers', slug: 'transfers', labelEn: 'Transfers', labelTr: 'Transferler', labelZh: '接送' },
      { id: 'workshops', slug: 'workshops', labelEn: 'Workshops', labelTr: 'Atölyeler', labelZh: '工作坊' },
    ],
  },
  {
    id: 'antalya',
    slug: 'antalya',
    nameEn: 'Antalya',
    nameTr: 'Antalya',
    nameZh: '安塔利亚',
    active: false,
    categories: [
      { id: 'boat-tours', slug: 'boat-tours', labelEn: 'Boat Tours', labelTr: 'Tekne Turları', labelZh: '游船' },
      { id: 'daily-tours', slug: 'daily-tours', labelEn: 'Daily Tours', labelTr: 'Gün Turları', labelZh: '一日游' },
      { id: 'transfers', slug: 'transfers', labelEn: 'Transfers', labelTr: 'Transferler', labelZh: '接送' },
    ],
  },
  {
    id: 'istanbul',
    slug: 'istanbul',
    nameEn: 'Istanbul',
    nameTr: 'İstanbul',
    nameZh: '伊斯坦布尔',
    active: false,
    categories: [
      { id: 'daily-tours', slug: 'daily-tours', labelEn: 'Daily Tours', labelTr: 'Gün Turları', labelZh: '一日游' },
      { id: 'cultural-experiences', slug: 'cultural-experiences', labelEn: 'Cultural Experiences', labelTr: 'Kültürel Deneyimler', labelZh: '文化体验' },
      { id: 'transfers', slug: 'transfers', labelEn: 'Transfers', labelTr: 'Transferler', labelZh: '接送' },
    ],
  },
];

export function getDestinations(): DestinationConfig[] {
  return DESTINATIONS;
}

export function getActiveDestinations(): DestinationConfig[] {
  return DESTINATIONS.filter((d) => d.active);
}

export function getDestinationBySlug(slug: string): DestinationConfig | null {
  return DESTINATIONS.find((d) => d.slug === slug) ?? null;
}

export function getCategoriesForDestination(destinationSlug: string): CategoryConfig[] {
  const dest = getDestinationBySlug(destinationSlug);
  return dest?.categories ?? [];
}

export function getCategoryBySlug(destinationSlug: string, categorySlug: string): CategoryConfig | null {
  const cats = getCategoriesForDestination(destinationSlug);
  return cats.find((c) => c.slug === categorySlug) ?? null;
}

export function isDestinationSlug(slug: string): boolean {
  return DESTINATIONS.some((d) => d.slug === slug);
}

export function getDestinationName(dest: DestinationConfig, lang: Lang): string {
  return lang === 'tr' ? dest.nameTr : lang === 'zh' ? dest.nameZh : dest.nameEn;
}

export function getCategoryLabel(cat: CategoryConfig, lang: Lang): string {
  return lang === 'tr' ? cat.labelTr : lang === 'zh' ? cat.labelZh : cat.labelEn;
}
