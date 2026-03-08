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
    <div className="tour-detail-gallery" style={{ display: 'flex', gap: '12px', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {thumbSources.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setMainSrcState(src)}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '8px',
              overflow: 'hidden',
              padding: 0,
              border: '2px solid transparent',
              cursor: 'pointer',
              backgroundColor: 'var(--color-bg-alt)',
            }}
          >
            <img
              src={src}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).src = fallbackSrc; }}
            />
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: '320px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--color-bg-alt)' }}>
        <img
          src={mainSrcState}
          alt="Tour"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackSrc; setMainSrcState(fallbackSrc); }}
        />
      </div>
    </div>
  );
}
