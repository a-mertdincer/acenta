'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  getActiveDestinations,
  getDestinationName,
  getCategoryLabel,
  type Lang,
} from '@/lib/destinations';

interface ActivitiesDestinationSectionProps {
  lang: Lang;
  title: string;
  /** Slug of currently selected destination (for tours page) */
  currentDestination?: string;
  /** Slug of currently selected category (for tours category page) */
  currentCategory?: string;
  /** Label for "View all" / "View All Activities" CTA (homepage only) */
  viewAllLabel?: string;
}

export function ActivitiesDestinationSection({
  lang,
  title,
  currentDestination,
  currentCategory,
  viewAllLabel,
}: ActivitiesDestinationSectionProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const destinations = getActiveDestinations();
  const selectedDest = currentDestination
    ? destinations.find((d) => d.slug === currentDestination) ?? destinations[0]
    : destinations[0];
  const categories = selectedDest?.categories ?? [];

  const scroll = (dir: 'left' | 'right') => {
    const el = sliderRef.current;
    if (!el) return;
    const step = 200;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <section className="home-activities page-section section-alt">
      <div className="container">
        <h2 className="section-title home-section-title">{title}</h2>

        {destinations.length > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)' }}>
            {destinations.map((d) => {
              const isActive = selectedDest?.slug === d.slug;
              const href = `/${lang}/tours/${d.slug}`;
              return (
                <Link
                  key={d.id}
                  href={href}
                  style={{
                    padding: 'var(--space-sm) var(--space-lg)',
                    borderRadius: '8px',
                    fontWeight: isActive ? 'bold' : 'normal',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-bg-light)',
                    color: isActive ? 'white' : 'var(--color-text-main)',
                    textDecoration: 'none',
                    border: `1px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {getDestinationName(d, lang)}
                </Link>
              );
            })}
          </div>
        )}

        <div className="tours-slider-container">
          <button
            type="button"
            className="slider-arrow slider-arrow-left"
            onClick={() => scroll('left')}
            aria-label="Önceki"
          >
            ‹
          </button>
          <div className="tours-slider activities-slider" ref={sliderRef}>
            {categories.map((cat) => {
              const href = `/${lang}/tours/${selectedDest!.slug}/${cat.slug}`;
              const isActive = currentCategory === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={href}
                  className="home-activity-card activity-card-slide"
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    border: isActive ? '2px solid var(--color-primary)' : undefined,
                  }}
                >
                  <span className="home-activity-label">{getCategoryLabel(cat, lang)}</span>
                </Link>
              );
            })}
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

        {viewAllLabel && (
          <div className="section-cta home-view-all">
            <Link href={`/${lang}/tours`} className="btn btn-secondary">
              {viewAllLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
