import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import { AdminPromotionsClient } from './AdminPromotionsClient';

export default async function AdminPromotionsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect(`/${lang}/login?from=admin`);

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-lg)' }}>Promosyonlar</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', maxWidth: 720 }}>
        Kod gerektirmez; seçilen ürün ve tarih aralığında en yüksek tek indirim sepette uygulanır. Kupon ile birlikte yalnızca
        daha avantajlı olan uygulanır.
      </p>
      <AdminPromotionsClient />
    </div>
  );
}
