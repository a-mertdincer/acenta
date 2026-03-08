import { redirect } from 'next/navigation';
import { getSession } from '../../../actions/auth';
import { getCoupons } from '../../../actions/coupons';
import { AdminUsersClient } from '../users/AdminUsersClient';

export default async function AdminCouponsPage() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect('/en/login');

  const couponsRes = await getCoupons();
  const coupons = couponsRes.ok ? (couponsRes.coupons ?? []) : [];

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-2xl)' }}>🎟 Kuponlar</h1>
      <AdminUsersClient coupons={coupons} />
    </div>
  );
}
