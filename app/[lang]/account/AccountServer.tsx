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
  const accountDict = {
    ...dict.account,
    reviews: {
      title: 'Reviews',
      writeReview: 'Write a Review',
      yourReview: 'Your review',
      submit: 'Submit',
      thankYou: 'Thank you! Your review will appear after approval.',
      alreadyReviewed: 'Already reviewed.',
      showMore: 'More',
      rating: 'Rating',
      close: 'Close',
      reviewSubmitted: 'Review submitted',
      ...(typeof dict === 'object' && dict !== null && 'reviews' in dict && dict.reviews && typeof dict.reviews === 'object'
        ? dict.reviews
        : {}),
    },
  };
  const profileRes = await getMyProfile();
  if (!profileRes.ok || !profileRes.profile) redirect(`/${lang}/login`);

  const profile = profileRes.profile;
  if (profile.role === 'ADMIN') {
    if (lang !== 'tr') redirect('/tr/account');
    if (tab !== 'profile') redirect(`/${lang}/account`);
    return <AdminAccountClient lang={lang} profile={profile} labels={accountDict} />;
  }
  const reservations = await getReservationsByUserId(profile.id);
  type ReservationItem = Awaited<ReturnType<typeof getReservationsByUserId>>[number];
  const couponsRes = await getMyCoupons();
  const coupons = couponsRes.ok ? couponsRes.coupons ?? [] : [];

  const couponHistoryRaw = await prisma.couponUsage.findMany({
    where: { guestEmail: profile.email },
    include: { coupon: { select: { code: true } } },
    orderBy: { usedAt: 'desc' },
    take: 20,
  });
  const couponHistory = couponHistoryRaw.map((u: { id: string; usedAt: Date; coupon: { code: string } | null; tourName: string; discountAmount: number }) => ({
    id: u.id,
    usedAt: u.usedAt.toISOString(),
    couponCode: u.coupon?.code ?? '-',
    tourName: u.tourName,
    discountAmount: u.discountAmount,
  }));

  const resIds = reservations.map((r: ReservationItem) => r.id);
  const reviewRows =
    resIds.length > 0
      ? await prisma.review.findMany({
          where: { reservationId: { in: resIds } },
          select: { reservationId: true },
        })
      : [];
  const reviewedSet = new Set(
    reviewRows.map((x: { reservationId: string | null }) => x.reservationId).filter((id: string | null): id is string => Boolean(id))
  );
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const serializedReservations = reservations.map((res: ReservationItem) => {
    const activityDay = new Date(res.date);
    activityDay.setHours(0, 0, 0, 0);
    const confirmedPast =
      res.status === 'CONFIRMED' && activityDay.getTime() < dayStart.getTime();
    const hasRev = reviewedSet.has(res.id);
    return {
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
      canWriteReview: confirmedPast && !hasRev,
      hasReview: hasRev,
    };
  });

  const completedReservations = reservations.filter((r: ReservationItem) => r.status !== 'CANCELLED');
  const totalReservations = completedReservations.length;
  const totalSpend = completedReservations.reduce((sum: number, r: ReservationItem) => sum + r.totalPrice, 0);
  const today = new Date();
  const activeCouponCount = coupons.filter((c) => c.isActive && c.bookingStart <= today && c.bookingEnd >= today).length;

  const homeLabel = (dict as { navigation?: { home?: string } }).navigation?.home ?? 'Home';

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
      homeLabel={homeLabel}
    />
  );
}
