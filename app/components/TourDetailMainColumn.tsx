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
  itineraryItems: string[];
  highlightsItems: string[];
  knowBeforeItems: string[];
  notSuitableItems: string[];
  notAllowedItems: string[];
  whatsIncludedItems: string[];
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
  itineraryItems,
  highlightsItems,
  knowBeforeItems,
  notSuitableItems,
  notAllowedItems,
  whatsIncludedItems,
  faqs,
  galleryMainSrc,
  galleryFallback,
  thumbUrls,
  openFaqIndex,
  onToggleFaq,
}: TourDetailMainColumnProps) {
  const hasHighlights = highlightsItems.length > 0;
  const itineraryIdOnDescription = itineraryItems.length === 0;

  return (
    <>
      <section className="tour-detail-gallery-section tour-detail-gallery-section--lead" id="gallery">
        <TourDetailGallery
          mainSrc={galleryMainSrc}
          fallbackSrc={galleryFallback}
          thumbs={thumbUrls.length > 0 ? thumbUrls : [galleryMainSrc]}
        />
      </section>

      <div
        className="tour-detail-desc-block"
        id={itineraryIdOnDescription ? 'itinerary' : undefined}
      >
        <h2>{descriptionSectionTitle}</h2>
        <ProductDescription text={desc} />
      </div>

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
