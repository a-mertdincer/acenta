import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttractionBySlug } from '@/app/actions/attractions';
import { formatPriceByLang } from '@/lib/currency';
import { getDictionary } from '@/app/dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';
import { getEurTryRate } from '@/lib/exchangeRate';
import { TourCardImageWithFallback } from '@/app/components/TourCardImageWithFallback';

export default async function AttractionDetailPage(props: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await props.params;
  const locale = (lang || 'en') as SiteLocale;
  const dict = await getDictionary(locale);
  const row = await getAttractionBySlug(slug);
  if (!row) notFound();

  const rateData = locale === 'tr' ? await getEurTryRate() : null;
  const fromLabel = dict.home?.from ?? 'From';
  const bookLabel = dict.tours?.bookNow ?? 'Book Now';

  const title = locale === 'tr' ? row.nameTr : locale === 'zh' ? (row.nameZh ?? row.nameEn) : row.nameEn;
  const description = locale === 'tr' ? row.descriptionTr : locale === 'zh' ? row.descriptionZh : row.descriptionEn;

  return (
    <div className="container page-section">
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <Link href={`/${lang}/attractions`} className="site-footer-link">
          ← {dict.navigation?.attractions ?? (locale === 'zh' ? '返回景点' : 'Attractions')}
        </Link>
      </div>
      <h1>{title}</h1>
      {description ? <div className="tours-page-subtitle attraction-description">{description}</div> : null}
      <div className="tours-grid">
        {row.tours.map((tour) => {
          const tourTitle = locale === 'tr' ? tour.titleTr : locale === 'zh' ? tour.titleZh : tour.titleEn;
          const tourDesc = locale === 'tr' ? tour.descTr : locale === 'zh' ? tour.descZh : tour.descEn;
          const shownPrice = formatPriceByLang(tour.basePrice, locale, rateData?.rate ?? null);
          return (
            <article key={tour.id} className="tour-card tour-card-clickable">
              <Link href={`/${lang}/tour/${tour.id}`} className="tour-card-link-area" aria-label={tourTitle}>
                <div className="tour-card-image">
                  <TourCardImageWithFallback
                    primaryUrl={tour.primaryImage}
                    tourType={tour.type}
                    alt={tourTitle}
                    className="tour-card-image-img"
                  />
                </div>
                <div className="tour-card-body">
                  <div className="tour-card-header">
                    <h2 className="tour-card-title">{tourTitle}</h2>
                    <span className="tour-type-badge">{tour.category ?? tour.type}</span>
                  </div>
                  <p className="tour-card-desc">{tourDesc}</p>
                  <div className="tour-card-footer">
                    <span className="tour-card-price">
                      {fromLabel} {shownPrice.primary}
                    </span>
                    <span className="btn btn-primary tour-card-cta">{bookLabel}</span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
