import { AccountServer } from './AccountServer';

export default async function UserAccountPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = params.lang as 'en' | 'tr' | 'zh';
  return <AccountServer lang={lang} tab="profile" />;
}
