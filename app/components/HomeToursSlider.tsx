'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { getTourImagePath, getTourImageFallback } from '@/lib/imagePaths';

type TourItem = {
  id: string;
  type: string;
  title: string;
  price: number;
};

export function HomeToursSlider({
  tours,
  lang,
  sectionTitle,
  viewAllLabel,
  fromLabel,
}: {
  tours: TourItem[];
  lang: string;
  sectionTitle: string;
  viewAllLabel: string;
  fromLabel: string;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    const el = sliderRef.current;
    if (!el) return;
    const step = 320;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <section className="home-experiences page-section section-alt fade-in-up">
      <div className="container">
        <h2 className="section-title home-section-title">{sectionTitle}</h2>
        <div className="tours-slider-container">
          <button
            type="button"
            className="slider-arrow slider-arrow-left"
            onClick={() => scroll('left')}
            aria-label="Önceki"
          >
            ‹
          </button>
          <div className="tours-slider" ref={sliderRef}>
            {tours.map((tour) => (
              <TourSlideCard
                key={tour.id}
                lang={lang}
                tour={tour}
                fromLabel={fromLabel}
              />
            ))}
          </div>
          <button
            type="button"
            className="slider-arrow slider-arrow-right"
            onClick={() => scroll('right')}
            aria-label="Sonraki"
          >
            ›
          </button>
        </div>
        <div className="section-cta home-view-all">
          <Link href={`/${lang}/tours`} className="btn btn-secondary">
            {viewAllLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}

function TourSlideCard({
  lang,
  tour,
  fromLabel,
}: {
  lang: string;
  tour: TourItem;
  fromLabel: string;
}) {
  const [src, setSrc] = useState(() => getTourImagePath(tour.type));
  const fallback = getTourImageFallback(tour.type);

  return (
    <Link
      href={`/${lang}/tour/${tour.id}`}
      className="tour-card tour-card-slide"
    >
      <div className="tour-card-image-wrap">
        <img
          src={src}
          alt={tour.title}
          loading="lazy"
          onError={() => setSrc(fallback)}
        />
        <span className="tour-card-price-badge">{fromLabel} €{tour.price}</span>
      </div>
      <div className="tour-card-content">
        <h3>{tour.title}</h3>
      </div>
    </Link>
  );
}
