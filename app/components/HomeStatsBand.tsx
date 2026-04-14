interface StatItem {
  head: string;
  sub: string;
}

interface HomeStatsBandProps {
  items: StatItem[];
}

export function HomeStatsBand({ items }: HomeStatsBandProps) {
  return (
    <section className="home-stats-six" aria-label="Highlights">
      <div className="container home-stats-six-inner">
        <ul className="home-stats-six-grid">
          {items.map((item, i) => (
            <li key={i} className="home-stats-six-item">
              <strong className="home-stats-six-head">{item.head}</strong>
              <span className="home-stats-six-sub">{item.sub}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
