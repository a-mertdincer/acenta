'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTours, getTourDatePricesInRange, setTourDatePrice, type DatePriceEntry } from '../../../actions/tours';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number): { dateStr: string; day: number; isCurrentMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const firstWeekday = first.getDay();
  const lastDay = last.getDate();
  const cells: { dateStr: string; day: number; isCurrentMonth: boolean }[] = [];
  const startPadding = firstWeekday;
  for (let i = 0; i < startPadding; i++) {
    const d = new Date(year, month - 1, -startPadding + i + 1);
    cells.push({
      dateStr: toLocalDateStr(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 0; i < remaining; i++) {
    const d = new Date(year, month, i + 1);
    cells.push({
      dateStr: toLocalDateStr(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  return cells;
}

export default function AdminBalloonCalendarPage() {
  const [tours, setTours] = useState<{ id: string; titleEn: string; type: string; basePrice: number; capacity: number }[]>([]);
  const [balloonTourId, setBalloonTourId] = useState('');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [data, setData] = useState<{ basePrice: number; defaultCapacity: number; entries: DatePriceEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editDate, setEditDate] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCapacity, setEditCapacity] = useState('');
  const [editClosed, setEditClosed] = useState(false);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCapacity, setBulkCapacity] = useState('');
  const [bulkClosed, setBulkClosed] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    getTours().then((list) => {
      const balloon = list.filter((t) => t.type === 'BALLOON').map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice, capacity: t.capacity }));
      setTours(balloon);
      if (balloon.length > 0 && !balloonTourId) setBalloonTourId(balloon[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!balloonTourId || !month) return;
    const [y, m] = month.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setLoading(true);
    getTourDatePricesInRange(balloonTourId, from, to).then((res) => {
      setData(res ?? null);
      setLoading(false);
    });
  }, [balloonTourId, month]);

  const [year, monthNum] = month.split('-').map(Number);
  const calendarCells = useMemo(() => getDaysInMonth(year, monthNum), [year, monthNum]);
  const entriesByDate = useMemo(() => {
    const map: Record<string, { price: number; capacityOverride: number | null; isClosed: boolean }> = {};
    data?.entries.forEach((e) => {
      map[e.date] = { price: e.price, capacityOverride: e.capacityOverride, isClosed: e.isClosed };
    });
    return map;
  }, [data?.entries]);

  const basePrice = data?.basePrice ?? 0;
  const defaultCapacity = data?.defaultCapacity ?? 0;

  const openEdit = (dateStr: string) => {
    if (bulkMode) {
      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (next.has(dateStr)) next.delete(dateStr);
        else next.add(dateStr);
        return next;
      });
      return;
    }
    const entry = entriesByDate[dateStr];
    setEditDate(dateStr);
    setEditPrice(entry ? String(entry.price) : String(basePrice));
    setEditCapacity(entry?.capacityOverride != null ? String(entry.capacityOverride) : String(defaultCapacity));
    setEditClosed(entry?.isClosed ?? false);
  };

  const selectAllCurrentMonth = () => {
    const currentMonthCells = calendarCells.filter((c) => c.isCurrentMonth);
    setSelectedDates(new Set(currentMonthCells.map((c) => c.dateStr)));
  };

  const clearSelection = () => setSelectedDates(new Set());

  const applyBulkUpdate = async () => {
    if (!balloonTourId || selectedDates.size === 0) return;
    const price = parseFloat(bulkPrice);
    if (Number.isNaN(price) || price < 0) {
      alert('Geçerli bir fiyat girin.');
      return;
    }
    setBulkSaving(true);
    const cap = bulkCapacity.trim() === '' ? undefined : parseInt(bulkCapacity, 10);
    const capacityOverride = cap !== undefined && !Number.isNaN(cap) ? cap : undefined;
    const dates = Array.from(selectedDates);
    let ok = 0;
    for (const dateStr of dates) {
      const result = await setTourDatePrice(balloonTourId, dateStr, {
        price,
        capacityOverride,
        isClosed: bulkClosed,
      });
      if (result.ok) ok++;
    }
    setBulkSaving(false);
    if (ok === dates.length) {
      setSelectedDates(new Set());
      const [y, m] = month.split('-').map(Number);
      const from = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const nextData = await getTourDatePricesInRange(balloonTourId, from, to);
      setData(nextData ?? null);
    } else alert(`${ok}/${dates.length} gün güncellendi. Bazı günler kaydedilemedi.`);
  };

  const saveEdit = async () => {
    if (!editDate || !balloonTourId) return;
    setSaving(true);
    const cap = editCapacity.trim() === '' ? undefined : parseInt(editCapacity, 10);
    const capacityOverride = cap !== undefined && !Number.isNaN(cap) ? cap : undefined;
    const result = await setTourDatePrice(balloonTourId, editDate, {
      price: parseFloat(editPrice) || basePrice,
      capacityOverride,
      isClosed: Boolean(editClosed),
    });
    if (!result.ok) {
      setSaving(false);
      alert(result.error ?? 'Kaydetme başarısız.');
      return;
    }
    const [y, m] = month.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const nextData = await getTourDatePricesInRange(balloonTourId, from, to);
    setData(nextData ?? null);
    setEditDate(null);
    setSaving(false);
  };

  const weekDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

  if (loading && !data) return <div className="loading-block">Yükleniyor...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Balon Fiyat Takvimi</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
        Her güne ayrı fiyat girebilir, kapasite sınırı koyabilir ve günü kapatabilirsiniz. Takvimde bir güne tıklayarak düzenleyin. Toplu güncelleme için &quot;Birden fazla gün seç&quot; ile günleri seçip aynı fiyatı uygulayın.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Balon turu</label>
          <select
            value={balloonTourId}
            onChange={(e) => setBalloonTourId(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)', minWidth: '200px' }}
          >
            {tours.map((t) => (
              <option key={t.id} value={t.id}>{t.titleEn}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Ay</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginTop: '1.5rem' }}>
          <input type="checkbox" checked={bulkMode} onChange={(e) => { setBulkMode(e.target.checked); if (!e.target.checked) setSelectedDates(new Set()); }} />
          <span>Birden fazla gün seç (toplu güncelleme)</span>
        </label>
      </div>

      {selectedDates.size > 0 && (
        <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 'bold' }}>Seçilen {selectedDates.size} gün</span>
          <Button variant="secondary" type="button" onClick={selectAllCurrentMonth}>Bu ayın tümünü seç</Button>
          <Button variant="secondary" type="button" onClick={clearSelection}>Seçimi temizle</Button>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Input label="Fiyat (€)" type="number" step="0.01" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder={String(basePrice)} style={{ width: '100px' }} />
            <Input label="Kapasite" type="number" min="0" value={bulkCapacity} onChange={(e) => setBulkCapacity(e.target.value)} placeholder={String(defaultCapacity)} style={{ width: '80px' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input type="checkbox" checked={bulkClosed} onChange={(e) => setBulkClosed(e.target.checked)} />
              <span>Günleri kapat</span>
            </label>
            <Button onClick={applyBulkUpdate} disabled={bulkSaving}>{bulkSaving ? 'Uygulanıyor…' : 'Seçilen günlere uygula'}</Button>
          </div>
        </div>
      )}

      {tours.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz BALLOON tipinde tur yok. Önce Turlar ve Fiyatlandırma üzerinden balon turu ekleyin.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 'var(--space-md)', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', minWidth: '320px' }}>
              {weekDays.map((w) => (
                <div key={w} style={{ padding: 'var(--space-xs)', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{w}</div>
              ))}
              {calendarCells.map((cell, idx) => {
                const entry = entriesByDate[cell.dateStr];
                const price = entry ? entry.price : basePrice;
                const cap = entry?.capacityOverride ?? defaultCapacity;
                const closed = entry?.isClosed ?? false;
                const isCurrentMonth = cell.isCurrentMonth;
                const isSelected = selectedDates.has(cell.dateStr);
                return (
                  <button
                    key={`${cell.dateStr}-${idx}`}
                    type="button"
                    onClick={() => isCurrentMonth && openEdit(cell.dateStr)}
                    disabled={!isCurrentMonth}
                    style={{
                      padding: 'var(--space-sm)',
                      border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: '6px',
                      background: isSelected ? '#dbeafe' : closed ? 'var(--color-bg-light)' : isCurrentMonth ? 'var(--color-bg-card)' : 'var(--color-bg-light)',
                      cursor: isCurrentMonth ? 'pointer' : 'default',
                      textAlign: 'left',
                      opacity: isCurrentMonth ? 1 : 0.6,
                      minHeight: '70px',
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{cell.day}</span>
                    {isCurrentMonth && (
                      <>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '2px' }}>€{price}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Kap: {cap}</div>
                        {closed && <span style={{ fontSize: '0.7rem', color: 'var(--color-error, #b91c1c)', display: 'block', marginTop: '2px' }}>Kapalı</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {editDate && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEditDate(null)}>
              <div className="card" style={{ padding: 'var(--space-xl)', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: 'var(--space-lg)' }}>{editDate} — Fiyat / Kapasite / Gün Kapat</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                  <Input label="Fiyat (€)" type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                  <Input label="Kapasite" type="number" min="0" value={editCapacity} onChange={(e) => setEditCapacity(e.target.value)} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <input type="checkbox" checked={editClosed} onChange={(e) => setEditClosed(e.target.checked)} />
                    <span>Bu günü kapat (rezervasyon alınmasın)</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-xl)' }}>
                  <Button onClick={saveEdit} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button>
                  <Button variant="secondary" onClick={() => setEditDate(null)}>İptal</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
