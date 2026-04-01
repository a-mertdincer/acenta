import { getDictionary } from '../../dictionaries/getDictionary';
import Link from 'next/link';
import { TourCardImage } from '../../components/TourCardImage';
import { getTourImagePath, getTourImageFallback } from '../../../lib/imagePaths';
import { getTours } from '../../actions/tours';
import { ActivitiesDestinationSection } from '../../components/ActivitiesDestinationSection';
import { getEurTryRate } from '@/lib/exchangeRate';
import { formatPriceByLang } from '@/lib/currency';

const MOCK_TOURS = [
    { id: 'mock-balloon', type: 'BALLOON' as const, titleEn: 'Standard Balloon Flight', titleTr: 'Standart Balon Turu', titleZh: '标准热气球飞行', descEn: 'Float above the fairy chimneys at sunrise in our spacious baskets. 1 hour flight with champagne toast.', descTr: 'Geniş sepetlerimizde gün doğumunda peribacalarının üzerinde süzülün. Şampanya ikramlı 1 saatlik uçuş.', descZh: '在宽敞的吊篮中，在日出时分漂浮在仙女烟囱上方。香槟吐司1小时飞行。', basePrice: 150.0 },
    { id: 'mock-green', type: 'TOUR' as const, titleEn: 'Cappadocia Green Tour', titleTr: 'Kapadokya Yeşil Tur', titleZh: '卡帕多奇亚绿线之旅', descEn: 'Explore the underground city, hike in Ihlara Valley and visit Selime Monastery. Includes lunch.', descTr: 'Yeraltı şehrini keşfedin, Ihlara Vadisinde yürüyüş yapın ve Selime Manastırını ziyaret edin. Öğle yemeği dahildir.', descZh: '探索地下城，在伊赫拉拉山谷徒步旅行，并参观塞利梅修道院。包括午餐。', basePrice: 40.0 },
    { id: 'mock-transfer', type: 'TRANSFER' as const, titleEn: 'Private Airport Transfer', titleTr: 'Özel Havalimanı Transferi', titleZh: '私人机场接送', descEn: 'VIP transfer to and from Nevşehir or Kayseri airports. 1-4 Pax in Mercedes Vito.', descTr: 'Nevşehir veya Kayseri havalimanlarına Mercedes Vito ile VIP transfer. 1-4 Kişi.', descZh: '内夫谢希尔或开塞利机场的VIP接送服务。 1-4人在奔驰Vito。', basePrice: 50.0 },
];

export default async function ToursPage(props: { params: Promise<{ lang: string }> }) {
    const params = await props.params;
    const lang = params.lang as 'en' | 'tr' | 'zh';
    const dict = await getDictionary(lang);

    const dbTours = await getTours();
    const rateData = lang === 'tr' ? await getEurTryRate() : null;
    const tours = dbTours.length > 0
        ? dbTours.map((t) => {
            const byAirport = t.transferAirportTiers;
            const allTierPrices = byAirport
                ? [...(byAirport.ASR ?? []), ...(byAirport.NAV ?? [])].map((tier) => tier.price)
                : (t.transferTiers ?? []).map((tier) => tier.price);
            const fromPrice = t.type === 'TRANSFER' && allTierPrices.length
                ? Math.min(...allTierPrices)
                : t.basePrice;
            return {
                id: t.id,
                type: t.type as 'BALLOON' | 'TOUR' | 'TRANSFER' | 'ACTIVITY' | 'PACKAGE' | 'CONCIERGE',
                titleEn: t.titleEn,
                titleTr: t.titleTr,
                titleZh: t.titleZh,
                descEn: t.descEn,
                descTr: t.descTr,
                descZh: t.descZh,
                basePrice: t.basePrice,
                fromPrice,
                imageUrl: (t.images ?? []).find((img) => img.isPrimary)?.url ?? (t.images ?? [])[0]?.url ?? null,
            };
        })
        : MOCK_TOURS.map((t) => ({ ...t, fromPrice: t.basePrice, imageUrl: null }));

    const bookNowLabel = (dict.tours as { bookNow?: string }).bookNow ?? 'Book Now';
    const contactForPriceLabel = lang === 'tr' ? 'Fiyat için iletişime geçin' : lang === 'zh' ? '价格请咨询' : 'Contact for price';

    return (
        <>
            <ActivitiesDestinationSection
                lang={lang}
                title={(dict.tours as { allTours?: string }).allTours ?? dict.navigation.tours}
            />
            <div className="container tours-page tours-page-topless">
                <p className="text-center tours-page-subtitle tours-page-subtitle-spacing">
                    {dict.home.popularExperiences}
                </p>

                <div className="tours-grid">
                {tours.map((tour) => {
                    const title = lang === 'tr' ? tour.titleTr : lang === 'zh' ? tour.titleZh : tour.titleEn;
                    const desc = lang === 'tr' ? tour.descTr : lang === 'zh' ? tour.descZh : tour.descEn;
                    return (
                        <article key={tour.id} className="tour-card tour-card-clickable">
                            <Link href={`/${lang}/tour/${tour.id}`} className="tour-card-link-area" aria-label={title}>
                            <TourCardImage
                                src={tour.imageUrl ?? getTourImagePath(tour.type)}
                                fallback={getTourImageFallback(tour.type)}
                                alt={title}
                            />
                            <div className="tour-card-body">
                                <div className="tour-card-header">
                                    <h2 className="tour-card-title">{title}</h2>
                                    <span className="tour-type-badge">{tour.type}</span>
                                </div>
                                <p className="tour-card-desc">{desc}</p>
                                <div className="tour-card-footer">
                                    {(() => {
                                      const shown = formatPriceByLang(Number((tour as { fromPrice?: number }).fromPrice ?? tour.basePrice), lang, rateData?.rate ?? null);
                                      return (
                                        <span className="tour-card-price">
                                          {Number((tour as { fromPrice?: number }).fromPrice ?? tour.basePrice) > 0 ? `${dict.home.from} ${shown.primary}` : contactForPriceLabel}
                                          {shown.secondary ? <small className="tour-card-price-secondary">{shown.secondary}</small> : null}
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
            </div>
        </>
    );
}
