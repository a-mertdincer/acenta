'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

interface HomeHeroProps {
  title: string;
  subtitle: string;
  lang: string;
  heroSrc: string;
  heroFallback: string;
  checkInLabel: string;
  checkOutLabel: string;
  guestsLabel: string;
  activitiesLabel: string;
  searchLabel: string;
  allActivitiesLabel: string;
  activityOptions: Array<{ value: string; label: string }>;
}

export function HomeHero({
  title,
  subtitle,
  lang,
  heroSrc,
  heroFallback,
  checkInLabel,
  checkOutLabel,
  guestsLabel,
  activitiesLabel,
  searchLabel,
  allActivitiesLabel,
  activityOptions,
}: HomeHeroProps) {
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
        <form action={`/${lang}/tours`} method="get" className="home-hero-search" aria-label={searchLabel}>
          <label className="home-hero-search-field">
            <span>{checkInLabel}</span>
            <input type="date" name="checkIn" className="home-hero-search-input" />
          </label>
          <label className="home-hero-search-field">
            <span>{checkOutLabel}</span>
            <input type="date" name="checkOut" className="home-hero-search-input" />
          </label>
          <label className="home-hero-search-field">
            <span>{guestsLabel}</span>
            <select name="guests" className="home-hero-search-input">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="home-hero-search-field">
            <span>{activitiesLabel}</span>
            <select name="category" className="home-hero-search-input">
              <option value="">{allActivitiesLabel}</option>
              {activityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="home-hero-search-btn" aria-label={searchLabel}>
            <Search size={18} aria-hidden />
          </button>
        </form>
      </div>
    </section>
  );
}
