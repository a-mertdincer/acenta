'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/Button';
import { useCartStore } from '../../../store/cartStore';
import { getTourImagePath, getTourImageFallback } from '../../../../lib/imagePaths';
import { getTourById, getTourDatePrice } from '../../../actions/tours';
import { getTourWithVariants } from '../../../actions/variants';
import { ProductVariantBookingCard } from '../../../components/ProductVariantBookingCard';
import { TourDetailMainColumn, type FaqItem } from '../../../components/TourDetailMainColumn';
import { TourReviewsSection } from '../../../components/TourReviewsSection';
import { RelatedToursSection } from '../../../components/RelatedToursSection';
import { AskForPriceBookingBlock, type AskForPriceStrings } from '../../../components/AskForPriceModal';
import { TourBookingTrustExtras } from '../../../components/TourBookingTrustExtras';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { TourTagBadges } from '../../../components/TourTagBadges';
import { buildTourWhatsAppHref } from '@/lib/buildWhatsAppTourUrl';
import { useExchangeRate } from '../../../hooks/useExchangeRate';
import { formatPriceByLang } from '@/lib/currency';
import { getTierFromPrice } from '@/lib/pricingTiers';
import { normalizeLocale, type SiteLocale } from '@/lib/i18n';
import { pickTourField, pickFaqs, pickContentLang } from '@/lib/pickContentLang';
import {
  tourDetailUi,
  variantUi,
  promotionUi,
  whyBookUi,
  tourCancellationUi,
  navigationUi,
  askForPriceUi,
  reviewsUi,
  siteDictionary,
} from '@/lib/siteLocaleDict';

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

function agePriceShortLabel(
  v: Record<string, string>,
  pricingType: 'free' | 'child' | 'adult' | 'not_allowed'
): string {
  if (pricingType === 'free') return v.agePriceFree ?? 'Free of charge';
  if (pricingType === 'child') return v.agePriceChild ?? 'Child price';
  if (pricingType === 'adult') return v.agePriceAdult ?? 'Adult price';
  return v.agePriceNotAllowed ?? 'Not allowed';
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


const EXT_TITLE_DESC_SUFFIXES = ['Es', 'It', 'Fr', 'De', 'Nl', 'Ro', 'Ru', 'Pl', 'Ko', 'Ja'] as const;

function extendTitlesDesc(row: Record<string, unknown>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const base of ['title', 'desc'] as const) {
    for (const suf of EXT_TITLE_DESC_SUFFIXES) {
      const k = `${base}${suf}`;
      const v = row[k];
      if (typeof v === 'string') out[k] = v;
    }
  }
  return out;
}

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

function mapDbTourToState(db: Record<string, unknown>, siteLang: SiteLocale) {
  const row = db;
  const titleEn = String(row.titleEn ?? '');
  const titleTr = String(row.titleTr ?? '');
  const titleZh = String(row.titleZh ?? '');
  const descEn = String(row.descEn ?? '');
  const descTr = String(row.descTr ?? '');
  const descZh = String(row.descZh ?? '');
  const optionsRaw = Array.isArray(row.options) ? row.options : [];

  return {
    id: String(row.id ?? ''),
    type: String(row.type ?? ''),
    titleEn,
    titleTr,
    titleZh,
    descEn,
    descTr,
    descZh,
    highlights: pickTourField(row, 'highlights', siteLang),
    itinerary: pickTourField(row, 'itinerary', siteLang),
    knowBefore: pickTourField(row, 'knowBefore', siteLang),
    notSuitable: pickTourField(row, 'notSuitable', siteLang),
    notAllowed: pickTourField(row, 'notAllowed', siteLang),
    whatsIncluded: pickTourField(row, 'whatsIncluded', siteLang),
    notIncluded: pickTourField(row, 'notIncluded', siteLang),
    faqs: pickFaqs(row, siteLang),
    basePrice: Number(row.basePrice ?? 0),
    transferTiers: (row.transferTiers as typeof row.transferTiers) ?? null,
    transferAirportTiers: (row.transferAirportTiers as typeof row.transferAirportTiers) ?? null,
    minAgeLimit: (row.minAgeLimit as number | null | undefined) ?? null,
    ageRestriction: pickTourField(row, 'ageRestriction', siteLang),
    ageGroups: (Array.isArray(row.ageGroups) ? row.ageGroups : []).map((group) => {
      const g = group as Record<string, unknown>;
      return {
        minAge: Number(g.minAge),
        maxAge: Number(g.maxAge),
        pricingType: g.pricingType as 'free' | 'child' | 'adult' | 'not_allowed',
        description:
          pickContentLang(
            {
              en: typeof g.descriptionEn === 'string' ? g.descriptionEn : '',
              tr: typeof g.descriptionTr === 'string' ? g.descriptionTr : '',
              zh: typeof g.descriptionZh === 'string' ? g.descriptionZh : '',
            },
            siteLang
          ) ?? (typeof g.descriptionEn === 'string' ? g.descriptionEn : ''),
      };
    }),
    images: (Array.isArray(row.images) ? row.images : []).map((img) =>
      String((img as { url?: string }).url ?? '')
    ),
    salesTags: Array.isArray(row.salesTags)
      ? row.salesTags.filter((x): x is string => typeof x === 'string')
      : [],
    startTimes: Array.isArray(row.startTimes)
      ? row.startTimes.filter((x): x is string => typeof x === 'string')
      : [],
    options: optionsRaw.map((o) => {
      const opt = o as Record<string, unknown>;
      const pricingModeRaw = typeof opt.pricingMode === 'string' ? opt.pricingMode : 'per_person';
      const pricingMode =
        pricingModeRaw === 'flat' ? 'flat' : pricingModeRaw === 'per_unit' ? 'per_unit' : 'per_person';
      return {
        id: String(opt.id ?? ''),
        title: pickTourField(opt, 'title', siteLang) ?? String(opt.titleEn ?? ''),
        price: Number(opt.priceAdd ?? 0),
        pricingMode,
      };
    }),
    isAskForPrice: Boolean(row.isAskForPrice),
    cancellationNote: pickTourField(row, 'cancellationNote', siteLang),
    ...extendTitlesDesc(row),
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
        isAskForPrice: false,
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
        isAskForPrice: false,
        options: [
            { id: '1', title: 'Vegetarian Lunch', price: 0, pricingMode: 'per_person' },
            { id: '2', title: 'Private Guide', price: 50.0, pricingMode: 'per_person' }
        ]
    }
];

export default function TourDetailPage(props: { params: Promise<{ lang: string; id: string }> }) {
    const params = use(props.params);
    const { lang, id } = params;
    const siteLang = normalizeLocale(lang);
    const t = tourDetailUi(siteLang);
    const vUiFlat = variantUi(siteLang) as Record<string, string>;
    const promoFlat = promotionUi(siteLang) as Record<string, string>;
    const navUi = navigationUi(siteLang);
    const askStrings = askForPriceUi(siteLang);
    const askModalStrings = askStrings as unknown as AskForPriceStrings;
    const reviewsLabels = reviewsUi(siteLang) as Record<string, string>;
    const homeUi = siteDictionary(siteLang).home;
    const whyBook = whyBookUi(siteLang);
    const tourCancellation = tourCancellationUi(siteLang);
    const router = useRouter();
    const addItem = useCartStore(state => state.addItem);

    const [tour, setTour] = useState<any>(null);
    const [tourWithVariants, setTourWithVariants] = useState<Awaited<ReturnType<typeof getTourWithVariants>>>(null);
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [infants, setInfants] = useState(0);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
    const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
    const [selectedAirport, setSelectedAirport] = useState<TransferAirport>('ASR');
    const [datePrice, setDatePrice] = useState<{ price: number; capacity: number; isClosed: boolean } | null>(null);
    const [cartToastOpen, setCartToastOpen] = useState(false);
    const [cartToastTitle, setCartToastTitle] = useState('');
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const { eurTryRate, updatedAt } = useExchangeRate(siteLang === 'tr');
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
              setTour(mapDbTourToState(dbTour as unknown as Record<string, unknown>, siteLang));
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
                highlights: null,
                basePrice: 0,
                isAskForPrice: variantData.isAskForPrice,
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
                  description:
                    pickContentLang(
                      {
                        en: group.descriptionEn,
                        tr: group.descriptionTr,
                        zh: group.descriptionZh ?? '',
                      },
                      siteLang
                    ) ?? group.descriptionEn,
                })),
                cancellationNote: null,
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

    if (!tour) return <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>{t.loading}</div>;

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
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: 'var(--space-lg)' }}>{t.loading}</p>
      </div>;
    }

    const title = pickTourField(tour as Record<string, unknown>, 'title', siteLang) ?? tour.titleEn;
    const desc = pickTourField(tour as Record<string, unknown>, 'desc', siteLang) ?? tour.descEn;
    const formatShown = (eur: number) => formatPriceByLang(eur, siteLang, eurTryRate);

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
        if (!opt) return;
        const qty = Math.max(1, optionQuantities[optId] ?? 1);
        if (opt.pricingMode === 'flat') total += opt.price;
        else if (opt.pricingMode === 'per_unit') total += opt.price * qty;
        else total += opt.price * pax;
    });

    const toggleOption = (optId: string) => {
        setSelectedOptions(prev =>
            prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
        );
    };

    const availableVariants = tourWithVariants?.variants ?? [];
    const useVariantBooking = availableVariants.length > 0;
    const fromPrice = useVariantBooking
        ? Math.min(
            ...availableVariants.map((variant) => {
              if ((variant.privatePriceTiers?.length ?? 0) > 0) {
                return getTierFromPrice(variant.privatePriceTiers ?? null) ?? variant.adultPrice;
              }
              return variant.adultPrice;
            })
          )
        : null;
    const galleryMain = getTourImagePath(tour.type);
    const galleryFallback = getTourImageFallback(tour.type);
    const dynamicImages = Array.isArray(tour.images) ? tour.images.filter((url: unknown): url is string => typeof url === 'string' && url.trim() !== '') : [];
    const galleryMainSrc = dynamicImages[0] ?? galleryMain;
    const itineraryItems = parseLineList(tour.itinerary);
    const highlightsItems = parseLineList(tour.highlights);
    const hasHighlights = highlightsItems.length > 0;
    const knowBeforeItems = parseLineList(tour.knowBefore);
    const notSuitableItems = parseLineList(tour.notSuitable);
    const notAllowedItems = parseLineList(tour.notAllowed);
    const isAskForPrice = Boolean((tour as { isAskForPrice?: boolean }).isAskForPrice);
    const tourLevelWhatsIncluded = parseLineList((tour as { whatsIncluded?: string | null }).whatsIncluded);
    const whatsIncludedItems: string[] = (() => {
      if (tourLevelWhatsIncluded.length > 0) return tourLevelWhatsIncluded;
      if (!tourWithVariants?.variants?.length) return [];
      const v = tourWithVariants.variants.find((x) => x.isRecommended) ?? tourWithVariants.variants[0];
      const inc = v?.includes;
      return Array.isArray(inc) ? inc.filter((x: unknown): x is string => typeof x === 'string') : [];
    })();
    const notIncludedItems = parseLineList((tour as { notIncluded?: string | null }).notIncluded);
    const faqs = (Array.isArray(tour.faqs) ? tour.faqs : []) as FaqItem[];
    const bookNavLabel = t.bookNow;
    const faqNavLabel = t.faqs;
    const hasDesc = Boolean(desc?.trim());
    const anchorSections: { id: string; label: string }[] = [
      { id: 'book-now', label: bookNavLabel },
      { id: 'gallery', label: t.gallery },
    ];
    if (hasDesc) anchorSections.push({ id: 'description', label: t.description });
    if (itineraryItems.length > 0) anchorSections.push({ id: 'itinerary', label: t.itinerary });
    if (hasHighlights) anchorSections.push({ id: 'highlights', label: t.highlights });
    if (knowBeforeItems.length > 0) anchorSections.push({ id: 'know-before', label: t.knowBefore });
    if (notSuitableItems.length > 0) anchorSections.push({ id: 'not-suitable', label: t.notSuitable });
    if (notAllowedItems.length > 0) anchorSections.push({ id: 'not-allowed', label: t.notAllowed });
    if (whatsIncludedItems.length > 0) anchorSections.push({ id: 'whats-included', label: t.whatsIncluded });
    if (notIncludedItems.length > 0) anchorSections.push({ id: 'not-included', label: t.notIncluded });
    if (faqs.length > 0) anchorSections.push({ id: 'faqs', label: faqNavLabel });

    const askPriceLabel = askStrings.button;

    const productSchema =
      !isAskForPrice && useVariantBooking && tourWithVariants && tour
        ? buildProductSchema(tour, tourWithVariants, title, desc, galleryMainSrc)
        : null;

    const cancellationNoteLocalized = (tour as { cancellationNote?: string | null }).cancellationNote ?? null;

    const askPriceNextDay = new Date();
    askPriceNextDay.setDate(askPriceNextDay.getDate() + 1);
    const askPriceWhatsappHrefLegacy = buildTourWhatsAppHref({
      tourTitle: title,
      dateYmd: askPriceNextDay.toISOString().split('T')[0],
      people: 2,
    });
    const askWhatsAppLabel = vUiFlat.askWhatsApp ?? 'Ask on WhatsApp';

    const breadcrumbItems: { label: string; href?: string }[] = [
      { label: navUi.home, href: `/${lang}` },
      { label: navUi.tours, href: `/${lang}/tours` },
      { label: title },
    ];

    return (
        <div className={`container tour-detail-layout${useVariantBooking ? ' tour-detail-layout--variant' : ''}`}>
            {productSchema && (
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
            )}
            <Breadcrumbs items={breadcrumbItems} />
            <h1 className="tour-detail-title tour-detail-title--lead">{title}</h1>
            <StickyAnchorBar sections={anchorSections} />
            {useVariantBooking ? (
                <>
                    <div className="tour-detail-hero-grid tour-detail-hero-grid--variant">
                        <div>
                            <span className="tour-detail-type-badge">
                                {tour.type}
                            </span>
                            {Array.isArray((tour as { salesTags?: string[] }).salesTags) && (tour as { salesTags?: string[] }).salesTags!.length > 0 ? (
                                <TourTagBadges
                                    tagSlugs={(tour as { salesTags?: string[] }).salesTags ?? []}
                                    lang={siteLang}
                                    variant="detail"
                                    max={6}
                                />
                            ) : null}
                            {isAskForPrice ? (
                                <p className="tour-detail-price-ask">{askPriceLabel}</p>
                            ) : (
                              fromPrice != null && (
                                <p className="tour-detail-price-from">
                                    {homeUi.from} {formatShown(fromPrice).primary}
                                    {formatShown(fromPrice).secondary ? <small className="tour-detail-price-secondary">{formatShown(fromPrice).secondary}</small> : null}
                                </p>
                              )
                            )}
                            <TourDetailMainColumn
                              desc={desc}
                              descriptionSectionTitle={t.description}
                              itineraryLabel={t.itinerary}
                              highlightsTitle={t.highlights}
                              knowBeforeTitle={t.knowBefore}
                              notSuitableTitle={t.notSuitable}
                              notAllowedTitle={t.notAllowed}
                              whatsIncludedTitle={t.whatsIncluded}
                              notIncludedTitle={t.notIncluded}
                              itineraryItems={itineraryItems}
                              highlightsItems={highlightsItems}
                              knowBeforeItems={knowBeforeItems}
                              notSuitableItems={notSuitableItems}
                              notAllowedItems={notAllowedItems}
                              whatsIncludedItems={whatsIncludedItems}
                              notIncludedItems={notIncludedItems}
                              faqs={faqs}
                              galleryMainSrc={galleryMainSrc}
                              galleryFallback={galleryFallback}
                              thumbUrls={dynamicImages.length > 0 ? dynamicImages : [galleryMainSrc]}
                              openFaqIndex={openFaqIndex}
                              onToggleFaq={(idx) => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                            />
                            <TourReviewsSection tourId={tour.id} lang={siteLang} reviewsLabels={reviewsLabels} />
                        </div>
                        <div className="tour-detail-booking-card-wrapper" id="book-now">
                            <ProductVariantBookingCard
                                tourId={tour.id}
                                tourType={tour.type}
                                lang={siteLang}
                                variantUi={vUiFlat}
                                promotionUi={promoFlat}
                                askForPriceStrings={askModalStrings}
                                isAskForPrice={isAskForPrice}
                                whyBook={whyBook}
                                tourCancellationLabels={tourCancellation}
                                cancellationNote={cancellationNoteLocalized}
                                data={tourWithVariants ?? {
                                  id: tour.id,
                                  type: tour.type,
                                  titleEn: tour.titleEn,
                                  titleTr: tour.titleTr,
                                  titleZh: tour.titleZh,
                                  isAskForPrice: false,
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
                                startTimes={Array.isArray((tour as { startTimes?: string[] }).startTimes) ? (tour as { startTimes?: string[] }).startTimes ?? [] : []}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <>
            <div>
                <span className="tour-detail-type-badge">
                    {tour.type}
                </span>
                {isAskForPrice ? (
                  <p className="tour-detail-price-ask">{askPriceLabel}</p>
                ) : null}
                <TourDetailMainColumn
                  desc={desc}
                  descriptionSectionTitle={t.description}
                  itineraryLabel={t.itinerary}
                  highlightsTitle={t.highlights}
                  knowBeforeTitle={t.knowBefore}
                  notSuitableTitle={t.notSuitable}
                  notAllowedTitle={t.notAllowed}
                  whatsIncludedTitle={t.whatsIncluded}
                  notIncludedTitle={t.notIncluded}
                  itineraryItems={itineraryItems}
                  highlightsItems={highlightsItems}
                  knowBeforeItems={knowBeforeItems}
                  notSuitableItems={notSuitableItems}
                  notAllowedItems={notAllowedItems}
                  whatsIncludedItems={whatsIncludedItems}
                  notIncludedItems={notIncludedItems}
                  faqs={faqs}
                  galleryMainSrc={galleryMainSrc}
                  galleryFallback={galleryFallback}
                  thumbUrls={dynamicImages.length > 0 ? dynamicImages : [galleryMainSrc]}
                  openFaqIndex={openFaqIndex}
                  onToggleFaq={(idx) => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                />
                <TourReviewsSection tourId={tour.id} lang={siteLang} reviewsLabels={reviewsLabels} />
            </div>

            <div id="book-now" className="tour-detail-booking-card-wrapper">
                {isAskForPrice ? (
                  <div className="card tour-detail-booking-card tour-detail-booking-card--ask">
                    <AskForPriceBookingBlock tourId={tour.id} strings={askModalStrings} />
                    <TourBookingTrustExtras
                      lang={lang}
                      whatsappHref={askPriceWhatsappHrefLegacy}
                      whatsappLabel={askWhatsAppLabel}
                      whyBook={whyBook}
                      cancellationNote={cancellationNoteLocalized}
                      policyLabels={tourCancellation}
                    />
                  </div>
                ) : (
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
                            <span className="age-group-label">{vUiFlat.adults}</span>
                            <div className="stepper-control">
                                <button type="button" className="stepper-btn" disabled={adults <= 1} onClick={() => setAdults((n) => Math.max(1, n - 1))}>-</button>
                                <span>{adults}</span>
                                <button type="button" className="stepper-btn" onClick={() => setAdults((n) => n + 1)}>+</button>
                            </div>
                        </div>
                        {showChildren && (
                            <div className="age-group">
                                <span className="age-group-label">{vUiFlat.children}</span>
                                <div className="stepper-control">
                                    <button type="button" className="stepper-btn" disabled={children <= 0} onClick={() => setChildren((n) => Math.max(0, n - 1))}>-</button>
                                    <span>{children}</span>
                                    <button type="button" className="stepper-btn" onClick={() => setChildren((n) => n + 1)}>+</button>
                                </div>
                            </div>
                        )}
                        {showInfants && (
                            <div className="age-group">
                                <span className="age-group-label">{vUiFlat.infants}</span>
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
                                        const label = agePriceShortLabel(vUiFlat, g.pricingType);
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
                                    const isSelected = selectedOptions.includes(opt.id);
                                    const qty = Math.max(1, optionQuantities[opt.id] ?? 1);
                                    const isFlat = opt.pricingMode === 'flat';
                                    const isPerUnit = opt.pricingMode === 'per_unit';
                                    const multiplier = isFlat ? 1 : isPerUnit ? qty : pax;
                                    const displayPrice = opt.price * multiplier;
                                    const qtyLabel = isFlat ? '1x' : isPerUnit ? `×${multiplier}` : `×${pax}`;
                                    return (
                                        <label key={opt.id} className={`addon-row ${isSelected ? 'is-selected' : ''}`}>
                                            <span className="addon-left">
                                                <input type="checkbox" className="addon-checkbox" checked={isSelected} onChange={() => {
                                                    toggleOption(opt.id);
                                                    if (isPerUnit && !isSelected) {
                                                        setOptionQuantities((prev) => ({ ...prev, [opt.id]: prev[opt.id] && prev[opt.id] > 0 ? prev[opt.id] : 1 }));
                                                    }
                                                }} />
                                                <span className="addon-title">{opt.title}</span>
                                            </span>
                                            {isSelected && isPerUnit && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                                                    <button type="button" className="stepper-btn" disabled={qty <= 1} onClick={(e) => { e.preventDefault(); setOptionQuantities((prev) => ({ ...prev, [opt.id]: Math.max(1, (prev[opt.id] ?? 1) - 1) })); }}>−</button>
                                                    <span style={{ minWidth: 20, textAlign: 'center' }}>{qty}</span>
                                                    <button type="button" className="stepper-btn" onClick={(e) => { e.preventDefault(); setOptionQuantities((prev) => ({ ...prev, [opt.id]: (prev[opt.id] ?? 1) + 1 })); }}>+</button>
                                                </span>
                                            )}
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
                                        <span>{`${adults} ${vUiFlat.adults} × ${formatShown(adultUnitPrice).primary}`}</span>
                                        <span>{formatShown(adultUnitPrice * adults).primary}</span>
                                    </div>
                                )}
                                {children > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span>{`${children} ${vUiFlat.children} × ${formatShown(childUnitPrice).primary}`}</span>
                                        <span>{formatShown(childUnitPrice * children).primary}</span>
                                    </div>
                                )}
                                {infants > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                        <span>{`${infants} ${vUiFlat.infants}`}</span>
                                        <span>{t.free}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {selectedOptions.map(optId => {
                            const opt = tour.options.find((o: any) => o.id === optId);
                            if (!opt) return null;
                            const qty = Math.max(1, optionQuantities[optId] ?? 1);
                            const isFlat = opt.pricingMode === 'flat';
                            const isPerUnit = opt.pricingMode === 'per_unit';
                            const multiplier = isFlat ? 1 : isPerUnit ? qty : pax;
                            const optTotal = opt.price * multiplier;
                            const multiplierLabel = `(×${multiplier})`;
                            return (
                                <div key={optId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                    <span>{opt.title} {multiplierLabel}</span>
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
                    {siteLang === 'tr' && (
                        <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            TL tutarlar bilgilendirme amaçlıdır; ödeme EUR cinsindendir.
                            {updatedAt ? ` Kur güncelleme: ${new Date(updatedAt).toLocaleString('tr-TR')}` : ''}
                        </p>
                    )}

                    <Button style={{ width: '100%' }} disabled={isClosed} onClick={() => {
                        if (isClosed) return;
                        const itemTitle = pickTourField(tour as Record<string, unknown>, 'title', siteLang) ?? tour.titleEn;
                        addItem({
                            tourId: tour.id,
                            tourType: tour.type,
                            title: itemTitle,
                            date: selectedDate,
                            pax,
                            basePrice: isTransferWithTiers ? unitPrice : basePrice,
                            options: selectedOptions.map(optId => {
                                const o = tour.options.find((opt: any) => opt.id === optId);
                                const userQty = Math.max(1, optionQuantities[optId] ?? 1);
                                const mode: 'per_person' | 'flat' | 'per_unit' = o.pricingMode === 'flat' ? 'flat' : o.pricingMode === 'per_unit' ? 'per_unit' : 'per_person';
                                const quantity = mode === 'flat' ? 1 : mode === 'per_unit' ? userQty : pax;
                                return { id: o.id, title: o.title, price: o.price, pricingMode: mode, quantity };
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
                )}
            </div>
                </>
            )}
            {!id.startsWith('mock-') && (
              <RelatedToursSection
                tourId={tour.id}
                lang={siteLang}
                heading={t.customersAlsoLiked}
                fromLabel={homeUi.from ?? 'From'}
                bookLabel={t.bookNow}
                askForPriceLabel={askPriceLabel}
              />
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
                  ✅ {cartToastTitle} {vUiFlat.addedToCart}
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
                    {vUiFlat.goToCart}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCartToastOpen(false)}>
                    {vUiFlat.continueShopping}
                  </button>
                </div>
              </div>
            )}
        </div>
    );
}
