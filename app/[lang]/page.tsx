import { getDictionary } from '../dictionaries/getDictionary';
import { getHeroPath, getHeroFallback, getTourImagePath, getTourImageFallback } from '../../lib/imagePaths';
import { HomeHero } from '../components/HomeHero';
import { HomeExperienceCard } from '../components/HomeExperienceCard';
import { HomeWelcome } from '../components/HomeWelcome';
import { HomeActivitiesStrip } from '../components/HomeActivitiesStrip';
import { HomeWhyUs } from '../components/HomeWhyUs';
import { HomeCta } from '../components/HomeCta';
import { getTours } from '../actions/tours';
import Link from 'next/link';

const MOCK_CARDS = [
  { titleKey: 'standardBalloon', descKey: 'standardBalloonDesc', price: 150, tourId: 'mock-balloon', type: 'BALLOON' },
  { titleKey: 'greenTour', descKey: 'greenTourDesc', price: 40, tourId: 'mock-green', type: 'TOUR' },
  { titleKey: 'transfer', descKey: 'transferDesc', price: 50, tourId: 'mock-transfer', type: 'TRANSFER' },
];

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = params.lang as 'en' | 'tr' | 'zh';
  const dict = await getDictionary(lang);
  const toursDict = dict.tours as Record<string, string>;
  const homeDict = dict.home as Record<string, string>;

  const dbTours = await getTours();
  const tours = dbTours.length > 0
    ? dbTours.map((t) => {
        const byAirport = t.transferAirportTiers;
        const allTierPrices = byAirport
          ? [...(byAirport.ASR ?? []), ...(byAirport.NAV ?? [])].map((tier) => tier.price)
          : (t.transferTiers ?? []).map((tier) => tier.price);
        const fromPrice = t.type === 'TRANSFER' && allTierPrices.length
          ? Math.min(...allTierPrices)
          : t.basePrice;
        return {
          id: t.id,
          type: t.type,
          title: lang === 'tr' ? t.titleTr : lang === 'zh' ? t.titleZh : t.titleEn,
          desc: lang === 'tr' ? t.descTr : lang === 'zh' ? t.descZh : t.descEn,
          price: fromPrice,
        };
      })
    : MOCK_CARDS.map((c) => ({
        id: c.tourId,
        type: c.type,
        title: toursDict[c.titleKey] ?? c.titleKey,
        desc: toursDict[c.descKey] ?? '',
        price: c.price,
      }));

  const bookNowLabel = toursDict?.bookNow ?? 'Book Now';

  return (
    <>
      <HomeHero
        title={homeDict.title ?? dict.home.title}
        subtitle={homeDict.subtitle ?? dict.home.subtitle}
        bookLabel={homeDict.bookBalloon ?? dict.home.bookBalloon}
        exploreLabel={homeDict.exploreTours ?? dict.home.exploreTours}
        lang={lang}
        heroSrc={getHeroPath()}
        heroFallback={getHeroFallback()}
      />

      <HomeWelcome
        tagline={homeDict.welcomeTagline ?? ''}
        heading={homeDict.welcomeHeading ?? ''}
        body1={homeDict.welcomeBody1 ?? ''}
        body2={homeDict.welcomeBody2 ?? ''}
      />

      <section className="home-experiences page-section section-alt">
        <div className="container">
          <h2 className="home-section-title">{homeDict.bestSellingTours ?? dict.home.popularExperiences}</h2>
          <div className="home-cards">
            {tours.map((tour) => (
              <HomeExperienceCard
                key={tour.id}
                lang={lang}
                title={tour.title}
                desc={tour.desc}
                fromLabel={homeDict.from ?? dict.home.from}
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
              {homeDict.viewAllTours ?? 'View all tours'}
            </Link>
          </div>
        </div>
      </section>

      <HomeActivitiesStrip
        lang={lang}
        title={homeDict.activitiesTitle ?? 'Activities & Services'}
        activityBalloon={homeDict.activityBalloon ?? 'Balloon'}
        activityTours={homeDict.activityTours ?? 'Day Tours'}
        activityTransfer={homeDict.activityTransfer ?? 'Transfer'}
      />

      <HomeWhyUs
        title={homeDict.whyUsTitle ?? 'Why choose us'}
        point1={homeDict.whyUs1 ?? ''}
        point2={homeDict.whyUs2 ?? ''}
        point3={homeDict.whyUs3 ?? ''}
      />

      <HomeCta
        lang={lang}
        title={homeDict.ctaTitle ?? "Need help? We're here for you."}
        buttonLabel={homeDict.viewAllTours ?? homeDict.ctaButton ?? 'View all tours'}
      />
    </>
  );
}
