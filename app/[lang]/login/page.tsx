import type { Metadata } from 'next';
import { getDictionary } from '../../dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';
import LoginClient from './LoginClient';

export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = await getDictionary((lang || 'en') as SiteLocale);
  return { title: dict.login?.title ?? 'Login' };
}

export default async function LoginPage(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const dict = await getDictionary((lang || 'en') as SiteLocale);
  return (
    <LoginClient
      lang={lang}
      fromAdmin={searchParams?.from === 'admin'}
      dict={dict.login ?? {
        title: 'Login',
        email: 'Email Address',
        password: 'Password',
        submit: 'Login',
        or: 'or',
        googleSignIn: 'Sign in with Google',
        noAccount: "Don't have an account?",
        registerLink: 'Register here',
      }}
    />
  );
}
