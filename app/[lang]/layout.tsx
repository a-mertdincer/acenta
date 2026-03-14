import type { Metadata } from 'next';
import '../globals.css';
import { getDictionary } from '../dictionaries/getDictionary';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ScrollReveal } from '../components/ScrollReveal';
import { getSession } from '../actions/auth';
import { getActiveCouponCountForUser } from '../actions/coupons';

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
const fallbackHeaderUserMenu = {
  signedInAs: 'Signed in as',
  profile: 'Profile',
  myCoupons: 'My Coupons',
  myReservations: 'My Reservations',
  contact: 'Contact',
  managementPanel: 'Management Panel',
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { children } = props;
  let lang = 'en' as 'en' | 'tr' | 'zh';
  let dict: { navigation?: typeof fallbackNav; footer?: typeof fallbackFooter; headerUserMenu?: typeof fallbackHeaderUserMenu } = {
    navigation: fallbackNav,
    footer: fallbackFooter,
    headerUserMenu: fallbackHeaderUserMenu,
  };
  let session: Awaited<ReturnType<typeof getSession>> = null;
  let activeCouponCount = 0;

  try {
    const params = await props.params;
    lang = (params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en') as 'en' | 'tr' | 'zh';
  } catch {
    // params failed, keep default lang
  }

  try {
    const [d, s] = await Promise.all([getDictionary(lang), getSession()]);
    dict = d && typeof d === 'object' ? {
      navigation: d.navigation ?? fallbackNav,
      footer: d.footer ?? fallbackFooter,
      headerUserMenu: d.headerUserMenu ?? fallbackHeaderUserMenu,
    } : dict;
    session = s;
  } catch {
    session = null;
  }
  if (session?.id) {
    activeCouponCount = await getActiveCouponCountForUser(session.id);
  }

  const nav = dict?.navigation ?? fallbackNav;
  const footer = dict?.footer ?? fallbackFooter;
  const headerUserMenu = dict?.headerUserMenu ?? fallbackHeaderUserMenu;

  return (
    <html lang={lang}>
      <body>
        <Header
          lang={lang}
          nav={nav}
          menu={headerUserMenu}
          isLoggedIn={!!session}
          isAdmin={session?.role === 'ADMIN'}
          userName={session?.name}
          activeCouponCount={activeCouponCount}
        />
        <main>
          {children}
        </main>
        <ScrollReveal />
        <Footer lang={lang} footer={footer} />
      </body>
    </html>
  );
}
