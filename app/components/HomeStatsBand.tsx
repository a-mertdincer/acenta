interface StatItem {
  head: string;
  sub: string;
}

interface HomeStatsBandProps {
  items: StatItem[];
}

/**
 * Original highlights band: six centered items in a grid.
 * Collapses to 3 cols on tablet, 2 on mobile.
 */
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
