interface HomeWelcomeProps {
  tagline: string;
  heading: string;
  body1: string;
  body2: string;
}

export function HomeWelcome({ tagline, heading, body1, body2 }: HomeWelcomeProps) {
  return (
    <section className="home-welcome page-section">
      <div className="container">
        <p className="home-welcome-tagline">{tagline}</p>
        <h2 className="home-welcome-heading">{heading}</h2>
        <p className="home-welcome-body">{body1}</p>
        <p className="home-welcome-body">{body2}</p>
      </div>
    </section>
  );
}
