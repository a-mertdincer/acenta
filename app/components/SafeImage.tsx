'use client';

import { useState } from 'react';

interface SafeImageProps {
  src: string;
  fallback: string;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
}

/**
 * Renders an image that falls back to fallback URL if src fails (e.g. local file not yet added).
 */
export function SafeImage({ src, fallback, alt, className, fill, sizes }: SafeImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleError = () => setCurrentSrc(fallback);

  if (fill) {
    return (
      <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={currentSrc}
          alt={alt}
          sizes={sizes}
          onError={handleError}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <img src={currentSrc} alt={alt} className={className} onError={handleError} sizes={sizes} />
  );
}
