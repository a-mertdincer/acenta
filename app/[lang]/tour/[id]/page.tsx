'use client';

import { useState, use, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/Button';
import { useCartStore } from '../../../store/cartStore';
import { getTourImagePath, getTourImageFallback } from '../../../../lib/imagePaths';
import { getTourById, getTourDatePrice } from '../../../actions/tours';

function getTransferPriceForPaxClient(transferTiers: { minPax: number; maxPax: number; price: number }[] | null, pax: number, basePrice: number): number {
  if (transferTiers?.length) {
    const tier = transferTiers.find((t) => pax >= t.minPax && pax <= t.maxPax);
    if (tier) return tier.price;
  }
  return basePrice;
}

type TransferAirport = 'ASR' | 'NAV';

function TourDetailHeroImage({ type, title }: { type: string; title: string }) {
  const [src, setSrc] = useState(() => getTourImagePath(type));
  const fallback = getTourImageFallback(type);
  return (
    <div className="tour-detail-hero" style={{ borderRadius: '12px', marginBottom: 'var(--space-xl)', overflow: 'hidden' }}>
      <img
        src={src}
        alt={title}
        onError={() => setSrc(fallback)}
        style={{ width: '100%', height: '400px', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
}

type Lang = 'en' | 'tr' | 'zh';

const TOUR_DETAIL_STRINGS: Record<Lang, {
  description: string;
  optionalAddons: string;
  basePrice: string;
  perPerson: string;
  baseSubtotal: string;
  optionLine: string;
  netTotal: string;
  free: string;
  selectDate: string;
  passengers: string;
  thisDayPrice: string;
  capacity: string;
  guests: string;
  bookNow: string;
  addToCart: string;
  dateClosed: string;
  transferPrice: string;
  airport: string;
  airportASR: string;
  airportNAV: string;
}> = {
  en: {
    description: 'Description',
    optionalAddons: 'Optional add-ons',
    basePrice: 'Base price',
    perPerson: 'per person',
    baseSubtotal: 'Base (×{pax} guests)',
    optionLine: '{title} (×{pax})',
    netTotal: 'Net total',
    free: 'Free',
    selectDate: 'Select date',
    passengers: 'Number of guests',
    thisDayPrice: "This day's price",
    capacity: 'Capacity',
    guests: 'guests',
    bookNow: 'Book now',
    addToCart: 'Add to cart',
    dateClosed: 'This date is closed for booking.',
    transferPrice: 'Price for {pax} passenger(s)',
    airport: 'Airport',
    airportASR: 'Kayseri (ASR)',
    airportNAV: 'Nevşehir (NAV)',
  },
  tr: {
    description: 'Açıklama',
    optionalAddons: 'Opsiyonlar (ekstralar)',
    basePrice: 'Temel fiyat',
    perPerson: 'kişi başı',
    baseSubtotal: 'Temel fiyat (×{pax} kişi)',
    optionLine: '{title} (×{pax})',
    netTotal: 'Net toplam',
    free: 'Dahil',
    selectDate: 'Tarih seçin',
    passengers: 'Yolcu sayısı',
    thisDayPrice: 'Bu günün fiyatı',
    capacity: 'Kapasite',
    guests: 'kişi',
    bookNow: 'Rezervasyon yap',
    addToCart: 'Sepete ekle',
    dateClosed: 'Bu tarih için rezervasyon alınmamaktadır.',
    transferPrice: '{pax} kişi fiyatı',
    airport: 'Havalimanı',
    airportASR: 'Kayseri (ASR)',
    airportNAV: 'Nevşehir (NAV)',
  },
  zh: {
    description: '描述',
    optionalAddons: '可选附加项目',
    basePrice: '基础价格',
    perPerson: '每人',
    baseSubtotal: '基础 (×{pax} 人)',
    optionLine: '{title} (×{pax})',
    netTotal: '合计',
    free: '免费',
    selectDate: '选择日期',
    passengers: '乘客人数',
    thisDayPrice: '当日价格',
    capacity: '容量',
    guests: '人',
    bookNow: '立即预订',
    addToCart: '加入购物车',
    dateClosed: '该日期不接受预订。',
    transferPrice: '{pax} 人价格',
    airport: '机场',
    airportASR: '开塞利 (ASR)',
    airportNAV: '内夫谢希尔 (NAV)',
  },
};

function mapDbTourToState(db: {
  id: string; type: string; titleEn: string; titleTr: string; titleZh: string; descEn: string; descTr: string; descZh: string; basePrice: number;
  transferTiers?: { minPax: number; maxPax: number; price: number }[] | null;
  transferAirportTiers?: { ASR?: { minPax: number; maxPax: number; price: number }[]; NAV?: { minPax: number; maxPax: number; price: number }[] } | null;
  options: { id: string; titleTr: string; titleEn: string; titleZh: string; priceAdd: number }[];
}, _lang: Lang) {
  const titleEn = db.titleEn; const titleTr = db.titleTr; const titleZh = db.titleZh;
  return {
    id: db.id,
    type: db.type,
    titleEn,
    titleTr,
    titleZh,
    descEn: db.descEn,
    descTr: db.descTr,
    descZh: db.descZh,
    basePrice: db.basePrice,
    transferTiers: db.transferTiers ?? null,
    transferAirportTiers: db.transferAirportTiers ?? null,
    options: db.options.map((o, i) => ({
      id: i + 1,
      title: _lang === 'tr' ? o.titleTr : _lang === 'zh' ? o.titleZh : o.titleEn,
      price: o.priceAdd,
    })),
  };
}

const mockTours = [
    {
        id: 'mock-balloon',
        type: 'BALLOON',
        titleEn: 'Standard Balloon Flight',
        titleTr: 'Standart Balon Turu',
        titleZh: '标准热气球飞行',
        descEn: 'Float above the fairy chimneys at sunrise in our spacious baskets. 1 hour flight with champagne toast.',
        descTr: 'Geniş sepetlerimizde gün doğumunda peribacalarının üzerinde süzülün. Şampanya ikramlı 1 saatlik uçuş.',
        descZh: '在宽敞的吊篮中，在日出时分漂浮在仙女烟囱上方。香槟吐司1小时飞行。',
        basePrice: 150.0,
        options: []
    },
    {
        id: 'mock-green',
        type: 'TOUR',
        titleEn: 'Cappadocia Green Tour',
        titleTr: 'Kapadokya Yeşil Tur',
        titleZh: '卡帕多奇亚绿线之旅',
        descEn: 'Explore the underground city, hike in Ihlara Valley and visit Selime Monastery. Includes lunch.',
        descTr: 'Yeraltı şehrini keşfedin, Ihlara Vadisinde yürüyüş yapın ve Selime Manastırını ziyaret edin. Öğle yemeği dahildir.',
        descZh: '探索地下城，在伊赫拉拉山谷徒步旅行，并参观塞利梅修道院。包括午餐。',
        basePrice: 40.0,
        options: [
            { id: 1, title: 'Vegetarian Lunch', price: 0 },
            { id: 2, title: 'Private Guide', price: 50.0 }
        ]
    }
];

export default function TourDetailPage(props: { params: Promise<{ lang: string; id: string }> }) {
    const params = use(props.params);
    const { lang, id } = params;
    const router = useRouter();
    const addItem = useCartStore(state => state.addItem);

    const [tour, setTour] = useState<any>(null);
    const [pax, setPax] = useState(1);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
    const [selectedAirport, setSelectedAirport] = useState<TransferAirport>('ASR');
    const [datePrice, setDatePrice] = useState<{ price: number; capacity: number; isClosed: boolean } | null>(null);

    useEffect(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const defaultDate = d.toISOString().split('T')[0];
        setSelectedDate(defaultDate);

        if (id.startsWith('mock-')) {
            const found = mockTours.find(t => t.id === id);
            if (found) setTour(found);
            return;
        }
        getTourById(id).then((dbTour) => {
            if (dbTour) setTour(mapDbTourToState(dbTour, lang as Lang));
            else {
                const found = mockTours.find(t => t.id === id);
                if (found) setTour(found);
            }
        });
    }, [id, lang]);

    useEffect(() => {
        if (!tour || !selectedDate || id.startsWith('mock-')) {
            setDatePrice(null);
            return;
        }
        getTourDatePrice(tour.id, selectedDate).then((result) => {
            if (result) setDatePrice(result);
            else setDatePrice(null);
        });
    }, [tour?.id, selectedDate, id]);

    if (!tour) return <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>Loading...</div>;

    const locale = (lang === 'tr' || lang === 'zh' ? lang : 'en') as Lang;
    const t = TOUR_DETAIL_STRINGS[locale];
    const title = lang === 'tr' ? tour.titleTr : lang === 'zh' ? tour.titleZh : tour.titleEn;
    const desc = lang === 'tr' ? tour.descTr : lang === 'zh' ? tour.descZh : tour.descEn;

    const transferTiersForAirport =
        tour.type === 'TRANSFER' && tour.transferAirportTiers
            ? (tour.transferAirportTiers[selectedAirport] ?? tour.transferAirportTiers.ASR ?? tour.transferTiers)
            : null;
    const isTransferWithTiers = tour.type === 'TRANSFER' && (transferTiersForAirport?.length ?? tour.transferTiers?.length);
    const basePrice = datePrice?.price ?? tour.basePrice;
    const isClosed = datePrice?.isClosed ?? false;
    const unitPrice = isTransferWithTiers
        ? getTransferPriceForPaxClient(transferTiersForAirport ?? tour.transferTiers, pax, basePrice)
        : basePrice;
    let total = isTransferWithTiers ? unitPrice : basePrice * pax;
    selectedOptions.forEach(optId => {
        const opt = tour.options?.find((o: any) => o.id === optId);
        if (opt) total += (opt.price * pax);
    });

    const toggleOption = (optId: number) => {
        setSelectedOptions(prev =>
            prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
        );
    };

    return (
        <div className="container tour-detail-layout">

            <div>
                <h1 style={{ marginBottom: 'var(--space-md)' }}>{title}</h1>
                <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', display: 'inline-block', marginBottom: 'var(--space-xl)' }}>
                    {tour.type}
                </span>

                <TourDetailHeroImage type={tour.type} title={title} />

                <h2>{t.description}</h2>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6', fontSize: '1.1rem', marginTop: 'var(--space-sm)' }}>
                    {desc}
                </p>

                {tour.options?.length > 0 && (
                    <div style={{ marginTop: 'var(--space-xl)' }}>
                        <h2>{t.optionalAddons}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                            {tour.options.map((opt: any) => (
                                <label key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedOptions.includes(opt.id) ? 'var(--color-bg-card)' : 'transparent' }}>
                                    <div>
                                        <input type="checkbox" checked={selectedOptions.includes(opt.id)} onChange={() => toggleOption(opt.id)} style={{ marginRight: 'var(--space-sm)' }} />
                                        <span style={{ fontWeight: '500' }}>{opt.title}</span>
                                    </div>
                                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                        {opt.price === 0 ? t.free : `+€${opt.price}`}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div>
                <div className="card tour-detail-booking-card" style={{ padding: 'var(--space-xl)' }}>
                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>{t.bookNow}</h3>

                    <div style={{ marginBottom: 'var(--space-md)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>{t.selectDate}</label>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                    </div>

                    {datePrice && selectedDate && (
                        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
                            <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                <strong>{t.thisDayPrice}:</strong> €{datePrice.price.toFixed(2)} {t.perPerson}
                            </p>
                            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                {t.capacity}: {datePrice.capacity} {t.guests}
                            </p>
                        </div>
                    )}

                    {tour.type === 'TRANSFER' && (tour.transferAirportTiers || tour.transferTiers) && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>{t.airport}</label>
                            <select
                                value={selectedAirport}
                                onChange={(e) => setSelectedAirport(e.target.value as TransferAirport)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="ASR">{t.airportASR}</option>
                                <option value="NAV">{t.airportNAV}</option>
                            </select>
                        </div>
                    )}

                    <div style={{ marginBottom: 'var(--space-xl)' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>{t.passengers}</label>
                        <select value={pax} onChange={(e) => setPax(Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} Passenger{n > 1 ? 's' : ''}</option>)}
                        </select>
                    </div>

                    {isClosed && (
                        <p style={{ padding: 'var(--space-md)', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', marginBottom: 'var(--space-md)' }}>
                            {t.dateClosed}
                        </p>
                    )}
                    {isTransferWithTiers && (
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
                            {t.transferPrice.replace('{pax}', String(pax))}: €{unitPrice.toFixed(2)}
                        </p>
                    )}
                    <div style={{ padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', marginBottom: 'var(--space-xl)' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
                            {t.basePrice}: €{basePrice.toFixed(2)} {t.perPerson}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>{isTransferWithTiers ? `${t.basePrice} (${pax} ${t.guests})` : t.baseSubtotal.replace('{pax}', String(pax))}</span>
                            <span>€{(isTransferWithTiers ? unitPrice : basePrice * pax).toFixed(2)}</span>
                        </div>
                        {selectedOptions.map(optId => {
                            const opt = tour.options.find((o: any) => o.id === optId);
                            if (!opt) return null;
                            const optTotal = opt.price * pax;
                            return (
                                <div key={optId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
                                    <span>{opt.title} (×{pax})</span>
                                    <span>{opt.price === 0 ? t.free : `+€${optTotal.toFixed(2)}`}</span>
                                </div>
                            );
                        })}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: '1.25rem', fontWeight: 'bold' }}>
                            <span>{t.netTotal}</span>
                            <span style={{ color: 'var(--color-primary)' }}>€{Number(total).toFixed(2)}</span>
                        </div>
                    </div>

                    <Button style={{ width: '100%' }} disabled={isClosed} onClick={() => {
                        if (isClosed) return;
                        addItem({
                            tourId: tour.id,
                            tourType: tour.type,
                            title: lang === 'tr' ? tour.titleTr : lang === 'zh' ? tour.titleZh : tour.titleEn,
                            date: selectedDate,
                            pax,
                            basePrice: isTransferWithTiers ? unitPrice : basePrice,
                            options: selectedOptions.map(optId => {
                                const o = tour.options.find((opt: any) => opt.id === optId);
                                return { id: o.id, title: o.title, price: o.price };
                            }),
                            totalPrice: total,
                            ...(tour.type === 'TRANSFER' && { transferAirport: selectedAirport }),
                        });
                        router.push(`/${lang}/cart`);
                    }}>{t.addToCart}</Button>
                </div>
            </div>

        </div>
    );
}
