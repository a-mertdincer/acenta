import { redirect } from 'next/navigation';
import { AccountServer } from '../AccountServer';

const TABS = new Set(['coupons', 'reservations', 'contact']);

export default async function AccountTabPage(props: { params: Promise<{ lang: string; tab: string }> }) {
  const { lang, tab } = await props.params;
  if (!TABS.has(tab)) redirect(`/${lang}/account`);
  return <AccountServer lang={lang} tab={tab as 'coupons' | 'reservations' | 'contact'} />;
}
