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

const LOYALTY_LEVELS_BY_LOCALE = {
  en: [
    { label: 'New Member', icon: '🥉', minReservations: 0, minSpend: 0 },
    { label: 'Silver', icon: '🥈', minReservations: 5, minSpend: 2000 },
    { label: 'Gold', icon: '🥇', minReservations: 15, minSpend: 5000 },
    { label: 'Platinum', icon: '💎', minReservations: 30, minSpend: 10000 },
  ],
  tr: [
    { label: 'Yeni Uye', icon: '🥉', minReservations: 0, minSpend: 0 },
    { label: 'Silver', icon: '🥈', minReservations: 5, minSpend: 2000 },
    { label: 'Gold', icon: '🥇', minReservations: 15, minSpend: 5000 },
    { label: 'Platinum', icon: '💎', minReservations: 30, minSpend: 10000 },
  ],
  zh: [
    { label: '新会员', icon: '🥉', minReservations: 0, minSpend: 0 },
    { label: '银卡', icon: '🥈', minReservations: 5, minSpend: 2000 },
    { label: '金卡', icon: '🥇', minReservations: 15, minSpend: 5000 },
    { label: '白金', icon: '💎', minReservations: 30, minSpend: 10000 },
  ],
} as const;

type AccountLabels = {
  title: string;
  tabs: { profile: string; coupons: string; reservations: string; contact: string };
  messages: {
    profileUpdated: string;
    profileUpdateFailed: string;
    passwordUpdated: string;
    passwordChangeFailed: string;
    couponAdded: string;
    couponAddFailed: string;
  };
  profile: { title: string; name: string; email: string; phone: string; country: string; save: string; saving: string };
  password: { title: string; current: string; new: string; confirm: string; submit: string; submitting: string };
  loyalty: { title: string; membership: string; totalReservations: string; totalSpend: string; nextLevel: string };
  logout: string;
  coupons: {
    title: string;
    codePlaceholder: string;
    add: string;
    adding: string;
    activeTitle: string;
    noActive: string;
    discountSuffix: string;
    reservationWindow: string;
    activityWindow: string;
    historyTitle: string;
    noRecords: string;
    usedOn: string;
    status: { disabled: string; limitReached: string; expired: string; active: string };
  };
  reservations: { title: string; empty: string; exploreTours: string };
  reservationCard: {
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
  contact: {
    title: string;
    description: string;
    whatsAppLabel: string;
    emailLabel: string;
    addressLabel: string;
    addressValue: string;
    messageTitle: string;
    subject: string;
    message: string;
    send: string;
  };
};

function formatDate(d: Date, locale: 'en' | 'tr' | 'zh') {
  const localeMap = { en: 'en-US', tr: 'tr-TR', zh: 'zh-CN' } as const;
  return d.toLocaleDateString(localeMap[locale], { day: '2-digit', month: 'short', year: 'numeric' });
}

function couponStatus(c: CouponListItem, labels: AccountLabels['coupons']['status']) {
  const now = new Date();
  if (!c.isActive) return { label: labels.disabled, dot: '⚪' };
  if (c.usageLimit > 0 && c.usageCount >= c.usageLimit) return { label: labels.limitReached, dot: '🔴' };
  if (c.bookingEnd < now) return { label: labels.expired, dot: '⚫' };
  return { label: labels.active, dot: '🟢' };
}

export function AccountClient(props: {
  lang: string;
  locale: 'en' | 'tr' | 'zh';
  activeTab: AccountTab;
  profile: AccountProfile;
  reservations: ReservationItem[];
  coupons: CouponListItem[];
  couponHistory: CouponUsageView[];
  totalReservations: number;
  totalSpend: number;
  activeCouponCount: number;
  labels: AccountLabels;
}) {
  const { lang, locale, activeTab, profile, reservations, coupons, couponHistory, totalReservations, totalSpend, activeCouponCount, labels } = props;
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [claimingCoupon, setClaimingCoupon] = useState(false);
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
  const [couponCodeInput, setCouponCodeInput] = useState('');

  const loyaltyLevels = LOYALTY_LEVELS_BY_LOCALE[locale];
  const loyalty = useMemo(() => {
    const current = [...loyaltyLevels].reverse().find((l) => totalReservations >= l.minReservations || totalSpend >= l.minSpend) ?? loyaltyLevels[0];
    const currentIdx = loyaltyLevels.findIndex((l) => l.label === current.label);
    const next = loyaltyLevels[Math.min(loyaltyLevels.length - 1, currentIdx + 1)];
    const reservationProgress = next.minReservations > 0 ? Math.min(1, totalReservations / next.minReservations) : 1;
    const spendProgress = next.minSpend > 0 ? Math.min(1, totalSpend / next.minSpend) : 1;
    const progressPct = Math.round(Math.max(reservationProgress, spendProgress) * 100);
    return { current, next, progressPct };
  }, [totalReservations, totalSpend, loyaltyLevels]);

  const activeCoupons = coupons.filter((c) => couponStatus(c, labels.coupons.status).label === labels.coupons.status.active);
  const inactiveCoupons = coupons.filter((c) => couponStatus(c, labels.coupons.status).label !== labels.coupons.status.active);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    const res = await updateMyProfile(profileForm);
    setSavingProfile(false);
    setMessage(res.ok ? { type: 'ok', text: labels.messages.profileUpdated } : { type: 'err', text: res.error ?? labels.messages.profileUpdateFailed });
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangingPassword(true);
    setMessage(null);
    const res = await changeMyPassword(passwordForm);
    setChangingPassword(false);
    if (res.ok) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'ok', text: labels.messages.passwordUpdated });
    } else {
      setMessage({ type: 'err', text: res.error ?? labels.messages.passwordChangeFailed });
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
      setMessage({ type: 'ok', text: labels.messages.couponAdded });
    } else {
      setMessage({ type: 'err', text: res.error ?? labels.messages.couponAddFailed });
    }
  }

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0' }}>
      <h1 style={{ marginBottom: 'var(--space-lg)' }}>{labels.title}</h1>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-xl)', flexWrap: 'wrap' }}>
        <Link className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account`}>{labels.tabs.profile}</Link>
        <Link className={`btn ${activeTab === 'coupons' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account/coupons`}>{labels.tabs.coupons}</Link>
        <Link className={`btn ${activeTab === 'reservations' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account/reservations`}>{labels.tabs.reservations}</Link>
        <Link className={`btn ${activeTab === 'contact' ? 'btn-primary' : 'btn-secondary'}`} href={`/${lang}/account/contact`}>{labels.tabs.contact}</Link>
      </div>

      {message && (
        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 8, background: message.type === 'ok' ? '#dcfce7' : '#fee2e2' }}>
          {message.text}
        </div>
      )}

      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>👤 {labels.profile.title}</h2>
            <form onSubmit={onSaveProfile} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <input className="input" placeholder={labels.profile.name} value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} />
              <input className="input" placeholder={labels.profile.email} value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} />
              <input className="input" placeholder={labels.profile.phone} value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} />
              <input className="input" placeholder={labels.profile.country} value={profileForm.country} onChange={(e) => setProfileForm((p) => ({ ...p, country: e.target.value }))} />
              <button className="btn btn-primary" type="submit" disabled={savingProfile}>{savingProfile ? labels.profile.saving : `💾 ${labels.profile.save}`}</button>
            </form>
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>🔒 {labels.password.title}</h2>
            <form onSubmit={onChangePassword} style={{ display: 'grid', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <input className="input" type="password" placeholder={labels.password.current} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} />
              <input className="input" type="password" placeholder={labels.password.new} value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} />
              <input className="input" type="password" placeholder={labels.password.confirm} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
              <button className="btn btn-primary" type="submit" disabled={changingPassword}>{changingPassword ? labels.password.submitting : labels.password.submit}</button>
            </form>
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>🎯 {labels.loyalty.title}</h2>
            <p>{labels.loyalty.membership}: {loyalty.current.icon} {loyalty.current.label}</p>
            <p>{labels.loyalty.totalReservations}: {totalReservations}</p>
            <p>{labels.loyalty.totalSpend}: €{totalSpend.toFixed(2)}</p>
            <p>{labels.loyalty.nextLevel}: {loyalty.next.icon} {loyalty.next.label}</p>
            <div style={{ height: 10, background: '#e5e7eb', borderRadius: 999, marginTop: 8 }}>
              <div style={{ height: '100%', width: `${loyalty.progressPct}%`, background: 'var(--color-primary)', borderRadius: 999 }} />
            </div>
            <p style={{ marginTop: 6, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>%{loyalty.progressPct}</p>
          </div>

          <div>
            <a href={`/${lang}/logout`} className="btn btn-secondary">🚪 {labels.logout}</a>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>🎟 {labels.coupons.title}</h2>
            <form onSubmit={onClaimCoupon} style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
              <input className="input" placeholder={labels.coupons.codePlaceholder} value={couponCodeInput} onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())} />
              <button className="btn btn-primary" type="submit" disabled={claimingCoupon}>{claimingCoupon ? labels.coupons.adding : labels.coupons.add}</button>
            </form>
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3>{labels.coupons.activeTitle} ({activeCouponCount})</h3>
            {activeCoupons.length === 0 ? <p>{labels.coupons.noActive}</p> : activeCoupons.map((c) => (
              <div key={c.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                <strong>{couponStatus(c, labels.coupons.status).dot} {c.code}</strong>
                <p>{c.discountType === 'percentage' ? `%${c.discountValue}` : `€${c.discountValue}`} {labels.coupons.discountSuffix}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{labels.coupons.reservationWindow}: {formatDate(new Date(c.bookingStart), locale)} - {formatDate(new Date(c.bookingEnd), locale)}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{labels.coupons.activityWindow}: {formatDate(new Date(c.activityStart), locale)} - {formatDate(new Date(c.activityEnd), locale)}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3>{labels.coupons.historyTitle}</h3>
            {inactiveCoupons.length === 0 && couponHistory.length === 0 ? <p>{labels.coupons.noRecords}</p> : (
              <>
                {inactiveCoupons.map((c) => (
                  <p key={c.id}>⚫ {c.code} — {couponStatus(c, labels.coupons.status).label}</p>
                ))}
                {couponHistory.map((h) => (
                  <p key={h.id}>⚫ {h.couponCode} — {labels.coupons.usedOn}: {new Date(h.usedAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'zh' ? 'zh-CN' : 'en-US')} · {h.tourName} · -€{h.discountAmount.toFixed(2)}</p>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>{labels.reservations.title}</h2>
          {reservations.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              {labels.reservations.empty} <Link href={`/${lang}/tours`}>{labels.reservations.exploreTours}</Link>.
            </div>
          ) : (
            <MyReservationsList reservations={reservations} lang={lang} labels={labels.reservationCard} />
          )}
        </div>
      )}

      {activeTab === 'contact' && (
        <div style={{ display: 'grid', gap: 'var(--space-lg)' }}>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h2>📞 {labels.contact.title}</h2>
            <p>{labels.contact.description}</p>
          </div>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <p><strong>📱 {labels.contact.whatsAppLabel}:</strong> <a href="https://wa.me/905551234567" target="_blank" rel="noreferrer">+90 555 123 4567</a></p>
            <p><strong>✉️ {labels.contact.emailLabel}:</strong> <a href="mailto:info@kismetgoreme.com">info@kismetgoreme.com</a></p>
            <p><strong>📍 {labels.contact.addressLabel}:</strong> {labels.contact.addressValue}</p>
          </div>
          <div className="card" style={{ padding: 'var(--space-xl)' }}>
            <h3>{labels.contact.messageTitle}</h3>
            <input className="input" placeholder={labels.contact.subject} />
            <textarea className="input" placeholder={labels.contact.message} rows={4} style={{ marginTop: 'var(--space-sm)' }} />
            <button className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>📨 {labels.contact.send}</button>
          </div>
        </div>
      )}
    </div>
  );
}
