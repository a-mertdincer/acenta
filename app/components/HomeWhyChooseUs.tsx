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
    // 1. Local Expertise — mountain/pin
    <svg key="0" {...common}><path d="M3 20l5-9 4 5 3-3 6 7H3z" /><circle cx="16" cy="6" r="2" /><path d="M16 8v12" /></svg>,
    // 2. Reliable Local Partners — handshake
    <svg key="1" {...common}><path d="M11 17l-2-2-3 3-3-3 6-6 3 3" /><path d="M13 7l3-3 3 3 3 3-6 6-3-3" /><path d="M13 14l3 3" /></svg>,
    // 3. Flexible & Guest-Oriented Booking — calendar with gear
    <svg key="2" {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /><circle cx="12" cy="15" r="2" /></svg>,
    // 4. Tailor-Made — sparkles
    <svg key="3" {...common}><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /><path d="M19 15l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" /></svg>,
    // 5. Safety — shield with check
    <svg key="4" {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
    // 6. Hand-Picked — badge check
    <svg key="5" {...common}><path d="M12 2l2.5 2 3.5-.5.5 3.5 2 2.5-2 2.5-.5 3.5-3.5-.5L12 18l-2.5-2-3.5.5-.5-3.5-2-2.5 2-2.5.5-3.5 3.5.5L12 2z" /><path d="M9 10l2 2 4-4" /></svg>,
    // 7. Licensed — award
    <svg key="6" {...common}><circle cx="12" cy="9" r="6" /><path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7" /></svg>,
    // 8. Support — headset/message heart
    <svg key="7" {...common}><path d="M4 12a8 8 0 0 1 16 0v4a2 2 0 0 1-2 2h-1v-6h3" /><path d="M4 12v4a2 2 0 0 0 2 2h1v-6H4" /></svg>,
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
