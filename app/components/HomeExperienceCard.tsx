'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TourTagBadges } from './TourTagBadges';

interface HomeExperienceCardProps {
  lang: string;
  title: string;
  desc: string;
  fromLabel: string;
  price: number;
  tourId: string;
  imageSrc: string;
  imageFallback: string;
  bookLabel?: string;
  categoryBadge?: string;
  isAskForPrice?: boolean;
  askForPriceLabel?: string;
  originalPrice?: number;
  discountedPrice?: number | null;
  percentLabel?: number | null;
  discountAmount?: number;
  salesTags?: string[] | null;
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function HomeExperienceCard({
  lang,
  title,
  desc,
  fromLabel,
  price,
  tourId,
  imageSrc,
  imageFallback,
  bookLabel = 'View',
  categoryBadge,
  isAskForPrice = false,
  askForPriceLabel = 'Ask for Price',
  originalPrice,
  discountedPrice = null,
  percentLabel = null,
  discountAmount = 0,
  salesTags = null,
}: HomeExperienceCardProps) {
  const [imgSrc, setImgSrc] = useState(imageSrc);
  const hasDiscount = !isAskForPrice && discountedPrice != null && discountAmount > 0;
  const shownOriginal = originalPrice ?? price;

  return (
    <div className="card card-hover home-experience-card">
      <Link href={`/${lang}/tour/${tourId}`} className="card-image-link">
        <div className="card-image-wrap">
          <img
            src={imgSrc}
            alt={`${title} experience`}
            onError={() => setImgSrc(imageFallback)}
            className="card-image-fill"
          />
          {isAskForPrice ? (
            <span className="card-price-badge">{askForPriceLabel}</span>
          ) : hasDiscount ? (
            <span className="card-promo-badge">
              {percentLabel != null ? `-${percentLabel}%` : `Save €${formatAmount(discountAmount)}`}
            </span>
          ) : null}
        </div>
      </Link>
      <div className="card-body">
        <div className="home-experience-card-category-row">
          {categoryBadge ? <span className="tour-type-badge">{categoryBadge}</span> : null}
        </div>
        <div className="home-experience-card-tags-row">
          {salesTags && salesTags.length > 0 ? (
            <TourTagBadges tagSlugs={salesTags} lang={lang} variant="card" max={2} />
          ) : null}
        </div>
        <h3 className="home-experience-card-title">{title}</h3>
        <p className="card-desc home-experience-card-desc">{desc}</p>
        <div className="card-footer">
          <span className="card-price">
            {isAskForPrice ? (
              askForPriceLabel
            ) : hasDiscount ? (
              <>
                <span className="card-price-old">€{formatAmount(shownOriginal)}</span>{' '}
                <span className="card-price-new">
                  {fromLabel} €{formatAmount(discountedPrice!)}
                </span>
              </>
            ) : (
              <>
                {fromLabel} €{formatAmount(price)}
              </>
            )}
          </span>
          <Link href={`/${lang}/tour/${tourId}`} className="btn btn-primary btn-sm">
            {bookLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
