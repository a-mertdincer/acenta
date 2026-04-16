import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions/auth';
import {
  getMessagingLinks,
  getSocialLinks,
  getContactInfo,
} from '@/app/actions/siteSettings';
import { ContactSettingsClient } from './ContactSettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminContactSettingsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect(`/${lang}/login?from=admin`);

  const [messaging, social, contactInfo] = await Promise.all([
    getMessagingLinks(),
    getSocialLinks(),
    getContactInfo(),
  ]);

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-md)' }}>İletişim ayarları</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)', maxWidth: 640 }}>
        Mesajlaşma uygulamaları, sosyal medya ve iletişim bilgileri. Değişiklikler site genelinde hemen yansır.
      </p>
      <ContactSettingsClient
        initialMessaging={messaging}
        initialSocial={social}
        initialContact={contactInfo}
      />
    </div>
  );
}
