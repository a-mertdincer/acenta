'use client';

import { useState } from 'react';

/** Kelebek-style: left thumbnails + main image. Images can be one or many (same image repeated if single). */
export function TourDetailGallery({
  mainSrc,
  fallbackSrc,
  thumbs = [],
}: {
  mainSrc: string;
  fallbackSrc: string;
  thumbs?: string[];
}) {
  const [mainSrcState, setMainSrcState] = useState(mainSrc);
  const sources = thumbs.length >= 1 ? thumbs : [mainSrc];
  const thumbSources = sources.slice(0, 4);

  return (
    <div className="tour-detail-gallery">
      <div className="tour-detail-gallery-thumbs">
        {thumbSources.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setMainSrcState(src)}
            className="tour-detail-gallery-thumb-btn"
          >
            <img
              src={src}
              alt={`Tour gallery thumbnail ${i + 1}`}
              className="tour-detail-gallery-thumb-img"
              onError={(e) => { (e.target as HTMLImageElement).src = fallbackSrc; }}
            />
          </button>
        ))}
      </div>
      <div className="tour-detail-gallery-main">
        <img
          src={mainSrcState}
          alt="Tour"
          className="tour-detail-gallery-main-img"
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackSrc; setMainSrcState(fallbackSrc); }}
        />
      </div>
    </div>
  );
}
