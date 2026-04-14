interface TrustItem {
  title: string;
  description: string;
}

interface HomeWhyChooseUsProps {
  sectionTitle: string;
  items: TrustItem[];
}

function TrustIcon({ index }: { index: number }) {
  const common = { className: 'home-trust-icon', viewBox: '0 0 24 24' as const, fill: 'none' as const, stroke: 'currentColor' as const, strokeWidth: 1.5, 'aria-hidden': true as const };
  const set = [
    <svg key="0" {...common}><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7L12 17.8 5.7 21l2.3-7-6-4.6h7.6z" /></svg>,
    <svg key="1" {...common}><path d="M4 16l4-12 4 8 4-8 4 12" /><path d="M2 20h20" /></svg>,
    <svg key="2" {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    <svg key="3" {...common}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    <svg key="4" {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
    <svg key="5" {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
    <svg key="6" {...common}><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
    <svg key="7" {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>,
  ];
  return set[index % set.length];
}

export function HomeWhyChooseUs({ sectionTitle, items }: HomeWhyChooseUsProps) {
  return (
    <section className="home-why-choose page-section section-alt" aria-labelledby="home-trust-heading">
      <div className="container">
        <h2 id="home-trust-heading" className="home-trust-title">
          {sectionTitle}
        </h2>
        <ul className="home-trust-grid">
          {items.slice(0, 8).map((item, i) => (
            <li key={i} className="home-trust-card">
              <div className="home-trust-icon-wrap" aria-hidden>
                <TrustIcon index={i} />
              </div>
              <h3 className="home-trust-card-title">{item.title}</h3>
              <p className="home-trust-card-desc">{item.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
