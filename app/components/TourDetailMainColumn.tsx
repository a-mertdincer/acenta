'use client';

import { TourDetailGallery } from './TourDetailGallery';
import { ProductDescription } from './ProductDescription';

export type FaqItem = { question: string; answer: string };

type TourDetailMainColumnProps = {
  desc: string;
  descriptionSectionTitle: string;
  itineraryLabel: string;
  highlightsTitle: string;
  knowBeforeTitle: string;
  notSuitableTitle: string;
  notAllowedTitle: string;
  whatsIncludedTitle: string;
  notIncludedTitle: string;
  itineraryItems: string[];
  highlightsItems: string[];
  knowBeforeItems: string[];
  notSuitableItems: string[];
  notAllowedItems: string[];
  whatsIncludedItems: string[];
  notIncludedItems: string[];
  faqs: FaqItem[];
  galleryMainSrc: string;
  galleryFallback: string;
  thumbUrls: string[];
  openFaqIndex: number | null;
  onToggleFaq: (index: number) => void;
};

export function TourDetailMainColumn({
  desc,
  descriptionSectionTitle,
  itineraryLabel,
  highlightsTitle,
  knowBeforeTitle,
  notSuitableTitle,
  notAllowedTitle,
  whatsIncludedTitle,
  notIncludedTitle,
  itineraryItems,
  highlightsItems,
  knowBeforeItems,
  notSuitableItems,
  notAllowedItems,
  whatsIncludedItems,
  notIncludedItems,
  faqs,
  galleryMainSrc,
  galleryFallback,
  thumbUrls,
  openFaqIndex,
  onToggleFaq,
}: TourDetailMainColumnProps) {
  const hasHighlights = highlightsItems.length > 0;
  const hasDesc = Boolean(desc?.trim());

  return (
    <>
      <section className="tour-detail-gallery-section" id="gallery">
        <TourDetailGallery
          mainSrc={galleryMainSrc}
          fallbackSrc={galleryFallback}
          thumbs={thumbUrls.length > 0 ? thumbUrls : [galleryMainSrc]}
        />
      </section>

      {hasDesc ? (
        <div className="tour-detail-desc-block" id="description">
          <h2>{descriptionSectionTitle}</h2>
          <ProductDescription text={desc} />
        </div>
      ) : null}

      {itineraryItems.length > 0 ? (
        <section className="tour-structured-section" id="itinerary">
          <h3>{itineraryLabel}</h3>
          <ul>
            {itineraryItems.map((item, idx) => (
              <li key={`it-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {hasHighlights ? (
        <section className="tour-structured-section" id="highlights">
          <h3>{highlightsTitle}</h3>
          <ul>
            {highlightsItems.map((item, idx) => (
              <li key={`hl-${idx}`}>
                <span className="tour-highlight-check" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {knowBeforeItems.length > 0 ? (
        <section className="tour-structured-section" id="know-before">
          <h3>{knowBeforeTitle}</h3>
          <ul>
            {knowBeforeItems.map((item, idx) => (
              <li key={`kb-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {notSuitableItems.length > 0 ? (
        <section className="tour-structured-section" id="not-suitable">
          <h3>{notSuitableTitle}</h3>
          <ul>
            {notSuitableItems.map((item, idx) => (
              <li key={`ns-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {notAllowedItems.length > 0 ? (
        <section className="tour-structured-section" id="not-allowed">
          <h3>{notAllowedTitle}</h3>
          <ul>
            {notAllowedItems.map((item, idx) => (
              <li key={`na-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {whatsIncludedItems.length > 0 ? (
        <section className="tour-structured-section" id="whats-included">
          <h3>{whatsIncludedTitle}</h3>
          <ul>
            {whatsIncludedItems.map((item, idx) => (
              <li key={`wi-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {notIncludedItems.length > 0 ? (
        <section className="tour-structured-section" id="not-included">
          <h3>{notIncludedTitle}</h3>
          <ul>
            {notIncludedItems.map((item, idx) => (
              <li key={`ni-${idx}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {faqs.length > 0 ? (
        <section className="tour-structured-section" id="faqs">
          <h3>FAQs</h3>
          <div className="tour-faq-list">
            {faqs.map((faq, idx) => (
              <button
                key={`faq-${idx}`}
                type="button"
                className="tour-faq-item"
                onClick={() => onToggleFaq(idx)}
              >
                <strong>{faq.question}</strong>
                {openFaqIndex === idx ? <p>{faq.answer}</p> : null}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
