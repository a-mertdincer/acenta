interface HomeWhyUsProps {
  title: string;
  point1: string;
  point2: string;
  point3: string;
}

export function HomeWhyUs({ title, point1, point2, point3 }: HomeWhyUsProps) {
  return (
    <section className="home-whyus page-section">
      <div className="container">
        <h2 className="home-section-title home-section-title-small">{title}</h2>
        <div className="home-whyus-grid">
          <div className="home-whyus-item">
            <span className="home-whyus-dot" aria-hidden />
            <span>{point1}</span>
          </div>
          <div className="home-whyus-item">
            <span className="home-whyus-dot" aria-hidden />
            <span>{point2}</span>
          </div>
          <div className="home-whyus-item">
            <span className="home-whyus-dot" aria-hidden />
            <span>{point3}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
