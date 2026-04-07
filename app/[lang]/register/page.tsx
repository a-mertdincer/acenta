import type { Metadata } from 'next';
import { getDictionary } from '../../dictionaries/getDictionary';
import type { SiteLocale } from '@/lib/i18n';
import RegisterClient from './RegisterClient';

export async function generateMetadata(props: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await props.params;
  const dict = await getDictionary((lang || 'en') as SiteLocale);
  return { title: dict.register?.title ?? 'Register' };
}

export default async function RegisterPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const dict = await getDictionary((lang || 'en') as SiteLocale);
  return (
    <RegisterClient
      lang={lang}
      dict={dict.register ?? {
        title: 'Register',
        name: 'Full Name',
        email: 'Email Address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        submit: 'Create Account',
        or: 'or',
        googleSignIn: 'Sign in with Google',
        hasAccount: 'Already have an account?',
        loginLink: 'Login here',
      }}
    />
  );
}
