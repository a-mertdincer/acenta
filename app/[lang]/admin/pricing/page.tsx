'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  getTours,
  getTourById,
  setTourDatePrice,
  setTourDatePricesBulk,
  getTourDatePricesInRange,
  createTourOption,
  updateTourOption,
  deleteTourOption,
  setTourTransferAirportTiers,
  type DatePriceEntry,
  type TourOptionRow,
  type TransferTier,
} from '../../../actions/tours';
import { expandDateRange, getDaysInMonth } from '@/lib/adminCalendar';

type DateSelectionMode = 'single' | 'range';

export default function AdminPricingPage() {
  const [tours, setTours] = useState<{ id: string; titleEn: string; type: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourId, setTourId] = useState('');
  const [tourType, setTourType] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthData, setMonthData] = useState<{ basePrice: number; defaultCapacity: number; entries: DatePriceEntry[] } | null>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  const [dailyDate, setDailyDate] = useState('');
  const [dailyPrice, setDailyPrice] = useState(150);
  const [dailyCapacity, setDailyCapacity] = useState(20);
  const [dailyClosed, setDailyClosed] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);

  const [options, setOptions] = useState<TourOptionRow[]>([]);
  const [optTitleEn, setOptTitleEn] = useState('');
  const [optTitleTr, setOptTitleTr] = useState('');
  const [optTitleZh, setOptTitleZh] = useState('');
  const [optPriceAdd, setOptPriceAdd] = useState('');
  const [optSaving, setOptSaving] = useState(false);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editOptionTitleEn, setEditOptionTitleEn] = useState('');
  const [editOptionPrice, setEditOptionPrice] = useState('');

  const [transferTiersASR, setTransferTiersASR] = useState<TransferTier[]>([]);
  const [transferTiersNAV, setTransferTiersNAV] = useState<TransferTier[]>([]);
  const [transferSaving, setTransferSaving] = useState(false);

  const [selectionMode, setSelectionMode] = useState<DateSelectionMode>('single');
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCapacity, setBulkCapacity] = useState('');
  const [bulkClosed, setBulkClosed] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    getTours().then((list) => {
      const mapped = list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type }));
      setTours(mapped);
      if (mapped.length > 0) setTourId((prev) => prev || mapped[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!tourId) return;
    getTourById(tourId).then((t) => {
      setOptions(t?.options ?? []);
      setTransferTiersASR(t?.transferAirportTiers?.ASR ?? t?.transferTiers ?? []);
      setTransferTiersNAV(t?.transferAirportTiers?.NAV ?? []);
      setTourType(t?.type ?? '');
      setDailyPrice(t?.basePrice ?? 0);
      setDailyCapacity(t?.capacity ?? 0);
    });
  }, [tourId]);

  const refreshMonthData = async () => {
    if (!tourId || !month) return;
    const [y, m] = month.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setMonthLoading(true);
    const result = await getTourDatePricesInRange(tourId, from, to);
    setMonthData(result ?? null);
    setMonthLoading(false);
  };

  useEffect(() => {
    if (!tourId || !month) return;
    const [y, m] = month.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setMonthLoading(true);
    }, 0);
    getTourDatePricesInRange(tourId, from, to).then((result) => {
      if (cancelled) return;
      setMonthData(result ?? null);
      setMonthLoading(false);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tourId, month]);

  const refreshSelectedTourData = async () => {
    if (!tourId) return;
    const t = await getTourById(tourId);
    setOptions(t?.options ?? []);
    setTransferTiersASR(t?.transferAirportTiers?.ASR ?? t?.transferTiers ?? []);
    setTransferTiersNAV(t?.transferAirportTiers?.NAV ?? []);
    setTourType(t?.type ?? '');
    await refreshMonthData();
  };

  const handleDailySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourId || !dailyDate) return;
    setDailySaving(true);
    const result = await setTourDatePrice(tourId, dailyDate, {
      price: dailyPrice,
      capacityOverride: dailyCapacity,
      isClosed: dailyClosed,
    });
    setDailySaving(false);
    if (result.ok) alert('Günlük fiyat/kapasite güncellendi.');
    else alert(result.error);
    await refreshMonthData();
  };

  const [year, monthNum] = month.split('-').map(Number);
  const calendarCells = useMemo(() => getDaysInMonth(year, monthNum), [year, monthNum]);
  const entriesByDate = useMemo(() => {
    const map: Record<string, { price: number; capacityOverride: number | null; isClosed: boolean }> = {};
    monthData?.entries.forEach((entry) => {
      map[entry.date] = {
        price: entry.price,
        capacityOverride: entry.capacityOverride,
        isClosed: entry.isClosed,
      };
    });
    return map;
  }, [monthData?.entries]);

  const basePrice = monthData?.basePrice ?? 0;
  const defaultCapacity = monthData?.defaultCapacity ?? 0;

  const rangeDates = useMemo(
    () => (selectionMode === 'range' && rangeStart && rangeEnd ? expandDateRange(rangeStart, rangeEnd) : []),
    [selectionMode, rangeStart, rangeEnd]
  );

  const effectiveSelectedDates = useMemo(() => {
    if (selectionMode === 'range') return rangeDates;
    return Array.from(selectedDates).sort();
  }, [selectionMode, rangeDates, selectedDates]);

  const handleCalendarDayClick = (dateStr: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth || selectionMode !== 'single') return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
    setDailyDate(dateStr);
    const current = entriesByDate[dateStr];
    setDailyPrice(current?.price ?? basePrice);
    setDailyCapacity(current?.capacityOverride ?? defaultCapacity);
    setDailyClosed(current?.isClosed ?? false);
  };

  const applyBulkUpdate = async () => {
    if (!tourId || effectiveSelectedDates.length === 0) return;
    const price = parseFloat(bulkPrice);
    if (Number.isNaN(price) || price < 0) {
      alert('Geçerli bir fiyat girin.');
      return;
    }
    const capRaw = bulkCapacity.trim() === '' ? undefined : parseInt(bulkCapacity, 10);
    const capacityOverride = capRaw !== undefined && !Number.isNaN(capRaw) ? capRaw : undefined;
    const confirmText = `${effectiveSelectedDates.length} gün için fiyat €${price.toFixed(2)}, kapasite ${capacityOverride ?? defaultCapacity} olarak güncellenecek. Devam?`;
    if (!confirm(confirmText)) return;
    setBulkSaving(true);
    const result = await setTourDatePricesBulk(tourId, effectiveSelectedDates, {
      price,
      capacityOverride,
      isClosed: bulkClosed,
    });
    setBulkSaving(false);
    if (!result.ok) {
      alert(result.error ?? 'Toplu güncelleme başarısız.');
      return;
    }
    alert(`${result.updatedCount ?? effectiveSelectedDates.length} gün güncellendi.`);
    setSelectedDates(new Set());
    await refreshMonthData();
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourId || !optTitleEn.trim()) return;
    setOptSaving(true);
    const result = await createTourOption(tourId, {
      titleEn: optTitleEn.trim(),
      titleTr: optTitleTr.trim() || optTitleEn.trim(),
      titleZh: optTitleZh.trim() || optTitleEn.trim(),
      priceAdd: parseFloat(optPriceAdd) || 0,
    });
    setOptSaving(false);
    if (!result.ok) return alert(result.error);
    setOptTitleEn('');
    setOptTitleTr('');
    setOptTitleZh('');
    setOptPriceAdd('');
    await refreshSelectedTourData();
  };

  const startEditOption = (o: TourOptionRow) => {
    setEditingOptionId(o.id);
    setEditOptionTitleEn(o.titleEn);
    setEditOptionPrice(String(o.priceAdd));
  };

  const handleUpdateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOptionId) return;
    const result = await updateTourOption(editingOptionId, {
      titleEn: editOptionTitleEn.trim(),
      priceAdd: parseFloat(editOptionPrice) || 0,
    });
    if (!result.ok) return alert(result.error);
    setEditingOptionId(null);
    await refreshSelectedTourData();
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm('Bu opsiyonu silmek istediğinize emin misiniz?')) return;
    const result = await deleteTourOption(id);
    if (!result.ok) return alert(result.error);
    await refreshSelectedTourData();
  };

  const addTransferTier = (airport: 'ASR' | 'NAV') => {
    if (airport === 'ASR') setTransferTiersASR((prev) => [...prev, { minPax: 1, maxPax: 4, price: 50 }]);
    else setTransferTiersNAV((prev) => [...prev, { minPax: 1, maxPax: 4, price: 50 }]);
  };

  const updateTransferTier = (airport: 'ASR' | 'NAV', index: number, field: keyof TransferTier, value: number) => {
    if (airport === 'ASR') {
      setTransferTiersASR((prev) => prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
    } else {
      setTransferTiersNAV((prev) => prev.map((tier, i) => (i === index ? { ...tier, [field]: value } : tier)));
    }
  };

  const removeTransferTier = (airport: 'ASR' | 'NAV', index: number) => {
    if (airport === 'ASR') setTransferTiersASR((prev) => prev.filter((_, i) => i !== index));
    else setTransferTiersNAV((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveTransferTiers = async () => {
    if (!tourId) return;
    setTransferSaving(true);
    const result = await setTourTransferAirportTiers(tourId, { ASR: transferTiersASR, NAV: transferTiersNAV });
    setTransferSaving(false);
    if (result.ok) alert('ASR/NAV transfer kademeleri kaydedildi.');
    else alert(result.error);
  };

  if (loading) return <div className="loading-block">Fiyatlandırma ekranı yükleniyor...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Fiyatlandırma ve Müsaitlik</h1>

      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Ürün Fiyat Takvimi</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'end', marginBottom: 'var(--space-md)' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Ürün</label>
            <select value={tourId} onChange={(e) => setTourId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>{t.titleEn} ({t.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Ay</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" checked={selectionMode === 'range'} onChange={() => setSelectionMode('range')} />
            <span>Tarih Aralığı</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="radio" checked={selectionMode === 'single'} onChange={() => setSelectionMode('single')} />
            <span>Tekil Tarihler</span>
          </label>
          {selectionMode === 'range' && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <Input label="Başlangıç" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
              <Input label="Bitiş" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, minWidth: 320 }}>
          {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((label) => (
            <div key={label} style={{ padding: 'var(--space-xs)', textAlign: 'center', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>{label}</div>
          ))}
          {calendarCells.map((cell, idx) => {
            const entry = entriesByDate[cell.dateStr];
            const closed = entry?.isClosed ?? false;
            const isRangeSelected = selectionMode === 'range' && rangeDates.includes(cell.dateStr);
            const isSingleSelected = selectionMode === 'single' && selectedDates.has(cell.dateStr);
            const selected = isRangeSelected || isSingleSelected;
            return (
              <button
                key={`${cell.dateStr}-${idx}`}
                type="button"
                onClick={() => handleCalendarDayClick(cell.dateStr, cell.isCurrentMonth)}
                disabled={!cell.isCurrentMonth}
                style={{
                  minHeight: 78,
                  textAlign: 'left',
                  padding: 'var(--space-sm)',
                  borderRadius: 8,
                  border: selected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: selected ? '#dbeafe' : closed ? 'var(--color-bg-light)' : 'var(--color-bg-card)',
                  opacity: cell.isCurrentMonth ? 1 : 0.55,
                  cursor: cell.isCurrentMonth ? 'pointer' : 'default',
                }}
              >
                <div style={{ fontWeight: 700 }}>{cell.day}</div>
                {cell.isCurrentMonth && (
                  <>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>€{(entry?.price ?? basePrice).toFixed(2)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Kap: {entry?.capacityOverride ?? defaultCapacity}</div>
                    {closed && <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Kapalı</div>}
                  </>
                )}
              </button>
            );
          })}
        </div>
        {monthLoading && <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-muted)' }}>Takvim verisi yükleniyor...</p>}
      </div>

      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Toplu Güncelle</h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
          Seçili gün: <strong>{effectiveSelectedDates.length}</strong>
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'end' }}>
          <Input label="Fiyat (€)" type="number" step="0.01" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder={String(basePrice)} />
          <Input label="Kapasite" type="number" min={0} value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} placeholder={String(defaultCapacity)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input type="checkbox" checked={bulkClosed} onChange={(e) => setBulkClosed(e.target.checked)} />
            <span>Bu günleri kapat</span>
          </label>
          <Button onClick={applyBulkUpdate} disabled={bulkSaving || effectiveSelectedDates.length === 0}>
            {bulkSaving ? 'Toplu güncelleniyor...' : 'Toplu Güncelle'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleDailySubmit} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Günlük Fiyat / Kapasite / Gün Kapat</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tur</label>
            <select value={tourId} onChange={(e) => setTourId(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>{t.titleEn} ({t.type})</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tarih</label>
            <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)' }} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <Input label="Fiyat (€)" type="number" value={String(dailyPrice)} onChange={(e) => setDailyPrice(Number(e.target.value))} />
          </div>
          <div style={{ flex: '1 1 120px' }}>
            <Input label="Kapasite" type="number" value={String(dailyCapacity)} onChange={(e) => setDailyCapacity(Number(e.target.value))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={dailyClosed} onChange={(e) => setDailyClosed(e.target.checked)} />
            <span>Bu günü kapat</span>
          </label>
          <Button type="submit" disabled={dailySaving}>{dailySaving ? 'Kaydediliyor...' : 'Güncelle'}</Button>
        </div>
      </form>

      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Tur Opsiyonları (Ekstralar)</h2>
        <form onSubmit={handleAddOption} style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <Input label="Başlık (EN) *" value={optTitleEn} onChange={(e) => setOptTitleEn(e.target.value)} />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <Input label="Başlık (TR)" value={optTitleTr} onChange={(e) => setOptTitleTr(e.target.value)} />
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <Input label="Başlık (ZH)" value={optTitleZh} onChange={(e) => setOptTitleZh(e.target.value)} />
            </div>
            <div style={{ flex: '1 1 120px' }}>
              <Input label="Ek fiyat (€)" type="number" step="0.01" value={optPriceAdd} onChange={(e) => setOptPriceAdd(e.target.value)} />
            </div>
            <Button type="submit" disabled={optSaving}>{optSaving ? 'Ekleniyor...' : 'Opsiyon ekle'}</Button>
          </div>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left' }}>Başlık (EN)</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left' }}>Ek fiyat</th>
                <th style={{ padding: 'var(--space-md)', textAlign: 'left' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {options.map((o) => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {editingOptionId === o.id ? (
                    <>
                      <td style={{ padding: 'var(--space-md)' }}>
                        <form onSubmit={handleUpdateOption} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Input label="Başlık" value={editOptionTitleEn} onChange={(e) => setEditOptionTitleEn(e.target.value)} />
                          <Input label="Fiyat" type="number" step="0.01" value={editOptionPrice} onChange={(e) => setEditOptionPrice(e.target.value)} />
                          <Button type="submit">Kaydet</Button>
                          <Button type="button" variant="secondary" onClick={() => setEditingOptionId(null)}>İptal</Button>
                        </form>
                      </td>
                      <td colSpan={2} />
                    </>
                  ) : (
                    <>
                      <td style={{ padding: 'var(--space-md)' }}>{o.titleEn}</td>
                      <td style={{ padding: 'var(--space-md)' }}>+€{o.priceAdd}</td>
                      <td style={{ padding: 'var(--space-md)' }}>
                        <Button variant="secondary" style={{ marginRight: 8 }} onClick={() => startEditOption(o)}>Düzenle</Button>
                        <Button variant="secondary" onClick={() => handleDeleteOption(o.id)}>Sil</Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {options.length === 0 && <p style={{ paddingTop: 'var(--space-md)', color: 'var(--color-text-muted)' }}>Bu tur için opsiyon yok.</p>}
        </div>
      </div>

      {tourType === 'TRANSFER' && (
        <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>Havalimanına Göre Transfer Fiyatı (ASR / NAV)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2xl)' }}>
            {[
              { key: 'ASR' as const, title: 'ASR (Kayseri)' },
              { key: 'NAV' as const, title: 'NAV (Nevşehir)' },
            ].map(({ key, title }) => {
              const list = key === 'ASR' ? transferTiersASR : transferTiersNAV;
              return (
                <div key={key}>
                  <h3 style={{ marginBottom: 'var(--space-md)' }}>{title}</h3>
                  <table style={{ width: '100%', maxWidth: 380, borderCollapse: 'collapse', marginBottom: 'var(--space-md)' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                        <th style={{ padding: 'var(--space-sm)' }}>Min</th>
                        <th style={{ padding: 'var(--space-sm)' }}>Max</th>
                        <th style={{ padding: 'var(--space-sm)' }}>Fiyat (€)</th>
                        <th style={{ padding: 'var(--space-sm)' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((tier, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: 'var(--space-sm)' }}><input type="number" min={1} value={tier.minPax} onChange={(e) => updateTransferTier(key, i, 'minPax', parseInt(e.target.value, 10) || 1)} style={{ width: 60, padding: 4 }} /></td>
                          <td style={{ padding: 'var(--space-sm)' }}><input type="number" min={1} value={tier.maxPax} onChange={(e) => updateTransferTier(key, i, 'maxPax', parseInt(e.target.value, 10) || 1)} style={{ width: 60, padding: 4 }} /></td>
                          <td style={{ padding: 'var(--space-sm)' }}><input type="number" min={0} step="0.01" value={tier.price} onChange={(e) => updateTransferTier(key, i, 'price', parseFloat(e.target.value) || 0)} style={{ width: 80, padding: 4 }} /></td>
                          <td style={{ padding: 'var(--space-sm)' }}><button type="button" onClick={() => removeTransferTier(key, i)}>Kaldır</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Button variant="secondary" onClick={() => addTransferTier(key)}>{key} kademe ekle</Button>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Button onClick={handleSaveTransferTiers} disabled={transferSaving}>{transferSaving ? 'Kaydediliyor...' : 'ASR ve NAV fiyatlarını kaydet'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
