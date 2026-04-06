import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttractionBySlug } from '@/app/actions/attractions';
import { getTourImageFallback, getTourImagePath } from '@/lib/imagePaths';
import { formatPriceByLang } from '@/lib/currency';
import type { SiteLocale } from '@/lib/i18n';

export default async function AttractionDetailPage(props: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await props.params;
  const locale = (lang || 'en') as SiteLocale;
  const row = await getAttractionBySlug(slug);
  if (!row) notFound();

  const title = locale === 'tr' ? row.nameTr : locale === 'zh' ? (row.nameZh ?? row.nameEn) : row.nameEn;
  const description = locale === 'tr' ? row.descriptionTr : locale === 'zh' ? row.descriptionZh : row.descriptionEn;

  return (
    <div className="container page-section">
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <Link href={`/${lang}/attractions`} className="site-footer-link">
          ← {locale === 'tr' ? 'Gezi Noktalari' : locale === 'zh' ? '返回景点' : 'Attractions'}
        </Link>
      </div>
      <h1>{title}</h1>
      {description ? <p className="tours-page-subtitle">{description}</p> : null}
      <div className="tours-grid">
        {row.tours.map((tour) => {
          const tourTitle = locale === 'tr' ? tour.titleTr : locale === 'zh' ? tour.titleZh : tour.titleEn;
          const tourDesc = locale === 'tr' ? tour.descTr : locale === 'zh' ? tour.descZh : tour.descEn;
          const shownPrice = formatPriceByLang(tour.basePrice, locale === 'tr' || locale === 'zh' ? locale : 'en', null);
          return (
            <article key={tour.id} className="tour-card tour-card-clickable">
              <Link href={`/${lang}/tour/${tour.id}`} className="tour-card-link-area" aria-label={tourTitle}>
                <div className="tour-card-image">
                  <img src={getTourImagePath(tour.type)} onError={(e) => { e.currentTarget.src = getTourImageFallback(tour.type); }} alt={tourTitle} className="tour-card-image-img" />
                </div>
                <div className="tour-card-body">
                  <div className="tour-card-header">
                    <h2 className="tour-card-title">{tourTitle}</h2>
                    <span className="tour-type-badge">{tour.category ?? tour.type}</span>
                  </div>
                  <p className="tour-card-desc">{tourDesc}</p>
                  <div className="tour-card-footer">
                    <span className="tour-card-price">{locale === 'tr' ? 'Baslayan fiyatla' : locale === 'zh' ? '起价' : 'From'} {shownPrice.primary}</span>
                    <span className="btn btn-primary tour-card-cta">{locale === 'tr' ? 'Rezervasyon' : locale === 'zh' ? '预订' : 'Book Now'}</span>
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
