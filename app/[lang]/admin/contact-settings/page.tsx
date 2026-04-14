import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import { getMessagingLinks } from '@/app/actions/siteSettings';
import { ContactSettingsClient } from './ContactSettingsClient';

export default async function AdminContactSettingsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect(`/${lang}/login?from=admin`);

  const links = await getMessagingLinks();

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-md)' }}>İletişim — mesajlaşma linkleri</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', maxWidth: 640 }}>
        WhatsApp ve LINE için tam sohbet URL’si; WeChat için yalnızca kullanıcı/ID. Değişiklikler iletişim sayfasına hemen
        yansır.
      </p>
      <ContactSettingsClient initial={links} />
    </div>
  );
}
