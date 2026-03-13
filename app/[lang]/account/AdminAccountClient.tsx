'use client';

import Link from 'next/link';
import { useState } from 'react';
import { changeMyPassword, updateMyProfile, type AccountProfile } from '../../actions/auth';

export function AdminAccountClient({ lang, profile }: { lang: string; profile: AccountProfile }) {
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
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

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    const res = await updateMyProfile(profileForm);
    setSavingProfile(false);
    setMessage(res.ok ? { type: 'ok', text: 'Hesap bilgileriniz güncellendi.' } : { type: 'err', text: res.error ?? 'Guncelleme basarisiz.' });
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setMessage(null);
    const res = await changeMyPassword(passwordForm);
    setChangingPassword(false);
    if (res.ok) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'ok', text: 'Sifreniz guncellendi.' });
    } else {
      setMessage({ type: 'err', text: res.error ?? 'Sifre degistirilemedi.' });
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0' }}>
      <h1 style={{ marginBottom: 'var(--space-sm)' }}>Admin Hesabim</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
        Operasyon paneline hizli erisim ve hesap guvenlik ayarlariniz.
      </p>

      {message && (
        <div
          style={{
            marginBottom: 'var(--space-md)',
            padding: 'var(--space-sm)',
            borderRadius: 8,
            background: message.type === 'ok' ? '#dcfce7' : '#fee2e2',
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2>Yonetime Hizli Gecis</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <Link className="btn btn-primary" href={`/${lang}/admin`}>Pano</Link>
            <Link className="btn btn-secondary" href={`/${lang}/admin/reservations`}>Rezervasyon Takvimi</Link>
            <Link className="btn btn-secondary" href={`/${lang}/admin/users`}>Kullanicilar</Link>
            <Link className="btn btn-secondary" href={`/${lang}/admin/coupons`}>Kuponlar</Link>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2>Profil Bilgileri</h2>
          <form onSubmit={onSaveProfile} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <input className="input" placeholder="Ad Soyad" value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder="E-posta" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
            <input className="input" placeholder="Telefon" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
            <input className="input" placeholder="Ulke" value={profileForm.country} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} />
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? 'Kaydediliyor...' : 'Bilgileri Guncelle'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2>Sifre Degistir</h2>
          <form onSubmit={onChangePassword} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <input className="input" type="password" placeholder="Mevcut sifre" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
            <input className="input" type="password" placeholder="Yeni sifre" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
            <input className="input" type="password" placeholder="Yeni sifre (tekrar)" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
            <button className="btn btn-primary" type="submit" disabled={changingPassword}>
              {changingPassword ? 'Guncelleniyor...' : 'Sifreyi Guncelle'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
