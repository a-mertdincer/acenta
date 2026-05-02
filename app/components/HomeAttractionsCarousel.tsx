'use client';

import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_ACTIVITY_CARD_IMAGE } from '@/lib/activityCategoryImages';
import { useScrollDrivenCarousel } from '@/lib/useScrollDrivenCarousel';

export interface AttractionSlide {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  imageUrl: string | null;
}

interface HomeAttractionsCarouselProps {
  title: string;
  items: AttractionSlide[];
  imageFallback: string;
  lang: string;
}

const ATTR_NAV_MQ = '(max-width: 768px)';

function subscribeAttrNav(cb: () => void) {
  const mq = window.matchMedia(ATTR_NAV_MQ);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getAttrNavSnapshot() {
  return window.matchMedia(ATTR_NAV_MQ).matches;
}

/** SSR + first paint: desktop assumes duplicated strip (marquee). Client corrects after hydrate. */
function getAttrNavServerSnapshot() {
  return false;
}

export function HomeAttractionsCarousel({ title, items, imageFallback, lang }: HomeAttractionsCarouselProps) {
  const isNarrowViewport = useSyncExternalStore(
    subscribeAttrNav,
    getAttrNavSnapshot,
    getAttrNavServerSnapshot
  );

  const itemsKey = useMemo(() => `${items.map((i) => i.id).join('|')}::${items.length}`, [items]);

  const viewportRef = useScrollDrivenCarousel<HTMLDivElement>(itemsKey);

  const loopItems = useMemo(() => {
    if (items.length === 0) return [];
    return isNarrowViewport ? items : [...items, ...items];
  }, [items, isNarrowViewport]);

  if (items.length === 0) return null;

  return (
    <section className="home-attractions page-section" aria-labelledby="home-attr-heading">
      <div className="container">
        <h2 id="home-attr-heading" className="home-attr-title">
          {title}
        </h2>
        <div
          ref={viewportRef}
          className="home-attr-viewport"
          role="region"
          aria-roledescription="carousel"
        >
          <div className="home-attr-track">
            {loopItems.map((item, idx) => {
              const body = (
                <>
                  <div className="home-attr-img-wrap">
                    <img
                      src={item.imageUrl || imageFallback}
                      alt={item.name}
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
                </>
              );
              return item.slug ? (
                <Link
                  key={`${item.id}-${idx}`}
                  href={`/${lang}/attractions/${item.slug}`}
                  className="home-attr-card home-attr-card--link"
                >
                  {body}
                </Link>
              ) : (
                <article key={`${item.id}-${idx}`} className="home-attr-card">
                  {body}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
