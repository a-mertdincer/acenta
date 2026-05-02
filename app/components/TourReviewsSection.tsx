'use client';

import { useEffect, useState } from 'react';
import { getApprovedReviewsPage } from '@/app/actions/reviews';

const PAGE = 5;

type RevRow = {
  id: string;
  displayName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

function reviewMonthLocale(lang: string): string {
  const l = lang.toLowerCase();
  if (l === 'tr') return 'tr-TR';
  if (l === 'zh') return 'zh-CN';
  if (l === 'ja') return 'ja-JP';
  if (l === 'ko') return 'ko-KR';
  if (l === 'de') return 'de-DE';
  if (l === 'fr') return 'fr-FR';
  if (l === 'es') return 'es-ES';
  if (l === 'it') return 'it-IT';
  if (l === 'nl') return 'nl-NL';
  if (l === 'pl') return 'pl-PL';
  if (l === 'ro') return 'ro-RO';
  if (l === 'ru') return 'ru-RU';
  return 'en-US';
}

export function TourReviewsSection({
  tourId,
  lang,
  reviewsLabels,
}: {
  tourId: string;
  lang: string;
  reviewsLabels: Record<string, string>;
}) {
  const dict = reviewsLabels;
  const [total, setTotal] = useState(0);
  const [reviews, setReviews] = useState<RevRow[]>([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    void (async () => {
      setLoading(true);
      const res = await getApprovedReviewsPage(tourId, 0, PAGE);
      if (c) return;
      if (res.ok) {
        setReviews(res.reviews);
        setTotal(res.total);
        setSkip(res.reviews.length);
      }
      setLoading(false);
    })();
    return () => {
      c = true;
    };
  }, [tourId]);

  const loadMore = async () => {
    const res = await getApprovedReviewsPage(tourId, skip, PAGE);
    if (!res.ok) return;
    setReviews((prev) => [...prev, ...res.reviews]);
    setSkip((s) => s + res.reviews.length);
  };

  const monthLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(reviewMonthLocale(lang), {
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <section className="tour-structured-section tour-reviews-section" id="reviews">
        <p className="tour-reviews-loading">…</p>
      </section>
    );
  }

  if (total === 0) {
    return (
      <section className="tour-structured-section tour-reviews-section" id="reviews">
        <h3>{dict.title ?? 'Reviews'} (0)</h3>
        <p className="tour-reviews-empty">{dict.noReviews ?? ''}</p>
      </section>
    );
  }

  return (
    <section className="tour-structured-section tour-reviews-section" id="reviews">
      <h3>
        {dict.title ?? 'Reviews'} ({total})
      </h3>
      <ul className="tour-reviews-list">
        {reviews.map((rev) => (
          <li key={rev.id} className="tour-review-card">
            <div className="tour-review-meta">
              <span className="tour-review-stars" aria-hidden>
                {'★'.repeat(rev.rating)}
                {'☆'.repeat(5 - rev.rating)}
              </span>
              <span className="tour-review-name">{rev.displayName}</span>
              <span className="tour-review-date">— {monthLabel(rev.createdAt)}</span>
            </div>
            <blockquote className="tour-review-quote">&ldquo;{rev.comment}&rdquo;</blockquote>
          </li>
        ))}
      </ul>
      {skip < total ? (
        <button type="button" className="btn btn-secondary tour-reviews-more" onClick={() => void loadMore()}>
          {dict.showMore ?? 'Show more'}
        </button>
      ) : null}
    </section>
  );
}
