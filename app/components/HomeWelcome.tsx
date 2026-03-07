interface HomeWelcomeStat {
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
  { label: '10+ Years Experience' },
  { label: '500+ Happy Guests' },
  { label: 'Local Experts' },
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
          {hasImage && (
            <div className="home-welcome-image-wrap">
              <img
                src={welcomeImageSrc ?? welcomeImageFallback}
                alt=""
                aria-hidden
                onError={(e) => {
                  if (welcomeImageFallback && e.currentTarget.src !== welcomeImageFallback) {
                    e.currentTarget.src = welcomeImageFallback;
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
