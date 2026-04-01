'use client';

import { useState } from 'react';

interface TourCardImageProps {
  src: string;
  fallback: string;
  alt: string;
  className?: string;
}

export function TourCardImage({ src, fallback, alt, className }: TourCardImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  return (
    <div className={className ?? 'tour-card-image'}>
      <img
        src={currentSrc}
        alt={alt}
        onError={() => setCurrentSrc(fallback)}
        className="tour-card-image-img"
      />
    </div>
  );
}
