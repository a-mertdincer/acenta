import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import { AdminReviewsClient } from './AdminReviewsClient';

export default async function AdminReviewsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect(`/${lang}/login?from=admin`);

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-lg)' }}>Yorumlar</h1>
      <AdminReviewsClient />
    </div>
  );
}
