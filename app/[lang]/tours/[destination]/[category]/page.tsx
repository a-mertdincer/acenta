import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDictionary } from '../../../../dictionaries/getDictionary';
import { TourCardImage } from '../../../../components/TourCardImage';
import { getTourImagePath, getTourImageFallback } from '../../../../../lib/imagePaths';
import { getTours } from '../../../../actions/tours';
import {
  getDestinationBySlug,
  getCategoryBySlug,
  getDestinationName,
  getCategoryLabel,
  type Lang,
} from '@/lib/destinations';
import { ActivitiesDestinationSection } from '../../../../components/ActivitiesDestinationSection';
import type { Metadata } from 'next';
import { getEurTryRate } from '@/lib/exchangeRate';
import { formatPriceByLang } from '@/lib/currency';
import { getTourWithVariants } from '@/app/actions/variants';
import { getTierFromPrice } from '@/lib/pricingTiers';
import { getPromotionCardPrices } from '@/app/actions/promotions';
import { TourTagBadges } from '@/app/components/TourTagBadges';

export async function generateMetadata(props: {
  params: Promise<{ lang: string; destination: string; category: string }>;
}): Promise<Metadata> {
  const { lang, destination, category } = await props.params;
  const dest = getDestinationBySlug(destination);
  const cat = dest ? getCategoryBySlug(destination, category) : null;
  if (!dest || !cat) return { title: 'Tours' };
  const L = lang as Lang;
  const destName = getDestinationName(dest, L);
  const catLabel = getCategoryLabel(cat, L);
  return {
    title: `${catLabel} — ${destName} | Tours`,
    description: `${destName} ${catLabel}. Book online.`,
  };
}

export default async function ToursCategoryPage(props: {
  params: Promise<{ lang: string; destination: string; category: string }>;
}) {
  const params = await props.params;
  const lang = params.lang as Lang;
  const { destination, category } = params;

  const dest = getDestinationBySlug(destination);
  const cat = getCategoryBySlug(destination, category);
  if (!dest || !cat) notFound();

  const dict = await getDictionary(lang);
  const dbTours = await getTours({ destination, category });
  const variantFromPriceMap = new Map<string, number>();
  const variantData = await Promise.all(dbTours.map(async (tour) => ({ id: tour.id, data: await getTourWithVariants(tour.id) })));
  variantData.forEach(({ id, data }) => {
    const activeVariants = data?.variants ?? [];
    if (activeVariants.length === 0) return;
    const minPrice = Math.min(
      ...activeVariants.map((variant) => {
        if ((variant.privatePriceTiers?.length ?? 0) > 0) {
          return getTierFromPrice(variant.privatePriceTiers ?? null) ?? variant.adultPrice;
        }
        return variant.adultPrice;
      })
    );
    variantFromPriceMap.set(id, minPrice);
  });
  const byAirport = (t: { transferAirportTiers?: { ASR?: { price: number }[]; NAV?: { price: number }[] } | null; transferTiers?: { price: number }[] | null }) => {
    if (t.transferAirportTiers) {
      const asr = (t.transferAirportTiers as { ASR?: { price: number }[] }).ASR ?? [];
      const nav = (t.transferAirportTiers as { NAV?: { price: number }[] }).NAV ?? [];
      return [...asr, ...nav].map((x) => x.price);
    }
    return (t.transferTiers ?? []).map((x: { price: number }) => x.price);
  };
  const tours = dbTours.map((t) => {
    const allTierPrices = byAirport(t);
    const fromPrice = t.type === 'TRANSFER' && allTierPrices.length ? Math.min(...allTierPrices) : (variantFromPriceMap.get(t.id) ?? t.basePrice);
    return {
      id: t.id,
      slug: t.slug ?? null,
      type: t.type,
      titleEn: t.titleEn,
      titleTr: t.titleTr,
      titleZh: t.titleZh,
      descEn: t.descEn,
      descTr: t.descTr,
      descZh: t.descZh,
      basePrice: t.basePrice,
      fromPrice,
      isAskForPrice: t.isAskForPrice ?? false,
      imageUrl: (t.images ?? []).find((img) => img.isPrimary)?.url ?? (t.images ?? [])[0]?.url ?? null,
      destination: t.destination ?? destination,
      category: t.category ?? category,
      salesTags: Array.isArray(t.salesTags) ? t.salesTags.filter((x): x is string => typeof x === 'string') : [],
    };
  });

  const destName = getDestinationName(dest, lang);
  const catLabel = getCategoryLabel(cat, lang);
  const bookNowLabel = (dict.tours as { bookNow?: string })?.bookNow ?? 'Book Now';
  const contactForPriceLabel = lang === 'tr' ? 'Fiyat için iletişime geçin' : lang === 'zh' ? '价格请咨询' : 'Contact for price';
  const askForPriceLabel =
    typeof dict === 'object' && dict !== null && 'askForPrice' in dict
      ? String((dict as { askForPrice?: { button?: string } }).askForPrice?.button ?? '').trim() || 'Ask for Price'
      : 'Ask for Price';
  const rateData = lang === 'tr' ? await getEurTryRate() : null;
  const promoRefDate = new Date();
  const promoMap = await getPromotionCardPrices(
    tours.map((tour) => ({ tourId: tour.id, rackPrice: Number(tour.fromPrice ?? tour.basePrice) })),
    promoRefDate
  );

  return (
    <>
      <ActivitiesDestinationSection
        lang={lang}
        title={(dict.tours as { allTours?: string })?.allTours ?? dict.navigation?.tours ?? 'Tours'}
        currentDestination={destination}
        currentCategory={category}
      />
      <div className="container tours-page tours-page-topless">
        <h1 className="text-center tours-category-title">
          {catLabel} — {destName}
        </h1>
        {tours.length === 0 ? (
          <p className="text-center tours-category-empty">
            Bu kategoride henüz tur bulunmuyor.
          </p>
        ) : (
          <div className="tours-grid">
            {tours.map((tour) => {
              const title = lang === 'tr' ? tour.titleTr : lang === 'zh' ? tour.titleZh : tour.titleEn;
              const desc = lang === 'tr' ? tour.descTr : lang === 'zh' ? tour.descZh : tour.descEn;
              const badgeCategory = tour.category ? getCategoryBySlug(tour.destination ?? destination, tour.category) : null;
              const isAskTopBadge = tour.isAskForPrice ?? false;
              const promoTopBadge = promoMap.get(tour.id);
              const hasPromoTopBadge = !isAskTopBadge && promoTopBadge && promoTopBadge.discount > 0;
              return (
                <article key={tour.id} className="tour-card tour-card-clickable">
                  <Link href={`/${lang}/tour/${tour.slug ?? tour.id}`} className="tour-card-link-area" aria-label={title}>
                  <div className="tour-card-image-wrap">
                    <TourCardImage
                      src={tour.imageUrl ?? getTourImagePath(tour.type)}
                      fallback={getTourImageFallback(tour.type)}
                      alt={title}
                    />
                    {isAskTopBadge ? (
                      <span className="card-price-badge">{askForPriceLabel}</span>
                    ) : hasPromoTopBadge ? (
                      <span className="card-promo-badge">
                        {promoTopBadge.percentLabel != null ? `-${promoTopBadge.percentLabel}%` : `Save €${promoTopBadge.discount}`}
                      </span>
                    ) : null}
                  </div>
                  <div className="tour-card-body">
                    <div className="tour-card-header">
                      <h2 className="tour-card-title">{title}</h2>
                      <span className="tour-type-badge">{badgeCategory ? getCategoryLabel(badgeCategory, lang) : tour.type}</span>
                    </div>
                    {tour.salesTags && tour.salesTags.length > 0 ? (
                      <TourTagBadges tagSlugs={tour.salesTags} lang={lang} variant="card" max={2} />
                    ) : null}
                    <p className="tour-card-desc">{desc}</p>
                    <div className="tour-card-footer">
                      {(() => {
                        const isAsk = tour.isAskForPrice ?? false;
                        const rackP = Number(tour.fromPrice ?? tour.basePrice);
                        const pm = promoMap.get(tour.id);
                        const hasPromo = pm && pm.discount > 0 && rackP > 0;
                        const fromP = hasPromo ? pm.final : rackP;
                        const shown = formatPriceByLang(fromP, lang, rateData?.rate ?? null);
                        const shownRack = hasPromo ? formatPriceByLang(rackP, lang, rateData?.rate ?? null) : null;
                        const promoDict = (dict as { promotion?: { off?: string } }).promotion;
                        return (
                          <span className="tour-card-price">
                            {isAsk
                              ? askForPriceLabel
                              : fromP > 0
                                ? (
                                    <>
                                      {hasPromo && shownRack ? (
                                        <>
                                          <span className="tour-card-price-strike">{shownRack.primary}</span>{' '}
                                        </>
                                      ) : null}
                                      {`${dict.home?.from ?? 'From'} ${shown.primary}`}
                                      {hasPromo && pm.percentLabel != null ? (
                                        <span className="tour-card-promo-badge">-{pm.percentLabel}% {promoDict?.off ?? 'off'}</span>
                                      ) : null}
                                    </>
                                  )
                                : contactForPriceLabel}
                            {!isAsk && shown.secondary ? <small className="tour-card-price-secondary">{shown.secondary}</small> : null}
                          </span>
                        );
                      })()}
                      <span className="btn btn-primary tour-card-cta">{bookNowLabel}</span>
                    </div>
                  </div>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
