interface Step {
  title: string;
  description: string;
}

interface HomeHowItWorksProps {
  sectionTitle: string;
  steps: Step[];
}

function StepIcon({ index }: { index: number }) {
  const icons = [
    // 1. Choose Your Experience — compass
    <svg key="1" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" />
    </svg>,
    // 2. Contact & Reserve Easily — chat bubble
    <svg key="2" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>,
    // 3. Hotel Pick-Up — building/hotel
    <svg key="3" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1" />
    </svg>,
    // 4. Pay On-Site — wallet/cash
    <svg key="4" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M20 7H5a2 2 0 0 1 0-4h14v4z" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <circle cx="16" cy="13.5" r="1.5" />
    </svg>,
    // 5. Enjoy & Return Comfortably — home with heart
    <svg key="5" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>,
  ];
  return icons[index] ?? icons[0];
}

export function HomeHowItWorks({ sectionTitle, steps }: HomeHowItWorksProps) {
  const visible = steps.slice(0, 5);
  return (
    <section className="home-how-it-works page-section" aria-labelledby="home-hiw-heading">
      <div className="container">
        <h2 id="home-hiw-heading" className="home-hiw-title">
          {sectionTitle}
        </h2>
        <ol className="home-hiw-steps" data-count={visible.length}>
          {visible.map((step, i) => (
            <li key={i} className="home-hiw-step">
              <div className="home-hiw-icon-wrap" aria-hidden>
                <StepIcon index={i} />
              </div>
              <h3 className="home-hiw-step-title">{step.title}</h3>
              <p className="home-hiw-step-desc">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
