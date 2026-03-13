'use client';

import Link from 'next/link';
import { useState } from 'react';
import { changeMyPassword, updateMyProfile, type AccountProfile } from '../../actions/auth';

type AdminLabels = {
  profile: { title: string; name: string; email: string; phone: string; country: string; save: string; saving: string };
  password: { title: string; current: string; new: string; confirm: string; submit: string; submitting: string };
  admin: {
    title: string;
    subtitle: string;
    quickAccess: string;
    dashboard: string;
    reservationCalendar: string;
    users: string;
    coupons: string;
    profileUpdated: string;
    profileUpdateFailed: string;
    passwordUpdated: string;
    passwordUpdateFailed: string;
  };
};

export function AdminAccountClient({ lang, profile, labels }: { lang: string; profile: AccountProfile; labels: AdminLabels }) {
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? '',
    country: profile.country ?? '',
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
    setMessage(res.ok ? { type: 'ok', text: labels.admin.profileUpdated } : { type: 'err', text: res.error ?? labels.admin.profileUpdateFailed });
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setMessage(null);
    const res = await changeMyPassword(passwordForm);
    setChangingPassword(false);
    if (res.ok) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'ok', text: labels.admin.passwordUpdated });
    } else {
      setMessage({ type: 'err', text: res.error ?? labels.admin.passwordUpdateFailed });
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0' }}>
      <h1 style={{ marginBottom: 'var(--space-sm)' }}>{labels.admin.title}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
        {labels.admin.subtitle}
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
          <h2>{labels.admin.quickAccess}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <Link className="btn btn-primary" href={`/${lang}/admin`}>{labels.admin.dashboard}</Link>
            <Link className="btn btn-secondary" href={`/${lang}/admin/reservations`}>{labels.admin.reservationCalendar}</Link>
            <Link className="btn btn-secondary" href={`/${lang}/admin/users`}>{labels.admin.users}</Link>
            <Link className="btn btn-secondary" href={`/${lang}/admin/coupons`}>{labels.admin.coupons}</Link>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2>{labels.profile.title}</h2>
          <form onSubmit={onSaveProfile} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <input className="input" placeholder={labels.profile.name} value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="input" placeholder={labels.profile.email} value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
            <input className="input" placeholder={labels.profile.phone} value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
            <input className="input" placeholder={labels.profile.country} value={profileForm.country} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} />
            <button className="btn btn-primary" type="submit" disabled={savingProfile}>
              {savingProfile ? labels.profile.saving : labels.profile.save}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          <h2>{labels.password.title}</h2>
          <form onSubmit={onChangePassword} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
            <input className="input" type="password" placeholder={labels.password.current} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
            <input className="input" type="password" placeholder={labels.password.new} value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
            <input className="input" type="password" placeholder={labels.password.confirm} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
            <button className="btn btn-primary" type="submit" disabled={changingPassword}>
              {changingPassword ? labels.password.submitting : labels.password.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
