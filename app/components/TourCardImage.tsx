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
    <div className={className ?? 'tour-card-image'} style={{ position: 'relative', overflow: 'hidden', height: '220px', flexShrink: 0 }}>
      <img
        src={currentSrc}
        alt={alt}
        onError={() => setCurrentSrc(fallback)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
}
