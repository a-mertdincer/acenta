import { redirect } from 'next/navigation';
import { getMyProfile } from '../../actions/auth';
import { getReservationsByUserId } from '../../actions/reservations';
import { getMyCoupons } from '../../actions/coupons';
import { prisma } from '../../../lib/prisma';
import { AccountClient } from './AccountClient';
import { AdminAccountClient } from './AdminAccountClient';
import { getDictionary } from '../../dictionaries/getDictionary';

type AccountTab = 'profile' | 'coupons' | 'reservations' | 'contact';

export async function AccountServer({ lang, tab }: { lang: string; tab: AccountTab }) {
  const locale = (lang === 'tr' || lang === 'zh' ? lang : 'en') as 'en' | 'tr' | 'zh';
  const dict = await getDictionary(locale);
  const accountDict = dict.account;
  const profileRes = await getMyProfile();
  if (!profileRes.ok || !profileRes.profile) redirect(`/${lang}/login`);

  const profile = profileRes.profile;
  if (profile.role === 'ADMIN') {
    if (lang !== 'tr') redirect('/tr/account');
    if (tab !== 'profile') redirect(`/${lang}/account`);
    return <AdminAccountClient lang={lang} profile={profile} labels={accountDict} />;
  }
  const reservations = await getReservationsByUserId(profile.id);
  const couponsRes = await getMyCoupons();
  const coupons = couponsRes.ok ? couponsRes.coupons ?? [] : [];

  const couponHistoryRaw = await prisma.couponUsage.findMany({
    where: { guestEmail: profile.email },
    include: { coupon: { select: { code: true } } },
    orderBy: { usedAt: 'desc' },
    take: 20,
  });
  const couponHistory = couponHistoryRaw.map((u) => ({
    id: u.id,
    usedAt: u.usedAt.toISOString(),
    couponCode: u.coupon?.code ?? '-',
    tourName: u.tourName,
    discountAmount: u.discountAmount,
  }));

  const serializedReservations = reservations.map((res) => ({
    id: res.id,
    tourId: res.tourId,
    date: res.date.toISOString(),
    pax: res.pax,
    totalPrice: res.totalPrice,
    status: res.status,
    notes: res.notes ?? null,
    tour: res.tour ? { titleEn: res.tour.titleEn } : null,
    cancellationRequestedAt: res.cancellationRequestedAt?.toISOString() ?? null,
    updateRequestedAt: res.updateRequestedAt?.toISOString() ?? null,
    couponCode: res.couponCode ?? null,
    originalPrice: res.originalPrice ?? null,
    discountAmount: res.discountAmount ?? null,
  }));

  const completedReservations = reservations.filter((r) => r.status !== 'CANCELLED');
  const totalReservations = completedReservations.length;
  const totalSpend = completedReservations.reduce((sum, r) => sum + r.totalPrice, 0);
  const today = new Date();
  const activeCouponCount = coupons.filter((c) => c.isActive && c.bookingStart <= today && c.bookingEnd >= today).length;

  return (
    <AccountClient
      lang={lang}
      activeTab={tab}
      profile={profile}
      reservations={serializedReservations}
      coupons={coupons}
      couponHistory={couponHistory}
      totalReservations={totalReservations}
      totalSpend={totalSpend}
      activeCouponCount={activeCouponCount}
      labels={accountDict}
      locale={locale}
    />
  );
}
