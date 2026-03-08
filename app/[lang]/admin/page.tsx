import { getAdminDashboardStats, getPendingReservationsForDashboard, getTodayReservationsForDashboard, getRecentActivities, getGuestRequestReservations } from '../../actions/reservations';
import AdminDashboardClient from './AdminDashboardClient';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const [stats, pendingList, todayList, activities, guestRequestList] = await Promise.all([
    getAdminDashboardStats(),
    getPendingReservationsForDashboard(),
    getTodayReservationsForDashboard(),
    getRecentActivities(10),
    getGuestRequestReservations(),
  ]);

  return (
    <AdminDashboardClient
      lang={lang}
      stats={stats}
      pendingList={pendingList}
      todayList={todayList}
      activities={activities}
      guestRequestList={guestRequestList}
    />
  );
}
