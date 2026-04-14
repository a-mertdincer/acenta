'use client';

import { useMemo } from 'react';
import { DEFAULT_ACTIVITY_CARD_IMAGE } from '@/lib/activityCategoryImages';

export interface AttractionSlide {
  id: string;
  name: string;
  description?: string;
  imageUrl: string | null;
}

interface HomeAttractionsCarouselProps {
  title: string;
  items: AttractionSlide[];
  imageFallback: string;
}

export function HomeAttractionsCarousel({ title, items, imageFallback }: HomeAttractionsCarouselProps) {
  const loopItems = useMemo(() => {
    if (items.length === 0) return [];
    return [...items, ...items];
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className="home-attractions page-section" aria-labelledby="home-attr-heading">
      <div className="container">
        <h2 id="home-attr-heading" className="home-attr-title">
          {title}
        </h2>
        <div className="home-attr-viewport" role="region" aria-roledescription="carousel">
          <div className="home-attr-track">
            {loopItems.map((item, idx) => (
              <article key={`${item.id}-${idx}`} className="home-attr-card">
                <div className="home-attr-img-wrap">
                  <img
                    src={item.imageUrl || imageFallback}
                    alt=""
                    className="home-attr-img"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const el = e.currentTarget;
                      const placeholder = DEFAULT_ACTIVITY_CARD_IMAGE;
                      const n = Number(el.dataset.imgErr ?? '0') + 1;
                      el.dataset.imgErr = String(n);
                      if (n === 1) {
                        el.src = imageFallback;
                        return;
                      }
                      if (n === 2) {
                        el.src = placeholder;
                      }
                    }}
                  />
                </div>
                <div className="home-attr-card-body">
                  <h3 className="home-attr-card-title">{item.name}</h3>
                  {item.description ? <p className="home-attr-card-desc">{item.description}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
