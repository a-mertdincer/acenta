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

function BalloonSvg() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden>
      <path fill="currentColor" d="M24 4C15.2 4 8 11.2 8 20c0 4.4 1.6 8.4 4.2 11.5L10 38h6l2.2-5.5c1.2.2 2.4.3 3.6.3h.4l2.2 5.5h6l-2.2-6.5C38.4 28.4 40 24.4 40 20c0-8.8-7.2-16-16-16zm0 4c6.6 0 12 5.4 12 12 0 3.2-1.2 6-3.2 8.2l-1.2-2.8h-2.4l-1.4 3.4c-1.2 0-2.4-.2-3.4-.5l-1.6-3.8h-2.4l-1.4 3.2C13.2 22 12 19.2 12 16c0-6.6 5.4-12 12-12z" />
    </svg>
  );
}

function ToursSvg() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden>
      <path fill="currentColor" d="M24 6C14.1 6 6 14.1 6 24s8.1 18 18 18 18-8.1 18-18S33.9 6 24 6zm0 4c7.7 0 14 6.3 14 14s-6.3 14-14 14-14-6.3-14-14 6.3-14 14-14zm-2 6v8l6 3.5 2-3.5-4-2.3v-5.7h-4z" />
    </svg>
  );
}

function TransferSvg() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden>
      <path fill="currentColor" d="M8 10v28h4V18h12v20h4V14H12v-4H8zm28 8l-6-6v4H22v4h8v4l6-6z" />
    </svg>
  );
}

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
                {item.icon === 'balloon' && <BalloonSvg />}
                {item.icon === 'tours' && <ToursSvg />}
                {item.icon === 'transfer' && <TransferSvg />}
              </span>
              <span className="home-activity-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
