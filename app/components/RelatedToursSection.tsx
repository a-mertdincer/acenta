'use client';

import { useEffect, useState } from 'react';
import { getRelatedTours, type RelatedTourCard } from '@/app/actions/tours';
import { getTourImagePath, getTourImageFallback } from '@/lib/imagePaths';
import { HomeExperienceCard } from './HomeExperienceCard';
import { pickTourField } from '@/lib/pickContentLang';

export function RelatedToursSection({
  tourId,
  lang,
  heading,
  fromLabel,
  bookLabel,
  askForPriceLabel,
}: {
  tourId: string;
  lang: string;
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
        {items.map((card) => {
          const title = pickTourField(card as unknown as Record<string, unknown>, 'title', lang) ?? card.titleEn;
          const imageSrc = card.imageUrl ?? getTourImagePath(card.type);
          const imageFallback = getTourImageFallback(card.type);
          return (
            <HomeExperienceCard
              key={card.id}
              lang={lang}
              title={title}
              desc=""
              fromLabel={fromLabel}
              price={card.basePrice}
              tourId={card.slug ?? card.id}
              imageSrc={imageSrc}
              imageFallback={imageFallback}
              bookLabel={bookLabel}
              isAskForPrice={card.isAskForPrice}
              askForPriceLabel={askForPriceLabel}
            />
          );
        })}
      </div>
    </section>
  );
}
