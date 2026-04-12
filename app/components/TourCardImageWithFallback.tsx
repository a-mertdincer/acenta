'use client';

import { getTourImageFallback, getTourImagePath } from '@/lib/imagePaths';

export function TourCardImageWithFallback({
  primaryUrl,
  tourType,
  alt,
  className,
}: {
  primaryUrl: string | null;
  tourType: string;
  alt: string;
  className?: string;
}) {
  const initial = primaryUrl?.trim() || getTourImagePath(tourType);
  return (
    <img
      src={initial}
      onError={(e) => {
        e.currentTarget.src = getTourImageFallback(tourType);
      }}
      alt={alt}
      className={className}
    />
  );
}
