'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './Button';
import { useCartStore } from '../store/cartStore';
import { TourTypeToggle } from './TourTypeToggle';
import { ReservationTypeCards } from './ReservationTypeCards';
import { AirportSelector } from './AirportSelector';
import { getFlights } from '@/app/actions/flights';
import {
  getDefaultVariantSelection,
  calculateVariantTotal,
  type VariantSelection,
  type TourVariantDisplay,
  type ReservationTypeVariant,
} from '@/lib/types/variant';
import type { TourWithVariantsResult } from '@/app/actions/variants';
import { getLastTierPax, resolveTierPrice } from '@/lib/pricingTiers';
import { useExchangeRate } from '@/app/hooks/useExchangeRate';
import { formatPriceByLang } from '@/lib/currency';
import { AskForPriceBookingBlock, type AskForPriceStrings } from './AskForPriceModal';
import { buildTourWhatsAppHref } from '@/lib/buildWhatsAppTourUrl';
import { TourBookingTrustExtras, type TourCancellationLabels, type WhyBookDict } from './TourBookingTrustExtras';
import { Ban, Baby, PartyPopper, User as UserIcon, type LucideIcon } from 'lucide-react';
import type { SiteLocale } from '@/lib/i18n';
import { pickTourField } from '@/lib/pickContentLang';

type TransferDirection = 'arrival' | 'departure' | 'roundtrip';

function normalizeNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.toLowerCase();
}

function agePriceShortLabelUi(
  v: Record<string, string>,
  pricingType: 'free' | 'child' | 'adult' | 'not_allowed'
): string {
  if (pricingType === 'free') return v.agePriceFree ?? 'Free of charge';
  if (pricingType === 'child') return v.agePriceChild ?? 'Child price';
  if (pricingType === 'adult') return v.agePriceAdult ?? 'Adult price';
  return v.agePriceNotAllowed ?? 'Not allowed';
}

function variantTitleFor(lang: SiteLocale | string, variant: TourVariantDisplay, fallbackTitle: string): string {
  return pickTourField(variant as unknown as Record<string, unknown>, 'title', lang) ?? fallbackTitle;
}

function getAgePolicyDetail(
  description: string | null | undefined,
  label: string,
  pricingType: 'free' | 'child' | 'adult' | 'not_allowed'
): string | null {
  const normalized = (description ?? '').trim();
  if (!normalized) return null;
  const value = normalized.toLowerCase();
  const labelValue = label.toLowerCase();
  const generic = [
    'free of charge',
    'child price applies',
    'adult price applies',
    'not allowed',
    'ucretsiz',
    'cocuk fiyati',
    'yetiskin fiyati',
    'kabul edilmez',
  ];
  if (value === labelValue || generic.includes(value)) {
    return null;
  }
  if (pricingType !== 'not_allowed' && value === 'izin verilmez') {
    return null;
  }
  return normalized;
}

type ProductVariantBookingCardProps = {
  tourId: string;
  tourType: string;
  lang: SiteLocale;
  variantUi: Record<string, string>;
  promotionUi: Record<string, string>;
  askForPriceStrings: AskForPriceStrings;
  data: TourWithVariantsResult;
  title: string;
  isAskForPrice?: boolean;
  whyBook: WhyBookDict;
  tourCancellationLabels: TourCancellationLabels;
  cancellationNote?: string | null;
  options: { id: string; title: string; price: number; pricingMode?: 'per_person' | 'flat' | 'per_unit' }[];
  ageGroups?: {
    minAge: number;
    maxAge: number;
    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
    description: string;
  }[];
  minAgeLimit?: number | null;
  startTimes?: string[];
};

function AskPriceOnlyCard({
  tourId,
  lang,
  title,
  whyBook,
  tourCancellationLabels,
  cancellationNote,
  variantUi,
  askForPriceStrings,
}: Pick<
  ProductVariantBookingCardProps,
  | 'tourId'
  | 'lang'
  | 'title'
  | 'whyBook'
  | 'tourCancellationLabels'
  | 'cancellationNote'
  | 'variantUi'
  | 'askForPriceStrings'
>) {
  const t = variantUi;
  const askPriceWhatsappHref = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return buildTourWhatsAppHref({
      tourTitle: title,
      dateYmd: d.toISOString().split('T')[0],
      people: 2,
    });
  }, [title]);
  return (
    <div className="card tour-detail-booking-card tour-detail-booking-card--ask">
      <AskForPriceBookingBlock tourId={tourId} strings={askForPriceStrings} />
      <TourBookingTrustExtras
        lang={lang}
        whatsappHref={askPriceWhatsappHref}
        whatsappLabel={t.askWhatsApp ?? 'Ask on WhatsApp'}
        whyBook={whyBook}
        cancellationNote={cancellationNote}
        policyLabels={tourCancellationLabels}
      />
    </div>
  );
}

export function ProductVariantBookingCard(props: ProductVariantBookingCardProps) {
  if (props.isAskForPrice) {
    return (
      <AskPriceOnlyCard
        tourId={props.tourId}
        lang={props.lang}
        title={props.title}
        whyBook={props.whyBook}
        tourCancellationLabels={props.tourCancellationLabels}
        cancellationNote={props.cancellationNote}
        variantUi={props.variantUi}
        askForPriceStrings={props.askForPriceStrings}
      />
    );
  }
  return <ProductVariantBookingCardInner {...props} />;
}

function ProductVariantBookingCardInner({
  tourId,
  tourType,
  lang,
  variantUi,
  promotionUi,
  data,
  title,
  options,
  ageGroups = [],
  minAgeLimit = null,
  startTimes = [],
  whyBook,
  tourCancellationLabels,
  cancellationNote,
}: ProductVariantBookingCardProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const t = variantUi;
  const promoOff = promotionUi.off ?? 'off';
  const { eurTryRate } = useExchangeRate(lang === 'tr');

  const defaultSelection = useMemo(
    () => getDefaultVariantSelection(data.hasTourType, data.hasAirportSelect, data.hasReservationType, data.reservationTypeMode),
    [data.hasTourType, data.hasAirportSelect, data.hasReservationType, data.reservationTypeMode]
  );

  const [selection, setSelection] = useState<VariantSelection>(defaultSelection);
  const [selectedStartTime, setSelectedStartTime] = useState<string>(() => (startTimes.length === 1 ? startTimes[0] : ''));
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [selectedDirection, setSelectedDirection] = useState<TransferDirection>('arrival');
  const [flightArrival, setFlightArrival] = useState('');
  const [flightDeparture, setFlightDeparture] = useState('');
  const [transferHotelName, setTransferHotelName] = useState('');
  const [flightsArrival, setFlightsArrival] = useState<{ id: string; code: string; airline: string }[]>([]);
  const [flightsDeparture, setFlightsDeparture] = useState<{ id: string; code: string; airline: string }[]>([]);
  const [cartToastOpen, setCartToastOpen] = useState(false);
  const [cartToastTitle, setCartToastTitle] = useState('');
  const [optionQuantities, setOptionQuantities] = useState<Record<string, number>>({});
  const selectedOptions = useMemo(
    () => Object.entries(optionQuantities).filter(([, q]) => q > 0).map(([id]) => id),
    [optionQuantities]
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const isOptionMode = data.reservationTypeMode === 'option2' || data.reservationTypeMode === 'option3' || data.reservationTypeMode === 'option4';
  const showChildren = useMemo(() => {
    if (minAgeLimit != null && minAgeLimit >= 8) return false;
    if (ageGroups.length === 0) return true;
    return ageGroups.some((g) => g.pricingType === 'child' && g.maxAge >= 4);
  }, [ageGroups, minAgeLimit]);
  const showInfants = useMemo(() => {
    if (minAgeLimit != null && minAgeLimit >= 4) return false;
    if (ageGroups.length === 0) return true;
    return ageGroups.some((g) => (g.pricingType === 'free' || g.pricingType === 'adult' || g.pricingType === 'child') && g.minAge <= 3);
  }, [ageGroups, minAgeLimit]);

  useEffect(() => {
    if (!data.hasAirportSelect && tourType !== 'TRANSFER') return;
    const airport = selection.airport ?? 'NAV';
    setFlightArrival('');
    setFlightDeparture('');
    getFlights({ airport, direction: 'arrival' }).then((list) =>
      setFlightsArrival(list.map((f) => ({ id: f.id, code: f.code, airline: f.airline })))
    );
    getFlights({ airport, direction: 'departure' }).then((list) =>
      setFlightsDeparture(list.map((f) => ({ id: f.id, code: f.code, airline: f.airline })))
    );
  }, [data.hasAirportSelect, selection.airport, tourType]);

  useEffect(() => {
    if (!cartToastOpen) return;
    const timer = setTimeout(() => setCartToastOpen(false), 4000);
    return () => clearTimeout(timer);
  }, [cartToastOpen]);

  useEffect(() => {
    if (!showChildren && children !== 0) setChildren(0);
    if (!showInfants && infants !== 0) setInfants(0);
  }, [showChildren, showInfants, children, infants]);

  const matchingVariants = useMemo(() => {
    const selectedTourType = normalizeNullable(selection.tourType);
    const selectedAirport = isOptionMode ? null : normalizeNullable(selection.airport);
    return data.variants
      .filter((v) => v.isActive)
      .filter((v) => {
        const variantTourType = normalizeNullable(v.tourType);
        const variantAirport = normalizeNullable(v.airport);
        const tourTypeMatch = selectedTourType == null || variantTourType === selectedTourType || variantTourType == null;
        const airportMatch = selectedAirport == null || variantAirport === selectedAirport || variantAirport == null;
        return tourTypeMatch && airportMatch;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data.variants, selection.tourType, selection.airport, isOptionMode]);
  const variantsWithReservationType = useMemo(
    () => matchingVariants.filter((v) => Boolean(v.reservationType)),
    [matchingVariants]
  );
  const useReservationTypeCards = data.hasReservationType && variantsWithReservationType.length > 0;

  const activeVariant = useMemo(() => {
    if (selectedVariantId) {
      const picked = matchingVariants.find((v) => v.id === selectedVariantId);
      if (picked) return picked;
    }
    if (matchingVariants.length === 0) return null;
    return matchingVariants.find((v) => v.isRecommended) ?? matchingVariants[0];
  }, [matchingVariants, selectedVariantId]);
  const activeAirport = normalizeNullable(activeVariant?.airport) ?? normalizeNullable(selection.airport) ?? 'nav';
  const transferAirportTiers = useMemo(
    () => data.transferAirportTiers?.[activeAirport.toUpperCase() as 'NAV' | 'ASR'] ?? null,
    [data.transferAirportTiers, activeAirport]
  );
  const tierDerivedMax = useMemo(() => {
    if (!transferAirportTiers || transferAirportTiers.length === 0) return null;
    return transferAirportTiers.reduce((max, tier) => Math.max(max, tier.maxPax), 0);
  }, [transferAirportTiers]);
  const tierBasedMax = useMemo(() => {
    if (!activeVariant || (activeVariant.privatePriceTiers?.length ?? 0) === 0) return null;
    const lastPax = getLastTierPax(activeVariant.privatePriceTiers ?? null);
    if (!lastPax) return null;
    return Math.min(20, Math.max(lastPax, lastPax * 2));
  }, [activeVariant]);
  const maxGuests = Math.max(1, activeVariant?.maxGroupSize ?? tierBasedMax ?? tierDerivedMax ?? 99);
  const totalGuests = adults + children + infants;
  const isAtGuestLimit = totalGuests >= maxGuests;

  const bookingWhatsappHref = useMemo(() => {
    const pax = Math.max(1, adults + children + infants);
    return buildTourWhatsAppHref({
      tourTitle: title,
      dateYmd: selectedDate,
      people: pax,
    });
  }, [title, selectedDate, adults, children, infants]);

  useEffect(() => {
    if (!activeVariant?.maxGroupSize) return;
    const limit = Math.max(1, activeVariant.maxGroupSize);
    const currentTotal = adults + children + infants;
    if (currentTotal <= limit) return;
    let overflow = currentTotal - limit;
    if (infants > 0) {
      const cut = Math.min(overflow, infants);
      setInfants((n) => n - cut);
      overflow -= cut;
    }
    if (overflow > 0 && children > 0) {
      const cut = Math.min(overflow, children);
      setChildren((n) => n - cut);
      overflow -= cut;
    }
    if (overflow > 0) {
      setAdults((n) => Math.max(1, n - overflow));
    }
  }, [activeVariant?.id, activeVariant?.maxGroupSize, adults, children, infants]);

  useEffect(() => {
    if (activeVariant) return;
    if (matchingVariants.length === 0) return;
    const fallback = matchingVariants.find((v) => v.isRecommended) ?? matchingVariants[0];
    setSelectedVariantId(fallback.id);
    setSelection((s) => ({
      ...s,
      reservationType: useReservationTypeCards ? (fallback.reservationType as ReservationTypeVariant | null) : null,
      airport: (fallback.airport as VariantSelection['airport'] | null) ?? s.airport,
    }));
  }, [activeVariant, matchingVariants, useReservationTypeCards]);
  useEffect(() => {
    if (!activeVariant) return;
    if (selectedVariantId === activeVariant.id) return;
    setSelectedVariantId(activeVariant.id);
  }, [activeVariant, selectedVariantId]);

  const total = useMemo(() => {
    if (!activeVariant) return 0;
    const totalPax = Math.max(1, adults + children + infants);
    const effectivePrivateTiers =
      activeVariant.privatePriceTiers && activeVariant.privatePriceTiers.length > 0
        ? activeVariant.privatePriceTiers
        : (activeVariant.reservationType === 'private' ? transferAirportTiers : null);
    const tieredVariant =
      effectivePrivateTiers && effectivePrivateTiers.length > 0
        ? { ...activeVariant, privatePriceTiers: effectivePrivateTiers }
        : activeVariant;
    const direction = data.hasAirportSelect ? selectedDirection : undefined;
    const baseTotal = calculateVariantTotal(tieredVariant, adults, children, infants, direction);
    // Per-person variants can still use tier table as total override.
    if (activeVariant.pricingType === 'per_person' && effectivePrivateTiers && effectivePrivateTiers.length > 0) {
      const tierPrice = resolveTierPrice(effectivePrivateTiers, totalPax);
      if (tierPrice != null) {
        const multiplier = direction === 'roundtrip' ? 2 * 0.9 : 1;
        return tierPrice * multiplier;
      }
    }
    const extrasTotal = selectedOptions.reduce((sum, optId) => {
      const opt = options.find((o) => o.id === optId);
      if (!opt) return sum;
      const qty = Math.max(1, optionQuantities[optId] ?? 1);
      if (opt.pricingMode === 'flat') return sum + opt.price;
      if (opt.pricingMode === 'per_unit') return sum + opt.price * qty;
      return sum + opt.price * totalPax;
    }, 0);
    return baseTotal + extrasTotal;
  }, [activeVariant, adults, children, infants, data.hasAirportSelect, selectedDirection, transferAirportTiers, selection.airport, selectedOptions, options, optionQuantities]);
  const baseTotal = useMemo(() => {
    if (!activeVariant) return 0;
    const totalPax = Math.max(1, adults + children + infants);
    return total - selectedOptions.reduce((sum, optId) => {
      const opt = options.find((o) => o.id === optId);
      if (!opt) return sum;
      const qty = Math.max(1, optionQuantities[optId] ?? 1);
      if (opt.pricingMode === 'flat') return sum + opt.price;
      if (opt.pricingMode === 'per_unit') return sum + opt.price * qty;
      return sum + opt.price * totalPax;
    }, 0);
  }, [activeVariant, total, selectedOptions, options, adults, children, infants, optionQuantities]);
  const selectedOptionRows = useMemo(() => {
    const pax = Math.max(1, adults + children + infants);
    return selectedOptions
      .map((optId) => options.find((o) => o.id === optId))
      .filter((opt): opt is { id: string; title: string; price: number; pricingMode?: 'per_person' | 'flat' | 'per_unit' } => Boolean(opt))
      .map((opt) => {
        const qty = Math.max(1, optionQuantities[opt.id] ?? 1);
        const isFlat = opt.pricingMode === 'flat';
        const isPerUnit = opt.pricingMode === 'per_unit';
        const multiplier = isFlat ? 1 : isPerUnit ? qty : pax;
        return {
          id: opt.id,
          label: `+ ${opt.title} (×${multiplier})`,
          total: opt.price * multiplier,
        };
      });
  }, [selectedOptions, options, adults, children, infants, optionQuantities]);

  const variantTitle = activeVariant ? variantTitleFor(lang, activeVariant, title) : title;
  const formatShown = (eur: number) => formatPriceByLang(eur, lang, eurTryRate);

  const [promoPreview, setPromoPreview] = useState<{
    discount: number;
    final: number;
    percentOff: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!selectedDate || total <= 0) {
      setPromoPreview(null);
      return;
    }
    void (async () => {
      const { previewPromotionForBooking } = await import('@/app/actions/promotions');
      const r = await previewPromotionForBooking(tourId, selectedDate, total);
      if (!cancelled) {
        setPromoPreview(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tourId, selectedDate, total]);

  const payTotal = promoPreview && promoPreview.discount > 0 ? promoPreview.final : total;

  const handleAddToCart = () => {
    if (!activeVariant) {
      alert(t.alertNoVariant ?? 'No matching variant for this selection.');
      return;
    }
    const pax = adults + children + infants;
    if (pax > maxGuests) {
      alert(t.maxGuestsInfo?.replace('{max}', String(maxGuests)) ?? `Maksimum ${maxGuests} kişi kabul edilmektedir.`);
      return;
    }
    if (startTimes.length > 0 && !selectedStartTime) {
      alert(t.validationSelectStartTime ?? 'Please select a start time.');
      return;
    }
    const isTransferLike = data.hasAirportSelect || tourType === 'TRANSFER';
    if (isTransferLike) {
      const arrivalRequired = selectedDirection === 'arrival' || selectedDirection === 'roundtrip';
      const departureRequired = selectedDirection === 'departure' || selectedDirection === 'roundtrip';
      const arrivalValue = flightArrival.trim();
      const departureValue = flightDeparture.trim();
      if (arrivalRequired && !arrivalValue) {
        alert(t.validationArrivalFlight ?? 'Please enter arrival flight info.');
        return;
      }
      if (departureRequired && !departureValue) {
        alert(t.validationDepartureFlight ?? 'Please enter departure flight info.');
        return;
      }
      if (!transferHotelName.trim()) {
        alert(t.validationHotel ?? 'Please enter hotel name / address.');
        return;
      }
    }
    addItem({
      tourId,
      tourType,
      title: variantTitle,
      date: selectedDate,
      pax,
      basePrice: activeVariant.pricingType === 'per_person' ? activeVariant.adultPrice : activeVariant.adultPrice / Math.max(1, pax),
      options: selectedOptions
        .map((id) => options.find((o) => o.id === id))
        .filter((o): o is { id: string; title: string; price: number; pricingMode?: 'per_person' | 'flat' | 'per_unit' } => Boolean(o))
        .map((o) => {
          const userQty = Math.max(1, optionQuantities[o.id] ?? 1);
          const guestPax = Math.max(1, adults + children + infants);
          const mode: 'per_person' | 'flat' | 'per_unit' =
            o.pricingMode === 'flat' ? 'flat' : o.pricingMode === 'per_unit' ? 'per_unit' : 'per_person';
          const quantity = mode === 'flat' ? 1 : mode === 'per_unit' ? userQty : guestPax;
          return { id: o.id, title: o.title, price: o.price, pricingMode: mode, quantity };
        }),
      listTotalPrice: total,
      totalPrice: payTotal,
      variantId: activeVariant.id,
      startTime: selectedStartTime || null,
      ...((data.hasAirportSelect || tourType === 'TRANSFER') && {
        transferAirport: (activeVariant.airport as VariantSelection['airport'] | null) ?? selection.airport ?? undefined,
        transferDirection: selectedDirection,
        transferFlightArrival:
          (selectedDirection === 'arrival' || selectedDirection === 'roundtrip') && flightArrival ? flightArrival : null,
        transferFlightDeparture:
          (selectedDirection === 'departure' || selectedDirection === 'roundtrip') && flightDeparture ? flightDeparture : null,
        transferHotelName: transferHotelName.trim() || null,
      }),
      childCount: children,
      adultCount: adults,
      infantCount: infants,
    });
    setCartToastTitle(variantTitle);
    setCartToastOpen(true);
  };

  if (data.variants.length === 0) return null;

  return (
    <div className="card tour-detail-booking-card" style={{ padding: 'var(--space-xl)' }}>
      <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        {t.reservationType}
      </h3>

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label className="form-label">{t.selectDate}</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>

      {startTimes.length > 0 ? (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <label className="form-label">
            {t.startTime ?? 'Start time'}
          </label>
          {startTimes.length === 1 ? (
            <div style={{ padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', background: 'var(--color-bg-alt)' }}>
              {startTimes[0]}
            </div>
          ) : (
            <select
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
              required
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
            >
              <option value="">
                {t.selectStartTime ?? 'Select start time'}
              </option>
              {startTimes.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          )}
        </div>
      ) : null}

      {data.hasTourType && (
        <>
          <label className="form-label">{t.tourType}</label>
          <TourTypeToggle
            value={selection.tourType ?? 'eco'}
            onChange={(v) => setSelection((s) => ({ ...s, tourType: v }))}
            labels={{ eco: t.eco, plus: t.plus }}
          />
        </>
      )}

      {data.hasAirportSelect && !isOptionMode && (
        <>
          <label className="form-label">{t.airport}</label>
          <AirportSelector
            value={selection.airport ?? 'NAV'}
            onChange={(v) => setSelection((s) => ({ ...s, airport: v }))}
            labels={{ nav: t.nav, asr: t.asr, navMeta: t.navMeta, asrMeta: t.asrMeta }}
          />
        </>
      )}

      {useReservationTypeCards ? (
        <>
          <label className="form-label">{t.reservationType} *</label>
          <ReservationTypeCards
            variants={variantsWithReservationType}
            value={selectedVariantId ?? ''}
            onChange={(variantId) => {
              setSelectedVariantId(variantId);
              const picked = variantsWithReservationType.find((item) => item.id === variantId) ?? null;
              setSelection((s) => ({
                ...s,
                reservationType: (picked?.reservationType as ReservationTypeVariant | null) ?? s.reservationType,
                airport: (picked?.airport as VariantSelection['airport'] | null) ?? s.airport,
              }));
            }}
            lang={lang}
            showTypeMeta={data.reservationTypeMode === 'private_regular'}
            labels={{
              regular: t.regular,
              private: t.private,
              group: t.group,
              onlyYou: t.onlyYou,
              perPerson: t.perPerson,
              perVehicle: t.perVehicle,
              recommended: t.recommended ?? 'Recommended',
            }}
          />
        </>
      ) : (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label className="form-label">{t.variantOptions ?? 'Options'}</label>
          <div className="reservation-cards">
            {matchingVariants.map((variant) => {
              const selected = activeVariant?.id === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  className={`reservation-card ${variant.isRecommended ? 'recommended' : ''} ${selected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setSelection((s) => ({ ...s, reservationType: variant.reservationType as ReservationTypeVariant | null }));
                  }}
                >
                  {variant.isRecommended && <span className="recommended-badge">★ {t.recommended ?? 'Recommended'}</span>}
                  <strong className="reservation-card-title">{variantTitleFor(lang, variant, variant.titleEn)}</strong>
                  <span className="reservation-card-price">{formatShown(variant.adultPrice).primary}</span>
                  <span className="reservation-card-subtitle">
                    {variant.pricingType === 'per_vehicle' ? (t.perVehicle ?? 'per vehicle') : (t.perPerson ?? 'per person')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {options.length > 0 && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <label className="form-label">{t.optionalAddons ?? 'Optional add-ons'}</label>
          <div className="addons-list">
            {options.map((opt) => {
              const currentQty = optionQuantities[opt.id] ?? 0;
              const selected = currentQty > 0;
              const pax = Math.max(1, adults + children + infants);
              const isFlat = opt.pricingMode === 'flat';
              const isPerUnit = opt.pricingMode === 'per_unit';
              const effectiveMultiplier = isFlat ? 1 : isPerUnit ? Math.max(1, currentQty) : pax;
              const displayPrice = opt.price * effectiveMultiplier;
              const qtyLabel = isFlat ? '1x' : isPerUnit ? `×${effectiveMultiplier}` : `×${pax}`;
              return (
                <label key={opt.id} className={`addon-row ${selected ? 'is-selected' : ''}`}>
                  <span className="addon-left">
                    <input
                      type="checkbox"
                      className="addon-checkbox"
                      checked={selected}
                      onChange={(e) => {
                        const next = e.target.checked ? 1 : 0;
                        setOptionQuantities((prev) => ({ ...prev, [opt.id]: next }));
                      }}
                    />
                    <span className="addon-title">{opt.title}</span>
                  </span>
                  {selected && isPerUnit && (
                    <span className="addon-qty-controls" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
                      <button
                        type="button"
                        className="stepper-btn"
                        disabled={currentQty <= 1}
                        onClick={(e) => {
                          e.preventDefault();
                          setOptionQuantities((prev) => ({ ...prev, [opt.id]: Math.max(1, (prev[opt.id] ?? 1) - 1) }));
                        }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 20, textAlign: 'center' }}>{currentQty}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          setOptionQuantities((prev) => ({ ...prev, [opt.id]: (prev[opt.id] ?? 1) + 1 }));
                        }}
                      >
                        +
                      </button>
                    </span>
                  )}
                  <strong className="addon-price">+{formatShown(displayPrice).primary} <span className="addon-multiplier">({qtyLabel})</span></strong>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {activeVariant && (
        <div className="variant-description">
          <h4>{variantTitle}</h4>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
            {pickTourField(activeVariant as unknown as Record<string, unknown>, 'desc', lang) ?? activeVariant.descEn}
          </p>
          {activeVariant.includes.length > 0 && (
            <>
              <p className="variant-section-title">{t.includedTitle ?? 'Included'}</p>
              <ul className="includes-list">
                {activeVariant.includes.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {activeVariant.includes.length > 0 && activeVariant.excludes.length > 0 && <div className="variant-section-divider" />}
          {activeVariant.excludes.length > 0 && (
            <>
              <p className="variant-section-title">{t.notIncludedTitle ?? 'Not included'}</p>
              <ul className="excludes-list">
                {activeVariant.excludes.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {(data.hasAirportSelect || tourType === 'TRANSFER') && (
        <>
          <label className="form-label">{t.direction} *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'var(--space-md)' }}>
            {(['arrival', 'departure', 'roundtrip'] as const).map((dir) => (
              <label key={dir} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="direction"
                  checked={selectedDirection === dir}
                  onChange={() => setSelectedDirection(dir)}
                />
                <span>
                  {dir === 'arrival' ? t.arrival : dir === 'departure' ? t.departure : t.roundtrip}
                  {dir === 'roundtrip' && <small style={{ marginLeft: '6px', color: 'var(--color-text-muted)' }}>({t.roundtripOff})</small>}
                </span>
              </label>
            ))}
          </div>
          {(selectedDirection === 'arrival' || selectedDirection === 'roundtrip') && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">{t.flightArrival} *</label>
              {flightsArrival.length > 0 ? (
                <select
                  className="transfer-flight-select"
                  value={flightArrival}
                  onChange={(e) => setFlightArrival(e.target.value)}
                  required
                >
                  <option value="">
                    {t.transferPickFlight ?? 'Select flight'}
                  </option>
                  {flightsArrival.map((f) => (
                    <option key={f.id} value={f.code}>{f.code} — {f.airline}</option>
                  ))}
                </select>
              ) : (
                <div className="transfer-no-flights-notice" role="alert">
                  {t.transferNoFlightsAvailable ?? 'No flights configured for this airport. Please contact us.'}
                </div>
              )}
            </div>
          )}
          {(selectedDirection === 'departure' || selectedDirection === 'roundtrip') && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">{t.flightDeparture} *</label>
              {flightsDeparture.length > 0 ? (
                <select
                  className="transfer-flight-select"
                  value={flightDeparture}
                  onChange={(e) => setFlightDeparture(e.target.value)}
                  required
                >
                  <option value="">
                    {t.transferPickFlight ?? 'Select flight'}
                  </option>
                  {flightsDeparture.map((f) => (
                    <option key={f.id} value={f.code}>{f.code} — {f.airline}</option>
                  ))}
                </select>
              ) : (
                <div className="transfer-no-flights-notice" role="alert">
                  {t.transferNoFlightsAvailable ?? 'No flights configured for this airport. Please contact us.'}
                </div>
              )}
            </div>
          )}
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">
              {t.transferHotelSection ?? t.hotel ?? 'Hotel name / address'}
            </label>
            <input
              type="text"
              value={transferHotelName}
              onChange={(e) => setTransferHotelName(e.target.value)}
              placeholder={t.transferHotelPlaceholder ?? 'Hotel name or address'}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
            />
          </div>
        </>
      )}

      <div className="age-group">
        <span className="age-group-label">{t.adults} *</span>
        <div className="stepper-control">
          <button
            type="button"
            className="stepper-btn"
            disabled={adults <= 1}
            onClick={() => setAdults((a) => Math.max(1, a - 1))}
          >
            −
          </button>
          <span>{adults}</span>
          <button
            type="button"
            className="stepper-btn"
            disabled={isAtGuestLimit}
            onClick={() => setAdults((a) => Math.min(maxGuests - children - infants, a + 1))}
          >
            +
          </button>
        </div>
      </div>
      {showChildren && (
        <div className="age-group">
          <span className="age-group-label">{t.children}</span>
          {activeVariant?.childPrice != null && (
            <span className="age-group-price">€{activeVariant.childPrice}/child</span>
          )}
          <div className="stepper-control">
            <button
              type="button"
              className="stepper-btn"
              disabled={children <= 0}
              onClick={() => setChildren((c) => Math.max(0, c - 1))}
            >
              −
            </button>
            <span>{children}</span>
            <button
              type="button"
              className="stepper-btn"
              disabled={isAtGuestLimit}
              onClick={() => setChildren((c) => Math.max(0, Math.min(maxGuests - adults - infants, c + 1)))}
            >
              +
            </button>
          </div>
        </div>
      )}
      {showInfants && (
        <div className="age-group">
          <span className="age-group-label">{t.infants}</span>
          <div className="stepper-control">
            <button
              type="button"
              className="stepper-btn"
              disabled={infants <= 0}
              onClick={() => setInfants((i) => Math.max(0, i - 1))}
            >
              −
            </button>
            <span>{infants}</span>
            <button
              type="button"
              className="stepper-btn"
              disabled={isAtGuestLimit}
              onClick={() => setInfants((i) => Math.max(0, Math.min(maxGuests - adults - children, i + 1)))}
            >
              +
            </button>
          </div>
        </div>
      )}
      {activeVariant?.maxGroupSize != null && (
        <p style={{ marginTop: '8px', marginBottom: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {t.maxGuestsInfo?.replace('{max}', String(maxGuests)) ?? `Maximum ${maxGuests} guests allowed for this option.`}
        </p>
      )}
      <div style={{ marginTop: 'var(--space-sm)', marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 8, background: 'var(--color-bg-alt)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <strong>{t.agePolicyTitle}</strong><br />
        {ageGroups.length > 0 ? (
          <>
            {ageGroups
              .sort((a, b) => a.minAge - b.minAge)
              .map((g, idx) => {
                const IconCmp: LucideIcon =
                  g.pricingType === 'not_allowed' ? Ban
                  : g.pricingType === 'child' ? Baby
                  : g.pricingType === 'free' ? PartyPopper
                  : UserIcon;
                const range = g.maxAge >= 99 ? `${g.minAge}+` : `${g.minAge}-${g.maxAge}`;
                const label = agePriceShortLabelUi(t, g.pricingType);
                const extra = getAgePolicyDetail(g.description, label, g.pricingType);
                return (
                  <span key={`${range}-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 6 }}>
                    <IconCmp size={14} aria-hidden />
                    {range}: {label}{extra ? ` — ${extra}` : ''}
                    <br />
                  </span>
                );
              })}
          </>
        ) : (
          <>
            {t.agePolicyInfant}<br />
            {t.agePolicyChild}<br />
            {t.agePolicyAdult}
          </>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-alt)', borderRadius: '8px' }}>
        {activeVariant && (
          <div style={{ marginBottom: 'var(--space-md)', fontSize: '0.95rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>{variantTitle}</div>
            {activeVariant.pricingType === 'per_person' && (
              <>
                {(activeVariant.privatePriceTiers?.length ?? 0) > 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>
                      {`${adults + children + infants} ${t.guestsWord ?? 'guests'}`}
                    </span>
                    <span>{formatShown(baseTotal).primary}</span>
                  </div>
                ) : (
                  <>
                    {adults > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>{adults} Adult{adults > 1 ? 's' : ''} × {formatShown(activeVariant.adultPrice).primary}</span>
                      <span>{formatShown(activeVariant.adultPrice * adults).primary}</span>
                      </div>
                    )}
                    {children > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>{children} Child × {formatShown(activeVariant.childPrice ?? activeVariant.adultPrice).primary}</span>
                      <span>{formatShown((activeVariant.childPrice ?? activeVariant.adultPrice) * children).primary}</span>
                      </div>
                    )}
                    {infants > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--color-text-muted)' }}>
                        <span>{infants} Infant{infants > 1 ? 's' : ''}</span>
                        <span>{t.free}</span>
                      </div>
                    )}
                  </>
                )}
                {data.hasAirportSelect && selectedDirection === 'roundtrip' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <span>{t.roundtrip} ({t.roundtripOff})</span>
                    <span>×2</span>
                  </div>
                )}
              </>
            )}
            {activeVariant.pricingType === 'per_vehicle' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{adults + children + infants} pax (vehicle)</span>
                  <span>{formatShown(baseTotal).primary}</span>
                </div>
                {data.hasAirportSelect && selectedDirection === 'roundtrip' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <span>{t.roundtrip} ({t.roundtripOff})</span>
                    <span>{t.roundtripApplied ?? 'Applied'}</span>
                  </div>
                )}
              </>
            )}
            {selectedOptionRows.map((row) => (
              <div key={row.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: 'var(--color-text-muted)', paddingLeft: '8px' }}>
                <span>{row.label}</span>
                <span>{formatShown(row.total).primary}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
          <span>{t.total}</span>
          <span style={{ color: 'var(--color-primary)', textAlign: 'right' }}>
            {promoPreview && promoPreview.discount > 0 ? (
              <>
                <span className="tour-price-strike">{formatShown(total).primary}</span>{' '}
                {formatShown(payTotal).primary}
                <small className="tour-promotion-pill" title={promoOff}>
                  {promoPreview.percentOff != null ? `-${promoPreview.percentOff}% ${promoOff}` : `-${formatShown(promoPreview.discount).primary}`}
                </small>
              </>
            ) : (
              <>
                {formatShown(payTotal).primary}
                {formatShown(payTotal).secondary ? <small style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatShown(payTotal).secondary}</small> : null}
              </>
            )}
          </span>
        </div>
        <Button style={{ width: '100%' }} onClick={handleAddToCart} disabled={!activeVariant}>
          {t.addToCart}
        </Button>
      </div>

      <TourBookingTrustExtras
        lang={lang}
        whatsappHref={bookingWhatsappHref}
        whatsappLabel={t.askWhatsApp}
        whyBook={whyBook}
        cancellationNote={cancellationNote}
        policyLabels={tourCancellationLabels}
      />

      {cartToastOpen && (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            width: 'min(92vw, 360px)',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow-lg)',
            padding: 'var(--space-md)',
            zIndex: 999,
          }}
        >
          <p style={{ marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
            ✅ {cartToastTitle} {t.addedToCart}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setCartToastOpen(false);
                router.push(`/${lang}/cart`);
              }}
            >
              {t.goToCart}
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCartToastOpen(false)}>
              {t.continueShopping}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
