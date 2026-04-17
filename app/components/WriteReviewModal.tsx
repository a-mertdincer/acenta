'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { submitReview } from '@/app/actions/reviews';

type ReviewLabels = {
  title: string;
  yourReview: string;
  submit: string;
  thankYou: string;
  alreadyReviewed: string;
  rating: string;
};

export function WriteReviewModal(props: {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  tourTitle: string;
  closeLabel: string;
  labels: ReviewLabels;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset local form state every time the modal opens (new reservation or reopen).
  useEffect(() => {
    if (!props.open) return;
    setRating(5);
    setComment('');
    setDone(false);
    setErr(null);
  }, [props.open, props.reservationId]);

  useEffect(() => {
    if (!props.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onEsc);
    };
  }, [props.open, props.onClose]);

  if (!props.open || !mounted || !props.reservationId) return null;

  const send = () => {
    setErr(null);
    startTransition(async () => {
      const res = await submitReview({ reservationId: props.reservationId, rating, comment });
      if (res.ok) {
        setDone(true);
        setTimeout(() => {
          setDone(false);
          props.onClose();
          router.refresh();
        }, 1600);
        return;
      }
      if (res.error === 'alreadyReviewed') setErr(props.labels.alreadyReviewed);
      else setErr(res.error ?? 'Error');
    });
  };

  return createPortal(
    <div className="write-review-modal-root" role="presentation">
      <button type="button" className="write-review-modal-backdrop" aria-label="Close" onClick={props.onClose} />
      <div className="write-review-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="write-review-title">
        <h3 id="write-review-title" className="write-review-modal-heading">
          {props.labels.title}
        </h3>
        <p className="write-review-modal-tour">{props.tourTitle}</p>
        {done ? (
          <p className="write-review-modal-thanks">{props.labels.thankYou}</p>
        ) : (
          <>
            <p className="write-review-modal-label">{props.labels.rating}</p>
            <div className="write-review-stars-input" role="group" aria-label={props.labels.rating}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`write-review-star-btn ${n <= rating ? 'is-on' : ''}`}
                  onClick={() => setRating(n)}
                  aria-pressed={n <= rating}
                >
                  ★
                </button>
              ))}
            </div>
            <label className="write-review-field">
              <span>{props.labels.yourReview}</span>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={4000}
                className="write-review-textarea"
              />
            </label>
            {err ? <p className="write-review-error">{err}</p> : null}
            <div className="write-review-actions">
              <button type="button" className="btn btn-secondary" onClick={props.onClose}>
                {props.closeLabel}
              </button>
              <button type="button" className="btn btn-primary" disabled={pending || comment.trim().length < 2} onClick={send}>
                {pending ? '…' : props.labels.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
