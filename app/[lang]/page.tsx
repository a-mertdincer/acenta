import { getDictionary } from '../dictionaries/getDictionary';
import { getHeroPath, getHeroFallback, getTourImagePath, getTourImageFallback } from '../../lib/imagePaths';
import { HomeHero } from '../components/HomeHero';
import { HomeTourCarousel, type HomeCarouselTourItem } from '../components/HomeTourCarousel';
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
import { HomeTourTypePills } from '../components/HomeTourTypePills';
import { HomeHowItWorks } from '../components/HomeHowItWorks';
import { HomeWhyChooseUs } from '../components/HomeWhyChooseUs';
import { HomeAttractionsCarousel } from '../components/HomeAttractionsCarousel';
import { attractionCardSummary } from '@/lib/attractionSummary';
import { pickTourField } from '@/lib/pickContentLang';

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
  scrollHint: 'Swipe',
  carouselPrev: 'Previous tours',
  carouselNext: 'Next tours',
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
  hiw1Title: 'Choose Your Experience',
  hiw1Desc: 'Explore our tours and activities, and pick the ones that fit your travel style.',
  hiw2Title: 'Contact & Reserve Easily',
  hiw2Desc: "Reach out via WhatsApp — we'll help you plan and secure your reservation in minutes.",
  hiw3Title: 'Hotel Pick-Up',
  hiw3Desc: 'We pick you up directly from your hotel and take you to the activity.',
  hiw4Title: 'Pay On-Site',
  hiw4Desc: 'No prepayment required — you can pay in cash during the service.',
  hiw5Title: 'Enjoy & Return Comfortably',
  hiw5Desc: 'After your experience, we safely drop you back at your hotel.',
  whyChooseTitle: 'Why Choose Us',
  wcu1Title: 'Local Expertise, Real Experiences',
  wcu1Desc: 'Born and raised in Cappadocia, we design experiences based on real local knowledge — not generic routes.',
  wcu2Title: 'Reliable Local Partners',
  wcu2Desc: 'We work with carefully selected, reliable local partners for balloons, tours, and transfers to ensure consistent quality.',
  wcu3Title: 'Flexible & Guest-Oriented Booking',
  wcu3Desc: 'No-pressure booking, easy planning, and personalized assistance — we adapt to your travel style.',
  wcu4Title: 'Tailor-Made Experiences',
  wcu4Desc: 'From classic tours to unique local activities, we create journeys that fit your interests — not fixed packages.',
  wcu5Title: 'Safety & Professional Operation',
  wcu5Desc: 'Licensed guides, insured activities, and well-organized operations for a smooth and secure experience.',
  wcu6Title: 'Hand-Picked Quality Services',
  wcu6Desc: 'We personally test and select every experience we offer — from balloon flights to hidden valley tours.',
  wcu7Title: 'Fully Licensed Travel Agency',
  wcu7Desc: 'Operating under official tourism regulations, providing trusted and professional travel services.',
  wcu8Title: 'Support Before & During Your Trip',
  wcu8Desc: "Fast communication via WhatsApp and on-site support — we're with you at every step of your journey.",
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
  slug: string | null;
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
  salesTags: string[];
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
      slug: t.slug ?? null,
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
      salesTags: Array.isArray((t as { salesTags?: unknown }).salesTags)
        ? ((t as { salesTags: unknown[] }).salesTags.filter((x): x is string => typeof x === 'string'))
        : [],
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
    slug: null,
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
    salesTags: [],
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
        slug: null,
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
        salesTags: [],
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
    featuredPool.length > 0 ? featuredPool.slice(0, 8) : sortedByNewest.slice(0, 8);
  const bestIds = new Set(bestSelling.map((t) => t.id));

  const packageTours = sortedByNewest.filter((t) => t.category === 'packages').filter((t) => !bestIds.has(t.id)).slice(0, 8);
  const packageIds = new Set(packageTours.map((t) => t.id));
  const stripIds = new Set([...bestIds, ...packageIds]);
  const moreTours = sortedByNewest.filter((t) => !stripIds.has(t.id));

  const attractions = await getAttractions({ resolveImages: true });
  const attractionSlides = attractions.map((a) => {
    const fullDesc =
      pickTourField(a as unknown as Record<string, unknown>, 'description', lang) ?? a.descriptionEn ?? '';
    const summary = fullDesc.trim() ? attractionCardSummary(fullDesc, 130) : undefined;
    return {
      id: a.id,
      slug: a.slug,
      name: pickTourField(a as unknown as Record<string, unknown>, 'name', lang) ?? a.nameEn,
      description: summary,
      imageUrl: a.imageUrl,
    };
  });

  const howSteps = Array.from({ length: 5 }, (_, i) => {
    const n = i + 1;
    return {
      title: homeDict[`hiw${n}Title`] ?? FALLBACK_HOME[`hiw${n}Title`] ?? '',
      description: homeDict[`hiw${n}Desc`] ?? FALLBACK_HOME[`hiw${n}Desc`] ?? '',
    };
  });

  const whyItems = Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    return {
      title: homeDict[`wcu${n}Title`] ?? FALLBACK_HOME[`wcu${n}Title`] ?? '',
      description: homeDict[`wcu${n}Desc`] ?? FALLBACK_HOME[`wcu${n}Desc`] ?? '',
    };
  });

  const mapToursToCarouselItems = (tourList: typeof tours): HomeCarouselTourItem[] =>
    tourList.map((tour) => {
      const categorySlug = tour.category ?? 'daily-tours';
      const category = defaultDestination?.categories.find((c) => c.slug === categorySlug || c.id === categorySlug);
      const categoryBadge = category ? getCategoryLabel(category, lang as Lang) : '';
      return {
        id: tour.id,
        slug: tour.slug,
        title: tour.title,
        desc: tour.desc,
        categoryBadge,
        imageSrc: tour.imageSrc,
        imageFallback: tour.imageFallback,
        price: tour.price,
        isAskForPrice: tour.isAskForPrice,
        originalPrice: tour.originalPrice,
        discountedPrice: tour.discountedPrice,
        percentLabel: tour.percentLabel,
        discountAmount: tour.discountAmount,
        salesTags: tour.salesTags,
      };
    });

  const renderTourRow = (tourList: typeof tours) => (
    <div className="home-cards">
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
            tourId={tour.slug ?? tour.id}
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
            salesTags={tour.salesTags}
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

      <section className="home-experiences page-section section-alt">
        <div className="container">
          <h2 className="home-section-title">{homeDict.bestSellingTours ?? FALLBACK_HOME.bestSellingTours}</h2>
          <HomeTourCarousel
            lang={lang}
            items={mapToursToCarouselItems(bestSelling)}
            fromLabel={homeDict.from ?? FALLBACK_HOME.from}
            bookLabel={bookNowLabel}
            askForPriceLabel={askForPriceButton}
            prevAriaLabel={homeDict.carouselPrev ?? FALLBACK_HOME.carouselPrev}
            nextAriaLabel={homeDict.carouselNext ?? FALLBACK_HOME.carouselNext}
          />
        </div>
      </section>

      <HomeTourTypePills lang={lang} />

      {packageTours.length > 0 ? (
        <section className="home-experiences page-section">
          <div className="container">
            <h2 className="home-section-title">{homeDict.packagesTitle ?? FALLBACK_HOME.packagesTitle}</h2>
            <HomeTourCarousel
              lang={lang}
              items={mapToursToCarouselItems(packageTours)}
              fromLabel={homeDict.from ?? FALLBACK_HOME.from}
              bookLabel={bookNowLabel}
              askForPriceLabel={askForPriceButton}
              prevAriaLabel={homeDict.carouselPrev ?? FALLBACK_HOME.carouselPrev}
              nextAriaLabel={homeDict.carouselNext ?? FALLBACK_HOME.carouselNext}
            />
          </div>
        </section>
      ) : null}

      {moreTours.length > 0 ? (
        <section className="home-experiences page-section section-alt home-experiences--more">
          <div className="container">
            <h2 className="home-section-title">{homeDict.moreExperiencesTitle ?? FALLBACK_HOME.moreExperiencesTitle}</h2>
            {renderTourRow(moreTours)}
          </div>
        </section>
      ) : null}

      <HomeHowItWorks sectionTitle={homeDict.howItWorksTitle ?? FALLBACK_HOME.howItWorksTitle} steps={howSteps} />

      <HomeAttractionsCarousel
        title={homeDict.attractionsCarouselTitle ?? FALLBACK_HOME.attractionsCarouselTitle}
        items={attractionSlides}
        imageFallback={getTourImagePath('TOUR')}
        lang={lang}
        scrollHintLabel={homeDict.scrollHint ?? FALLBACK_HOME.scrollHint}
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
