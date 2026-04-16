'use client';

import { useEffect, useState } from 'react';
import { getRelatedTours, type RelatedTourCard } from '@/app/actions/tours';
import { getTourImagePath, getTourImageFallback } from '@/lib/imagePaths';
import { HomeExperienceCard } from './HomeExperienceCard';

type Lang = 'en' | 'tr' | 'zh';

export function RelatedToursSection({
  tourId,
  lang,
  heading,
  fromLabel,
  bookLabel,
  askForPriceLabel,
}: {
  tourId: string;
  lang: Lang | string;
  heading: string;
  fromLabel: string;
  bookLabel: string;
  askForPriceLabel: string;
}) {
  const [items, setItems] = useState<RelatedTourCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRelatedTours(tourId, 4)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tourId]);

  if (!items || items.length === 0) return null;

  return (
    <section className="related-tours-section page-section" id="related-tours" aria-labelledby="related-tours-heading">
      <h2 id="related-tours-heading" className="related-tours-heading">
        {heading}
      </h2>
      <div className="related-tours-grid home-cards">
        {items.map((t) => {
          const title = lang === 'tr' ? t.titleTr : lang === 'zh' ? t.titleZh : t.titleEn;
          const imageSrc = t.imageUrl ?? getTourImagePath(t.type);
          const imageFallback = getTourImageFallback(t.type);
          return (
            <HomeExperienceCard
              key={t.id}
              lang={lang}
              title={title}
              desc=""
              fromLabel={fromLabel}
              price={t.basePrice}
              tourId={t.id}
              imageSrc={imageSrc}
              imageFallback={imageFallback}
              bookLabel={bookLabel}
              isAskForPrice={t.isAskForPrice}
              askForPriceLabel={askForPriceLabel}
            />
          );
        })}
      </div>
    </section>
  );
}
