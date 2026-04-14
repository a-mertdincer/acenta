'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  loadReviewsAdmin,
  setReviewModeration,
  updateReviewAdmin,
  deleteReviewAdmin,
} from '@/app/actions/reviews';

type Filter = 'all' | 'pending' | 'approved' | 'rejected';

type Row = {
  id: string;
  tourId: string;
  guestName: string;
  rating: number;
  comment: string;
  moderationStatus: string;
  adminNote: string | null;
  createdAt: Date;
  tour: { titleEn: string; titleTr: string } | null;
};

export function AdminReviewsClient() {
  const [filter, setFilter] = useState<Filter>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let c = false;
    void (async () => {
      setLoading(true);
      const r = await loadReviewsAdmin(filter);
      if (c) return;
      if (r.ok) setRows(r.reviews as Row[]);
      setLoading(false);
    })();
    return () => { c = true; };
  }, [filter]);

  const reload = () => {
    startTransition(async () => {
      const r = await loadReviewsAdmin(filter);
      if (r.ok) setRows(r.reviews as Row[]);
    });
  };

  return (
    <div>
      <div className="admin-reviews-toolbar">
        <label>
          Filtre:{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="admin-contact-settings-input">
            <option value="all">Tümü</option>
            <option value="pending">Onay bekleyen</option>
            <option value="approved">Onaylı</option>
            <option value="rejected">Reddedilmiş</option>
          </select>
        </label>
      </div>

      {loading ? <p>Yükleniyor…</p> : null}

      <ul className="admin-reviews-list">
        {rows.map((row) => (
          <li key={row.id} className="admin-reviews-card">
            <div className="admin-reviews-card-head">
              <span className="admin-reviews-stars" aria-hidden>
                {'★'.repeat(row.rating)}
                {'☆'.repeat(5 - row.rating)}
              </span>
              <strong>{row.guestName}</strong>
              <span className="admin-reviews-sep">—</span>
              <span>{row.tour?.titleTr ?? row.tour?.titleEn ?? row.tourId}</span>
              <span className="admin-reviews-sep">—</span>
              <time dateTime={row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)}>
                {row.createdAt instanceof Date ? row.createdAt.toLocaleDateString('tr-TR') : ''}
              </time>
            </div>
            <blockquote className="admin-reviews-quote">&ldquo;{row.comment}&rdquo;</blockquote>
            <p className="admin-reviews-status">
              Durum:{' '}
              <strong>
                {row.moderationStatus === 'PENDING'
                  ? '⏳ Onay bekliyor'
                  : row.moderationStatus === 'APPROVED'
                    ? '✅ Onaylı'
                    : 'Reddedildi'}
              </strong>
            </p>
            {row.adminNote ? <p className="admin-reviews-admin-note">Not: {row.adminNote}</p> : null}
            <div className="admin-reviews-actions">
              {row.moderationStatus !== 'APPROVED' && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await setReviewModeration(row.id, 'APPROVED');
                      reload();
                    })
                  }
                >
                  Onayla
                </button>
              )}
              {row.moderationStatus !== 'REJECTED' && row.moderationStatus !== 'APPROVED' && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await setReviewModeration(row.id, 'REJECTED');
                      reload();
                    })
                  }
                >
                  Reddet
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setEditId(row.id);
                  setEditText(row.comment);
                  setNoteText(row.adminNote ?? '');
                }}
              >
                Düzenle / Not
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ color: 'var(--color-error, #b91c1c)' }}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!window.confirm('Bu yorum silinsin mi?')) return;
                    await deleteReviewAdmin(row.id);
                    reload();
                  })
                }
              >
                Sil
              </button>
            </div>
            {editId === row.id && (
              <div className="admin-reviews-edit-panel">
                <label className="admin-contact-settings-label">
                  Yorum metni
                  <textarea className="admin-contact-settings-input" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                </label>
                <label className="admin-contact-settings-label">
                  İç not (sadece admin)
                  <textarea className="admin-contact-settings-input" rows={2} value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                </label>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await updateReviewAdmin(row.id, { comment: editText, adminNote: noteText });
                      setEditId(null);
                      reload();
                    })
                  }
                >
                  Kaydet
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>
                  Vazgeç
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
