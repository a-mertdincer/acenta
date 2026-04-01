'use client';

interface HomeWelcomeStat {
  number?: string;
  label: string;
}

interface HomeWelcomeProps {
  tagline: string;
  heading: string;
  body1: string;
  body2: string;
  welcomeImageSrc?: string;
  welcomeImageFallback?: string;
  stats?: HomeWelcomeStat[];
}

const DEFAULT_STATS: HomeWelcomeStat[] = [
  { number: '10+', label: 'Years Experience' },
  { number: '500+', label: 'Happy Guests' },
  { number: '24/7', label: 'Local Support' },
];

export function HomeWelcome({
  tagline,
  heading,
  body1,
  body2,
  welcomeImageSrc,
  welcomeImageFallback,
  stats = DEFAULT_STATS,
}: HomeWelcomeProps) {
  const hasImage = Boolean(welcomeImageSrc || welcomeImageFallback);

  return (
    <section id="welcome" className="home-welcome page-section">
      <div className="container">
        <div className="home-welcome-inner">
          {hasImage && (welcomeImageSrc || welcomeImageFallback) && (
            <div className="home-welcome-image-wrap">
              <img
                src={welcomeImageSrc || welcomeImageFallback || ''}
                alt="Cappadocia travel experience"
                onError={(e) => {
                  const fallback = welcomeImageFallback || welcomeImageSrc;
                  if (fallback && e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
              />
            </div>
          )}
          <div className="home-welcome-text">
            {tagline && <p className="home-welcome-tagline">{tagline}</p>}
            <h2 className="home-welcome-heading">{heading}</h2>
            <p className="home-welcome-body">{body1}</p>
            {body2 && <p className="home-welcome-body">{body2}</p>}
            {stats.length > 0 && (
              <div className="home-welcome-stats">
                {stats.map((stat, i) => (
                  <div key={i} className="home-welcome-stat">
                    {stat.number != null && <span className="home-welcome-stat-number">{stat.number}</span>}
                    <span className="home-welcome-stat-label">{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
