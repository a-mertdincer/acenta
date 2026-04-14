'use client';

import { useState, useEffect } from 'react';

export interface WhyBookDict {
  title: string;
  flexible: string;
  flexibleDesc: string;
  support: string;
  noFees: string;
}

export interface TourCancellationLabels {
  viewPolicy: string;
  modalTitle: string;
  acknowledge: string;
}

interface TourBookingTrustExtrasProps {
  whatsappHref: string;
  whatsappLabel: string;
  whyBook: WhyBookDict;
  cancellationNote: string | null | undefined;
  policyLabels: TourCancellationLabels;
}

export function TourBookingTrustExtras({
  whatsappHref,
  whatsappLabel,
  whyBook,
  cancellationNote,
  policyLabels,
}: TourBookingTrustExtrasProps) {
  const [open, setOpen] = useState(false);
  const note = typeof cancellationNote === 'string' ? cancellationNote.trim() : '';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="tour-booking-extras">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn btn-secondary tour-booking-wa-btn">
        {whatsappLabel}
      </a>

      <section className="tour-why-book" aria-labelledby="tour-why-book-heading">
        <h4 id="tour-why-book-heading" className="tour-why-book-title">
          {whyBook.title}
        </h4>
        <ul className="tour-why-book-list">
          <li className="tour-why-book-li">
            <strong>✓ {whyBook.flexible}</strong>
            <p className="tour-why-book-desc">{whyBook.flexibleDesc}</p>
          </li>
          <li className="tour-why-book-li">✓ {whyBook.support}</li>
          <li className="tour-why-book-li">✓ {whyBook.noFees}</li>
        </ul>
      </section>

      {note ? (
        <button type="button" className="tour-cancellation-policy-link" onClick={() => setOpen(true)}>
          📋 {policyLabels.viewPolicy}
        </button>
      ) : null}

      {open && note ? (
        <div
          className="tour-cancellation-modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="tour-cancellation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-cancellation-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tour-cancellation-modal-header">
              <h2 id="tour-cancellation-modal-title" className="tour-cancellation-modal-title">
                {policyLabels.modalTitle}
              </h2>
              <button
                type="button"
                className="tour-cancellation-modal-close"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="tour-cancellation-modal-body">
              <p className="tour-cancellation-modal-text">{note}</p>
            </div>
            <div className="tour-cancellation-modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>
                {policyLabels.acknowledge}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
