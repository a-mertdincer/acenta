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

type Lang = 'en' | 'tr' | 'zh';
type TransferDirection = 'arrival' | 'departure' | 'roundtrip';

const DICTS = { en: enDict, tr: trDict, zh: zhDict } as const;

function getVariantStrings(lang: Lang): Record<string, string> {
  const variant = (DICTS[lang] as { variant?: Record<string, string> })?.variant;
  return variant ?? (DICTS.en as { variant?: Record<string, string> }).variant ?? {};
}

export function ProductVariantBookingCard({
  tourId,
  tourType,
  lang,
  data,
  title,
}: {
  tourId: string;
  tourType: string;
  lang: Lang;
  data: TourWithVariantsResult;
  title: string;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const t = useMemo(() => getVariantStrings(lang), [lang]);

  const defaultSelection = useMemo(
    () => getDefaultVariantSelection(data.hasTourType, data.hasAirportSelect),
    [data.hasTourType, data.hasAirportSelect]
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

  const activeVariant = useMemo(
    () => getActiveVariant(data.variants, selection),
    [data.variants, selection]
  );

  const variantsForReservationType = useMemo(() => {
    return data.variants.filter((v) => {
      const tourTypeMatch = (v.tourType ?? null) === selection.tourType;
      const airportMatch = (v.airport ?? null) === selection.airport;
      return tourTypeMatch && airportMatch;
    });
  }, [data.variants, selection.tourType, selection.airport]);

  const total = useMemo(() => {
    if (!activeVariant) return 0;
    const direction = data.hasAirportSelect ? selectedDirection : undefined;
    return calculateVariantTotal(activeVariant, adults, children, infants, direction);
  }, [activeVariant, adults, children, infants, data.hasAirportSelect, selectedDirection]);

  const variantTitle = activeVariant
    ? lang === 'tr'
      ? activeVariant.titleTr
      : lang === 'zh'
        ? activeVariant.titleZh
        : activeVariant.titleEn
    : title;

  const handleAddToCart = () => {
    if (!activeVariant) return;
    const pax = adults + children + infants;
    addItem({
      tourId,
      tourType,
      title: variantTitle,
      date: selectedDate,
      pax,
      basePrice: activeVariant.pricingType === 'per_person' ? activeVariant.adultPrice : activeVariant.adultPrice / Math.max(1, pax),
      options: [],
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
    router.push(`/${lang}/cart`);
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

      <label className="form-label">{t.reservationType} *</label>
      <ReservationTypeCards
        variants={variantsForReservationType}
        value={selection.reservationType}
        onChange={(v) => setSelection((s) => ({ ...s, reservationType: v }))}
        lang={lang}
        labels={{
          regular: t.regular,
          private: t.private,
          group: t.group,
          onlyYou: t.onlyYou,
          perPerson: t.perPerson,
          perVehicle: t.perVehicle,
        }}
      />

      {activeVariant && (
        <div className="variant-description">
          <h4>{variantTitle}</h4>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
            {lang === 'tr' ? activeVariant.descTr : lang === 'zh' ? activeVariant.descZh : activeVariant.descEn}
          </p>
          {activeVariant.includes.length > 0 && (
            <ul className="includes-list">
              {activeVariant.includes.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
          {activeVariant.excludes.length > 0 && (
            <ul className="excludes-list">
              {activeVariant.excludes.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
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
          <button type="button" className="stepper-btn" onClick={() => setAdults((a) => a + 1)}>+</button>
        </div>
      </div>
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
          <button type="button" className="stepper-btn" onClick={() => setChildren((c) => c + 1)}>+</button>
        </div>
      </div>
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
          <button type="button" className="stepper-btn" onClick={() => setInfants((i) => i + 1)}>+</button>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', backgroundColor: 'var(--color-bg-alt)', borderRadius: '8px' }}>
        {activeVariant && (
          <div style={{ marginBottom: 'var(--space-md)', fontSize: '0.95rem' }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>{variantTitle}</div>
            {activeVariant.pricingType === 'per_person' && (
              <>
                {adults > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{adults} Adult{adults > 1 ? 's' : ''} × €{activeVariant.adultPrice.toFixed(2)}</span>
                    <span>€{(activeVariant.adultPrice * adults).toFixed(2)}</span>
                  </div>
                )}
                {children > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>{children} Child × €{(activeVariant.childPrice ?? activeVariant.adultPrice).toFixed(2)}</span>
                    <span>€{((activeVariant.childPrice ?? activeVariant.adultPrice) * children).toFixed(2)}</span>
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
                  <span>{adults + children} pax (vehicle)</span>
                  <span>€{activeVariant.adultPrice.toFixed(2)}</span>
                </div>
                {data.hasAirportSelect && selectedDirection === 'roundtrip' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <span>{t.roundtrip} ({t.roundtripOff})</span>
                    <span>€{(activeVariant.adultPrice * 2 * 0.9).toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-sm)' }}>
          <span>{t.total}</span>
          <span style={{ color: 'var(--color-primary)' }}>€{total.toFixed(2)}</span>
        </div>
        <Button style={{ width: '100%' }} onClick={handleAddToCart} disabled={!activeVariant}>
          {t.addToCart}
        </Button>
        <p style={{ textAlign: 'center', marginTop: 'var(--space-sm)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          {t.askWhatsApp}
        </p>
      </div>
    </div>
  );
}
