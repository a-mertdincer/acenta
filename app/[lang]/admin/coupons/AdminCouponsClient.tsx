'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  revokeCoupon,
  reactivateCoupon,
  getCouponUsages,
  getCouponById,
  type CouponListItem,
  type CouponUsageItem,
} from '../../../actions/coupons';

type Filter = 'all' | 'active' | 'expired' | 'limit_reached' | 'disabled';

function getCouponStatus(c: CouponListItem): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!c.isActive) return { label: 'Devre Dışı', color: '#9ca3af' };
  if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return { label: 'Limiti Dolmuş', color: '#ef4444' };
  if (c.bookingEnd < today) return { label: 'Süresi Doldu', color: '#6b7280' };
  if (c.bookingStart > today) return { label: 'Planlanmış', color: '#eab308' };
  return { label: 'Aktif', color: '#22c55e' };
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDiscount(c: CouponListItem): string {
  if (c.discountType === 'percentage') return `%${c.discountValue} İndirim`;
  return `€${c.discountValue} Sabit İndirim`;
}

function formatCategories(cats: string | null): string {
  if (!cats) return 'Tüm Ürünler';
  try {
    const arr = JSON.parse(cats) as string[];
    return arr.join(', ') || 'Tüm Ürünler';
  } catch {
    return 'Tüm Ürünler';
  }
}

export function AdminCouponsClient({ initialCoupons }: { initialCoupons: CouponListItem[] }) {
  const [coupons, setCoupons] = useState<CouponListItem[]>(initialCoupons);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | 'detail' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [existingCoupon, setExistingCoupon] = useState<CouponListItem | null>(null);

  async function refresh() {
    setLoading(true);
    const res = await getCoupons(filter);
    setLoading(false);
    if (res.ok && res.coupons) setCoupons(res.coupons);
  }

  useEffect(() => {
    refresh();
  }, [filter]);

  useEffect(() => {
    if (modal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [modal]);

  const filtered = filter === 'all' ? coupons : coupons;

  return (
    <div className="card" style={{ padding: 'var(--space-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ margin: 0 }}>🎟 Kuponlar</h2>
        <Button onClick={() => { setModal('create'); setExistingCoupon(null); setMessage(null); }}>
          + Yeni Kupon
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap' }}>
        {(['all', 'active', 'expired', 'limit_reached', 'disabled'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: filter === f ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: filter === f ? 'var(--color-bg-card)' : 'transparent',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : f === 'expired' ? 'Süresi Dolmuş' : f === 'limit_reached' ? 'Limiti Dolmuş' : 'Devre Dışı'}
          </button>
        ))}
      </div>

      {message && (
        <p style={{ color: message.type === 'err' ? 'var(--color-error, #b91c1c)' : 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
          {message.text}
        </p>
      )}

      {loading ? (
        <p>Yükleniyor...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filtered.map(c => {
            const status = getCouponStatus(c);
            const limit = c.usageLimit === 0 ? '∞' : `${c.usageCount} / ${c.usageLimit}`;
            const pct = c.usageLimit > 0 ? Math.round((c.usageCount / c.usageLimit) * 100) : 0;
            return (
              <div
                key={c.id}
                style={{
                  border: `2px solid ${status.color}`,
                  borderRadius: '8px',
                  padding: 'var(--space-lg)',
                  backgroundColor: 'var(--color-bg-card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{c.code}</span>
                  <span style={{ color: status.color, fontWeight: '600', fontSize: '0.9rem' }}>● {status.label}</span>
                </div>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>
                  {formatDiscount(c)} · {formatCategories(c.applicableCategories)}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  📅 Rezervasyon: {formatDate(c.bookingStart)} – {formatDate(c.bookingEnd)}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  📅 Aktivite: {formatDate(c.activityStart)} – {formatDate(c.activityEnd)}
                </p>
                <p style={{ fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                  Kullanım: {limit}
                  {c.usageLimit > 0 && (
                    <span style={{ marginLeft: 'var(--space-sm)' }}>
                      [{'█'.repeat(Math.floor(pct / 10))}{'░'.repeat(10 - Math.floor(pct / 10))}] %{pct}
                    </span>
                  )}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => { setDetailId(c.id); setModal('detail'); }}>
                    👁 Detay
                  </Button>
                  <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => { setEditingId(c.id); setModal('edit'); }}>
                    ✏️ Düzenle
                  </Button>
                  {c.isActive ? (
                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => handleRevoke(c.id)}>
                      🔴 Devre Dışı Bırak
                    </Button>
                  ) : (
                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleReactivate(c.id)}>
                      ♻️ Yeniden Aktifleştir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && !loading && <p style={{ color: 'var(--color-text-muted)' }}>Henüz kupon yok.</p>}

      {modal === 'create' && typeof document !== 'undefined' && createPortal(
        <CouponFormModal
          onClose={() => { setModal(null); setExistingCoupon(null); refresh(); }}
          onSuccess={() => { setMessage({ type: 'ok', text: 'Kupon oluşturuldu.' }); setModal(null); refresh(); }}
          onError={(err) => setMessage({ type: 'err', text: err })}
          onCodeExists={(existing) => setExistingCoupon(existing)}
          onClearExisting={() => setExistingCoupon(null)}
          existingCoupon={existingCoupon}
        />,
        document.body
      )}

      {modal === 'edit' && editingId && typeof document !== 'undefined' && createPortal(
        <CouponEditModal
          couponId={editingId}
          onClose={() => { setModal(null); setEditingId(null); refresh(); }}
          onSuccess={() => { setMessage({ type: 'ok', text: 'Kupon güncellendi.' }); setModal(null); setEditingId(null); refresh(); }}
          onError={(err) => setMessage({ type: 'err', text: err })}
        />,
        document.body
      )}

      {modal === 'detail' && detailId && typeof document !== 'undefined' && createPortal(
        <CouponDetailModal
          couponId={detailId}
          onClose={() => { setModal(null); setDetailId(null); }}
        />,
        document.body
      )}
    </div>
  );

  async function handleRevoke(id: string) {
    const res = await revokeCoupon(id);
    if (res.ok) {
      setMessage({ type: 'ok', text: 'Kupon devre dışı bırakıldı.' });
      refresh();
    } else setMessage({ type: 'err', text: res.error ?? 'Başarısız' });
  }

  async function handleReactivate(id: string) {
    const res = await reactivateCoupon(id);
    if (res.ok) {
      setMessage({ type: 'ok', text: 'Kupon yeniden aktifleştirildi.' });
      refresh();
    } else setMessage({ type: 'err', text: res.error ?? 'Başarısız' });
  }
}

function CouponFormModal({
  onClose,
  onSuccess,
  onError,
  onCodeExists,
  onClearExisting,
  existingCoupon,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (err: string) => void;
  onCodeExists: (c: CouponListItem) => void;
  onClearExisting: () => void;
  existingCoupon: CouponListItem | null;
}) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [code, setCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [activityStart, setActivityStart] = useState('');
  const [activityEnd, setActivityEnd] = useState('');
  const [usageLimit, setUsageLimit] = useState('0');
  const [minCartAmount, setMinCartAmount] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function randomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    setCode(s);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createCoupon({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      discountCurrency: discountType === 'fixed' ? 'EUR' : undefined,
      bookingStart: bookingStart || new Date().toISOString().slice(0, 10),
      bookingEnd: bookingEnd || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      activityStart: activityStart || new Date().toISOString().slice(0, 10),
      activityEnd: activityEnd || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      usageLimit: parseInt(usageLimit, 10) || 0,
      minCartAmount: minCartAmount ? parseFloat(minCartAmount) : null,
      internalNote: internalNote || null,
    });
    setSubmitting(false);
    if (res.ok) onSuccess();
    else if (res.error === 'CODE_ALREADY_EXISTS' && res.existingCoupon) {
      onCodeExists(res.existingCoupon);
    } else onError(res.error ?? 'Başarısız');
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-lg)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ background: 'var(--color-bg-card)', padding: 'var(--space-2xl)', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ margin: 0 }}>Yeni Kupon Oluştur</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {existingCoupon && (
          <div style={{ padding: 'var(--space-md)', background: '#fef3c7', borderRadius: '8px', marginBottom: 'var(--space-lg)' }}>
            <p style={{ fontWeight: '600', marginBottom: 'var(--space-sm)' }}>⚠️ "{existingCoupon.code}" kodu zaten kullanılıyor.</p>
            <p style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>
              Mevcut kupon: {formatDiscount(existingCoupon)} · {getCouponStatus(existingCoupon).label}
            </p>
            <p style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>Kullanım: {existingCoupon.usageLimit === 0 ? '∞' : `${existingCoupon.usageCount}/${existingCoupon.usageLimit}`}</p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Button variant="secondary" onClick={() => { onClearExisting(); setCode(''); }}>Farklı kod gir</Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <Input label="Kupon Kodu *" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} placeholder="SUMMER2026" required />
            <button type="button" onClick={randomCode} style={{ marginTop: 'var(--space-xs)', fontSize: '0.85rem', background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}>🔄 Otomatik Oluştur</button>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>İndirim Tipi</label>
            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              <label>
                <input type="radio" checked={discountType === 'percentage'} onChange={() => setDiscountType('percentage')} /> Yüzde İndirim
              </label>
              <label>
                <input type="radio" checked={discountType === 'fixed'} onChange={() => setDiscountType('fixed')} /> Sabit Tutar İndirimi
              </label>
            </div>
          </div>

          <Input label="İndirim Değeri *" type="number" min="0" max={discountType === 'percentage' ? 100 : undefined} step="0.01" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required />

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>📅 Rezervasyon Dönemi</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <Input label="Başlangıç" type="date" value={bookingStart} onChange={e => setBookingStart(e.target.value)} />
              <Input label="Bitiş" type="date" value={bookingEnd} onChange={e => setBookingEnd(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>📅 Aktivite Dönemi</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <Input label="Başlangıç" type="date" value={activityStart} onChange={e => setActivityStart(e.target.value)} />
              <Input label="Bitiş" type="date" value={activityEnd} onChange={e => setActivityEnd(e.target.value)} />
            </div>
          </div>

          <Input label="Maksimum Kullanım (0 = Sınırsız)" type="number" min="0" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} />
          <Input label="Minimum Sepet Tutarı (€)" type="number" min="0" step="0.01" value={minCartAmount} onChange={e => setMinCartAmount(e.target.value)} placeholder="Opsiyonel" />
          <Input label="Not (dahili)" value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="e.g. Yaz kampanyası" />

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
            <Button type="submit" disabled={submitting} isLoading={submitting}>💾 Kupon Oluştur</Button>
            <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CouponEditModal({ couponId, onClose, onSuccess, onError }: { couponId: string; onClose: () => void; onSuccess: () => void; onError: (err: string) => void }) {
  const [coupon, setCoupon] = useState<CouponListItem | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [activityStart, setActivityStart] = useState('');
  const [activityEnd, setActivityEnd] = useState('');
  const [usageLimit, setUsageLimit] = useState('0');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCouponById(couponId).then((res) => {
      if (res.ok && res.coupon) {
        const c = res.coupon;
        setCoupon(c);
        setDiscountType(c.discountType as 'percentage' | 'fixed');
        setDiscountValue(String(c.discountValue));
        setBookingStart(c.bookingStart.toISOString().slice(0, 10));
        setBookingEnd(c.bookingEnd.toISOString().slice(0, 10));
        setActivityStart(c.activityStart.toISOString().slice(0, 10));
        setActivityEnd(c.activityEnd.toISOString().slice(0, 10));
        setUsageLimit(String(c.usageLimit));
        setInternalNote(c.internalNote ?? '');
      }
    });
  }, [couponId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await updateCoupon({
      id: couponId,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      bookingStart,
      bookingEnd,
      activityStart,
      activityEnd,
      usageLimit: parseInt(usageLimit, 10) || 0,
      internalNote: internalNote || null,
    });
    setSubmitting(false);
    if (res.ok) onSuccess();
    else onError(res.error ?? 'Başarısız');
  }

  if (!coupon) return <div style={{ padding: 'var(--space-xl)' }}>Yükleniyor...</div>;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-lg)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ background: 'var(--color-bg-card)', padding: 'var(--space-2xl)', borderRadius: '12px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ margin: 0 }}>Kupon Düzenle — {coupon.code}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>İndirim Tipi</label>
            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              <label><input type="radio" checked={discountType === 'percentage'} onChange={() => setDiscountType('percentage')} /> Yüzde</label>
              <label><input type="radio" checked={discountType === 'fixed'} onChange={() => setDiscountType('fixed')} /> Sabit</label>
            </div>
          </div>
          <Input label="İndirim Değeri" type="number" min="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <Input label="Rez. Başlangıç" type="date" value={bookingStart} onChange={e => setBookingStart(e.target.value)} />
            <Input label="Rez. Bitiş" type="date" value={bookingEnd} onChange={e => setBookingEnd(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <Input label="Aktivite Başlangıç" type="date" value={activityStart} onChange={e => setActivityStart(e.target.value)} />
            <Input label="Aktivite Bitiş" type="date" value={activityEnd} onChange={e => setActivityEnd(e.target.value)} />
          </div>
          <Input label="Kullanım Limiti" type="number" min="0" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} />
          <Input label="Dahili Not" value={internalNote} onChange={e => setInternalNote(e.target.value)} />
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Button type="submit" disabled={submitting} isLoading={submitting}>Kaydet</Button>
            <Button type="button" variant="secondary" onClick={onClose}>İptal</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CouponDetailModal({ couponId, onClose }: { couponId: string; onClose: () => void }) {
  const [coupon, setCoupon] = useState<CouponListItem | null>(null);
  const [usages, setUsages] = useState<CouponUsageItem[]>([]);

  useEffect(() => {
    getCouponById(couponId).then((res) => {
      if (res.ok && res.coupon) setCoupon(res.coupon);
    });
    getCouponUsages(couponId).then((res) => {
      if (res.ok && res.usages) setUsages(res.usages);
    });
  }, [couponId]);

  if (!coupon) return <div style={{ padding: 'var(--space-xl)' }}>Yükleniyor...</div>;

  const totalDiscount = usages.reduce((s, u) => s + u.discountAmount, 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--space-lg)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{ background: 'var(--color-bg-card)', padding: 'var(--space-2xl)', borderRadius: '12px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ margin: 0 }}>{coupon.code} — Detay</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <p><strong>Tip:</strong> {formatDiscount(coupon)}</p>
          <p><strong>Geçerli Ürünler:</strong> {formatCategories(coupon.applicableCategories)}</p>
          <p><strong>Rez. Dönemi:</strong> {formatDate(coupon.bookingStart)} – {formatDate(coupon.bookingEnd)}</p>
          <p><strong>Aktivite Dönemi:</strong> {formatDate(coupon.activityStart)} – {formatDate(coupon.activityEnd)}</p>
          <p><strong>Limit:</strong> {coupon.usageLimit === 0 ? 'Sınırsız' : `${coupon.usageLimit} kullanım`}</p>
          <p><strong>Durum:</strong> {getCouponStatus(coupon).label}</p>
          {coupon.internalNote && <p><strong>Not:</strong> {coupon.internalNote}</p>}
        </div>
        <h3 style={{ marginBottom: 'var(--space-md)' }}>Kullanım Geçmişi ({usages.length} / {coupon.usageLimit === 0 ? '∞' : coupon.usageLimit})</h3>
        <div style={{ overflowX: 'auto', marginBottom: 'var(--space-lg)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-sm)' }}>#</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-sm)' }}>Misafir</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-sm)' }}>Rez. Tarihi</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-sm)' }}>Tur/Aktivite</th>
                <th style={{ textAlign: 'right', padding: 'var(--space-sm)' }}>İndirim</th>
              </tr>
            </thead>
            <tbody>
              {usages.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: 'var(--space-sm)' }}>{i + 1}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{u.guestName}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{formatDate(u.usedAt)}</td>
                  <td style={{ padding: 'var(--space-sm)' }}>{u.tourName}</td>
                  <td style={{ padding: 'var(--space-sm)', textAlign: 'right' }}>€{u.discountAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontWeight: '600' }}>Toplam İndirim Tutarı: €{totalDiscount.toFixed(2)}</p>
        <Button
          variant="secondary"
          onClick={() => {
            const headers = ['#', 'Misafir', 'E-posta', 'Rez. Tarihi', 'Tur/Aktivite', 'Tur Tarihi', 'Orijinal', 'İndirim', 'Final', 'Para Birimi'];
            const rows = usages.map((u, i) => [
              i + 1,
              u.guestName,
              u.guestEmail ?? '',
              formatDate(u.usedAt),
              u.tourName,
              formatDate(u.tourDate),
              u.originalAmount.toFixed(2),
              u.discountAmount.toFixed(2),
              u.finalAmount.toFixed(2),
              u.currency,
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `kupon-kullanim-${coupon.code}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
          style={{ marginTop: 'var(--space-md)', marginRight: 'var(--space-sm)' }}
        >
          📥 Kullanım Raporu İndir (CSV)
        </Button>
        <Button variant="secondary" onClick={onClose} style={{ marginTop: 'var(--space-lg)' }}>Kapat</Button>
      </div>
    </div>
  );
}
