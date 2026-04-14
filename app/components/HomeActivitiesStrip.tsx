import Link from 'next/link';

type Lang = 'en' | 'tr' | 'zh';

interface ActivityItem {
  href: string;
  label: string;
  icon: 'balloon' | 'tours' | 'transfer';
}

interface HomeActivitiesStripProps {
  lang: Lang;
  title: string;
  activityBalloon: string;
  activityTours: string;
  activityTransfer: string;
}

const HOME_ACTIVITY_IMAGES: Record<ActivityItem['icon'], string> = {
  balloon: '/images/tours/balloon/balon-goreme/ballom-flight.jpg',
  tours: '/images/tours/daily-tours/green-tour/1105287.jpg',
  transfer: '/images/tours/transfer/airport-transfer/8-1-768x576.jpg',
};

export function HomeActivitiesStrip({
  lang,
  title,
  activityBalloon,
  activityTours,
  activityTransfer,
}: HomeActivitiesStripProps) {
  const activities: ActivityItem[] = [
    { href: `/${lang}/tours`, label: activityBalloon, icon: 'balloon' },
    { href: `/${lang}/tours`, label: activityTours, icon: 'tours' },
    { href: `/${lang}/tours`, label: activityTransfer, icon: 'transfer' },
  ];

  return (
    <section className="home-activities page-section section-alt">
      <div className="container">
        <h2 className="home-section-title">{title}</h2>
        <div className="home-activities-grid">
          {activities.map((item) => (
            <Link key={item.icon} href={item.href} className="home-activity-card">
              <span className="home-activity-icon">
                <img
                  src={HOME_ACTIVITY_IMAGES[item.icon]}
                  alt=""
                  width={56}
                  height={56}
                  loading="lazy"
                  decoding="async"
                  className="home-activity-thumb"
                />
              </span>
              <span className="home-activity-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
