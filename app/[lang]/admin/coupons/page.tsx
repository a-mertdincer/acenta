import { redirect } from 'next/navigation';
import { getSession } from '../../../actions/auth';
import { getCoupons } from '../../../actions/coupons';
import { AdminCouponsClient } from './AdminCouponsClient';

export default async function AdminCouponsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect(`/${lang}/login?from=admin`);

  const couponsRes = await getCoupons('all');
  const coupons = couponsRes.ok ? (couponsRes.coupons ?? []) : [];

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-2xl)' }}>🎟 Kuponlar</h1>
      <AdminCouponsClient initialCoupons={coupons} />
    </div>
  );
}
