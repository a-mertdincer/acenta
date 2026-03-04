'use client';

import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { createCoupon, revokeCoupon, type CouponListItem } from '../../../actions/coupons';

export function AdminUsersClient({ coupons }: { coupons: CouponListItem[] }) {
  const [code, setCode] = useState('');
  const [discountPct, setDiscountPct] = useState<string>('');
  const [discountAbs, setDiscountAbs] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function handleCreateCoupon(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const pct = discountPct ? parseFloat(discountPct) : undefined;
    const abs = discountAbs ? parseFloat(discountAbs) : undefined;
    const res = await createCoupon({
      code,
      discountPct: pct,
      discountAbs: abs,
      validUntil: validUntil || null,
    });
    if (res.ok) {
      setMessage({ type: 'ok', text: 'Kupon oluşturuldu.' });
      setCode('');
      setDiscountPct('');
      setDiscountAbs('');
      setValidUntil('');
    } else {
      setMessage({ type: 'err', text: res.error ?? 'Başarısız' });
    }
  }

  async function handleRevoke(id: string) {
    setRevoking(id);
    const res = await revokeCoupon(id);
    setRevoking(null);
    if (!res.ok) setMessage({ type: 'err', text: res.error ?? 'İptal edilemedi' });
  }

  return (
    <>
      <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Aktif Kuponlar</h2>
        {message && (
          <p style={{ color: message.type === 'err' ? 'var(--color-error, #b91c1c)' : 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
            {message.text}
          </p>
        )}
        <form onSubmit={handleCreateCoupon} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 'var(--space-md)', alignItems: 'end', marginBottom: 'var(--space-lg)' }}>
          <div>
            <Input label="Kod" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. WELCOME10" required />
          </div>
          <div>
            <Input label="İndirim %" type="number" min="0" max="100" step="0.01" value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="10" />
          </div>
          <div>
            <Input label="İndirim (€)" type="number" min="0" step="0.01" value={discountAbs} onChange={e => setDiscountAbs(e.target.value)} placeholder="5" />
          </div>
          <div>
            <Input label="Geçerlilik tarihi" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
          </div>
          <Button type="submit">Yeni Kupon Oluştur</Button>
        </form>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {coupons.map(c => (
            <div
              key={c.id}
              style={{
                border: `2px solid ${c.isActive ? '#10b981' : 'var(--color-border)'}`,
                padding: 'var(--space-md)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: c.isActive ? 1 : 0.7,
              }}
            >
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: c.isActive ? '#10b981' : 'var(--color-text-muted)' }}>{c.code}</span>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  {c.discountPct != null ? `%${c.discountPct} indirim` : c.discountAbs != null ? `€${c.discountAbs} indirim` : '—'}
                  {c.validUntil ? ` · ${new Date(c.validUntil).toLocaleDateString('tr-TR')} tarihine kadar` : ''}
                  {!c.isActive ? ' · İptal edildi' : ''}
                </p>
              </div>
              {c.isActive && (
                <Button
                  variant="secondary"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  onClick={() => handleRevoke(c.id)}
                  disabled={revoking === c.id}
                >
                  {revoking === c.id ? '…' : 'İptal et'}
                </Button>
              )}
            </div>
          ))}
        </div>
        {coupons.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Henüz kupon yok. Yukarıdan oluşturun.</p>}
      </div>
    </>
  );
}
