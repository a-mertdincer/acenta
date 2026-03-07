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

const fallbackHome = {
  title: 'Experience the Magic of Cappadocia',
  subtitle: 'Discover breathtaking landscapes and hot air balloon rides with Kısmet Göreme Travel.',
  bookBalloon: 'Book a Balloon',
  exploreTours: 'Explore Tours',
  popularExperiences: 'Popular Experiences',
  from: 'From',
  welcomeTagline: '',
  welcomeHeading: 'Welcome to Kısmet Göreme',
  welcomeBody1: '',
  welcomeBody2: '',
  bestSellingTours: 'Best Selling Tours',
  activitiesTitle: 'Activities & Services',
  whyUsTitle: 'Why choose us',
  whyUs1: 'Premium experiences',
  whyUs2: 'Local experts',
  whyUs3: 'Best price guarantee',
  ctaTitle: "Need help? We're here for you.",
  ctaButton: 'View all tours',
  viewAllTours: 'View all tours',
};
const fallbackToursDict = { bookNow: 'Book Now', standardBalloon: 'Standard Balloon', greenTour: 'Green Tour', transfer: 'Transfer', standardBalloonDesc: '', greenTourDesc: '', transferDesc: '' };

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  let lang = 'en' as 'en' | 'tr' | 'zh';
  let toursDict: Record<string, string> = fallbackToursDict;
  let homeDict: Record<string, string> = fallbackHome;
  let tours: { id: string; type: string; title: string; desc: string; price: number }[] = [];
  let bookNowLabel = 'Book Now';

  try {
    const params = await props.params;
    lang = (params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en') as 'en' | 'tr' | 'zh';
    const dict = await getDictionary(lang);
    toursDict = (dict?.tours as Record<string, string>) ?? fallbackToursDict;
    homeDict = (dict?.home as Record<string, string>) ?? fallbackHome;
    bookNowLabel = toursDict?.bookNow ?? 'Book Now';

    const dbTours = await getTours();
    if (dbTours.length > 0) {
      tours = dbTours.map((t) => {
        try {
          const byAirport = t.transferAirportTiers;
          const allTierPrices = byAirport
            ? [...(byAirport.ASR ?? []), ...(byAirport.NAV ?? [])].map((tier) => tier?.price ?? 0).filter(Boolean)
            : (t.transferTiers ?? []).map((tier) => tier?.price ?? 0).filter(Boolean);
          const fromPrice = t.type === 'TRANSFER' && allTierPrices.length > 0
            ? Math.min(...allTierPrices)
            : Number(t.basePrice) || 0;
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
  } catch {
    // Full fallback so home never throws
    const fd = fallbackToursDict as Record<string, string>;
    tours = MOCK_CARDS.map((c) => ({
      id: c.tourId,
      type: c.type,
      title: fd[c.titleKey] ?? c.titleKey,
      desc: '',
      price: c.price,
    }));
  }

  const heroSrc = getHeroPath();
  const heroFallback = getHeroFallback();

  return (
    <>
      <HomeHero
        title={homeDict.title ?? fallbackHome.title}
        subtitle={homeDict.subtitle ?? fallbackHome.subtitle}
        bookLabel={homeDict.bookBalloon ?? fallbackHome.bookBalloon}
        exploreLabel={homeDict.exploreTours ?? fallbackHome.exploreTours}
        scrollLabel={typeof homeDict.scrollToExplore === 'string' ? homeDict.scrollToExplore : undefined}
        lang={lang}
        heroSrc={heroSrc}
        heroFallback={heroFallback}
      />

      <HomeWelcome
        tagline={homeDict.welcomeTagline ?? ''}
        heading={homeDict.welcomeHeading ?? fallbackHome.welcomeHeading}
        body1={homeDict.welcomeBody1 ?? ''}
        body2={homeDict.welcomeBody2 ?? ''}
        welcomeImageSrc={heroSrc}
        welcomeImageFallback={heroFallback}
      />

      <section className="home-experiences page-section section-alt">
        <div className="container">
          <h2 className="home-section-title">{homeDict.bestSellingTours ?? fallbackHome.bestSellingTours}</h2>
          <div className="home-cards">
            {tours.map((tour) => (
              <HomeExperienceCard
                key={tour.id}
                lang={lang}
                title={tour.title}
                desc={tour.desc}
                fromLabel={homeDict.from ?? fallbackHome.from}
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
              {homeDict.viewAllTours ?? fallbackHome.viewAllTours}
            </Link>
          </div>
        </div>
      </section>

      <ActivitiesDestinationSection
        lang={lang}
        title={homeDict.activitiesTitle ?? fallbackHome.activitiesTitle}
      />

      <HomeWhyUs
        title={homeDict.whyUsTitle ?? fallbackHome.whyUsTitle}
        point1={homeDict.whyUs1 ?? fallbackHome.whyUs1}
        point2={homeDict.whyUs2 ?? fallbackHome.whyUs2}
        point3={homeDict.whyUs3 ?? fallbackHome.whyUs3}
      />

      <HomeCta
        lang={lang}
        title={homeDict.ctaTitle ?? fallbackHome.ctaTitle}
        buttonLabel={homeDict.viewAllTours ?? homeDict.ctaButton ?? fallbackHome.viewAllTours}
      />
    </>
  );
}
