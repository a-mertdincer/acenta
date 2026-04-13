'use client';

import { useState } from 'react';

/** Thumbnail grid + main image; click main for lightbox overlay. */
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const sources = thumbs.length >= 1 ? thumbs : [mainSrc];
  const thumbSources = sources.slice(0, 4);

  return (
    <>
      <div className="tour-detail-gallery">
        <div className="tour-detail-gallery-thumbs">
          {thumbSources.map((src, i) => (
            <button
              key={src + String(i)}
              type="button"
              onClick={() => setMainSrcState(src)}
              className="tour-detail-gallery-thumb-btn"
            >
              <img
                src={src}
                alt=""
                className="tour-detail-gallery-thumb-img"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackSrc;
                }}
              />
            </button>
          ))}
        </div>
        <div className="tour-detail-gallery-main">
          <button
            type="button"
            className="tour-detail-gallery-main-btn"
            onClick={() => setLightboxSrc(mainSrcState)}
            aria-label="Open image full size"
          >
            <img
              src={mainSrcState}
              alt=""
              className="tour-detail-gallery-main-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallbackSrc;
                setMainSrcState(fallbackSrc);
              }}
            />
          </button>
        </div>
      </div>
      {lightboxSrc ? (
        <div
          className="tour-gallery-lightbox"
          role="presentation"
          onClick={() => setLightboxSrc(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxSrc(null);
          }}
        >
          <button type="button" className="tour-gallery-lightbox-close" onClick={() => setLightboxSrc(null)} aria-label="Close">
            ×
          </button>
          <img
            src={lightboxSrc}
            alt=""
            className="tour-gallery-lightbox-img"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }}
          />
        </div>
      ) : null}
    </>
  );
}
