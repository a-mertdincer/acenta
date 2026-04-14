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
    <svg key="1" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      <path d="M9 12h6M9 16h6" />
    </svg>,
    <svg key="2" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>,
    <svg key="3" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 17h18l-2-8H5l-2 8zM5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>,
    <svg key="4" className="home-hiw-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>,
  ];
  return icons[index] ?? icons[0];
}

export function HomeHowItWorks({ sectionTitle, steps }: HomeHowItWorksProps) {
  return (
    <section className="home-how-it-works page-section" aria-labelledby="home-hiw-heading">
      <div className="container">
        <h2 id="home-hiw-heading" className="home-hiw-title">
          {sectionTitle}
        </h2>
        <ol className="home-hiw-steps">
          {steps.slice(0, 4).map((step, i) => (
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
