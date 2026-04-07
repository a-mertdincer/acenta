import type { Metadata } from 'next';
import '../globals.css';
import { getDictionary } from '../dictionaries/getDictionary';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ScrollReveal } from '../components/ScrollReveal';
import { getSession } from '../actions/auth';
import { getActiveCouponCountForUser } from '../actions/coupons';
import { normalizeLocale, SUPPORTED_LOCALES, type SiteLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Kısmet Göreme Travel',
  description: 'Premium Cappadocia Tours & Activities',
};

const fallbackNav = {
  home: 'Home',
  tours: 'Tours',
  attractions: 'Attractions',
  aboutUs: 'About Us',
  contact: 'Contact',
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
  aboutDesc: 'Kismet Goreme Travel — premium tours and hot air balloon experiences in Cappadocia.',
  quickLinks: 'Quick links',
  contact: 'Contact',
  phone: 'Phone',
  email: 'Email',
  legal: 'Legal',
  privacy: 'Privacy Policy',
  cancellation: 'Cancellation Policy',
  rights: 'All rights reserved.',
};
const fallbackCategories = {
  'balloon-flights': 'Balloon Flights',
  'daily-tours': 'Daily Tours',
  'adventure-activities': 'Adventure Activities',
  'cultural-experiences': 'Cultural Experiences',
  transfers: 'Transfers',
  workshops: 'Workshops',
  packages: 'Packages',
  concierge: 'Concierge',
  'rent-a-car-bike': 'Rent a Car/Bike',
  all: 'All Tours',
  soon: 'Soon',
  inDestination: 'Cappadocia',
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
  let lang: SiteLocale = 'en';
  let dict: { navigation?: typeof fallbackNav; footer?: typeof fallbackFooter; headerUserMenu?: typeof fallbackHeaderUserMenu; categories?: typeof fallbackCategories } = {
    navigation: fallbackNav,
    footer: fallbackFooter,
    headerUserMenu: fallbackHeaderUserMenu,
    categories: fallbackCategories,
  };
  let session: Awaited<ReturnType<typeof getSession>> = null;
  let activeCouponCount = 0;

  try {
    const params = await props.params;
    lang = normalizeLocale(params?.lang);
  } catch {
    // params failed, keep default lang
  }

  try {
    const [d, s] = await Promise.all([getDictionary(lang), getSession()]);
    dict = d && typeof d === 'object' ? {
      navigation: d.navigation ?? fallbackNav,
      footer: d.footer ?? fallbackFooter,
      headerUserMenu: d.headerUserMenu ?? fallbackHeaderUserMenu,
      categories: d.categories ?? fallbackCategories,
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
  const categories = dict?.categories ?? fallbackCategories;

  return (
    <html lang={lang}>
      <head>
        {SUPPORTED_LOCALES.map((locale) => (
          <link key={locale} rel="alternate" hrefLang={locale} href={`/${locale}`} />
        ))}
        <link rel="alternate" hrefLang="x-default" href="/en" />
      </head>
      <body>
        <Header
          lang={lang}
          nav={nav}
          menu={headerUserMenu}
          categories={categories}
          isLoggedIn={!!session}
          isAdmin={session?.role === 'ADMIN'}
          userName={session?.name}
          activeCouponCount={activeCouponCount}
        />
        <main>
          {children}
        </main>
        <ScrollReveal />
        <Footer lang={lang} footer={footer} navigation={nav} />
      </body>
    </html>
  );
}
