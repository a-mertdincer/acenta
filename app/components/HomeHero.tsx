'use client';

import { useState } from 'react';

interface HomeHeroProps {
  title: string;
  subtitle: string;
  bookLabel: string;
  exploreLabel: string;
  scrollLabel?: string;
  lang: string;
  heroSrc: string;
  heroFallback: string;
}

export function HomeHero({ title, subtitle, bookLabel, exploreLabel, scrollLabel, lang, heroSrc, heroFallback }: HomeHeroProps) {
  const [heroImgSrc, setHeroImgSrc] = useState(heroSrc);

  return (
    <section className="home-hero">
      <div className="home-hero-bg">
        <img
          src={heroImgSrc}
          alt="Cappadocia panorama at sunrise"
          onError={() => setHeroImgSrc(heroFallback)}
          className="home-hero-bg-image"
        />
        <div className="home-hero-overlay" />
      </div>
      <div className="home-hero-content">
        <h1 className="home-hero-title">{title}</h1>
        <p className="home-hero-subtitle">{subtitle}</p>
        <div className="home-hero-ctas">
          <a href={`/${lang}/tours`} className="btn btn-primary">
            {bookLabel}
          </a>
          <a href={`/${lang}/tours`} className="btn btn-secondary">
            {exploreLabel}
          </a>
        </div>
        <a href="#welcome" className="home-hero-scroll" aria-label={scrollLabel ?? 'Scroll to explore'}>
          <span className="home-hero-scroll-text">{scrollLabel ?? 'Scroll to explore'}</span>
          <span className="home-hero-scroll-chevron" aria-hidden>▼</span>
        </a>
      </div>
    </section>
  );
}
