interface HomeWhyUsProps {
  title: string;
  point1: string;
  point2: string;
  point3: string;
  desc1?: string;
  desc2?: string;
  desc3?: string;
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconHeart({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function IconMapPin({ className }: { className?: string }) {
  return (
    <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/* Content matched to correct headings: Premium = safety, Local experts = local knowledge, Best price = service/pricing */
const DEFAULT_DESC = {
  desc1: 'We are fully licensed and insured. Your safety and satisfaction are our top priorities on every balloon flight and tour.',
  desc2: 'Our team lives in Cappadocia. We know the best viewpoints, timings, and local spots to make your experience unforgettable.',
  desc3: 'From first contact to post-trip follow-up, we provide personalized service and transparent pricing with no hidden fees.',
};

export function HomeWhyUs({
  title,
  point1,
  point2,
  point3,
  desc1 = DEFAULT_DESC.desc1,
  desc2 = DEFAULT_DESC.desc2,
  desc3 = DEFAULT_DESC.desc3,
}: HomeWhyUsProps) {
  const items = [
    { title: point1, desc: desc1, icon: IconShield },
    { title: point2, desc: desc2, icon: IconMapPin },
    { title: point3, desc: desc3, icon: IconHeart },
  ];

  return (
    <section className="home-whyus page-section section-dark">
      <div className="container">
        <h2 className="home-section-title home-section-title-small">{title}</h2>
        <div className="home-whyus-grid">
          {items.map(({ title: itemTitle, desc, icon: Icon }) => (
            <div key={itemTitle} className="home-whyus-item">
              <span className="home-whyus-icon"><Icon /></span>
              <h3>{itemTitle}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
