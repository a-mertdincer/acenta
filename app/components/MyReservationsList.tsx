'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { getReservationStatusStyle } from '@/lib/reservationStatus';
import { formatNotesForDisplay } from '@/lib/guestNotes';
import { requestCancellationByGuest, requestUpdateByGuest } from '@/app/actions/reservations';
import { getAvailableTourDatesForGuest } from '@/app/actions/tours';
import { WriteReviewModal } from '@/app/components/WriteReviewModal';

type ReservationItem = {
  id: string;
  tourId: string;
  date: Date | string;
  pax: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  tour?: { titleEn: string } | null;
  cancellationRequestedAt?: string | null;
  updateRequestedAt?: string | null;
  couponCode?: string | null;
  originalPrice?: number | null;
  discountAmount?: number | null;
  canWriteReview?: boolean;
  hasReview?: boolean;
};

type DateFetchState = 'idle' | 'loading' | 'loaded' | 'empty' | 'error';

type ReservationLabels = {
  date: string;
  pax: string;
  total: string;
  couponApplied: string;
  original: string;
  discount: string;
  pendingCancellation: string;
  pendingUpdate: string;
  changeRequest: string;
  changeRequestPending: string;
  cancelRequest: string;
  cancelRequestPending: string;
  requestReceived: string;
  requestFailed: string;
  cancelRequestReceived: string;
  cancelIntro: string;
  cancelReasonLabel: string;
  cancelReasonPlaceholder: string;
  changeIntro: string;
  dateLabel: string;
  paxLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  loadingDates: string;
  dateLoadError: string;
  noDates: string;
  submitChange: string;
  submitCancel: string;
  sending: string;
  cancel: string;
  detailsTitle: string;
};

type ReviewLabels = {
  title: string;
  writeReview: string;
  yourReview: string;
  submit: string;
  thankYou: string;
  alreadyReviewed: string;
  rating: string;
  close: string;
  reviewSubmitted: string;
};

type MyReservationsListProps = {
  reservations: ReservationItem[];
  lang: string;
  labels: ReservationLabels;
  reviewLabels: ReviewLabels;
};

export function MyReservationsList({
  reservations,
  lang,
  labels,
  reviewLabels,
}: MyReservationsListProps) {
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const openReview = useCallback((id: string) => setReviewingId(id), []);
  const closeReview = useCallback(() => setReviewingId(null), []);
  const reviewing = reviewingId ? reservations.find((r) => r.id === reviewingId) ?? null : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {reservations.map((res) => (
        <ReservationCard
          key={res.id}
          reservation={res}
          lang={lang}
          labels={labels}
          reviewLabels={reviewLabels}
          onWriteReview={openReview}
        />
      ))}
      <WriteReviewModal
        open={reviewing !== null}
        onClose={closeReview}
        reservationId={reviewing?.id ?? ''}
        tourTitle={reviewing?.tour?.titleEn ?? reviewing?.tourId ?? ''}
        closeLabel={reviewLabels.close}
        labels={{
          title: reviewLabels.title,
          yourReview: reviewLabels.yourReview,
          submit: reviewLabels.submit,
          thankYou: reviewLabels.thankYou,
          alreadyReviewed: reviewLabels.alreadyReviewed,
          rating: reviewLabels.rating,
        }}
      />
    </div>
  );
}

function ReservationCard({
  reservation,
  lang,
  labels,
  reviewLabels,
  onWriteReview,
}: {
  reservation: ReservationItem;
  lang: string;
  labels: MyReservationsListProps['labels'];
  reviewLabels: ReviewLabels;
  onWriteReview: (reservationId: string) => void;
}) {
  const currentDateStr = typeof reservation.date === 'string'
    ? reservation.date.slice(0, 10)
    : reservation.date.toISOString().split('T')[0];
  const locale = lang === 'tr' ? 'tr' : lang === 'zh' ? 'zh' : 'en';
  function getStatusLabel(status: string): string {
    const labelsByLocale: Record<string, Record<string, string>> = {
      tr: {
        PENDING: 'Beklemede',
        CONFIRMED: 'Onaylandi',
        CHANGE_REQUESTED: 'Degisiklik bekliyor',
        CANCELLED: 'Iptal',
        COMPLETED: 'Geldi',
        NO_SHOW: 'Gelmedi',
      },
      en: {
        PENDING: 'Pending',
        CONFIRMED: 'Confirmed',
        CHANGE_REQUESTED: 'Change requested',
        CANCELLED: 'Cancelled',
        COMPLETED: 'Completed',
        NO_SHOW: 'No show',
      },
      zh: {
        PENDING: '待处理',
        CONFIRMED: '已确认',
        CHANGE_REQUESTED: '变更处理中',
        CANCELLED: '已取消',
        COMPLETED: '已完成',
        NO_SHOW: '未到场',
      },
    };
    return labelsByLocale[locale][status] ?? status;
  }


  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(currentDateStr);
  const [pax, setPax] = useState(reservation.pax);
  const [notes, setNotes] = useState(reservation.notes ?? '');
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFetchState, setDateFetchState] = useState<DateFetchState>('idle');

  useEffect(() => {
    if (!editOpen || !reservation.tourId) {
      return;
    }

    let cancelled = false;
    const loadDates = async () => {
      try {
        setDateFetchState('loading');
        const timeoutMs = 10000;
        const result = await Promise.race<
          { kind: 'ok'; dates: string[] } | { kind: 'timeout' }
        >([
          getAvailableTourDatesForGuest(reservation.tourId)
            .then((dates) => ({ kind: 'ok' as const, dates }))
            .catch(() => ({ kind: 'timeout' as const })),
          new Promise<{ kind: 'timeout' }>((resolve) => {
            setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs);
          }),
        ]);

        if (cancelled) return;
        if (result.kind === 'timeout') {
          setDateFetchState('error');
          setAvailableDates([]);
          setSelectedDate(currentDateStr);
          return;
        }
        const dates = result.dates;
        setAvailableDates(dates);
        if (dates.length === 0) {
          setDateFetchState('empty');
          setSelectedDate(currentDateStr);
          return;
        }
        setDateFetchState('loaded');
        if (!dates.includes(currentDateStr)) {
          setSelectedDate(dates[0]);
        } else {
          setSelectedDate(currentDateStr);
        }
      } catch {
        if (cancelled) return;
        setDateFetchState('error');
        setAvailableDates([]);
        setSelectedDate(currentDateStr);
      }
    };

    void loadDates();
    return () => {
      cancelled = true;
    };
  }, [editOpen, reservation.tourId, currentDateStr]);

  const isCancelled = reservation.status === 'CANCELLED';
  const hasCancellationRequest = Boolean(reservation.cancellationRequestedAt);
  const hasUpdateRequest = Boolean(reservation.updateRequestedAt);
  const detailsLine = formatNotesForDisplay(reservation.notes);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await requestUpdateByGuest(reservation.id, { date: selectedDate, pax, notes });
    setLoading(false);
    if (result.ok) {
      setMessage({ type: 'ok', text: labels.requestReceived });
      setEditOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } else {
      setMessage({ type: 'err', text: result.error ?? labels.requestFailed });
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await requestCancellationByGuest(reservation.id, cancelReason || undefined);
    setLoading(false);
    if (result.ok) {
      setMessage({ type: 'ok', text: labels.cancelRequestReceived });
      setCancelOpen(false);
      setTimeout(() => window.location.reload(), 800);
    } else {
      setMessage({ type: 'err', text: result.error ?? labels.requestFailed });
    }
  }

  function openEdit() {
    setEditOpen(true);
    setCancelOpen(false);
    setDateFetchState('loading');
    setAvailableDates([]);
    setSelectedDate(currentDateStr);
    setPax(reservation.pax);
    setNotes(reservation.notes ?? '');
    setMessage(null);
  }

  const dateOptions = availableDates.length > 0
    ? (availableDates.includes(currentDateStr) ? availableDates : [currentDateStr, ...availableDates])
    : [currentDateStr];

  const detailHref = `/${lang}/booking/success?ids=${reservation.id}&from=account`;

  return (
    <div className="card" style={{ padding: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={detailHref} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }} title={labels.detailsTitle}>
            <h3 style={{ marginBottom: 'var(--space-xs)' }}>{reservation.tour?.titleEn ?? reservation.tourId}</h3>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              {labels.date}: {currentDateStr} · {labels.pax}: {reservation.pax} · {labels.total}: <strong>€{Number(reservation.totalPrice).toFixed(2)}</strong>
            </div>
            {reservation.couponCode && reservation.originalPrice != null && reservation.discountAmount != null && (
              <div style={{ marginTop: 'var(--space-xs)', padding: 'var(--space-sm)', background: 'var(--color-bg-alt)', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Ticket size={14} aria-hidden />
                {reservation.couponCode} {labels.couponApplied}
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-xs)' }}>
                  {labels.original}: €{reservation.originalPrice.toFixed(2)} · {labels.discount}: -€{reservation.discountAmount.toFixed(2)}
                  {reservation.originalPrice > 0 && (
                    <span> (%{Math.round((reservation.discountAmount / reservation.originalPrice) * 100)})</span>
                  )}
                </span>
              </div>
            )}
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
              {getStatusLabel(reservation.status)}
            </span>
            {(hasCancellationRequest || hasUpdateRequest) && (
              <span style={{ display: 'block', marginTop: 'var(--space-xs)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {hasCancellationRequest && `${labels.pendingCancellation} `}
                {hasUpdateRequest && labels.pendingUpdate}
              </span>
            )}
          </Link>
        </div>
        {!isCancelled && (
          <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            {reservation.canWriteReview && (
              <button type="button" className="btn btn-primary" onClick={() => onWriteReview(reservation.id)}>
                {reviewLabels.writeReview}
              </button>
            )}
            {reservation.hasReview && !reservation.canWriteReview && (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                ✓ {reviewLabels.reviewSubmitted}
              </span>
            )}
            <button type="button" className="btn btn-secondary" onClick={openEdit} disabled={hasUpdateRequest}>
              {hasUpdateRequest ? labels.changeRequestPending : labels.changeRequest}
            </button>
            <button type="button" className="btn btn-secondary" style={{ color: 'var(--color-error, #b91c1c)' }} onClick={() => { setCancelOpen(true); setEditOpen(false); setCancelReason(''); setMessage(null); }} disabled={hasCancellationRequest}>
              {hasCancellationRequest ? labels.cancelRequestPending : labels.cancelRequest}
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
          <p style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>{labels.changeIntro}</p>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>{labels.dateLabel}</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input"
              style={{ minWidth: '180px' }}
              disabled={dateFetchState === 'loading'}
              required
            >
              {dateFetchState === 'loading' && <option value={currentDateStr}>{labels.loadingDates}</option>}
              {dateFetchState === 'error' && <option value={currentDateStr}>{labels.dateLoadError}</option>}
              {dateFetchState === 'empty' && <option value={currentDateStr}>{labels.noDates}</option>}
              {(dateFetchState === 'loaded' || dateFetchState === 'idle') && dateOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>{labels.paxLabel}</label>
            <input type="number" min={1} value={pax} onChange={(e) => setPax(parseInt(e.target.value, 10) || 1)} className="input" style={{ width: '6rem' }} />
          </div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>{labels.noteLabel}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input" style={{ width: '100%', resize: 'vertical' }} placeholder={labels.notePlaceholder} maxLength={500} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? labels.sending : labels.submitChange}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditOpen(false)}>{labels.cancel}</button>
          </div>
        </form>
      )}

      {cancelOpen && (
        <form onSubmit={handleCancel} style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--color-border, #e5e7eb)' }}>
          <p style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>{labels.cancelIntro}</p>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem' }}>{labels.cancelReasonLabel}</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} className="input" style={{ width: '100%', resize: 'vertical' }} placeholder={labels.cancelReasonPlaceholder} maxLength={500} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-error, #b91c1c)' }} disabled={loading}>{loading ? labels.sending : labels.submitCancel}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelOpen(false)}>{labels.cancel}</button>
          </div>
        </form>
      )}
    </div>
  );
}
