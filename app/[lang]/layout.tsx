import type { Metadata } from 'next';
import '../globals.css';
import { getDictionary } from '../dictionaries/getDictionary';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { getSession } from '../actions/auth';

export const metadata: Metadata = {
  title: 'Kısmet Göreme Travel',
  description: 'Premium Cappadocia Tours & Activities',
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { children } = props;
  const params = await props.params;
  const lang = params.lang as 'en' | 'tr' | 'zh';
  const dict = await getDictionary(lang);
  const session = await getSession();

  return (
    <html lang={lang}>
      <body>
        <Header lang={lang} nav={dict.navigation} isLoggedIn={!!session} isAdmin={session?.role === 'ADMIN'} />
        <main>
          {children}
        </main>
        <Footer lang={lang} footer={dict.footer} />
      </body>
    </html>
  );
}
