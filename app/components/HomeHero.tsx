'use client';

import { useState } from 'react';

interface HomeHeroProps {
  title: string;
  subtitle: string;
  bookLabel: string;
  exploreLabel: string;
  lang: string;
  heroSrc: string;
  heroFallback: string;
}

export function HomeHero({ title, subtitle, bookLabel, exploreLabel, lang, heroSrc, heroFallback }: HomeHeroProps) {
  const [heroImgSrc, setHeroImgSrc] = useState(heroSrc);

  return (
    <section className="home-hero">
      <div
        className="home-hero-bg"
        style={{
          backgroundImage: `url('${heroImgSrc}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <img
          src={heroSrc}
          alt=""
          aria-hidden
          onError={() => setHeroImgSrc(heroFallback)}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
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
      </div>
    </section>
  );
}
