import {
  TrendingUp,
  Star,
  Flame,
  AlertCircle,
  Zap,
  CircleCheck,
  ShieldCheck,
  Wallet,
  MapPinned,
  Hand,
  Heart,
  Handshake,
  Crown,
  Users,
  Sparkles,
  Mountain,
  Eye,
  Landmark,
  Camera,
  Bus,
  Sunrise,
  Sunset,
  Clock,
  BadgePercent,
  Award,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';

export type TagCategory =
  | 'sales'
  | 'trust'
  | 'difference'
  | 'premium'
  | 'activity'
  | 'operational';

export type TagColor = 'orange' | 'green' | 'blue' | 'purple' | 'gray';

export interface TagDefinition {
  slug: string;
  category: TagCategory;
  icon: LucideIcon;
  labelEn: string;
  labelTr: string;
  labelZh: string;
  color: TagColor;
}

export const TOUR_TAGS: TagDefinition[] = [
  // ── Sales Triggers ────────────────────────────────────────────────────────
  { slug: 'best-seller',   category: 'sales', icon: TrendingUp,  labelEn: 'Best Seller',   labelTr: 'Çok Satan',         labelZh: '热销',     color: 'orange' },
  { slug: 'most-popular',  category: 'sales', icon: Star,        labelEn: 'Most Popular',  labelTr: 'En Popüler',        labelZh: '最受欢迎', color: 'orange' },
  { slug: 'selling-fast',  category: 'sales', icon: Flame,       labelEn: 'Selling Fast',  labelTr: 'Hızlı Satış',       labelZh: '热销中',   color: 'orange' },
  { slug: 'limited-spots', category: 'sales', icon: AlertCircle, labelEn: 'Limited Spots', labelTr: 'Sınırlı Kontenjan', labelZh: '名额有限', color: 'orange' },
  { slug: 'high-demand',   category: 'sales', icon: TrendingUp,  labelEn: 'High Demand',   labelTr: 'Yoğun Talep',       labelZh: '需求旺盛', color: 'orange' },

  // ── Trust ─────────────────────────────────────────────────────────────────
  { slug: 'instant-confirmation', category: 'trust', icon: Zap,         labelEn: 'Instant Confirmation', labelTr: 'Anında Onay',         labelZh: '即时确认', color: 'green' },
  { slug: 'free-cancellation',    category: 'trust', icon: CircleCheck, labelEn: 'Free Cancellation',    labelTr: 'Ücretsiz İptal',      labelZh: '免费取消', color: 'green' },
  { slug: 'no-prepayment',        category: 'trust', icon: CircleCheck, labelEn: 'No Prepayment',        labelTr: 'Ön Ödeme Yok',        labelZh: '无需预付', color: 'green' },
  { slug: 'secure-booking',       category: 'trust', icon: ShieldCheck, labelEn: 'Secure Booking',       labelTr: 'Güvenli Rezervasyon', labelZh: '安全预订', color: 'green' },
  { slug: 'pay-on-arrival',       category: 'trust', icon: Wallet,      labelEn: 'Pay on Arrival',       labelTr: 'Varışta Ödeme',       labelZh: '到付',     color: 'green' },

  // ── Differentiators ───────────────────────────────────────────────────────
  { slug: 'operated-local-experts', category: 'difference', icon: MapPinned, labelEn: 'Operated by Local Experts',       labelTr: 'Yerel Uzmanlarca İşletilir',    labelZh: '本地专家运营',       color: 'blue' },
  { slug: 'handpicked-experience',  category: 'difference', icon: Hand,      labelEn: 'Handpicked Experience',           labelTr: 'Özenle Seçilmiş Deneyim',       labelZh: '精选体验',           color: 'blue' },
  { slug: 'authentic-cappadocia',   category: 'difference', icon: Heart,     labelEn: 'Authentic Cappadocia Experience', labelTr: 'Otantik Kapadokya Deneyimi',    labelZh: '正宗卡帕多奇亚体验', color: 'blue' },
  { slug: 'family-run-quality',     category: 'difference', icon: Heart,     labelEn: 'Family-Run Quality',              labelTr: 'Aile İşletmesi Kalitesi',       labelZh: '家族经营品质',       color: 'blue' },
  { slug: 'carefully-selected',     category: 'difference', icon: Handshake, labelEn: 'Carefully Selected Partners',     labelTr: 'Özenle Seçilmiş Ortaklar',      labelZh: '精选合作伙伴',       color: 'blue' },

  // ── Premium & Quality ─────────────────────────────────────────────────────
  { slug: 'premium-experience',   category: 'premium', icon: Crown,    labelEn: 'Premium Experience',   labelTr: 'Premium Deneyim',          labelZh: '高端体验',   color: 'purple' },
  { slug: 'small-group',          category: 'premium', icon: Users,    labelEn: 'Small Group',          labelTr: 'Küçük Grup',               labelZh: '小团',       color: 'purple' },
  { slug: 'exclusive-experience', category: 'premium', icon: Crown,    labelEn: 'Exclusive Experience', labelTr: 'Özel Deneyim',             labelZh: '独家体验',   color: 'purple' },
  { slug: 'personalized-service', category: 'premium', icon: Sparkles, labelEn: 'Personalized Service', labelTr: 'Kişiselleştirilmiş Hizmet', labelZh: '个性化服务', color: 'purple' },

  // ── Activity Feel ─────────────────────────────────────────────────────────
  { slug: 'scenic-experience', category: 'activity', icon: Mountain, labelEn: 'Scenic Experience',    labelTr: 'Manzaralı Deneyim',    labelZh: '风景体验',   color: 'gray' },
  { slug: 'panoramic-views',   category: 'activity', icon: Eye,      labelEn: 'Panoramic Views',      labelTr: 'Panoramik Manzara',    labelZh: '全景视野',   color: 'gray' },
  { slug: 'iconic-locations',  category: 'activity', icon: Landmark, labelEn: 'Iconic Locations',     labelTr: 'İkonik Mekânlar',      labelZh: '标志性地点', color: 'gray' },
  { slug: 'photo-stops',       category: 'activity', icon: Camera,   labelEn: 'Photo Stops Included', labelTr: 'Fotoğraf Molaları Dahil', labelZh: '含拍照站点', color: 'gray' },

  // ── Operational ───────────────────────────────────────────────────────────
  { slug: 'hotel-pickup',         category: 'operational', icon: Bus,          labelEn: 'Hotel Pick-up Included', labelTr: 'Otelden Alım Dahil',     labelZh: '含酒店接送', color: 'gray' },
  { slug: 'sunrise-experience',   category: 'operational', icon: Sunrise,      labelEn: 'Sunrise Experience',     labelTr: 'Gün Doğumu Deneyimi',    labelZh: '日出体验',   color: 'gray' },
  { slug: 'sunset-experience',    category: 'operational', icon: Sunset,       labelEn: 'Sunset Experience',      labelTr: 'Gün Batımı Deneyimi',    labelZh: '日落体验',   color: 'gray' },
  { slug: 'full-day-tour',        category: 'operational', icon: Clock,        labelEn: 'Full-Day Tour',          labelTr: 'Tam Gün Tur',            labelZh: '全天游',     color: 'gray' },
  { slug: 'best-price-guarantee', category: 'operational', icon: BadgePercent, labelEn: 'Best Price Guarantee',   labelTr: 'En İyi Fiyat Garantisi', labelZh: '最低价保证', color: 'green' },
  { slug: 'limited-availability', category: 'operational', icon: AlertCircle,  labelEn: 'Limited Availability',   labelTr: 'Sınırlı Uygunluk',       labelZh: '名额有限',   color: 'orange' },
  { slug: 'top-rated',            category: 'operational', icon: Award,        labelEn: 'Top Rated Experience',   labelTr: 'En Yüksek Puanlı',       labelZh: '顶级评价',   color: 'orange' },
  { slug: 'local-expert-guided',  category: 'operational', icon: UserCheck,    labelEn: 'Local Expert Guided',    labelTr: 'Yerel Uzman Rehberli',   labelZh: '本地专家带队', color: 'blue' },
];

export const TAG_CATEGORY_ORDER: TagCategory[] = ['sales', 'trust', 'difference', 'premium', 'activity', 'operational'];

export const TAG_CATEGORY_LABELS: Record<TagCategory, { en: string; tr: string; zh: string }> = {
  sales:       { en: 'Sales Triggers',    tr: 'Satış Etiketleri',     zh: '销售标签' },
  trust:       { en: 'Trust & Safety',    tr: 'Güven',                zh: '信任' },
  difference:  { en: 'Differentiators',   tr: 'Farklılaştırıcılar',   zh: '特色' },
  premium:     { en: 'Premium & Quality', tr: 'Premium ve Kalite',    zh: '高端品质' },
  activity:    { en: 'Activity Feel',     tr: 'Aktivite Hissi',       zh: '活动氛围' },
  operational: { en: 'Operational',       tr: 'Operasyonel',          zh: '运营' },
};

export function getTagBySlug(slug: string): TagDefinition | undefined {
  return TOUR_TAGS.find((t) => t.slug === slug);
}

export function getTagLabel(slug: string, lang: 'en' | 'tr' | 'zh'): string {
  const tag = getTagBySlug(slug);
  if (!tag) return slug;
  return lang === 'tr' ? tag.labelTr : lang === 'zh' ? tag.labelZh : tag.labelEn;
}

/**
 * Pick up to `max` tags to display in a compact surface (e.g. a card):
 * preserve the admin-selected order but round-robin across categories
 * so one category can't hog the slots.
 */
export function pickDisplayTagSlugs(selected: string[] | null | undefined, max = 3): string[] {
  if (!Array.isArray(selected) || selected.length === 0) return [];
  const validTags = selected
    .map((s) => getTagBySlug(s))
    .filter((t): t is TagDefinition => Boolean(t));
  if (validTags.length === 0) return [];

  const byCategory = new Map<TagCategory, TagDefinition[]>();
  for (const tag of validTags) {
    const list = byCategory.get(tag.category) ?? [];
    list.push(tag);
    byCategory.set(tag.category, list);
  }

  const result: string[] = [];
  let changed = true;
  while (result.length < max && changed) {
    changed = false;
    for (const cat of TAG_CATEGORY_ORDER) {
      if (result.length >= max) break;
      const list = byCategory.get(cat);
      if (!list || list.length === 0) continue;
      result.push(list.shift()!.slug);
      changed = true;
    }
  }
  return result;
}

export function normalizeSalesTagsInput(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const knownSlugs = new Set(TOUR_TAGS.map((t) => t.slug));
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    if (!knownSlugs.has(item)) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}
