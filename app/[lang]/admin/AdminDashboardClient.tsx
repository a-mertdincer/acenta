'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/Button';
import {
  updateReservationStatus,
  sendReservationConfirmationEmail,
  getPendingReservationsForDashboard,
  approveGuestCancellationRequest,
  rejectGuestCancellationRequest,
  approveGuestUpdateRequest,
  rejectGuestUpdateRequest,
} from '@/app/actions/reservations';
import { getReservationStatusLabel, getReservationStatusStyle } from '@/lib/reservationStatus';
import type { DashboardStats, PendingReservationCard, TodayReservationRow, RecentActivity, GuestRequestItem } from '@/app/actions/reservations';

function formatDateTr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminDashboardClient({
  lang,
  stats,
  pendingList: initialPending,
  todayList,
  activities,
  guestRequestList: initialGuestRequests,
}: {
  lang: string;
  stats: DashboardStats;
  pendingList: PendingReservationCard[];
  todayList: TodayReservationRow[];
  activities: RecentActivity[];
  guestRequestList: GuestRequestItem[];
}) {
  const router = useRouter();
  const [pendingList, setPendingList] = useState<PendingReservationCard[]>(initialPending);
  const [guestRequestList, setGuestRequestList] = useState<GuestRequestItem[]>(initialGuestRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sendEmailOnConfirm, setSendEmailOnConfirm] = useState(true);

  const handleConfirm = async (id: string) => {
    setLoadingId(id);
    const res = await updateReservationStatus(id, 'CONFIRMED');
    if (res.ok) {
      if (sendEmailOnConfirm) await sendReservationConfirmationEmail(id);
      setPendingList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else alert(res.error ?? 'Güncellenemedi');
    setLoadingId(null);
  };

  const handleHold = async (id: string) => {
    setLoadingId(id);
    const res = await updateReservationStatus(id, 'PENDING');
    if (res.ok) router.refresh();
    setLoadingId(null);
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reddetme sebebi? (isteğe bağlı)');
    setLoadingId(id);
    const res = await updateReservationStatus(id, 'CANCELLED');
    if (res.ok) {
      setPendingList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else alert(res.error ?? 'Güncellenemedi');
    setLoadingId(null);
  };

  const handleApproveCancellation = async (id: string) => {
    setLoadingId(id);
    const res = await approveGuestCancellationRequest(id, sendEmailOnConfirm);
    if (res.ok) {
      setGuestRequestList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else alert(res.error ?? 'Onaylama başarısız');
    setLoadingId(null);
  };
  const handleRejectCancellation = async (id: string) => {
    const note = window.prompt('Misafire iletilecek not (isteğe bağlı):');
    setLoadingId(id);
    const res = await rejectGuestCancellationRequest(id, note ?? undefined, sendEmailOnConfirm);
    if (res.ok) {
      setGuestRequestList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else alert(res.error ?? 'Reddetme başarısız');
    setLoadingId(null);
  };
  const handleApproveUpdate = async (id: string) => {
    setLoadingId(id);
    const res = await approveGuestUpdateRequest(id, sendEmailOnConfirm);
    if (res.ok) {
      setGuestRequestList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else alert(res.error ?? 'Onaylama başarısız');
    setLoadingId(null);
  };
  const handleRejectUpdate = async (id: string) => {
    const note = window.prompt('Misafire iletilecek not (isteğe bağlı):');
    setLoadingId(id);
    const res = await rejectGuestUpdateRequest(id, note ?? undefined, sendEmailOnConfirm);
    if (res.ok) {
      setGuestRequestList((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } else alert(res.error ?? 'Reddetme başarısız');
    setLoadingId(null);
  };

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-xl)' }}>Pano</h1>

      {/* Özet kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
        <Link
          href={`/${lang}/admin/reservations?status=PENDING`}
          className="card"
          style={{ padding: 'var(--space-lg)', borderLeft: '4px solid #f59e0b', textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>⏳ Onay Bekleyen</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.pendingCount}</div>
        </Link>
        <div className="card" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>📋 Bugün Tur/Trns</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.todayReservations}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>🔜 Yarın</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.tomorrowReservations ?? 0}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>💰 Bu Ay Gelir (Onaylı)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>€{(stats.monthRevenue ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-lg)', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>❌ İptal</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stats.cancelledCount ?? 0}</div>
        </div>
      </div>

      {/* Onay bekleyen rezervasyonlar */}
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>🔔 Onay Bekleyen Rezervasyonlar ({pendingList.length})</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={sendEmailOnConfirm} onChange={(e) => setSendEmailOnConfirm(e.target.checked)} />
          Onaylarken konfirme maili gönder
        </label>
        {pendingList.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Bekleyen rezervasyon yok.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {pendingList.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  backgroundColor: 'var(--color-bg-card)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>⏳ YENİ · {r.timeAgo}</span>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {r.guestName} — {r.variantTitle ?? r.tourTitle}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  📅 {formatDateTr(r.dateStr)} · 👥 {r.pax} kişi{r.notes ? ` · 🏨 ${r.notes}` : ''}
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
                  💰 €{r.totalPrice.toFixed(2)} · Depozit: €{r.depositPaid.toFixed(2)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  <Button onClick={() => handleConfirm(r.id)} disabled={loadingId === r.id}>
                    {loadingId === r.id ? '…' : '✅ Onayla'}
                  </Button>
                  <Button variant="secondary" onClick={() => handleHold(r.id)} disabled={loadingId === r.id}>
                    ⏸ Beklet
                  </Button>
                  <Button variant="secondary" onClick={() => handleReject(r.id)} disabled={loadingId === r.id}>
                    ❌ Reddet
                  </Button>
                  <Link href={`/${lang}/admin/reservations?view=table&expand=${r.id}&tourDate=${r.dateStr}`}>
                    <Button variant="secondary">👁 Detay</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Misafir talepleri (iptal / değişiklik) — operasyon onayı */}
      {guestRequestList.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)', borderLeft: '4px solid #8b5cf6' }}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>📩 Misafir Talepleri (İptal / Değişiklik)</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
            Onay veya red sonrası misafire e-posta gider (konfirme maili kutusu açıksa).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {guestRequestList.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 'var(--space-lg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  backgroundColor: 'var(--color-bg-card)',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{r.guestName}</span>
                  <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, backgroundColor: r.requestType === 'cancellation' ? '#fef2f2' : '#f0f9ff', color: r.requestType === 'cancellation' ? '#b91c1c' : '#0369a1' }}>
                    {r.requestType === 'cancellation' ? 'İptal talebi' : 'Değişiklik talebi'}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {r.tourTitle} · 📅 {formatDateTr(r.dateStr)} · 👥 {r.pax} kişi · €{r.totalPrice.toFixed(2)}
                </div>
                {r.requestType === 'cancellation' && r.cancellationRequestReason && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 'var(--space-sm)', fontStyle: 'italic' }}>
                    İptal nedeni: {r.cancellationRequestReason}
                  </div>
                )}
                {r.requestType === 'update' && (r.pendingDate || r.pendingPax != null || r.pendingNotes) && (
                  <div style={{ fontSize: '0.85rem', marginBottom: 'var(--space-sm)' }}>
                    Talep:
                    {r.pendingDate && ` Tarih: ${formatDateTr(r.dateStr)} → ${formatDateTr(r.pendingDate.toISOString().split('T')[0])}`}
                    {r.pendingPax != null && ` · Kişi: ${r.pax} → ${r.pendingPax}`}
                    {r.pendingNotes && ` · Not: ${r.pendingNotes}`}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                  {r.requestType === 'cancellation' ? (
                    <>
                      <Button onClick={() => handleApproveCancellation(r.id)} disabled={loadingId === r.id}>
                        {loadingId === r.id ? '…' : '✅ İptali onayla'}
                      </Button>
                      <Button variant="secondary" onClick={() => handleRejectCancellation(r.id)} disabled={loadingId === r.id}>
                        {loadingId === r.id ? '…' : '❌ İptal talebini reddet'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => handleApproveUpdate(r.id)} disabled={loadingId === r.id}>
                        {loadingId === r.id ? '…' : '✅ Değişikliği onayla'}
                      </Button>
                      <Button variant="secondary" onClick={() => handleRejectUpdate(r.id)} disabled={loadingId === r.id}>
                        {loadingId === r.id ? '…' : '❌ Değişiklik talebini reddet'}
                      </Button>
                    </>
                  )}
                  <Link href={`/${lang}/admin/reservations?view=table&expand=${r.id}&tourDate=${r.dateStr}`}>
                    <Button variant="secondary">👁 Detay</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bugünkü turlar */}
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>📋 Bugünkü Turlar & Transferler</h2>
        {todayList.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Bugün rezervasyon yok.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {todayList.map((r) => (
              <li key={r.id} style={{ padding: 'var(--space-sm) 0', borderBottom: '1px solid var(--color-border)' }}>
                {r.variantTitle ?? r.tourTitle} — {r.pax} kişi
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 'var(--space-md)' }}>
          <Link href={`/${lang}/admin/reservations`}>
            <Button variant="secondary">📅 Takvimde Gör →</Button>
          </Link>
        </div>
      </div>

      {/* Son aktiviteler */}
      <div className="card" style={{ padding: 'var(--space-xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>🕐 Son Aktiviteler</h2>
        {activities.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Henüz aktivite yok.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {activities.map((a) => (
              <Link
                key={a.id}
                href={`/${lang}/admin/reservations?view=table&expand=${a.id}&tourDate=${a.dateStr}`}
                style={{
                  display: 'block',
                  padding: 'var(--space-md)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <span style={{ fontWeight: 600 }}>{a.guestName}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 'bold', ...getReservationStatusStyle(a.status) }}>
                    {getReservationStatusLabel(a.status)}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  {a.tourTitle} · {formatDateTr(a.dateStr)} · {a.pax} kişi · €{a.totalPrice.toFixed(2)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
