import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAttractionBySlug } from '@/app/actions/attractions';
import { formatPriceByLang } from '@/lib/currency';
import { getDictionary } from '@/app/dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';
import { getEurTryRate } from '@/lib/exchangeRate';
import { TourCardImageWithFallback } from '@/app/components/TourCardImageWithFallback';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

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

  const attractionsLabel = dict.navigation?.attractions ?? (locale === 'zh' ? '景点' : locale === 'tr' ? 'Gezi Noktaları' : 'Attractions');
  const homeLabel = dict.navigation?.home ?? (locale === 'zh' ? '首页' : locale === 'tr' ? 'Ana Sayfa' : 'Home');

  return (
    <div className="container page-section">
      <Breadcrumbs
        items={[
          { label: homeLabel, href: `/${lang}` },
          { label: attractionsLabel, href: `/${lang}/attractions` },
          { label: title },
        ]}
      />
      <h1>{title}</h1>
      {row.images && row.images.length > 0 ? (
        <div className="attraction-gallery">
          {row.images.map((img) => (
            <a
              key={img.id}
              href={img.url}
              target="_blank"
              rel="noopener noreferrer"
              className="attraction-gallery-item"
            >
              <img src={img.url} alt={title} loading="lazy" />
            </a>
          ))}
        </div>
      ) : row.imageUrl ? (
        <div className="attraction-gallery attraction-gallery--single">
          <img src={row.imageUrl} alt={title} />
        </div>
      ) : null}
      {description ? <div className="tours-page-subtitle attraction-description">{description}</div> : null}
      <div className="tours-grid">
        {row.tours.map((tour) => {
          const tourTitle = locale === 'tr' ? tour.titleTr : locale === 'zh' ? tour.titleZh : tour.titleEn;
          const tourDesc = locale === 'tr' ? tour.descTr : locale === 'zh' ? tour.descZh : tour.descEn;
          const shownPrice = formatPriceByLang(tour.basePrice, locale, rateData?.rate ?? null);
          return (
            <article key={tour.id} className="tour-card tour-card-clickable">
              <Link href={`/${lang}/tour/${tour.slug ?? tour.id}`} className="tour-card-link-area" aria-label={tourTitle}>
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
