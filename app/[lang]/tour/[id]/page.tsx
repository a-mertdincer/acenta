'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/Button';
import { useCartStore } from '../../../store/cartStore';
import { getTourImagePath, getTourImageFallback } from '../../../../lib/imagePaths';
import { getTourById, getTourDatePrice } from '../../../actions/tours';
import { getTourWithVariants } from '../../../actions/variants';
import { ProductVariantBookingCard } from '../../../components/ProductVariantBookingCard';
import { TourDetailGallery } from '../../../components/TourDetailGallery';
import { useExchangeRate } from '../../../hooks/useExchangeRate';
import { formatPriceByLang } from '@/lib/currency';

function getTransferPriceForPaxClient(transferTiers: { minPax: number; maxPax: number; price: number }[] | null, pax: number, basePrice: number): number {
  if (transferTiers?.length) {
    const tier = transferTiers.find((t) => pax >= t.minPax && pax <= t.maxPax);
    if (tier) return tier.price;
  }
  return basePrice;
}

function buildProductSchema(
  _tour: { titleEn: string; type: string },
  tourWithVariants: { variants: { titleEn: string; adultPrice: number; pricingType: string }[] },
  title: string,
  desc: string,
  imagePath: string
) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const imageUrl = imagePath.startsWith('http') ? imagePath : `${baseUrl}${imagePath}`;
  const offers = tourWithVariants.variants.map((v) => ({
    '@type': 'Offer',
    price: v.adultPrice,
    priceCurrency: 'EUR',
    name: v.titleEn,
    availability: 'https://schema.org/InStock',
  }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description: desc,
    image: imageUrl,
    ...(offers.length > 0 && { offers }),
  };
}

type TransferAirport = 'ASR' | 'NAV';

function getAgePricingLabel(lang: Lang, pricingType: 'free' | 'child' | 'adult' | 'not_allowed'): string {
  if (lang === 'tr') {
    if (pricingType === 'free') return 'Ucretsiz';
    if (pricingType === 'child') return 'Cocuk fiyati';
    if (pricingType === 'adult') return 'Yetiskin fiyati';
    return 'Kabul edilmez';
  }
  if (lang === 'zh') {
    if (pricingType === 'free') return '免费';
    if (pricingType === 'child') return '儿童价格';
    if (pricingType === 'adult') return '成人价格';
    return '不接受';
  }
  if (pricingType === 'free') return 'Free of charge';
  if (pricingType === 'child') return 'Child price';
  if (pricingType === 'adult') return 'Adult price';
  return 'Not allowed';
}

function getAgePolicyDetail(
  description: string | null | undefined,
  label: string,
  pricingType: 'free' | 'child' | 'adult' | 'not_allowed'
): string | null {
  const normalized = (description ?? '').trim();
  if (!normalized) return null;
  const value = normalized.toLowerCase();
  const labelValue = label.toLowerCase();
  const generic = [
    'free of charge',
    'child price applies',
    'adult price applies',
    'not allowed',
    'ucretsiz',
    'cocuk fiyati',
    'yetiskin fiyati',
    'kabul edilmez',
  ];
  if (value === labelValue || generic.includes(value)) {
    return null;
  }
  if (pricingType !== 'not_allowed' && value === 'izin verilmez') {
    return null;
  }
  return normalized;
}

function TourDetailHeroImage({ type, title }: { type: string; title: string }) {
  const [src, setSrc] = useState(() => getTourImagePath(type));
  const fallback = getTourImageFallback(type);
  return (
    <div className="tour-detail-hero" style={{ borderRadius: '12px', marginBottom: 'var(--space-xl)', overflow: 'hidden' }}>
      <img
        src={src}
        alt={title}
        onError={() => setSrc(fallback)}
        style={{ width: '100%', height: '400px', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

type Lang = 'en' | 'tr' | 'zh';

const TOUR_DETAIL_STRINGS: Record<Lang, {
  description: string;
  optionalAddons: string;
  basePrice: string;
  perPerson: string;
  baseSubtotal: string;
  optionLine: string;
  netTotal: string;
  free: string;
  selectDate: string;
  passengers: string;
  thisDayPrice: string;
  capacity: string;
  guests: string;
  bookNow: string;
  addToCart: string;
  dateClosed: string;
  transferPrice: string;
  airport: string;
  airportASR: string;
  airportNAV: string;
  addedToCart: string;
  goToCart: string;
  continueShopping: string;
  agePolicyTitle: string;
  agePolicyInfant: string;
  agePolicyChild: string;
  agePolicyAdult: string;
}> = {
  en: {
    description: 'Description',
    optionalAddons: 'Optional add-ons',
    basePrice: 'Base price',
    perPerson: 'per person',
    baseSubtotal: 'Base (×{pax} guests)',
    optionLine: '{title} (×{pax})',
    netTotal: 'Net total',
    free: 'Free',
    selectDate: 'Select date',
    passengers: 'Number of guests',
    thisDayPrice: "This day's price",
    capacity: 'Capacity',
    guests: 'guests',
    bookNow: 'Book now',
    addToCart: 'Add to cart',
    dateClosed: 'This date is closed for booking.',
    transferPrice: 'Price for {pax} passenger(s)',
    airport: 'Airport',
    airportASR: 'Kayseri (ASR)',
    airportNAV: 'Nevşehir (NAV)',
    addedToCart: 'added to cart!',
    goToCart: 'Go to cart',
    continueShopping: 'Continue shopping',
    agePolicyTitle: 'Age policy:',
    agePolicyInfant: '0-3 years: Free',
    agePolicyChild: '4-7 years: Child price',
    agePolicyAdult: '7+ years: Adult price',
  },
  tr: {
    description: 'Açıklama',
    optionalAddons: 'Opsiyonlar (ekstralar)',
    basePrice: 'Temel fiyat',
    perPerson: 'kişi başı',
    baseSubtotal: 'Temel fiyat (×{pax} kişi)',
    optionLine: '{title} (×{pax})',
    netTotal: 'Net toplam',
    free: 'Dahil',
    selectDate: 'Tarih seçin',
    passengers: 'Yolcu sayısı',
    thisDayPrice: 'Bu günün fiyatı',
    capacity: 'Kapasite',
    guests: 'kişi',
    bookNow: 'Rezervasyon yap',
    addToCart: 'Sepete ekle',
    dateClosed: 'Bu tarih için rezervasyon alınmamaktadır.',
    transferPrice: '{pax} kişi fiyatı',
    airport: 'Havalimanı',
    airportASR: 'Kayseri (ASR)',
    airportNAV: 'Nevşehir (NAV)',
    addedToCart: 'sepete eklendi!',
    goToCart: 'Sepete Git',
    continueShopping: 'Alışverişe Devam Et',
    agePolicyTitle: 'Yaş politikası:',
    agePolicyInfant: '0-3 yaş: Ücretsiz',
    agePolicyChild: '4-7 yaş: Çocuk fiyatı',
    agePolicyAdult: '7+ yaş: Yetişkin fiyatı',
  },
  zh: {
    description: '描述',
    optionalAddons: '可选附加项目',
    basePrice: '基础价格',
    perPerson: '每人',
    baseSubtotal: '基础 (×{pax} 人)',
    optionLine: '{title} (×{pax})',
    netTotal: '合计',
    free: '免费',
    selectDate: '选择日期',
    passengers: '乘客人数',
    thisDayPrice: '当日价格',
    capacity: '容量',
    guests: '人',
    bookNow: '立即预订',
    addToCart: '加入购物车',
    dateClosed: '该日期不接受预订。',
    transferPrice: '{pax} 人价格',
    airport: '机场',
    airportASR: '开塞利 (ASR)',
    airportNAV: '内夫谢希尔 (NAV)',
    addedToCart: '已加入购物车！',
    goToCart: '前往购物车',
    continueShopping: '继续购物',
    agePolicyTitle: '年龄政策：',
    agePolicyInfant: '0-3岁：免费',
    agePolicyChild: '4-7岁：儿童价格',
    agePolicyAdult: '7岁以上：成人价格',
  },
};

type DescriptionBlock =
  | { kind: 'p'; content: string }
  | { kind: 'h2'; content: string }
  | { kind: 'h3'; content: string }
  | { kind: 'ul'; items: string[] };

function parseDescriptionBlocks(source: string): DescriptionBlock[] {
  const normalized = source
    .replace(/\r\n?/g, '\n')
    .replace(/\s+•\s+/g, '\n• ')
    .trim();
  if (!normalized) return [];
  const lines = normalized.split('\n');
  const blocks: DescriptionBlock[] = [];
  let listBuffer: string[] = [];
  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ kind: 'ul', items: listBuffer });
      listBuffer = [];
    }
  };
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const bullet = line.match(/^(?:[-*•])\s+(.+)$/);
    if (bullet) {
      listBuffer.push(bullet[1].trim());
      continue;
    }
    flushList();
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      blocks.push({ kind: 'h2', content: h2[1].trim() });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      blocks.push({ kind: 'h3', content: h3[1].trim() });
      continue;
    }
    blocks.push({ kind: 'p', content: line });
  }
  flushList();
  return blocks;
}

function ProductDescription({ text }: { text: string }) {
  const blocks = parseDescriptionBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <div className="product-description">
      {blocks.map((block, idx) => {
        if (block.kind === 'ul') {
          return (
            <ul key={`ul-${idx}`}>
              {block.items.map((item, itemIdx) => (
                <li key={`li-${idx}-${itemIdx}`}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'h2') return <h2 key={`h2-${idx}`}>{block.content}</h2>;
        if (block.kind === 'h3') return <h3 key={`h3-${idx}`}>{block.content}</h3>;
        return <p key={`p-${idx}`}>{block.content}</p>;
      })}
    </div>
  );
}

type FaqItem = { question: string; answer: string };

function parseLineList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split('\n')
    .map((line) => line.replace(/^[\s\-*•]+/, '').trim())
    .filter(Boolean);
}

function StickyAnchorBar({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const anchorBar = document.querySelector('.tour-anchor-bar') as HTMLElement | null;
    const navbarHeight = (anchorBar?.offsetHeight ?? 0) + 70;
    const y = element.getBoundingClientRect().top + window.scrollY - navbarHeight;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveId(id);
  };

  useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-120px 0px -55% 0px', threshold: [0.15, 0.35, 0.6] }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="tour-anchor-bar">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={`tour-anchor-link ${activeId === section.id ? 'active' : ''}`}
          onClick={(event) => {
            event.preventDefault();
            scrollToSection(section.id);
          }}
        >
          {section.label}
        </a>
      ))}
    </div>
  );
}

function mapDbTourToState(db: {
  id: string; type: string; titleEn: string; titleTr: string; titleZh: string; descEn: string; descTr: string; descZh: string; basePrice: number;
  itineraryEn?: string | null;
  itineraryTr?: string | null;
  itineraryZh?: string | null;
  knowBeforeEn?: string | null;
  knowBeforeTr?: string | null;
  knowBeforeZh?: string | null;
  notSuitableEn?: string | null;
  notSuitableTr?: string | null;
  notSuitableZh?: string | null;
  notAllowedEn?: string | null;
  notAllowedTr?: string | null;
  notAllowedZh?: string | null;
  faqsEn?: { question: string; answer: string }[] | null;
  faqsTr?: { question: string; answer: string }[] | null;
  faqsZh?: { question: string; answer: string }[] | null;
  transferTiers?: { minPax: number; maxPax: number; price: number }[] | null;
  transferAirportTiers?: { ASR?: { minPax: number; maxPax: number; price: number }[]; NAV?: { minPax: number; maxPax: number; price: number }[] } | null;
  options: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number; pricingMode?: 'per_person' | 'flat' }[];
  minAgeLimit?: number | null;
  ageRestrictionEn?: string | null;
  ageRestrictionTr?: string | null;
  ageRestrictionZh?: string | null;
  ageGroups?: { minAge: number; maxAge: number; pricingType: 'free' | 'child' | 'adult' | 'not_allowed'; descriptionEn: string; descriptionTr: string; descriptionZh?: string | null }[];
  images?: { url: string; isPrimary: boolean }[];
}, _lang: Lang) {
  const titleEn = db.titleEn; const titleTr = db.titleTr; const titleZh = db.titleZh;
  return {
    id: db.id,
    type: db.type,
    titleEn,
    titleTr,
    titleZh,
    descEn: db.descEn,
    descTr: db.descTr,
    descZh: db.descZh,
    itinerary: _lang === 'tr' ? db.itineraryTr : _lang === 'zh' ? db.itineraryZh : db.itineraryEn,
    knowBefore: _lang === 'tr' ? db.knowBeforeTr : _lang === 'zh' ? db.knowBeforeZh : db.knowBeforeEn,
    notSuitable: _lang === 'tr' ? db.notSuitableTr : _lang === 'zh' ? db.notSuitableZh : db.notSuitableEn,
    notAllowed: _lang === 'tr' ? db.notAllowedTr : _lang === 'zh' ? db.notAllowedZh : db.notAllowedEn,
    faqs: (_lang === 'tr' ? db.faqsTr : _lang === 'zh' ? db.faqsZh : db.faqsEn) ?? [],
    basePrice: db.basePrice,
    transferTiers: db.transferTiers ?? null,
    transferAirportTiers: db.transferAirportTiers ?? null,
    minAgeLimit: db.minAgeLimit ?? null,
    ageRestriction: _lang === 'tr' ? db.ageRestrictionTr : _lang === 'zh' ? db.ageRestrictionZh : db.ageRestrictionEn,
    ageGroups: (db.ageGroups ?? []).map((group) => ({
      minAge: group.minAge,
      maxAge: group.maxAge,
      pricingType: group.pricingType,
      description: _lang === 'tr' ? group.descriptionTr : _lang === 'zh' ? (group.descriptionZh ?? '') : group.descriptionEn,
    })),
    images: (db.images ?? []).map((img) => img.url),
    options: db.options.map((o) => ({
      id: o.id,
      title: _lang === 'tr' ? o.titleTr : _lang === 'zh' ? o.titleZh : o.titleEn,
      price: o.priceAdd,
      pricingMode: o.pricingMode === 'flat' ? 'flat' : 'per_person',
    })),
  };
}

const mockTours = [
    {
        id: 'mock-balloon',
        type: 'BALLOON',
        titleEn: 'Standard Balloon Flight',
        titleTr: 'Standart Balon Turu',
        titleZh: '标准热气球飞行',
        descEn: 'Float above the fairy chimneys at sunrise in our spacious baskets. 1 hour flight with champagne toast.',
        descTr: 'Geniş sepetlerimizde gün doğumunda peribacalarının üzerinde süzülün. Şampanya ikramlı 1 saatlik uçuş.',
        descZh: '在宽敞的吊篮中，在日出时分漂浮在仙女烟囱上方。香槟吐司1小时飞行。',
        basePrice: 150.0,
        options: []
    },
    {
        id: 'mock-green',
        type: 'TOUR',
        titleEn: 'Cappadocia Green Tour',
        titleTr: 'Kapadokya Yeşil Tur',
        titleZh: '卡帕多奇亚绿线之旅',
        descEn: 'Explore the underground city, hike in Ihlara Valley and visit Selime Monastery. Includes lunch.',
        descTr: 'Yeraltı şehrini keşfedin, Ihlara Vadisinde yürüyüş yapın ve Selime Manastırını ziyaret edin. Öğle yemeği dahildir.',
        descZh: '探索地下城，在伊赫拉拉山谷徒步旅行，并参观塞利梅修道院。包括午餐。',
        basePrice: 40.0,
        options: [
            { id: '1', title: 'Vegetarian Lunch', price: 0, pricingMode: 'per_person' },
            { id: '2', title: 'Private Guide', price: 50.0, pricingMode: 'per_person' }
        ]
    }
];

export default function TourDetailPage(props: { params: Promise<{ lang: string; id: string }> }) {
    const params = use(props.params);
    const { lang, id } = params;
    const router = useRouter();
    const addItem = useCartStore(state => state.addItem);

    const [tour, setTour] = useState<any>(null);
    const [tourWithVariants, setTourWithVariants] = useState<Awaited<ReturnType<typeof getTourWithVariants>>>(null);
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [selectedAirport, setSelectedAirport] = useState<TransferAirport>('ASR');
    const [datePrice, setDatePrice] = useState<{ price: number; capacity: number; isClosed: boolean } | null>(null);
    const [cartToastOpen, setCartToastOpen] = useState(false);
    const [cartToastTitle, setCartToastTitle] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const { eurTryRate, updatedAt } = useExchangeRate(lang === 'tr');
    const showChildren = (tour?.minAgeLimit != null ? tour.minAgeLimit < 8 : true) && (tour?.ageGroups?.length ? tour.ageGroups.some((g: { pricingType: string; maxAge: number }) => g.pricingType === 'child' && g.maxAge >= 4) : true);
    const showInfants = (tour?.minAgeLimit != null ? tour.minAgeLimit < 4 : true) && (tour?.ageGroups?.length ? tour.ageGroups.some((g: { minAge: number; pricingType: string }) => g.minAge <= 3 && g.pricingType !== 'not_allowed') : true);

    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const defaultDate = d.toISOString().split('T')[0];
        setSelectedDate(defaultDate);

        if (id.startsWith('mock-')) {
            const found = mockTours.find(t => t.id === id);
            if (found) setTour(found);
            return;
        }
        Promise.all([getTourById(id), getTourWithVariants(id)])
          .then(([dbTour, variantData]) => {
            setTourWithVariants(variantData);
            if (dbTour) {
              setTour(mapDbTourToState(dbTour, lang as Lang));
              return;
            }
            if (variantData) {
              setTour({
                id: variantData.id,
                type: variantData.type,
                titleEn: variantData.titleEn,
                titleTr: variantData.titleTr,
                titleZh: variantData.titleZh,
                descEn: '',
                descTr: '',
                descZh: '',
                basePrice: 0,
                transferTiers: null,
                transferAirportTiers: variantData.transferAirportTiers ?? null,
                options: [],
                faqs: [],
                images: [],
                itinerary: null,
                knowBefore: null,
                notSuitable: null,
                notAllowed: null,
                minAgeLimit: variantData.minAgeLimit ?? null,
                ageRestriction: null,
                ageGroups: (variantData.ageGroups ?? []).map((group) => ({
                  minAge: group.minAge,
                  maxAge: group.maxAge,
                  pricingType: group.pricingType,
                  description: lang === 'tr'
                    ? group.descriptionTr
                    : lang === 'zh'
                      ? (group.descriptionZh ?? '')
                      : group.descriptionEn,
                })),
              });
              return;
            }
            const found = mockTours.find(t => t.id === id);
            if (found) setTour(found);
          })
          .catch(() => {
            const found = mockTours.find(t => t.id === id);
            if (found) setTour(found);
          });
    }, [id, lang]);

    useEffect(() => {
        if (!tour || !selectedDate || id.startsWith('mock-')) {
            setDatePrice(null);
            return;
        }
        getTourDatePrice(tour.id, selectedDate).then((result) => {
            if (result) setDatePrice(result);
            else setDatePrice(null);
        });
    }, [tour?.id, selectedDate, id]);

    useEffect(() => {
      if (!cartToastOpen) return;
      const timer = setTimeout(() => setCartToastOpen(false), 4000);
      return () => clearTimeout(timer);
    }, [cartToastOpen]);

    useEffect(() => {
        if (!showChildren && children !== 0) setChildren(0);
        if (!showInfants && infants !== 0) setInfants(0);
    }, [showChildren, showInfants, children, infants]);

    if (!tour) return <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>Loading...</div>;

    // Transfer sayfasında layout atlamasını önle: varyant verisi gelene kadar aynı layout ile skeleton göster
    const needsVariants = tour.type === 'TRANSFER';
    if (needsVariants && !tourWithVariants) {
      return <div className="container tour-detail-layout tour-detail-layout--variant" style={{ padding: 'var(--space-2xl) 0', minHeight: '60vh' }}>
        <div className="tour-detail-hero-grid tour-detail-hero-grid--variant" style={{ opacity: 0.6 }}>
          <div>
            <div style={{ height: 28, background: 'var(--color-border)', borderRadius: 4, marginBottom: 12, maxWidth: 240 }} />
            <div style={{ height: 24, background: 'var(--color-border)', borderRadius: 4, marginBottom: 16, maxWidth: 80 }} />
            <div style={{ aspectRatio: '4/3', background: 'var(--color-bg-alt)', borderRadius: 12 }} />
          </div>
          <div className="tour-detail-booking-card-wrapper" style={{ padding: 'var(--space-xl)', background: 'var(--color-bg-card)', borderRadius: 12 }}>
            <div style={{ height: 80, background: 'var(--color-border)', borderRadius: 8, marginBottom: 12 }} />
            <div style={{ height: 120, background: 'var(--color-border)', borderRadius: 8 }} />
          </div>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 'var(--space-lg)' }}>Yükleniyor...</p>
      </div>;
    }

    const locale = (lang === 'tr' || lang === 'zh' ? lang : 'en') as Lang;
    const t = TOUR_DETAIL_STRINGS[locale];
    const title = lang === 'tr' ? tour.titleTr : lang === 'zh' ? tour.titleZh : tour.titleEn;
    const desc = lang === 'tr' ? tour.descTr : lang === 'zh' ? tour.descZh : tour.descEn;
    const formatShown = (eur: number) => formatPriceByLang(eur, locale, eurTryRate);

    const pax = adults + children + infants;
    const transferTiersForAirport =
        tour.type === 'TRANSFER' && tour.transferAirportTiers
            ? (tour.transferAirportTiers[selectedAirport] ?? tour.transferAirportTiers.ASR ?? tour.transferTiers)
            : null;
    const isTransferWithTiers = tour.type === 'TRANSFER' && (transferTiersForAirport?.length ?? tour.transferTiers?.length);
    const basePrice = datePrice?.price ?? tour.basePrice;
    const adultUnitPrice = basePrice;
    const hasChildPricingPolicy = Array.isArray(tour.ageGroups)
      ? tour.ageGroups.some((g: { pricingType: string; maxAge: number }) => g.pricingType === 'child' && g.maxAge >= 4)
      : false;
    const explicitChildPrice = Number((tour as { childPrice?: number | null }).childPrice ?? 0);
    const childUnitPrice = explicitChildPrice > 0 ? explicitChildPrice : hasChildPricingPolicy ? basePrice / 2 : basePrice;
    const isClosed = datePrice?.isClosed ?? false;
    const unitPrice = isTransferWithTiers
        ? getTransferPriceForPaxClient(transferTiersForAirport ?? tour.transferTiers, pax, basePrice)
        : basePrice;
    let total = isTransferWithTiers ? unitPrice : (adultUnitPrice * adults + childUnitPrice * children);
    selectedOptions.forEach(optId => {
        const opt = tour.options?.find((o: any) => o.id === optId);
        if (opt) total += opt.pricingMode === 'flat' ? opt.price : (opt.price * pax);
    });

    const toggleOption = (optId: string) => {
        setSelectedOptions(prev =>
            prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
        );
    };

    const availableVariants = tourWithVariants?.variants ?? [];
    const useVariantBooking = availableVariants.length > 0;
    const fromPrice = useVariantBooking
        ? Math.min(...availableVariants.map((v) => v.adultPrice))
        : null;
    const galleryMain = getTourImagePath(tour.type);
    const galleryFallback = getTourImageFallback(tour.type);
    const dynamicImages = Array.isArray(tour.images) ? tour.images.filter((url: unknown): url is string => typeof url === 'string' && url.trim() !== '') : [];
    const galleryMainSrc = dynamicImages[0] ?? galleryMain;
    const itineraryItems = parseLineList(tour.itinerary);
    const knowBeforeItems = parseLineList(tour.knowBefore);
    const notSuitableItems = parseLineList(tour.notSuitable);
    const notAllowedItems = parseLineList(tour.notAllowed);
    const faqs = (Array.isArray(tour.faqs) ? tour.faqs : []) as FaqItem[];
    const anchorSections = [
      { id: 'book-now', label: lang === 'tr' ? 'Rezervasyon' : lang === 'zh' ? '立即预订' : 'Book Now' },
      { id: 'itinerary', label: 'Itinerary' },
      { id: 'gallery', label: lang === 'tr' ? 'Galeri' : lang === 'zh' ? '图库' : 'Gallery' },
      { id: 'whats-included', label: lang === 'tr' ? 'Dahil Olanlar' : lang === 'zh' ? '包含内容' : "What's Included" },
      { id: 'faqs', label: 'FAQs' },
    ];

    const productSchema = useVariantBooking && tourWithVariants && tour
        ? buildProductSchema(tour, tourWithVariants, title, desc, galleryMainSrc)
        : null;

    return (
        <div className={`container tour-detail-layout${useVariantBooking ? ' tour-detail-layout--variant' : ''}`}>
            {productSchema && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
            )}
            <StickyAnchorBar sections={anchorSections} />
            {useVariantBooking ? (
                <>
                    <div className="tour-detail-hero-grid tour-detail-hero-grid--variant">
                        <div>
                            <h1 style={{ marginBottom: 'var(--space-md)' }}>{title}</h1>
                            <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', display: 'inline-block', marginBottom: 'var(--space-md)' }}>
                                {tour.type}
                            </span>
                            {fromPrice != null && (
                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-lg)' }}>
                                    From {formatShown(fromPrice).primary}
                                    {formatShown(fromPrice).secondary ? <small style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{formatShown(fromPrice).secondary}</small> : null}
                                </p>
                            )}
                            <div id="gallery">
                              <TourDetailGallery mainSrc={galleryMainSrc} fallbackSrc={galleryFallback} thumbs={dynamicImages.length > 0 ? dynamicImages : [galleryMainSrc]} />
                            </div>
                            <div style={{ marginTop: 'var(--space-lg)' }} id="itinerary">
                                <h2>{t.description}</h2>
                                <ProductDescription text={desc} />
                            </div>
                            {itineraryItems.length > 0 && (
                                <section className="tour-structured-section">
                                    <h3>Itinerary</h3>
                                    <ul>{itineraryItems.map((item, idx) => <li key={`it-${idx}`}>{item}</li>)}</ul>
                                </section>
                            )}
                            {knowBeforeItems.length > 0 && (
                                <section className="tour-structured-section">
                                    <h3>{lang === 'tr' ? 'Bilmeniz Gerekenler' : lang === 'zh' ? '出行须知' : 'Know Before You Go'}</h3>
                                    <ul>{knowBeforeItems.map((item, idx) => <li key={`kb-${idx}`}>{item}</li>)}</ul>
                                </section>
                            )}
                            {notSuitableItems.length > 0 && (
                                <section className="tour-structured-section">
                                    <h3>{lang === 'tr' ? 'Uygun Degil' : lang === 'zh' ? '不适合人群' : 'Not Suitable For'}</h3>
                                    <ul>{notSuitableItems.map((item, idx) => <li key={`ns-${idx}`}>{item}</li>)}</ul>
                                </section>
                            )}
                            {notAllowedItems.length > 0 && (
                                <section className="tour-structured-section" id="whats-included">
                                    <h3>{lang === 'tr' ? 'Izin Verilmeyenler' : lang === 'zh' ? '禁止事项' : 'Not Allowed'}</h3>
                                    <ul>{notAllowedItems.map((item, idx) => <li key={`na-${idx}`}>{item}</li>)}</ul>
                                </section>
                            )}
                            {faqs.length > 0 && (
                                <section className="tour-structured-section" id="faqs">
                                    <h3>FAQs</h3>
                                    <div className="tour-faq-list">
                                        {faqs.map((faq, idx) => (
                                            <button
                                                key={`faq-v-${idx}`}
                                                type="button"
                                                className="tour-faq-item"
                                                onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                                            >
                                                <strong>{faq.question}</strong>
                                                {openFaqIndex === idx ? <p>{faq.answer}</p> : null}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                        <div className="tour-detail-booking-card-wrapper" id="book-now">
                            <ProductVariantBookingCard
                                tourId={tour.id}
                                tourType={tour.type}
                                lang={lang as Lang}
                                data={tourWithVariants ?? {
                                  id: tour.id,
                                  type: tour.type,
                                  titleEn: tour.titleEn,
                                  titleTr: tour.titleTr,
                                  titleZh: tour.titleZh,
                                  hasTourType: false,
                                  hasAirportSelect: false,
                                  hasReservationType: false,
                                  reservationTypeMode: 'none',
                                  minAgeLimit: tour.minAgeLimit ?? null,
                                  ageRestrictionEn: null,
                                  ageRestrictionTr: null,
                                  ageRestrictionZh: null,
                                  ageGroups: [],
                                  transferAirportTiers: null,
                                  variants: [],
                                }}
                                title={title}
                                options={tour.options ?? []}
                                ageGroups={tour.ageGroups ?? []}
                                minAgeLimit={tour.minAgeLimit ?? null}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <>
            <div>
                <h1 style={{ marginBottom: 'var(--space-md)' }}>{title}</h1>
                <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', display: 'inline-block', marginBottom: 'var(--space-xl)' }}>
                    {tour.type}
                </span>

                {dynamicImages.length > 0 ? (
                    <div id="gallery">
                      <TourDetailGallery mainSrc={galleryMainSrc} fallbackSrc={galleryFallback} thumbs={dynamicImages} />
                    </div>
                ) : (
                    <TourDetailHeroImage type={tour.type} title={title} />
                )}

                <div id="itinerary">
                  <h2>{t.description}</h2>
                  <ProductDescription text={desc} />
                </div>
                {itineraryItems.length > 0 && (
                    <section className="tour-structured-section">
                        <h3>Itinerary</h3>
                        <ul>{itineraryItems.map((item, idx) => <li key={`it-nv-${idx}`}>{item}</li>)}</ul>
                    </section>
                )}
                {knowBeforeItems.length > 0 && (
                    <section className="tour-structured-section">
                        <h3>{lang === 'tr' ? 'Bilmeniz Gerekenler' : lang === 'zh' ? '出行须知' : 'Know Before You Go'}</h3>
                        <ul>{knowBeforeItems.map((item, idx) => <li key={`kb-nv-${idx}`}>{item}</li>)}</ul>
                    </section>
                )}
                {notSuitableItems.length > 0 && (
                    <section className="tour-structured-section">
                        <h3>{lang === 'tr' ? 'Uygun Degil' : lang === 'zh' ? '不适合人群' : 'Not Suitable For'}</h3>
                        <ul>{notSuitableItems.map((item, idx) => <li key={`ns-nv-${idx}`}>{item}</li>)}</ul>
                    </section>
                )}
                {notAllowedItems.length > 0 && (
                    <section className="tour-structured-section" id="whats-included">
                        <h3>{lang === 'tr' ? 'Izin Verilmeyenler' : lang === 'zh' ? '禁止事项' : 'Not Allowed'}</h3>
                        <ul>{notAllowedItems.map((item, idx) => <li key={`na-nv-${idx}`}>{item}</li>)}</ul>
                    </section>
                )}
                {faqs.length > 0 && (
                    <section className="tour-structured-section" id="faqs">
                        <h3>FAQs</h3>
                        <div className="tour-faq-list">
                            {faqs.map((faq, idx) => (
                                <button
                                    key={`faq-nv-${idx}`}
                                    type="button"
                                    className="tour-faq-item"
                                    onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                                >
                                    <strong>{faq.question}</strong>
                                    {openFaqIndex === idx ? <p>{faq.answer}</p> : null}
                                </button>
                            ))}
                        </div>
                    </section>
                )}

            </div>

            <div id="book-now">
                <div className="card tour-detail-booking-card" style={{ padding: 'var(--space-xl)' }}>
                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>{t.bookNow}</h3>

                    <div style={{ marginBottom: 'var(--space-md)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>{t.selectDate}</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                    </div>

                    {datePrice && selectedDate && (
                        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                <strong>{t.thisDayPrice}:</strong> {formatShown(datePrice.price).primary} {t.perPerson}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {t.capacity}: {datePrice.capacity} {t.guests}
                            </p>
                        </div>
                    )}

                    {tour.type === 'TRANSFER' && (tour.transferAirportTiers || tour.transferTiers) && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>{t.airport}</label>
                            <select
                                value={selectedAirport}
                                onChange={(e) => setSelectedAirport(e.target.value as TransferAirport)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="ASR">{t.airportASR}</option>
                                <option value="NAV">{t.airportNAV}</option>
                            </select>
                        </div>
                    )}

                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>{t.passengers}</label>
                        <div className="age-group">
                            <span className="age-group-label">{lang === 'tr' ? 'Yetiskin' : lang === 'zh' ? '成人' : 'Adults'}</span>
                            <div className="stepper-control">
                                <button type="button" className="stepper-btn" disabled={adults <= 1} onClick={() => setAdults((n) => Math.max(1, n - 1))}>-</button>
                                <span>{adults}</span>
                                <button type="button" className="stepper-btn" onClick={() => setAdults((n) => n + 1)}>+</button>
                            </div>
                        </div>
                        {showChildren && (
                            <div className="age-group">
                                <span className="age-group-label">{lang === 'tr' ? 'Cocuk' : lang === 'zh' ? '儿童' : 'Children'}</span>
                                <div className="stepper-control">
                                    <button type="button" className="stepper-btn" disabled={children <= 0} onClick={() => setChildren((n) => Math.max(0, n - 1))}>-</button>
                                    <span>{children}</span>
                                    <button type="button" className="stepper-btn" onClick={() => setChildren((n) => n + 1)}>+</button>
                                </div>
                            </div>
                        )}
                        {showInfants && (
                            <div className="age-group">
                                <span className="age-group-label">{lang === 'tr' ? 'Bebek' : lang === 'zh' ? '婴儿' : 'Infants'}</span>
                                <div className="stepper-control">
                                    <button type="button" className="stepper-btn" disabled={infants <= 0} onClick={() => setInfants((n) => Math.max(0, n - 1))}>-</button>
                                    <span>{infants}</span>
                                    <button type="button" className="stepper-btn" onClick={() => setInfants((n) => n + 1)}>+</button>
                                </div>
                            </div>
                        )}
                        <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', borderRadius: 8, background: 'var(--color-bg-alt)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            <strong>{t.agePolicyTitle}</strong><br />
                            {(tour.ageGroups?.length ?? 0) > 0 ? (
                                <>
                                    {(tour.ageGroups ?? []).map((g: { minAge: number; maxAge: number; pricingType: 'free' | 'child' | 'adult' | 'not_allowed'; description: string }, idx: number) => {
                                        const icon = g.pricingType === 'not_allowed' ? '⛔' : g.pricingType === 'child' ? '👶' : g.pricingType === 'free' ? '🎉' : '👤';
                                        const range = g.maxAge >= 99 ? `${g.minAge}+` : `${g.minAge}-${g.maxAge}`;
                                        const label = getAgePricingLabel(locale, g.pricingType);
                                        const extra = getAgePolicyDetail(g.description, label, g.pricingType);
                                        return <span key={`${range}-${idx}`}>{icon} {range}: {label}{extra ? ` — ${extra}` : ''}<br /></span>;
                                    })}
                                </>
                            ) : (
                                <>
                                    {t.agePolicyInfant}<br />
                                    {t.agePolicyChild}<br />
                                    {t.agePolicyAdult}
                                </>
                            )}
                        </div>
                    </div>

                    {tour.options?.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-xl)' }}>
                            <h4 style={{ marginBottom: 'var(--space-sm)' }}>{t.optionalAddons}</h4>
                            <div className="addons-list">
                                {tour.options.map((opt: any) => {
                                    const displayPrice = opt.pricingMode === 'flat' ? opt.price : opt.price * pax;
                                    const qtyLabel = opt.pricingMode === 'flat' ? '1x' : `${pax}x`;
                                    return (
                                        <label key={opt.id} className={`addon-row ${selectedOptions.includes(opt.id) ? 'is-selected' : ''}`}>
                                            <span className="addon-left">
                                                <input type="checkbox" className="addon-checkbox" checked={selectedOptions.includes(opt.id)} onChange={() => toggleOption(opt.id)} />
                                                <span className="addon-title">{opt.title}</span>
                                            </span>
                                            <span className="addon-price">
                                                {opt.price === 0 ? t.free : `+${formatShown(displayPrice).primary}`} <span className="addon-multiplier">({qtyLabel})</span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {isClosed && (
                        <p style={{ padding: 'var(--space-md)', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', marginBottom: 'var(--space-md)' }}>
                            {t.dateClosed}
                        </p>
                    )}
                    {isTransferWithTiers && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                            {t.transferPrice.replace('{pax}', String(pax))}: {formatShown(unitPrice).primary}
                        </p>
                    )}
                    <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', marginBottom: 'var(--space-xl)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
                            {t.basePrice}: {formatShown(basePrice).primary} {t.perPerson}
                        </p>
                        {isTransferWithTiers ? (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span>{`${t.basePrice} (${pax} ${t.guests})`}</span>
                                <span>{formatShown(unitPrice).primary}</span>
                            </div>
                        ) : (
                            <>
                                {adults > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>{`${adults} ${lang === 'tr' ? 'Yetişkin' : lang === 'zh' ? '成人' : 'Adult'} × ${formatShown(adultUnitPrice).primary}`}</span>
                                        <span>{formatShown(adultUnitPrice * adults).primary}</span>
                                    </div>
                                )}
                                {children > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>{`${children} ${lang === 'tr' ? 'Çocuk' : lang === 'zh' ? '儿童' : 'Child'} × ${formatShown(childUnitPrice).primary}`}</span>
                                        <span>{formatShown(childUnitPrice * children).primary}</span>
                                    </div>
                                )}
                                {infants > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                        <span>{`${infants} ${lang === 'tr' ? 'Bebek' : lang === 'zh' ? '婴儿' : 'Infant'}`}</span>
                                        <span>{t.free}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {selectedOptions.map(optId => {
                            const opt = tour.options.find((o: any) => o.id === optId);
                            if (!opt) return null;
                            const optTotal = opt.pricingMode === 'flat' ? opt.price : opt.price * pax;
                            return (
                                <div key={optId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                    <span>{opt.title} {opt.pricingMode === 'flat' ? '(sabit)' : `(×${pax})`}</span>
                                    <span>{opt.price === 0 ? t.free : `+${formatShown(optTotal).primary}`}</span>
                                </div>
                            );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            <span>{t.netTotal}</span>
                            <span style={{ color: 'var(--color-primary)' }}>
                                {formatShown(Number(total)).primary}
                                {formatShown(Number(total)).secondary ? <small style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{formatShown(Number(total)).secondary}</small> : null}
                            </span>
                        </div>
                    </div>
                    {lang === 'tr' && (
                        <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            TL tutarlar bilgilendirme amaçlıdır; ödeme EUR cinsindendir.
                            {updatedAt ? ` Kur güncelleme: ${new Date(updatedAt).toLocaleString('tr-TR')}` : ''}
                        </p>
                    )}

                    <Button style={{ width: '100%' }} disabled={isClosed} onClick={() => {
                        if (isClosed) return;
                        const itemTitle = lang === 'tr' ? tour.titleTr : lang === 'zh' ? tour.titleZh : tour.titleEn;
                        addItem({
                            tourId: tour.id,
                            tourType: tour.type,
                            title: itemTitle,
                            date: selectedDate,
                            pax,
                            basePrice: isTransferWithTiers ? unitPrice : basePrice,
                            options: selectedOptions.map(optId => {
                                const o = tour.options.find((opt: any) => opt.id === optId);
                                return { id: o.id, title: o.title, price: o.price, pricingMode: o.pricingMode };
                            }),
                            totalPrice: total,
                            ...(tour.type === 'TRANSFER' && { transferAirport: selectedAirport }),
                            childCount: children,
                            adultCount: adults,
                            infantCount: infants,
                        });
                        setCartToastTitle(itemTitle);
                        setCartToastOpen(true);
                    }}>{t.addToCart}</Button>
                </div>
            </div>
                </>
                )}
            {cartToastOpen && (
              <div
                style={{
                  position: 'fixed',
                  right: 16,
                  bottom: 16,
                  width: 'min(92vw, 360px)',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  padding: 'var(--space-md)',
                  zIndex: 999,
                }}
              >
                <p style={{ marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
                  ✅ {cartToastTitle} {t.addedToCart}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setCartToastOpen(false);
                      router.push(`/${lang}/cart`);
                    }}
                  >
                    {t.goToCart}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCartToastOpen(false)}>
                    {t.continueShopping}
                  </button>
                </div>
              </div>
            )}
        </div>
    );
}
