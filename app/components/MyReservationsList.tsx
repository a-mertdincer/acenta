'use client';

import { useState } from 'react';
import { getReservationStatusLabel, getReservationStatusStyle } from '@/lib/reservationStatus';
import { parseGuestNotes, formatGuestNotesDisplay } from '@/lib/guestNotes';
import { cancelReservationByGuest, updateReservationByGuest } from '@/app/actions/reservations';

type ReservationItem = {
  id: string;
  tourId: string;
  date: Date | string;
  pax: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  tour?: { titleEn: string } | null;
};

export function MyReservationsList({
  reservations,
  lang,
}: {
  reservations: ReservationItem[];
  lang: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {reservations.map((res) => (
        <ReservationCard key={res.id} reservation={res} lang={lang} />
      ))}
    </div>
  );
}

function ReservationCard({ reservation, lang }: { reservation: ReservationItem; lang: string }) {
  const parsed = parseGuestNotes(reservation.notes);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [hotel, setHotel] = useState(parsed.hotel);
  const [room, setRoom] = useState(parsed.room);
  const [flight, setFlight] = useState(parsed.flight);
  const [other, setOther] = useState(parsed.other);
  const [pax, setPax] = useState(reservation.pax);
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const isCancelled = reservation.status === 'CANCELLED';
  const dateStr = typeof reservation.date === 'string'
    ? reservation.date.slice(0, 10)
    : reservation.date.toISOString().split('T')[0];
  const detailsLine = formatGuestNotesDisplay(parsed);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await updateReservationByGuest(reservation.id, { hotel, room, flight, other, pax });
    setLoading(false);
    if (result.ok) {
      setMessage({ type: 'ok', text: 'Rezervasyon güncellendi.' });
      setEditOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } else {
      setMessage({ type: 'err', text: result.error ?? 'Güncelleme başarısız.' });
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await cancelReservationByGuest(reservation.id, cancelReason || undefined);
    setLoading(false);
    if (result.ok) {
      setMessage({ type: 'ok', text: 'Rezervasyon iptal edildi.' });
      setCancelOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } else {
      setMessage({ type: 'err', text: result.error ?? 'İptal başarısız.' });
    }
  }

  return (
    <div className="card" style={{ padding: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h3 style={{ marginBottom: 'var(--space-xs)' }}>{reservation.tour?.titleEn ?? reservation.tourId}</h3>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Tarih: {dateStr} · Kişi: {reservation.pax} · Toplam: <strong>€{reservation.totalPrice}</strong>
          </div>
          {detailsLine && (
            <div style={{ marginTop: 'var(--space-sm)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {detailsLine}
            </div>
          )}
          <span
            style={{
              display: 'inline-block',
              marginTop: 'var(--space-sm)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '0.8rem',
              ...getReservationStatusStyle(reservation.status),
            }}
          >
            {getReservationStatusLabel(reservation.status)}
          </span>
        </div>
        {!isCancelled && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { setEditOpen(true); setCancelOpen(false); setHotel(parsed.hotel); setRoom(parsed.room); setFlight(parsed.flight); setOther(parsed.other); setPax(reservation.pax); setMessage(null); }}>
              Rezervasyonu güncelle
            </button>
            <button type="button" className="btn btn-secondary" style={{ color: 'var(--color-error, #b91c1c)' }} onClick={() => { setCancelOpen(true); setEditOpen(false); setCancelReason(''); setMessage(null); }}>
              İptal talebi
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: message.type === 'ok' ? '#d1fae5' : '#fee2e2', color: message.type === 'ok' ? '#065f46' : '#b91c1c' }}>
          {message.text}
        </div>
      )}

      {editOpen && (
        <form onSubmit={handleUpdate} style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
          <p style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>Rezervasyon detaylarını güncelleyebilirsiniz. Tüm alanlar güvenli şekilde kaydedilir (HTML/script kabul edilmez).</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>Otel / Konaklama</label>
              <input type="text" value={hotel} onChange={(e) => setHotel(e.target.value)} className="input" style={{ width: '100%' }} placeholder="Otel adı" maxLength={200} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>Oda numarası</label>
              <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} className="input" style={{ width: '100%' }} placeholder="Oda no" maxLength={200} />
            </div>
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>Uçuş numarası</label>
            <input type="text" value={flight} onChange={(e) => setFlight(e.target.value)} className="input" style={{ width: '100%' }} placeholder="Örn: TK 1234" maxLength={200} />
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>Ek notlar</label>
            <textarea value={other} onChange={(e) => setOther(e.target.value)} rows={2} className="input" style={{ width: '100%', resize: 'vertical' }} placeholder="Diğer bilgiler (max 500 karakter)" maxLength={500} />
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>Kişi sayısı</label>
            <input type="number" min={1} value={pax} onChange={(e) => setPax(parseInt(e.target.value, 10) || 1)} className="input" style={{ width: '6rem' }} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Kaydediliyor…' : 'Kaydet'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>Vazgeç</button>
          </div>
        </form>
      )}

      {cancelOpen && (
        <form onSubmit={handleCancel} style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
          <p style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>Bu rezervasyonu iptal etmek istediğinize emin misiniz? İsteğe bağlı olarak iptal nedeninizi yazabilirsiniz.</p>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>İptal nedeni (isteğe bağlı)</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} className="input" style={{ width: '100%', resize: 'vertical' }} placeholder="Örn: Plan değişikliği" maxLength={500} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-error, #b91c1c)' }} disabled={loading}>{loading ? 'İptal ediliyor…' : 'İptal et'}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelOpen(false)}>Vazgeç</button>
          </div>
        </form>
      )}
    </div>
  );
}
