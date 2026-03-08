import { getDictionary } from '../dictionaries/getDictionary';
import { getHeroPath, getHeroFallback, getTourImagePath, getTourImageFallback } from '../../lib/imagePaths';
import { HomeHero } from '../components/HomeHero';
import { HomeExperienceCard } from '../components/HomeExperienceCard';
import { HomeWelcome } from '../components/HomeWelcome';
import { ActivitiesDestinationSection } from '../components/ActivitiesDestinationSection';
import { HomeWhyUs } from '../components/HomeWhyUs';
import { HomeCta } from '../components/HomeCta';
import { getTours } from '../actions/tours';
import Link from 'next/link';

const MOCK_CARDS = [
  { titleKey: 'standardBalloon', descKey: 'standardBalloonDesc', price: 150, tourId: 'mock-balloon', type: 'BALLOON' },
  { titleKey: 'greenTour', descKey: 'greenTourDesc', price: 40, tourId: 'mock-green', type: 'TOUR' },
  { titleKey: 'transfer', descKey: 'transferDesc', price: 50, tourId: 'mock-transfer', type: 'TRANSFER' },
];

const FALLBACK_HOME = {
  title: 'Experience the Magic of Cappadocia',
  subtitle: 'Discover breathtaking landscapes and hot air balloon rides with Kısmet Göreme Travel.',
  bookBalloon: 'Book a Balloon',
  exploreTours: 'Explore Tours',
  from: 'From',
  welcomeTagline: '',
  welcomeHeading: 'Welcome to Kısmet Göreme',
  welcomeBody1: 'Based in the heart of Göreme, Kısmet Göreme Travel specialises in tailor-made experiences across Turkey.',
  welcomeBody2: "Whether it's hot air balloon flights over Cappadocia, guided valley walks, or unique experiences, we offer authentic hospitality.",
  bestSellingTours: 'Best Selling Tours',
  activitiesTitle: 'Activities & Services',
  whyUsTitle: 'Why choose us',
  whyUs1: 'Premium experiences',
  whyUs2: 'Local experts',
  whyUs3: 'Best price guarantee',
  ctaTitle: "Need help? We're here for you.",
  ctaSubtitle: 'Let us plan your perfect Cappadocia experience.',
  ctaButton: 'View all tours',
  viewAllTours: 'View all tours',
  scrollToExplore: 'Scroll to explore',
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
  let lang = 'en' as 'en' | 'tr' | 'zh';
  let homeDict: Record<string, string> = FALLBACK_HOME;
  let toursDict: Record<string, string> = FALLBACK_TOURS_DICT;
  let tours: { id: string; type: string; title: string; desc: string; price: number }[] = MOCK_CARDS.map((c) => ({
    id: c.tourId,
    type: c.type,
    title: FALLBACK_TOURS_DICT[c.titleKey] ?? c.titleKey,
    desc: FALLBACK_TOURS_DICT[c.descKey] ?? '',
    price: c.price,
  }));

  try {
    const params = await props.params;
    lang = (params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en') as 'en' | 'tr' | 'zh';

    const dict = await getDictionary(lang);
    if (dict?.home && typeof dict.home === 'object') homeDict = { ...FALLBACK_HOME, ...(dict.home as Record<string, string>) };
    if (dict?.tours && typeof dict.tours === 'object') toursDict = { ...FALLBACK_TOURS_DICT, ...(dict.tours as Record<string, string>) };

    const dbTours = await getTours();
    if (dbTours.length > 0) {
      tours = dbTours.map((t) => {
        try {
          const byAirport = t.transferAirportTiers;
          const allTierPrices = byAirport
            ? [...(byAirport.ASR ?? []), ...(byAirport.NAV ?? [])].map((tier) => tier?.price ?? 0).filter(Boolean)
            : (t.transferTiers ?? []).map((tier) => tier?.price ?? 0).filter(Boolean);
          const fromPrice = t.type === 'TRANSFER' && allTierPrices.length > 0 ? Math.min(...allTierPrices) : Number(t.basePrice) || 0;
          return {
            id: String(t.id),
            type: String(t.type ?? 'TOUR'),
            title: String(lang === 'tr' ? t.titleTr : lang === 'zh' ? t.titleZh : t.titleEn ?? ''),
            desc: String(lang === 'tr' ? t.descTr : lang === 'zh' ? t.descZh : t.descEn ?? ''),
            price: fromPrice,
          };
        } catch {
          return {
            id: t.id,
            type: t.type ?? 'TOUR',
            title: String(t.titleEn ?? t.titleTr ?? t.titleZh ?? ''),
            desc: '',
            price: Number(t.basePrice) || 0,
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
      }));
    }
  } catch (_e) {
    // keep fallbacks
  }

  const heroSrc = getHeroPath();
  const heroFallback = getHeroFallback();
  const bookNowLabel = toursDict.bookNow ?? 'Book Now';

  return (
    <>
      <HomeHero
        title={homeDict.title ?? FALLBACK_HOME.title}
        subtitle={homeDict.subtitle ?? FALLBACK_HOME.subtitle}
        bookLabel={homeDict.bookBalloon ?? FALLBACK_HOME.bookBalloon}
        exploreLabel={homeDict.exploreTours ?? FALLBACK_HOME.exploreTours}
        scrollLabel={typeof homeDict.scrollToExplore === 'string' ? homeDict.scrollToExplore : undefined}
        lang={lang}
        heroSrc={heroSrc}
        heroFallback={heroFallback}
      />

      <div className="fade-in-up">
        <HomeWelcome
          tagline={homeDict.welcomeTagline ?? ''}
          heading={homeDict.welcomeHeading ?? FALLBACK_HOME.welcomeHeading}
          body1={homeDict.welcomeBody1 ?? FALLBACK_HOME.welcomeBody1}
          body2={homeDict.welcomeBody2 ?? FALLBACK_HOME.welcomeBody2}
          welcomeImageSrc={heroSrc}
          welcomeImageFallback={heroFallback}
        />
      </div>

      <section className="home-experiences page-section section-alt fade-in-up">
        <div className="container">
          <h2 className="home-section-title">{homeDict.bestSellingTours ?? FALLBACK_HOME.bestSellingTours}</h2>
          <div className="home-cards">
            {tours.map((tour) => (
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
              />
            ))}
          </div>
          <div className="home-view-all">
            <Link href={`/${lang}/tours`} className="btn btn-secondary">
              {homeDict.viewAllTours ?? FALLBACK_HOME.viewAllTours}
            </Link>
          </div>
        </div>
      </section>

      <div className="fade-in-up">
        <ActivitiesDestinationSection
          lang={lang}
          title={homeDict.activitiesTitle ?? FALLBACK_HOME.activitiesTitle}
          viewAllLabel={homeDict.viewAllTours ?? FALLBACK_HOME.viewAllTours}
        />
      </div>

      <div className="fade-in-up">
        <HomeWhyUs
          title={homeDict.whyUsTitle ?? FALLBACK_HOME.whyUsTitle}
          point1={homeDict.whyUs1 ?? FALLBACK_HOME.whyUs1}
          point2={homeDict.whyUs2 ?? FALLBACK_HOME.whyUs2}
          point3={homeDict.whyUs3 ?? FALLBACK_HOME.whyUs3}
        />
      </div>

      <div className="fade-in-up">
        <HomeCta
        lang={lang}
        title={homeDict.ctaTitle ?? FALLBACK_HOME.ctaTitle}
        buttonLabel={homeDict.viewAllTours ?? homeDict.ctaButton ?? FALLBACK_HOME.viewAllTours}
        subtitle={typeof homeDict.ctaSubtitle === 'string' ? homeDict.ctaSubtitle : FALLBACK_HOME.ctaSubtitle}
        />
      </div>
    </>
  );
}
