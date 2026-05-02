import { getAdminDashboardStats, getPendingReservationsForDashboard, getTodayReservationsForDashboard, getRecentActivities, getGuestRequestReservations } from '../../actions/reservations';
import AdminDashboardClient from './AdminDashboardClient';
import { getDeepLUsage } from '@/lib/deeplTranslate';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const [stats, pendingList, todayList, activities, guestRequestList, deeplUsage] = await Promise.all([
    getAdminDashboardStats(),
    getPendingReservationsForDashboard(),
    getTodayReservationsForDashboard(),
    getRecentActivities(10),
    getGuestRequestReservations(),
    getDeepLUsage(),
  ]);

  return (
    <AdminDashboardClient
      lang={lang}
      stats={stats}
      pendingList={pendingList}
      todayList={todayList}
      activities={activities}
      guestRequestList={guestRequestList}
      deeplUsage={deeplUsage}
    />
  );
}
