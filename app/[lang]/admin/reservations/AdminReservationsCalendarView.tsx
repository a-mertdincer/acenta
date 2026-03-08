'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getReservations, updateReservationStatus, sendReservationConfirmationEmail } from '@/app/actions/reservations';
import { getReservationStatusLabel, getReservationStatusStyle, RESERVATION_STATUS_OPTIONS } from '@/lib/reservationStatus';
import { Button } from '@/app/components/Button';

interface Res {
  id: string;
  date: Date;
  guestName: string;
  pax: number;
  totalPrice: number;
  status: string;
  tour?: { titleEn: string; type: string };
  variant?: { titleEn: string } | null;
  notes?: string | null;
}

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
    cells.push({ dateStr: toLocalDateStr(d), day: d.getDate(), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 0; i < remaining; i++) {
    const d = new Date(year, month, i + 1);
    cells.push({ dateStr: toLocalDateStr(d), day: d.getDate(), isCurrentMonth: false });
  }
  return cells;
}

const TOUR_COLOR: Record<string, string> = {
  BALLOON: '#3b82f6',
  TOUR: '#22c55e',
  TRANSFER: '#ef4444',
  CONCIERGE: '#a855f7',
  PACKAGE: '#a855f7',
};

export default function AdminReservationsCalendarView({ lang }: { lang: string }) {
  const [reservations, setReservations] = useState<Res[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const [y, m] = month.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);
    getReservations({ from, to }).then((list) => {
      setReservations((list ?? []) as Res[]);
      setLoading(false);
    });
  }, [month]);

  const byDate = useMemo(() => {
    const map: Record<string, Res[]> = {};
    reservations.forEach((r) => {
      const key = toLocalDateStr(new Date(r.date));
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [reservations]);

  const [year, monthNum] = month.split('-').map(Number);
  const calendarCells = useMemo(() => getDaysInMonth(year, monthNum), [year, monthNum]);
  const weekDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const selectedItems = selectedDate ? byDate[selectedDate] ?? [] : [];

  const handleStatusChange = async (id: string, newStatus: string) => {
    const result = await updateReservationStatus(id, newStatus);
    if (result.ok) setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    else alert(result.error);
  };

  const handleSendConfirmation = async (id: string) => {
    setSendingEmailId(id);
    const result = await sendReservationConfirmationEmail(id);
    setSendingEmailId(null);
    if (result.ok) alert('Onay e-postası gönderildi.');
    else alert(result.error ?? 'Gönderilemedi');
  };

  const formatDateTr = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading && reservations.length === 0) return <div className="loading-block">Yükleniyor...</div>;

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label style={{ marginRight: 'var(--space-sm)' }}>Ay:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>

      <div className="card" style={{ padding: 'var(--space-md)', overflowX: 'auto', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, minWidth: 320 }}>
          {weekDays.map((w) => (
            <div key={w} style={{ padding: 'var(--space-xs)', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{w}</div>
          ))}
          {calendarCells.map((cell, idx) => {
            const items = byDate[cell.dateStr] ?? [];
            const count = items.length;
            const isSelected = selectedDate === cell.dateStr;
            const isCurrentMonth = cell.isCurrentMonth;
            const types = [...new Set(items.map((r) => r.tour?.type ?? 'TOUR'))];
            return (
              <button
                key={`${cell.dateStr}-${idx}`}
                type="button"
                onClick={() => isCurrentMonth && setSelectedDate(cell.dateStr)}
                disabled={!isCurrentMonth}
                style={{
                  padding: 'var(--space-sm)',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 6,
                  background: isSelected ? '#dbeafe' : isCurrentMonth ? 'var(--color-bg-card)' : 'var(--color-bg-light)',
                  cursor: isCurrentMonth ? 'pointer' : 'default',
                  textAlign: 'left',
                  opacity: isCurrentMonth ? 1 : 0.6,
                  minHeight: 64,
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{cell.day}</span>
                {isCurrentMonth && count > 0 && (
                  <div style={{ marginTop: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {types.slice(0, 3).map((t) => (
                      <span key={t} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: TOUR_COLOR[t] ?? '#888' }} title={t} />
                    ))}
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{count} rez.</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>📅 {formatDateTr(selectedDate)} — {selectedItems.length} Rezervasyon</h2>
          {selectedItems.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bu günde rezervasyon yok.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedItems.map((r) => (
                <li
                  key={r.id}
                  style={{
                    padding: 'var(--space-lg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    borderLeft: `4px solid ${TOUR_COLOR[r.tour?.type ?? ''] ?? '#888'}`,
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    <Link href={`/${lang}/admin/reservations?highlight=${r.id}&view=table`} style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {r.guestName}
                    </Link>
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>
                      · {r.pax} kişi · €{r.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                    {r.notes && <>🏨 {r.notes}</>}
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 'bold', ...getReservationStatusStyle(r.status) }}>
                    {getReservationStatusLabel(r.status)}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--color-border)' }}
                    >
                      {RESERVATION_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleSendConfirmation(r.id)} disabled={sendingEmailId === r.id}>
                      {sendingEmailId === r.id ? 'Gönderiliyor…' : '📧 Mail'}
                    </Button>
                    <Link href={`/${lang}/admin/reservations?highlight=${r.id}&view=table`}>
                      <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>👁 Detay</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <Button variant="secondary" onClick={() => setSelectedDate(null)}>Kartı kapat</Button>
          </div>
        </div>
      )}
    </div>
  );
}
