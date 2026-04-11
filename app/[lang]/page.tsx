import { getDictionary } from '../dictionaries/getDictionary';
import { getHeroPath, getHeroFallback, getTourImagePath, getTourImageFallback } from '../../lib/imagePaths';
import { HomeHero } from '../components/HomeHero';
import { HomeExperienceCard } from '../components/HomeExperienceCard';
import { HomeCta } from '../components/HomeCta';
import { getTours } from '../actions/tours';
import { getTourWithVariants } from '../actions/variants';
import Link from 'next/link';
import { getActiveDestinations, getCategoryLabel, normalizeCategorySlug, type Lang } from '@/lib/destinations';
import { getTierFromPrice } from '@/lib/pricingTiers';

const MOCK_CARDS = [
  { titleKey: 'standardBalloon', descKey: 'standardBalloonDesc', price: 150, tourId: 'mock-balloon', type: 'BALLOON' },
  { titleKey: 'greenTour', descKey: 'greenTourDesc', price: 40, tourId: 'mock-green', type: 'TOUR' },
  { titleKey: 'transfer', descKey: 'transferDesc', price: 50, tourId: 'mock-transfer', type: 'TRANSFER' },
];

const FALLBACK_HOME = {
  title: 'Experience the Magic of Cappadocia',
  subtitle: 'Find and book your perfect adventure in minutes.',
  from: 'From',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  guests: 'Guests',
  allActivities: 'All Activities',
  search: 'Search',
  topStatsTours: 'Tours',
  topStatsBooked: 'Booked',
  topStatsRating: 'Rating',
  topStatsAwards: 'Awards',
  bestSellingTours: 'Best Selling Tours',
  ctaTitle: "Need help? We're here for you.",
  ctaSubtitle: 'Let us plan your perfect Cappadocia experience.',
  ctaButton: 'View all tours',
  viewAllTours: 'View all tours',
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

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  let lang = 'en' as Lang;
  let homeDict: Record<string, string> = FALLBACK_HOME;
  let toursDict: Record<string, string> = FALLBACK_TOURS_DICT;
  let tours: { id: string; type: string; title: string; desc: string; price: number; category: string | null; destination: string }[] = MOCK_CARDS.map((c) => ({
    id: c.tourId,
    type: c.type,
    title: FALLBACK_TOURS_DICT[c.titleKey] ?? c.titleKey,
    desc: FALLBACK_TOURS_DICT[c.descKey] ?? '',
    price: c.price,
    category: c.type === 'BALLOON' ? 'balloon-flights' : c.type === 'TRANSFER' ? 'transfers' : 'daily-tours',
    destination: 'cappadocia',
  }));

  try {
    const params = await props.params;
    lang = (params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en') as Lang;

    const dict = await getDictionary(lang);
    if (dict?.home && typeof dict.home === 'object') homeDict = { ...FALLBACK_HOME, ...(dict.home as Record<string, string>) };
    if (dict?.tours && typeof dict.tours === 'object') toursDict = { ...FALLBACK_TOURS_DICT, ...(dict.tours as Record<string, string>) };

    const dbTours = await getTours();
    if (dbTours.length > 0) {
      const variantFromPriceMap = new Map<string, number>();
      const variantData = await Promise.all(dbTours.map(async (tour) => ({ id: tour.id, data: await getTourWithVariants(tour.id) })));
      variantData.forEach(({ id, data }) => {
        const activeVariants = data?.variants ?? [];
        if (activeVariants.length === 0) return;
        const minPrice = Math.min(
          ...activeVariants.map((variant) => {
            if (variant.reservationType === 'private' && (variant.privatePriceTiers?.length ?? 0) > 0) {
              return getTierFromPrice(variant.privatePriceTiers ?? null) ?? variant.adultPrice;
            }
            return variant.adultPrice;
          })
        );
        variantFromPriceMap.set(id, minPrice);
      });
      tours = dbTours.map((t) => {
        try {
          const byAirport = t.transferAirportTiers;
          const allTierPrices = byAirport
            ? [...(byAirport.ASR ?? []), ...(byAirport.NAV ?? [])].map((tier) => tier?.price ?? 0).filter(Boolean)
            : (t.transferTiers ?? []).map((tier) => tier?.price ?? 0).filter(Boolean);
          const fromPrice = t.type === 'TRANSFER' && allTierPrices.length > 0
            ? Math.min(...allTierPrices)
            : ((variantFromPriceMap.get(t.id) ?? Number(t.basePrice)) || 0);
          return {
            id: String(t.id),
            type: String(t.type ?? 'TOUR'),
            title: String(lang === 'tr' ? t.titleTr : lang === 'zh' ? t.titleZh : t.titleEn ?? ''),
            desc: String(lang === 'tr' ? t.descTr : lang === 'zh' ? t.descZh : t.descEn ?? ''),
            price: fromPrice,
            category: t.category ? normalizeCategorySlug(String(t.category)) : null,
            destination: String(t.destination ?? 'cappadocia'),
          };
        } catch {
          return {
            id: t.id,
            type: t.type ?? 'TOUR',
            title: String(t.titleEn ?? t.titleTr ?? t.titleZh ?? ''),
            desc: '',
            price: Number(t.basePrice) || 0,
            category: null,
            destination: 'cappadocia',
          };
        }
      });
    } else {
      tours = MOCK_CARDS.map((c) => ({
        id: c.tourId,
        type: c.type,
        title: toursDict[c.titleKey] ?? c.titleKey,
        desc: toursDict[c.descKey] ?? '',
        price: c.price,
        category: c.type === 'BALLOON' ? 'balloon-flights' : c.type === 'TRANSFER' ? 'transfers' : 'daily-tours',
        destination: 'cappadocia',
      }));
    }
  } catch (_e) {
    // keep fallbacks
  }

  const heroSrc = getHeroPath();
  const heroFallback = getHeroFallback();
  const bookNowLabel = toursDict.bookNow ?? 'Book Now';
  const defaultDestination = getActiveDestinations()[0];
  const activityOptions = (defaultDestination?.categories ?? []).map((category) => ({
    value: category.slug,
    label: getCategoryLabel(category, lang),
  }));

  const groupedTours = tours.reduce((acc, tour) => {
    const destination = defaultDestination?.slug ?? tour.destination ?? 'cappadocia';
    const categorySlug = tour.category ?? 'daily-tours';
    const category = defaultDestination?.categories.find((c) => c.slug === categorySlug || c.id === categorySlug);
    const groupTitle = category ? getCategoryLabel(category, lang) : (lang === 'tr' ? 'Diger Deneyimler' : lang === 'zh' ? '其他体验' : 'Other Experiences');
    const list = acc.get(groupTitle) ?? [];
    list.push(tour);
    acc.set(groupTitle, list);
    return acc;
  }, new Map<string, typeof tours>());

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

      <section className="home-sales-stats">
        <div className="container home-sales-stats-row">
          <div className="home-sales-stat"><strong>30+</strong><span>{homeDict.topStatsTours ?? FALLBACK_HOME.topStatsTours}</span></div>
          <div className="home-sales-stat"><strong>12500+</strong><span>{homeDict.topStatsBooked ?? FALLBACK_HOME.topStatsBooked}</span></div>
          <div className="home-sales-stat"><strong>4.9/5.0</strong><span>{homeDict.topStatsRating ?? FALLBACK_HOME.topStatsRating}</span></div>
          <div className="home-sales-stat"><strong>15+</strong><span>{homeDict.topStatsAwards ?? FALLBACK_HOME.topStatsAwards}</span></div>
        </div>
      </section>

      <section className="home-experiences page-section section-alt">
        <div className="container">
          <h2 className="home-section-title">{homeDict.bestSellingTours ?? FALLBACK_HOME.bestSellingTours}</h2>
          {Array.from(groupedTours.entries()).map(([groupTitle, groupItems]) => (
            <div key={groupTitle} className="home-group">
              <h3 className="home-group-title">{groupTitle}</h3>
              <div className="home-cards">
                {groupItems.map((tour) => (
                  <HomeExperienceCard
                    key={tour.id}
                    lang={lang}
                    title={tour.title}
                    desc={tour.desc}
                    fromLabel={homeDict.from ?? FALLBACK_HOME.from}
                    price={tour.price}
                    tourId={tour.id}
                    imageSrc={getTourImagePath(tour.type)}
                    imageFallback={getTourImageFallback(tour.type)}
                    bookLabel={bookNowLabel}
                    categoryBadge={groupTitle}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="home-view-all">
            <Link href={`/${lang}/tours`} className="btn btn-secondary">
              {homeDict.viewAllTours ?? FALLBACK_HOME.viewAllTours}
            </Link>
          </div>
        </div>
      </section>

      <HomeCta
        lang={lang}
        title={homeDict.ctaTitle ?? FALLBACK_HOME.ctaTitle}
        buttonLabel={homeDict.viewAllTours ?? homeDict.ctaButton ?? FALLBACK_HOME.viewAllTours}
        subtitle={typeof homeDict.ctaSubtitle === 'string' ? homeDict.ctaSubtitle : FALLBACK_HOME.ctaSubtitle}
      />
    </>
  );
}
