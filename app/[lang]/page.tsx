import { getDictionary } from '../dictionaries/getDictionary';
import { getHeroPath, getHeroFallback, getTourImagePath, getTourImageFallback } from '../../lib/imagePaths';
import { HomeHero } from '../components/HomeHero';
import { HomeExperienceCard } from '../components/HomeExperienceCard';
import { HomeCta } from '../components/HomeCta';
import { getTours } from '../actions/tours';
import { getTourWithVariants } from '../actions/variants';
import { getPromotionCardPrices } from '../actions/promotions';
import { getAttractions } from '../actions/attractions';
import { getActiveDestinations, getCategoryLabel, normalizeCategorySlug, type Lang } from '@/lib/destinations';
import { getTierFromPrice } from '@/lib/pricingTiers';
import { normalizeLocale, type SiteLocale } from '@/lib/i18n';
import { tourDescription, tourTitle } from '@/lib/tourLabels';
import type { TourWithOptions } from '../actions/tours';
import { HomeStatsBand } from '../components/HomeStatsBand';
import { HomeHowItWorks } from '../components/HomeHowItWorks';
import { HomeWhyChooseUs } from '../components/HomeWhyChooseUs';
import { HomeAttractionsCarousel } from '../components/HomeAttractionsCarousel';
import { attractionCardSummary } from '@/lib/attractionSummary';

const MOCK_CARDS = [
  { titleKey: 'standardBalloon', descKey: 'standardBalloonDesc', price: 150, tourId: 'mock-balloon', type: 'BALLOON' },
  { titleKey: 'greenTour', descKey: 'greenTourDesc', price: 40, tourId: 'mock-green', type: 'TOUR' },
  { titleKey: 'transfer', descKey: 'transferDesc', price: 50, tourId: 'mock-transfer', type: 'TRANSFER' },
];

const FALLBACK_HOME: Record<string, string> = {
  title: 'Experience the Magic of Cappadocia',
  subtitle: 'Find and book your perfect adventure in minutes.',
  from: 'From',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  guests: 'Guests',
  allActivities: 'All Activities',
  search: 'Search',
  bestSellingTours: 'Best Selling Tours',
  ctaTitle: 'Plan your Cappadocia journey',
  ctaButton: 'View all tours',
  viewAllTours: 'View all tours',
  packagesTitle: 'Packages & Combos',
  moreExperiencesTitle: 'More Experiences',
  attractionsCarouselTitle: 'Highlights',
  stats1Head: '30+',
  stats1Sub: 'Tours & Experiences',
  stats2Head: 'Local Team',
  stats2Sub: 'Cappadocia Based',
  stats3Head: 'Reliable',
  stats3Sub: 'Local Partners',
  stats4Head: '24/7',
  stats4Sub: 'Support',
  stats5Head: 'Flexible',
  stats5Sub: 'Easy Cancellation',
  stats6Head: '5 Generations',
  stats6Sub: 'Local Family Heritage',
  howItWorksTitle: 'How It Works',
  howItWorks1Title: 'Book Your Tour',
  howItWorks1Desc: 'Find your best tour and make your free reservation.',
  howItWorks2Title: 'Pay in Vehicle',
  howItWorks2Desc: 'When we come to pick you up you can pay in cash.',
  howItWorks3Title: 'Pick-Up',
  howItWorks3Desc: 'We will pick you up from your hotel to the tour that you booked.',
  howItWorks4Title: 'Drop-Off',
  howItWorks4Desc: 'After the tour we will drop you off at your hotel.',
  whyChooseTitle: 'Why Choose Us',
  whyChoose1Title: 'Impressions for a Lifetime',
  whyChoose1Desc: 'Memorable moments crafted with care.',
  whyChoose2Title: 'Bright VIP Vehicle & Balloons',
  whyChoose2Desc: 'Comfortable transfers and premium balloon partners.',
  whyChoose3Title: 'Insurance',
  whyChoose3Desc: 'Clear coverage options where applicable.',
  whyChoose4Title: 'Experience',
  whyChoose4Desc: 'Years of local know-how and curated routes.',
  whyChoose5Title: 'Safety',
  whyChoose5Desc: 'Trained teams and safety-first operations.',
  whyChoose6Title: 'Quality',
  whyChoose6Desc: 'Hand-picked services and attention to detail.',
  whyChoose7Title: 'Tourism Licensed',
  whyChoose7Desc: 'Fully licensed travel services.',
  whyChoose8Title: 'Moneyback Guarantee',
  whyChoose8Desc: 'Fair policies and support if plans change.',
  ctaLine1: 'Plan your Cappadocia journey with reliable local experts.',
  ctaLine2: 'Contact us via WhatsApp.',
  ctaLine3: 'Fast replies within 5–15 minutes.',
  ctaExplore: 'Explore',
  ctaWhatsApp: 'WhatsApp',
};

const FALLBACK_TOURS_DICT: Record<string, string> = {
  bookNow: 'Book Now',
  standardBalloon: 'Standard Balloon Flight',
  greenTour: 'Cappadocia Green Tour',
  transfer: 'Private Airport Transfer',
  standardBalloonDesc: 'Float above the fairy chimneys at sunrise.',
  greenTourDesc: 'Explore the underground city and Ihlara Valley.',
  transferDesc: 'VIP transfer to and from Nevşehir or Kayseri airports.',
};

function pickTourCardImage(tour: TourWithOptions): { src: string; fallback: string } {
  const imgs = [...(tour.images ?? [])].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  const first = imgs[0];
  const fallback = getTourImageFallback(tour.type);
  if (first?.url) return { src: first.url, fallback };
  return { src: getTourImagePath(tour.type), fallback };
}

type TourRow = {
  id: string;
  type: string;
  title: string;
  desc: string;
  price: number;
  category: string | null;
  destination: string;
  isAskForPrice: boolean;
  isFeatured: boolean;
  createdAt: string;
  imageSrc: string;
  imageFallback: string;
  originalPrice: number;
  discountedPrice: number | null;
  percentLabel: number | null;
  discountAmount: number;
};

function buildTourRowsFromDb(
  dbTours: TourWithOptions[],
  lang: SiteLocale,
  variantFromPriceMap: Map<string, number>
): TourRow[] {
  return dbTours.map((t) => {
    const byAirport = t.transferAirportTiers;
    const allTierPrices = byAirport
      ? [...(byAirport.ASR ?? []), ...(byAirport.NAV ?? [])].map((tier) => tier?.price ?? 0).filter(Boolean)
      : (t.transferTiers ?? []).map((tier) => tier?.price ?? 0).filter(Boolean);
    const fromPrice =
      t.type === 'TRANSFER' && allTierPrices.length > 0
        ? Math.min(...allTierPrices)
        : ((variantFromPriceMap.get(t.id) ?? Number(t.basePrice)) || 0);
    const img = pickTourCardImage(t);
    return {
      id: String(t.id),
      type: String(t.type ?? 'TOUR'),
      title: tourTitle(t, lang),
      desc: tourDescription(t, lang),
      price: fromPrice,
      category: t.category ? normalizeCategorySlug(String(t.category)) : null,
      destination: String(t.destination ?? 'cappadocia'),
      isAskForPrice: t.isAskForPrice ?? false,
      isFeatured: t.isFeatured ?? false,
      createdAt: t.createdAt,
      imageSrc: img.src,
      imageFallback: img.fallback,
      originalPrice: fromPrice,
      discountedPrice: null,
      percentLabel: null,
      discountAmount: 0,
    };
  });
}

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  let lang: SiteLocale = 'en';
  let homeDict: Record<string, string> = FALLBACK_HOME;
  let toursDict: Record<string, string> = FALLBACK_TOURS_DICT;
  let askForPriceButton = 'Ask for Price';
  let tours: TourRow[] = MOCK_CARDS.map((c) => ({
    id: c.tourId,
    type: c.type,
    title: FALLBACK_TOURS_DICT[c.titleKey] ?? c.titleKey,
    desc: FALLBACK_TOURS_DICT[c.descKey] ?? '',
    price: c.price,
    category: c.type === 'BALLOON' ? 'balloon-flights' : c.type === 'TRANSFER' ? 'transfers' : 'daily-tours',
    destination: 'cappadocia',
    isAskForPrice: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    imageSrc: getTourImagePath(c.type),
    imageFallback: getTourImageFallback(c.type),
    originalPrice: c.price,
    discountedPrice: null,
    percentLabel: null,
    discountAmount: 0,
  }));

  try {
    const params = await props.params;
    lang = normalizeLocale(params?.lang);

    const dict = await getDictionary(lang);
    if (dict?.home && typeof dict.home === 'object') homeDict = { ...FALLBACK_HOME, ...(dict.home as Record<string, string>) };
    if (dict?.tours && typeof dict.tours === 'object') toursDict = { ...FALLBACK_TOURS_DICT, ...(dict.tours as Record<string, string>) };
    const askBlock = dict && typeof dict === 'object' ? (dict as { askForPrice?: { button?: string } }).askForPrice : undefined;
    if (askBlock?.button?.trim()) askForPriceButton = askBlock.button.trim();

    const dbTours = await getTours();
    if (dbTours.length > 0) {
      const variantFromPriceMap = new Map<string, number>();
      const variantData = await Promise.all(dbTours.map(async (tour) => ({ id: tour.id, data: await getTourWithVariants(tour.id) })));
      variantData.forEach(({ id, data }) => {
        const activeVariants = data?.variants ?? [];
        if (activeVariants.length === 0) return;
        const minPrice = Math.min(
          ...activeVariants.map((variant) => {
            if ((variant.privatePriceTiers?.length ?? 0) > 0) {
              return getTierFromPrice(variant.privatePriceTiers ?? null) ?? variant.adultPrice;
            }
            return variant.adultPrice;
          })
        );
        variantFromPriceMap.set(id, minPrice);
      });
      tours = buildTourRowsFromDb(dbTours, lang, variantFromPriceMap);
    } else {
      tours = MOCK_CARDS.map((c) => ({
        id: c.tourId,
        type: c.type,
        title: toursDict[c.titleKey] ?? c.titleKey,
        desc: toursDict[c.descKey] ?? '',
        price: c.price,
        category: c.type === 'BALLOON' ? 'balloon-flights' : c.type === 'TRANSFER' ? 'transfers' : 'daily-tours',
        destination: 'cappadocia',
        isAskForPrice: false,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        imageSrc: getTourImagePath(c.type),
        imageFallback: getTourImageFallback(c.type),
        originalPrice: c.price,
        discountedPrice: null,
        percentLabel: null,
        discountAmount: 0,
      }));
    }

    const promoEntries = tours
      .filter((t) => !t.isAskForPrice && t.price > 0)
      .map((t) => ({ tourId: t.id, rackPrice: t.price }));
    if (promoEntries.length > 0) {
      const promoMap = await getPromotionCardPrices(promoEntries, new Date());
      tours = tours.map((t) => {
        const p = promoMap.get(t.id);
        if (!p || p.discount <= 0) return t;
        return {
          ...t,
          originalPrice: t.price,
          discountedPrice: p.final,
          percentLabel: p.percentLabel,
          discountAmount: p.discount,
        };
      });
    }
  } catch {
    // keep fallbacks
  }

  const heroSrc = getHeroPath();
  const heroFallback = getHeroFallback();
  const bookNowLabel = toursDict.bookNow ?? 'Book Now';
  const defaultDestination = getActiveDestinations()[0];
  const activityOptions = (defaultDestination?.categories ?? []).map((category) => ({
    value: category.slug,
    label: getCategoryLabel(category, lang as Lang),
  }));

  const sortedByNewest = [...tours].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const featuredPool = sortedByNewest.filter((t) => t.isFeatured);
  const bestSelling =
    featuredPool.length > 0 ? featuredPool.slice(0, 4) : sortedByNewest.slice(0, 4);
  const bestIds = new Set(bestSelling.map((t) => t.id));

  const packageTours = sortedByNewest.filter((t) => t.category === 'packages').filter((t) => !bestIds.has(t.id)).slice(0, 4);
  const packageIds = new Set(packageTours.map((t) => t.id));
  const stripIds = new Set([...bestIds, ...packageIds]);
  const moreTours = sortedByNewest.filter((t) => !stripIds.has(t.id));

  const attractions = await getAttractions({ resolveImages: true });
  const attractionSlides = attractions.map((a) => {
    const fullDesc =
      lang === 'tr'
        ? a.descriptionTr
        : lang === 'zh'
          ? (a.descriptionZh ?? a.descriptionEn)
          : a.descriptionEn;
    const summary = fullDesc?.trim() ? attractionCardSummary(fullDesc, 130) : undefined;
    return {
      id: a.id,
      name: lang === 'tr' ? a.nameTr : lang === 'zh' ? (a.nameZh ?? a.nameEn) : a.nameEn,
      description: summary,
      imageUrl: a.imageUrl,
    };
  });

  const statsItems = [
    { head: homeDict.stats1Head ?? FALLBACK_HOME.stats1Head, sub: homeDict.stats1Sub ?? FALLBACK_HOME.stats1Sub },
    { head: homeDict.stats2Head ?? FALLBACK_HOME.stats2Head, sub: homeDict.stats2Sub ?? FALLBACK_HOME.stats2Sub },
    { head: homeDict.stats3Head ?? FALLBACK_HOME.stats3Head, sub: homeDict.stats3Sub ?? FALLBACK_HOME.stats3Sub },
    { head: homeDict.stats4Head ?? FALLBACK_HOME.stats4Head, sub: homeDict.stats4Sub ?? FALLBACK_HOME.stats4Sub },
    { head: homeDict.stats5Head ?? FALLBACK_HOME.stats5Head, sub: homeDict.stats5Sub ?? FALLBACK_HOME.stats5Sub },
    { head: homeDict.stats6Head ?? FALLBACK_HOME.stats6Head, sub: homeDict.stats6Sub ?? FALLBACK_HOME.stats6Sub },
  ];

  const howSteps = [
    { title: homeDict.howItWorks1Title ?? '', description: homeDict.howItWorks1Desc ?? '' },
    { title: homeDict.howItWorks2Title ?? '', description: homeDict.howItWorks2Desc ?? '' },
    { title: homeDict.howItWorks3Title ?? '', description: homeDict.howItWorks3Desc ?? '' },
    { title: homeDict.howItWorks4Title ?? '', description: homeDict.howItWorks4Desc ?? '' },
  ];

  const whyItems = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    return {
      title: homeDict[`whyChoose${n}Title`] ?? '',
      description: homeDict[`whyChoose${n}Desc`] ?? '',
    };
  });

  const renderTourRow = (tourList: typeof tours, scrollClass: boolean) => (
    <div className={scrollClass ? 'home-cards home-cards--scroll' : 'home-cards'}>
      {tourList.map((tour) => {
        const categorySlug = tour.category ?? 'daily-tours';
        const category = defaultDestination?.categories.find((c) => c.slug === categorySlug || c.id === categorySlug);
        const categoryBadge = category ? getCategoryLabel(category, lang as Lang) : '';
        return (
          <HomeExperienceCard
            key={tour.id}
            lang={lang}
            title={tour.title}
            desc={tour.desc}
            fromLabel={homeDict.from ?? FALLBACK_HOME.from}
            price={tour.price}
            tourId={tour.id}
            imageSrc={tour.imageSrc}
            imageFallback={tour.imageFallback}
            bookLabel={bookNowLabel}
            categoryBadge={categoryBadge}
            isAskForPrice={tour.isAskForPrice}
            askForPriceLabel={askForPriceButton}
            originalPrice={tour.originalPrice}
            discountedPrice={tour.discountedPrice}
            percentLabel={tour.percentLabel}
            discountAmount={tour.discountAmount}
          />
        );
      })}
    </div>
  );

  return (
    <>
      <HomeHero
        title={homeDict.title ?? FALLBACK_HOME.title}
        subtitle={homeDict.subtitle ?? FALLBACK_HOME.subtitle}
        lang={lang}
        heroSrc={heroSrc}
        heroFallback={heroFallback}
        checkInLabel={homeDict.checkIn ?? FALLBACK_HOME.checkIn}
        checkOutLabel={homeDict.checkOut ?? FALLBACK_HOME.checkOut}
        guestsLabel={homeDict.guests ?? FALLBACK_HOME.guests}
        activitiesLabel={homeDict.allActivities ?? FALLBACK_HOME.allActivities}
        allActivitiesLabel={homeDict.allActivities ?? FALLBACK_HOME.allActivities}
        searchLabel={homeDict.search ?? FALLBACK_HOME.search}
        activityOptions={activityOptions}
      />

      <HomeStatsBand items={statsItems} />

      <section className="home-experiences page-section section-alt">
        <div className="container">
          <h2 className="home-section-title">{homeDict.bestSellingTours ?? FALLBACK_HOME.bestSellingTours}</h2>
          {renderTourRow(bestSelling, true)}
        </div>
      </section>

      {packageTours.length > 0 ? (
        <section className="home-experiences page-section">
          <div className="container">
            <h2 className="home-section-title">{homeDict.packagesTitle ?? FALLBACK_HOME.packagesTitle}</h2>
            {renderTourRow(packageTours, true)}
          </div>
        </section>
      ) : null}

      {moreTours.length > 0 ? (
        <section className="home-experiences page-section section-alt">
          <div className="container">
            <h2 className="home-section-title">{homeDict.moreExperiencesTitle ?? FALLBACK_HOME.moreExperiencesTitle}</h2>
            {renderTourRow(moreTours, false)}
          </div>
        </section>
      ) : null}

      <HomeHowItWorks sectionTitle={homeDict.howItWorksTitle ?? FALLBACK_HOME.howItWorksTitle} steps={howSteps} />

      <HomeAttractionsCarousel
        title={homeDict.attractionsCarouselTitle ?? FALLBACK_HOME.attractionsCarouselTitle}
        items={attractionSlides}
        imageFallback={getTourImagePath('TOUR')}
      />

      <HomeWhyChooseUs sectionTitle={homeDict.whyChooseTitle ?? FALLBACK_HOME.whyChooseTitle} items={whyItems} />

      <HomeCta
        lang={lang}
        line1={homeDict.ctaLine1 ?? FALLBACK_HOME.ctaLine1}
        line2={homeDict.ctaLine2 ?? FALLBACK_HOME.ctaLine2}
        line3={homeDict.ctaLine3 ?? FALLBACK_HOME.ctaLine3}
        exploreLabel={homeDict.ctaExplore ?? FALLBACK_HOME.ctaExplore}
        whatsappLabel={homeDict.ctaWhatsApp ?? FALLBACK_HOME.ctaWhatsApp}
      />

    </>
  );
}
