'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { changeMyPassword, updateMyProfile, type AccountProfile } from '../../actions/auth';
import { claimCouponForCurrentUser, type CouponListItem } from '../../actions/coupons';
import { MyReservationsList } from '../../components/MyReservationsList';

type AccountTab = 'profile' | 'coupons' | 'reservations' | 'contact';

type ReservationItem = {
  id: string;
  tourId: string;
  date: string;
  pax: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  tour: { titleEn: string } | null;
  cancellationRequestedAt: string | null;
  updateRequestedAt: string | null;
  couponCode: string | null;
  originalPrice: number | null;
  discountAmount: number | null;
};

type CouponUsageView = {
  id: string;
  usedAt: string;
  couponCode: string;
  tourName: string;
  discountAmount: number;
};

const LOYALTY_LEVELS = [
  { label: 'Yeni Üye', icon: '🥉', minReservations: 0, minSpend: 0 },
  { label: 'Silver', icon: '🥈', minReservations: 5, minSpend: 2000 },
  { label: 'Gold', icon: '🥇', minReservations: 15, minSpend: 5000 },
  { label: 'Platinum', icon: '💎', minReservations: 30, minSpend: 10000 },
];

function formatDate(d: Date) {
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function couponStatus(c: CouponListItem) {
  const now = new Date();
  if (!c.isActive) return { label: 'Devre dışı', dot: '⚪' };
  if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return { label: 'Limiti dolmuş', dot: '🔴' };
  if (c.bookingEnd < now) return { label: 'Süresi dolmuş', dot: '⚫' };
  return { label: 'Aktif', dot: '🟢' };
}

export function AccountClient(props: {
  lang: string;
  activeTab: AccountTab;
  profile: AccountProfile;
  reservations: ReservationItem[];
  coupons: CouponListItem[];
  couponHistory: CouponUsageView[];
  totalReservations: number;
  totalSpend: number;
  activeCouponCount: number;
}) {
  const { lang, activeTab, profile, reservations, coupons, couponHistory, totalReservations, totalSpend, activeCouponCount } = props;
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [claimingCoupon, setClaimingCoupon] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? '',
    country: profile.country ?? 'Türkiye',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [couponCodeInput, setCouponCodeInput] = useState('');

  const loyalty = useMemo(() => {
    const current = [...LOYALTY_LEVELS].reverse().find((l) => totalReservations >= l.minReservations || totalSpend >= l.minSpend) ?? LOYALTY_LEVELS[0];
    const currentIdx = LOYALTY_LEVELS.findIndex((l) => l.label === current.label);
    const next = LOYALTY_LEVELS[Math.min(LOYALTY_LEVELS.length - 1, currentIdx + 1)];
    const reservationProgress = next.minReservations > 0 ? Math.min(1, totalReservations / next.minReservations) : 1;
    const spendProgress = next.minSpend > 0 ? Math.min(1, totalSpend / next.minSpend) : 1;
    const progressPct = Math.round(Math.max(reservationProgress, spendProgress) * 100);
    return { current, next, progressPct };
  }, [totalReservations, totalSpend]);

  const activeCoupons = coupons.filter((c) => couponStatus(c).label === 'Aktif');
  const inactiveCoupons = coupons.filter((c) => couponStatus(c).label !== 'Aktif');

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    const res = await updateMyProfile(profileForm);
    setSavingProfile(false);
    setMessage(res.ok ? { type: 'ok', text: 'Profil bilgileriniz güncellendi.' } : { type: 'err', text: res.error ?? 'Güncelleme başarısız.' });
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setMessage(null);
    const res = await changeMyPassword(passwordForm);
    setChangingPassword(false);
    if (res.ok) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'ok', text: 'Şifreniz güncellendi.' });
    } else {
      setMessage({ type: 'err', text: res.error ?? 'Şifre değiştirilemedi.' });
    }
  }

  async function onClaimCoupon(e: React.FormEvent) {
    e.preventDefault();
    setClaimingCoupon(true);
    setMessage(null);
    const res = await claimCouponForCurrentUser(couponCodeInput);
    setClaimingCoupon(false);
    if (res.ok) {
      setCouponCodeInput('');
      setMessage({ type: 'ok', text: 'Kupon hesabınıza eklendi. Sayfayı yenileyin.' });
    } else {
      setMessage({ type: 'err', text: res.error ?? 'Kupon eklenemedi.' });
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0' }}>
      <h1 style={{ marginBottom: 'var(--space-lg)' }}>My Account</h1>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
        <Link className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account`}>Profil Bilgileri</Link>
        <Link className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account/coupons`}>Kuponlarım</Link>
        <Link className={`btn ${activeTab === 'reservations' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account/reservations`}>Rezervasyonlarım</Link>
        <Link className={`btn ${activeTab === 'contact' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account/contact`}>İletişim</Link>
      </div>

      {message && (
        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 8, background: message.type === 'ok' ? '#dcfce7' : '#fee2e2' }}>
          {message.text}
        </div>
      )}

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>👤 Profil Bilgileri</h2>
            <form onSubmit={onSaveProfile} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <input className="input" placeholder="Ad Soyad" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="input" placeholder="E-posta" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
              <input className="input" placeholder="Telefon" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
              <input className="input" placeholder="Ülke" value={profileForm.country} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} />
              <button className="btn btn-primary" type="submit" disabled={savingProfile}>{savingProfile ? 'Kaydediliyor...' : '💾 Bilgileri Güncelle'}</button>
            </form>
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>🔒 Şifre Değiştir</h2>
            <form onSubmit={onChangePassword} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <input className="input" type="password" placeholder="Mevcut şifre" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
              <input className="input" type="password" placeholder="Yeni şifre" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
              <input className="input" type="password" placeholder="Yeni şifre (tekrar)" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
              <button className="btn btn-primary" type="submit" disabled={changingPassword}>{changingPassword ? 'Güncelleniyor...' : 'Şifre Değiştir'}</button>
            </form>
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>🎯 Loyalty Durumum</h2>
            <p>Üyelik: {loyalty.current.icon} {loyalty.current.label}</p>
            <p>Toplam Rezervasyon: {totalReservations}</p>
            <p>Toplam Harcama: €{totalSpend.toFixed(2)}</p>
            <p>Bir sonraki seviye: {loyalty.next.icon} {loyalty.next.label}</p>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, marginTop: 8 }}>
              <div style={{ height: '100%', width: `${loyalty.progressPct}%`, background: 'var(--color-primary)', borderRadius: 999 }} />
            </div>
            <p style={{ marginTop: 6, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>%{loyalty.progressPct}</p>
          </div>

          <div>
            <a href={`/${lang}/logout`} className="btn btn-secondary">🚪 Çıkış Yap</a>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>🎟 Kuponlarım</h2>
            <form onSubmit={onClaimCoupon} style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <input className="input" placeholder="Kupon kodu girin" value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} />
              <button className="btn btn-primary" type="submit" disabled={claimingCoupon}>{claimingCoupon ? 'Ekleniyor...' : 'Ekle'}</button>
            </form>
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3>Aktif Kuponlarım ({activeCouponCount})</h3>
            {activeCoupons.length === 0 ? <p>Aktif kupon bulunmuyor.</p> : activeCoupons.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                <strong>{couponStatus(c).dot} {c.code}</strong>
                <p>{c.discountType === 'percentage' ? `%${c.discountValue}` : `€${c.discountValue}`} indirim</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Rezervasyon: {formatDate(new Date(c.bookingStart))} – {formatDate(new Date(c.bookingEnd))}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Aktivite: {formatDate(new Date(c.activityStart))} – {formatDate(new Date(c.activityEnd))}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3>Kullanılmış / Süresi Dolmuş</h3>
            {inactiveCoupons.length === 0 && couponHistory.length === 0 ? <p>Kayıt yok.</p> : (
              <>
                {inactiveCoupons.map((c) => (
                  <p key={c.id}>⚫ {c.code} — {couponStatus(c).label}</p>
                ))}
                {couponHistory.map((h) => (
                  <p key={h.id}>⚫ {h.couponCode} — Kullanıldı: {new Date(h.usedAt).toLocaleDateString('tr-TR')} · {h.tourName} · -€{h.discountAmount.toFixed(2)}</p>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>Rezervasyonlarım</h2>
          {reservations.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              Henüz rezervasyonunuz yok. <Link href={`/${lang}/tours`}>Turları inceleyin</Link>.
            </div>
          ) : (
            <MyReservationsList reservations={reservations} lang={lang} />
          )}
        </div>
      )}

      {activeTab === 'contact' && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>📞 İletişim</h2>
            <p>Herhangi bir sorunuz veya özel talebiniz mi var? Size yardımcı olmaktan mutluluk duyarız.</p>
          </div>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <p><strong>📱 WhatsApp:</strong> <a href="https://wa.me/905551234567" target="_blank" rel="noreferrer">+90 555 123 4567</a></p>
            <p><strong>✉️ E-posta:</strong> <a href="mailto:info@kismetgoreme.com">info@kismetgoreme.com</a></p>
            <p><strong>📍 Adres:</strong> Göreme, Nevşehir, Türkiye</p>
          </div>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3>Mesaj bırakın</h3>
            <input className="input" placeholder="Konu" />
            <textarea className="input" placeholder="Mesajınız" rows={4} style={{ marginTop: 'var(--space-sm)' }} />
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>📨 Gönder</button>
          </div>
        </div>
      )}
    </div>
  );
}
