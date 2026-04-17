interface StatItem {
  head: string;
  sub: string;
}

interface HomeStatsBandProps {
  items: StatItem[];
}

/**
 * Compact pill strip under the hero. Flex-wrap keeps it one line on wide
 * screens and folds gracefully to multiple lines on tablet/mobile without
 * a grid breakpoint ladder.
 */
export function HomeStatsBand({ items }: HomeStatsBandProps) {
  return (
    <section className="home-stats-band" aria-label="Highlights">
      <div className="container">
        <ul className="home-stats-pills">
          {items.map((item, i) => (
            <li key={i} className="home-stats-pill">
              <span className="home-stats-pill-head">{item.head}</span>
              <span className="home-stats-pill-sub">{item.sub}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
