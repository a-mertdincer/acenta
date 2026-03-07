import { getHeroPath, getHeroFallback, getTourImagePath, getTourImageFallback } from '../../lib/imagePaths';
import { HomeHero } from '../components/HomeHero';
import { HomeExperienceCard } from '../components/HomeExperienceCard';
import { HomeWelcome } from '../components/HomeWelcome';
import { ActivitiesDestinationSection } from '../components/ActivitiesDestinationSection';
import { HomeWhyUs } from '../components/HomeWhyUs';
import { HomeCta } from '../components/HomeCta';
import Link from 'next/link';

const MOCK_CARDS = [
  { titleKey: 'standardBalloon', descKey: 'standardBalloonDesc', price: 150, tourId: 'mock-balloon', type: 'BALLOON' },
  { titleKey: 'greenTour', descKey: 'greenTourDesc', price: 40, tourId: 'mock-green', type: 'TOUR' },
  { titleKey: 'transfer', descKey: 'transferDesc', price: 50, tourId: 'mock-transfer', type: 'TRANSFER' },
];

const STATIC_HOME = {
  title: 'Experience the Magic of Cappadocia',
  subtitle: 'Discover breathtaking landscapes and hot air balloon rides with Kısmet Göreme Travel.',
  bookBalloon: 'Book a Balloon',
  exploreTours: 'Explore Tours',
  from: 'From',
  welcomeHeading: 'Welcome to Kısmet Göreme',
  welcomeBody1: 'Based in the heart of Göreme, Kısmet Göreme Travel specialises in tailor-made experiences across Turkey.',
  welcomeBody2: 'Whether it\'s hot air balloon flights over Cappadocia, guided valley walks, or unique experiences, we offer authentic hospitality.',
  bestSellingTours: 'Best Selling Tours',
  activitiesTitle: 'Activities & Services',
  whyUsTitle: 'Why choose us',
  whyUs1: 'Premium experiences',
  whyUs2: 'Local experts',
  whyUs3: 'Best price guarantee',
  ctaTitle: "Need help? We're here for you.",
  viewAllTours: 'View all tours',
};

const STATIC_TOURS_DICT: Record<string, string> = {
  bookNow: 'Book Now',
  standardBalloon: 'Standard Balloon Flight',
  greenTour: 'Cappadocia Green Tour',
  transfer: 'Private Airport Transfer',
  standardBalloonDesc: 'Float above the fairy chimneys at sunrise.',
  greenTourDesc: 'Explore the underground city and Ihlara Valley.',
  transferDesc: 'VIP transfer to and from Nevşehir or Kayseri airports.',
};

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = (params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en') as 'en' | 'tr' | 'zh';

  const tours = MOCK_CARDS.map((c) => ({
    id: c.tourId,
    type: c.type,
    title: STATIC_TOURS_DICT[c.titleKey] ?? c.titleKey,
    desc: STATIC_TOURS_DICT[c.descKey] ?? '',
    price: c.price,
  }));

  const heroSrc = getHeroPath();
  const heroFallback = getHeroFallback();

  return (
    <>
      <HomeHero
        title={STATIC_HOME.title}
        subtitle={STATIC_HOME.subtitle}
        bookLabel={STATIC_HOME.bookBalloon}
        exploreLabel={STATIC_HOME.exploreTours}
        lang={lang}
        heroSrc={heroSrc}
        heroFallback={heroFallback}
      />

      <HomeWelcome
        tagline=""
        heading={STATIC_HOME.welcomeHeading}
        body1={STATIC_HOME.welcomeBody1}
        body2={STATIC_HOME.welcomeBody2}
        welcomeImageSrc={heroSrc}
        welcomeImageFallback={heroFallback}
      />

      <section className="home-experiences page-section section-alt">
        <div className="container">
          <h2 className="home-section-title">{STATIC_HOME.bestSellingTours}</h2>
          <div className="home-cards">
            {tours.map((tour) => (
              <HomeExperienceCard
                key={tour.id}
                lang={lang}
                title={tour.title}
                desc={tour.desc}
                fromLabel={STATIC_HOME.from}
                price={tour.price}
                tourId={tour.id}
                imageSrc={getTourImagePath(tour.type)}
                imageFallback={getTourImageFallback(tour.type)}
                bookLabel={STATIC_TOURS_DICT.bookNow}
              />
            ))}
          </div>
          <div className="home-view-all">
            <Link href={`/${lang}/tours`} className="btn btn-secondary">
              {STATIC_HOME.viewAllTours}
            </Link>
          </div>
        </div>
      </section>

      <ActivitiesDestinationSection
        lang={lang}
        title={STATIC_HOME.activitiesTitle}
      />

      <HomeWhyUs
        title={STATIC_HOME.whyUsTitle}
        point1={STATIC_HOME.whyUs1}
        point2={STATIC_HOME.whyUs2}
        point3={STATIC_HOME.whyUs3}
      />

      <HomeCta
        lang={lang}
        title={STATIC_HOME.ctaTitle}
        buttonLabel={STATIC_HOME.viewAllTours}
      />
    </>
  );
}
