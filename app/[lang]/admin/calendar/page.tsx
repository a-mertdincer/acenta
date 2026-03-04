'use client';

import { useState, useEffect } from 'react';
import { getReservations } from '../../../actions/reservations';

interface Res {
  id: string;
  date: Date;
  guestName: string;
  pax: number;
  totalPrice: number;
  status: string;
  tour?: { titleEn: string; type: string };
}

export default function AdminCalendarPage() {
  const [reservations, setReservations] = useState<Res[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

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

  const byDate: Record<string, Res[]> = {};
  reservations.forEach((r) => {
    const key = r.date.toISOString().split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(r);
  });
  const dates = Object.keys(byDate).sort();

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Rezervasyon Takvimi</h1>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <label style={{ marginRight: 'var(--space-sm)' }}>Ay:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
        />
      </div>
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Yükleniyor...</p>
      ) : (
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          {dates.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>Bu ayda rezervasyon yok.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {dates.map((dateStr) => {
                const items = byDate[dateStr];
                const totalPax = items.reduce((s, r) => s + r.pax, 0);
                return (
                  <div key={dateStr} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-md)' }}>
                    <h3 style={{ marginBottom: 'var(--space-sm)' }}>
                      {dateStr} — {items.length} rezervasyon, {totalPax} kişi
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {items.map((r) => (
                        <li key={r.id} style={{ padding: 'var(--space-xs) 0', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                          {r.guestName} — {r.tour?.titleEn ?? r.tour?.type ?? 'Tur'} — {r.pax} pax — €{r.totalPrice} — {r.status}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
