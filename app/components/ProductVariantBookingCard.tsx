'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './Button';
import { useCartStore } from '../store/cartStore';
import { TourTypeToggle } from './TourTypeToggle';
import { ReservationTypeCards } from './ReservationTypeCards';
import { AirportSelector } from './AirportSelector';
import { getFlights } from '@/app/actions/flights';
import {
  getActiveVariant,
  getDefaultVariantSelection,
  calculateVariantTotal,
  type VariantSelection,
  type TourVariantDisplay,
} from '@/lib/types/variant';
import type { TourWithVariantsResult } from '@/app/actions/variants';
import enDict from '@/app/dictionaries/en.json';
import trDict from '@/app/dictionaries/tr.json';
import zhDict from '@/app/dictionaries/zh.json';
import { resolveTierPrice } from '@/lib/pricingTiers';
import { useExchangeRate } from '@/app/hooks/useExchangeRate';
import { formatPriceByLang } from '@/lib/currency';

type Lang = 'en' | 'tr' | 'zh';
type TransferDirection = 'arrival' | 'departure' | 'roundtrip';

const DICTS = { en: enDict, tr: trDict, zh: zhDict } as const;

function getVariantStrings(lang: Lang): Record<string, string> {
  const variant = (DICTS[lang] as { variant?: Record<string, string> })?.variant;
  return variant ?? (DICTS.en as { variant?: Record<string, string> }).variant ?? {};
}

function normalizeNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed.toLowerCase();
}

function getVariantLabel(lang: Lang, variant: TourVariantDisplay): string {
  return lang === 'tr' ? variant.titleTr : lang === 'zh' ? variant.titleZh : variant.titleEn;
}

export function ProductVariantBookingCard({
  tourId,
  tourType,
  lang,
  data,
  title,
  options,
  ageGroups = [],
  minAgeLimit = null,
  ageRestrictionText = null,
}: {
  tourId: string;
  tourType: string;
  lang: Lang;
  data: TourWithVariantsResult;
  title: string;
  options: { id: string; title: string; price: number; pricingMode?: 'per_person' | 'flat' }[];
  ageGroups?: {
    minAge: number;
    maxAge: number;
    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
    description: string;
  }[];
  minAgeLimit?: number | null;
  ageRestrictionText?: string | null;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const t = useMemo(() => getVariantStrings(lang), [lang]);
  const { eurTryRate } = useExchangeRate(lang === 'tr');

  const defaultSelection = useMemo(
    () => getDefaultVariantSelection(data.hasTourType, data.hasAirportSelect, data.hasReservationType),
    [data.hasTourType, data.hasAirportSelect, data.hasReservationType]
  );

  const [selection, setSelection] = useState<VariantSelection>(defaultSelection);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [hotelName, setHotelName] = useState('');
  const [note, setNote] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<TransferDirection>('arrival');
  const [flightArrival, setFlightArrival] = useState('');
  const [flightDeparture, setFlightDeparture] = useState('');
  const [flightsArrival, setFlightsArrival] = useState<{ id: string; code: string; airline: string }[]>([]);
  const [flightsDeparture, setFlightsDeparture] = useState<{ id: string; code: string; airline: string }[]>([]);
  const [cartToastOpen, setCartToastOpen] = useState(false);
  const [cartToastTitle, setCartToastTitle] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
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
    if (!data.hasAirportSelect) return;
    const airport = selection.airport ?? 'NAV';
    getFlights({ airport, direction: 'arrival' }).then((list) =>
      setFlightsArrival(list.map((f) => ({ id: f.id, code: f.code, airline: f.airline })))
    );
    getFlights({ airport, direction: 'departure' }).then((list) =>
      setFlightsDeparture(list.map((f) => ({ id: f.id, code: f.code, airline: f.airline })))
    );
  }, [data.hasAirportSelect, selection.airport]);

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
    const selectedAirport = normalizeNullable(selection.airport);
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
  }, [data.variants, selection.tourType, selection.airport]);

  const activeVariant = useMemo(() => {
    if (data.hasReservationType) return getActiveVariant(data.variants, selection);
    if (matchingVariants.length === 0) return null;
    if (selectedVariantId) {
      const picked = matchingVariants.find((v) => v.id === selectedVariantId);
      if (picked) return picked;
    }
    return matchingVariants.find((v) => v.isRecommended) ?? matchingVariants[0];
  }, [data.hasReservationType, data.variants, selection, matchingVariants, selectedVariantId]);
  const transferAirportTiers = useMemo(
    () => data.transferAirportTiers?.[selection.airport ?? 'NAV'] ?? null,
    [data.transferAirportTiers, selection.airport]
  );
  const tierDerivedMax = useMemo(() => {
    if (!transferAirportTiers || transferAirportTiers.length === 0) return null;
    return transferAirportTiers.reduce((max, tier) => Math.max(max, tier.maxPax), 0);
  }, [transferAirportTiers]);
  const maxGuests = Math.max(1, activeVariant?.maxGroupSize ?? tierDerivedMax ?? 99);
  const totalGuests = adults + children + infants;
  const isAtGuestLimit = totalGuests >= maxGuests;

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
    setSelection((s) => ({ ...s, reservationType: data.hasReservationType ? (fallback.reservationType as 'regular' | 'private' | null) : null }));
  }, [activeVariant, matchingVariants, data.hasReservationType]);

  const total = useMemo(() => {
    if (!activeVariant) return 0;
    const totalPax = Math.max(1, adults + children + infants);
    const effectivePrivateTiers =
      activeVariant.reservationType === 'private'
        ? (activeVariant.privatePriceTiers && activeVariant.privatePriceTiers.length > 0
          ? activeVariant.privatePriceTiers
          : transferAirportTiers)
        : null;
    const tieredVariant =
      effectivePrivateTiers && effectivePrivateTiers.length > 0
        ? { ...activeVariant, privatePriceTiers: effectivePrivateTiers }
        : activeVariant;
    const direction = data.hasAirportSelect ? selectedDirection : undefined;
    const baseTotal = calculateVariantTotal(tieredVariant, adults, children, infants, direction);
    // Per-person private tiers can still override base adult price by pax bracket.
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
      return sum + (opt.pricingMode === 'flat' ? opt.price : opt.price * totalPax);
    }, 0);
    return baseTotal + extrasTotal;
  }, [activeVariant, adults, children, infants, data.hasAirportSelect, selectedDirection, transferAirportTiers, selection.airport, selectedOptions, options]);

  const variantTitle = activeVariant
    ? lang === 'tr'
      ? activeVariant.titleTr
      : lang === 'zh'
        ? activeVariant.titleZh
        : activeVariant.titleEn
    : title;
  const formatShown = (eur: number) => formatPriceByLang(eur, lang, eurTryRate);

  const handleAddToCart = () => {
    if (!activeVariant) {
      alert('Bu seçenek için uygun varyant bulunamadı.');
      return;
    }
    const pax = adults + children + infants;
    if (pax > maxGuests) {
      alert(t.maxGuestsInfo?.replace('{max}', String(maxGuests)) ?? `Maksimum ${maxGuests} kişi kabul edilmektedir.`);
      return;
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
        .filter((o): o is { id: string; title: string; price: number; pricingMode?: 'per_person' | 'flat' } => Boolean(o))
        .map((o) => ({ id: o.id, title: o.title, price: o.price, pricingMode: o.pricingMode === 'flat' ? 'flat' : 'per_person' })),
      totalPrice: total,
      variantId: activeVariant.id,
      ...(data.hasAirportSelect && {
        transferAirport: selection.airport ?? undefined,
        transferDirection: selectedDirection,
        transferFlightArrival: selectedDirection === 'arrival' || selectedDirection === 'roundtrip' ? flightArrival || null : null,
        transferFlightDeparture: selectedDirection === 'departure' || selectedDirection === 'roundtrip' ? flightDeparture || null : null,
        transferHotelName: hotelName || null,
      }),
      childCount: children,
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

      {data.hasAirportSelect && (
        <>
          <label className="form-label">{t.airport}</label>
          <AirportSelector
            value={selection.airport ?? 'NAV'}
            onChange={(v) => setSelection((s) => ({ ...s, airport: v }))}
            labels={{ nav: t.nav, asr: t.asr, navMeta: t.navMeta, asrMeta: t.asrMeta }}
          />
        </>
      )}

      {data.hasReservationType ? (
        <>
          <label className="form-label">{t.reservationType} *</label>
          <ReservationTypeCards
            variants={matchingVariants}
            value={(selection.reservationType ?? 'regular') as 'regular' | 'private'}
            onChange={(v) => setSelection((s) => ({ ...s, reservationType: v }))}
            lang={lang}
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
                    setSelection((s) => ({ ...s, reservationType: variant.reservationType as 'regular' | 'private' | null }));
                  }}
                >
                  {variant.isRecommended && <span className="recommended-badge">★ {t.recommended ?? 'Recommended'}</span>}
                  <strong className="reservation-card-title">{getVariantLabel(lang, variant)}</strong>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((opt) => {
              const selected = selectedOptions.includes(opt.id);
              const displayPrice = opt.pricingMode === 'flat' ? opt.price : opt.price * Math.max(1, adults + children + infants);
              return (
                <label key={opt.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, border: '1px solid var(--color-border)', borderRadius: 8, padding: '8px 10px', background: selected ? 'var(--color-bg-alt)' : 'transparent' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        setSelectedOptions((prev) => (prev.includes(opt.id) ? prev.filter((id) => id !== opt.id) : [...prev, opt.id]));
                      }}
                    />
                    <span>{opt.title}</span>
                  </span>
                  <strong style={{ color: 'var(--color-primary)' }}>+{formatShown(displayPrice).primary}</strong>
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
            {lang === 'tr' ? activeVariant.descTr : lang === 'zh' ? activeVariant.descZh : activeVariant.descEn}
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

      {data.hasAirportSelect && (
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
              <label className="form-label">{t.flightArrival}</label>
              <input
                type="text"
                list="flights-arrival"
                value={flightArrival}
                onChange={(e) => setFlightArrival(e.target.value)}
                placeholder="e.g. TK 2000"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
              />
              <datalist id="flights-arrival">
                {flightsArrival.map((f) => (
                  <option key={f.id} value={f.code}>{f.airline}</option>
                ))}
              </datalist>
            </div>
          )}
          {(selectedDirection === 'departure' || selectedDirection === 'roundtrip') && (
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label className="form-label">{t.flightDeparture}</label>
              <input
                type="text"
                list="flights-departure"
                value={flightDeparture}
                onChange={(e) => setFlightDeparture(e.target.value)}
                placeholder="e.g. TK 2001"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
              />
              <datalist id="flights-departure">
                {flightsDeparture.map((f) => (
                  <option key={f.id} value={f.code}>{f.airline}</option>
                ))}
              </datalist>
            </div>
          )}
        </>
      )}

      <div style={{ marginBottom: 'var(--space-md)' }}>
        <label className="form-label">{t.hotel}</label>
        <input
          type="text"
          value={hotelName}
          onChange={(e) => setHotelName(e.target.value)}
          placeholder={data.hasAirportSelect ? 'e.g. Kelebek Cave Hotel' : ''}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>

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
                const icon = g.pricingType === 'not_allowed' ? '⛔' : g.pricingType === 'child' ? '👶' : g.pricingType === 'free' ? '🎉' : '👤';
                const range = g.maxAge >= 99 ? `${g.minAge}+` : `${g.minAge}-${g.maxAge}`;
                return <span key={`${range}-${idx}`}>{icon} {range}: {g.description}<br /></span>;
              })}
            {ageRestrictionText ? <span>⚠️ {ageRestrictionText}</span> : null}
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
                  <span>{formatShown(total).primary}</span>
                </div>
                {data.hasAirportSelect && selectedDirection === 'roundtrip' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <span>{t.roundtrip} ({t.roundtripOff})</span>
                    <span>Uygulandı</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
          <span>{t.total}</span>
          <span style={{ color: 'var(--color-primary)' }}>
            {formatShown(total).primary}
            {formatShown(total).secondary ? <small style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatShown(total).secondary}</small> : null}
          </span>
        </div>
        <Button style={{ width: '100%' }} onClick={handleAddToCart} disabled={!activeVariant}>
          {t.addToCart}
        </Button>
        <p style={{ textAlign: 'center', marginTop: 'var(--space-sm)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {t.askWhatsApp}
        </p>
      </div>

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
