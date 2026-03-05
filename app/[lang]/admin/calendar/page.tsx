'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getReservations, updateReservationStatus, sendReservationConfirmationEmail } from '../../../actions/reservations';
import { getReservationStatusLabel, getReservationStatusStyle, RESERVATION_STATUS_OPTIONS } from '@/lib/reservationStatus';
import { Button } from '../../../components/Button';

interface Res {
  id: string;
  date: Date;
  guestName: string;
  guestEmail: string;
  pax: number;
  totalPrice: number;
  status: string;
  tour?: { titleEn: string; type: string };
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

export default function AdminCalendarPage() {
  const pathname = usePathname();
  const lang = (pathname?.split('/')[1] ?? 'tr') as string;

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
      setReservations(list as Res[]);
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

  if (loading && reservations.length === 0) return <div className="loading-block">Yükleniyor...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Rezervasyon Takvimi</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
        Bir güne tıklayın; o günün rezervasyonları kartta listelenir. İsme tıklayarak Rezervasyonlar sayfasında tüm detayı açabilirsiniz.
      </p>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', minWidth: '320px' }}>
          {weekDays.map((w) => (
            <div key={w} style={{ padding: 'var(--space-xs)', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>{w}</div>
          ))}
          {calendarCells.map((cell, idx) => {
            const items = byDate[cell.dateStr] ?? [];
            const count = items.length;
            const totalPax = items.reduce((s, r) => s + r.pax, 0);
            const isSelected = selectedDate === cell.dateStr;
            const isCurrentMonth = cell.isCurrentMonth;
            return (
              <button
                key={`${cell.dateStr}-${idx}`}
                type="button"
                onClick={() => isCurrentMonth && setSelectedDate(cell.dateStr)}
                disabled={!isCurrentMonth}
                style={{
                  padding: 'var(--space-sm)',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: isSelected ? '#dbeafe' : isCurrentMonth ? 'var(--color-bg-card)' : 'var(--color-bg-light)',
                  cursor: isCurrentMonth ? 'pointer' : 'default',
                  textAlign: 'left',
                  opacity: isCurrentMonth ? 1 : 0.6,
                  minHeight: '64px',
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{cell.day}</span>
                {isCurrentMonth && count > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                    {count} rez. · {totalPax} kişi
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>{selectedDate} — Rezervasyonlar</h2>
          {selectedItems.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bu günde rezervasyon yok.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedItems.map((r) => (
                <li
                  key={r.id}
                  style={{
                    padding: 'var(--space-md)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-md)',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: '1 1 200px' }}>
                    <div style={{ marginBottom: 'var(--space-xs)' }}>
                      <Link
                        href={`/${lang}/admin/reservations?highlight=${r.id}`}
                        style={{ fontWeight: 'bold', color: 'var(--color-primary)', textDecoration: 'underline' }}
                      >
                        {r.guestName}
                      </Link>
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-sm)' }}>
                        {r.pax} kişi · {r.tour?.titleEn ?? r.tour?.type ?? 'Tur'} — €{r.totalPrice}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        ...getReservationStatusStyle(r.status),
                      }}
                    >
                      {getReservationStatusLabel(r.status)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                    >
                      {RESERVATION_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                      onClick={() => handleSendConfirmation(r.id)}
                      disabled={sendingEmailId === r.id}
                    >
                      {sendingEmailId === r.id ? 'Gönderiliyor…' : 'Onay mail'}
                    </Button>
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
