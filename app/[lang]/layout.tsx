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

const fallbackNav = {
  home: 'Home',
  tours: 'Tours',
  cart: 'Cart',
  login: 'Login',
  signUp: 'Sign up',
  account: 'My Account',
  logout: 'Log out',
  admin: 'Admin',
  search: 'Search',
};
const fallbackFooter = {
  about: 'About us',
  contact: 'Contact',
  phone: 'Phone',
  email: 'Email',
  privacy: 'Privacy Policy',
  cancellation: 'Cancellation Policy',
  rights: 'All rights reserved.',
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { children } = props;
  let lang = 'en' as 'en' | 'tr' | 'zh';
  let dict: { navigation: typeof fallbackNav; footer: typeof fallbackFooter } = { navigation: fallbackNav, footer: fallbackFooter };
  let session: Awaited<ReturnType<typeof getSession>> = null;

  try {
    const params = await props.params;
    lang = (params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en') as 'en' | 'tr' | 'zh';
    dict = (await getDictionary(lang)) as typeof dict;
    session = await getSession();
  } catch {
    // DATABASE_URL missing, DB down, or getDictionary failed — render with fallbacks so the app doesn't crash
  }

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
