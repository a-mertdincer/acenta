'use client';

import Link from 'next/link';
import { useState } from 'react';

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
}: HomeExperienceCardProps) {
  const [imgSrc, setImgSrc] = useState(imageSrc);

  return (
    <div className="card card-hover">
      <Link href={`/${lang}/tour/${tourId}`} className="card-image-link">
        <div className="card-image-wrap">
          <img
            src={imgSrc}
            alt={`${title} experience`}
            onError={() => setImgSrc(imageFallback)}
            className="card-image-fill"
          />
          <span className="card-price-badge">{fromLabel} €{price}</span>
        </div>
      </Link>
      <div className="card-body">
        {categoryBadge ? <span className="tour-type-badge">{categoryBadge}</span> : null}
        <h3>{title}</h3>
        <p className="card-desc">{desc}</p>
        <div className="card-footer">
          <span className="card-price">{fromLabel} €{price}</span>
          <Link href={`/${lang}/tour/${tourId}`} className="btn btn-primary btn-sm">
            {bookLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
