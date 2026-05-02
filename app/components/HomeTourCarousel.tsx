'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HomeExperienceCard } from './HomeExperienceCard';

export type HomeCarouselTourItem = {
  id: string;
  slug: string | null;
  title: string;
  desc: string;
  categoryBadge: string;
  imageSrc: string;
  imageFallback: string;
  price: number;
  isAskForPrice: boolean;
  originalPrice: number;
  discountedPrice: number | null;
  percentLabel: number | null;
  discountAmount: number;
  salesTags: string[];
};

type HomeTourCarouselProps = {
  lang: string;
  items: HomeCarouselTourItem[];
  fromLabel: string;
  bookLabel: string;
  askForPriceLabel: string;
  prevAriaLabel: string;
  nextAriaLabel: string;
};

function useItemsPerPage(): number {
  const [n, setN] = useState(4);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const sync = () => setN(mq.matches ? 2 : 4);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return n;
}

export function HomeTourCarousel({
  lang,
  items,
  fromLabel,
  bookLabel,
  askForPriceLabel,
  prevAriaLabel,
  nextAriaLabel,
}: HomeTourCarouselProps) {
  const itemsPerPage = useItemsPerPage();
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(0, p), totalPages - 1));
  }, [totalPages, items.length, itemsPerPage]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const pageSlices = useMemo(() => {
    const out: HomeCarouselTourItem[][] = [];
    for (let i = 0; i < totalPages; i += 1) {
      out.push(items.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
    }
    return out;
  }, [items, itemsPerPage, totalPages]);

  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(totalPages - 1, p + 1)), [totalPages]);

  if (items.length === 0) return null;

  const showControls = totalPages > 1;

  return (
    <div className="home-tour-carousel">
      <div className="home-tour-carousel__chrome">
        {showControls ? (
          canPrev ? (
            <button
              type="button"
              className="home-tour-carousel__arrow home-tour-carousel__arrow--prev"
              onClick={goPrev}
              aria-label={prevAriaLabel}
            >
              <ChevronLeft size={26} aria-hidden />
            </button>
          ) : (
            <span className="home-tour-carousel__arrow-placeholder" aria-hidden />
          )
        ) : null}

        <div className="home-tour-carousel__viewport">
          <div
            className="home-tour-carousel__pages"
            style={{
              width: `${totalPages * 100}%`,
              transform: `translateX(-${(page * 100) / totalPages}%)`,
            }}
          >
            {pageSlices.map((slice, pi) => (
              <div
                key={pi}
                className="home-tour-carousel__page"
                style={{ flex: `0 0 ${100 / totalPages}%`, maxWidth: `${100 / totalPages}%` }}
              >
                <div className="home-tour-carousel__grid">
                  {slice.map((tour) => (
                    <HomeExperienceCard
                      key={tour.id}
                      lang={lang}
                      title={tour.title}
                      desc={tour.desc}
                      fromLabel={fromLabel}
                      price={tour.price}
                      tourId={tour.slug ?? tour.id}
                      imageSrc={tour.imageSrc}
                      imageFallback={tour.imageFallback}
                      bookLabel={bookLabel}
                      categoryBadge={tour.categoryBadge}
                      isAskForPrice={tour.isAskForPrice}
                      askForPriceLabel={askForPriceLabel}
                      originalPrice={tour.originalPrice}
                      discountedPrice={tour.discountedPrice}
                      percentLabel={tour.percentLabel}
                      discountAmount={tour.discountAmount}
                      salesTags={tour.salesTags}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showControls ? (
          canNext ? (
            <button
              type="button"
              className="home-tour-carousel__arrow home-tour-carousel__arrow--next"
              onClick={goNext}
              aria-label={nextAriaLabel}
            >
              <ChevronRight size={26} aria-hidden />
            </button>
          ) : (
            <span className="home-tour-carousel__arrow-placeholder" aria-hidden />
          )
        ) : null}
      </div>

      {showControls ? (
        <div className="home-tour-carousel__dots" role="tablist" aria-label="Carousel">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === page}
              aria-label={`${i + 1} / ${totalPages}`}
              className={`home-tour-carousel__dot ${i === page ? 'is-active' : ''}`}
              onClick={() => setPage(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
