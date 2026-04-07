'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { login } from '../../actions/auth';

type LoginDict = {
  title: string;
  email: string;
  password: string;
  submit: string;
  or: string;
  googleSignIn: string;
  noAccount: string;
  registerLink: string;
};

export default function LoginClient(props: { lang: string; fromAdmin: boolean; dict: LoginDict }) {
  const { lang, fromAdmin, dict } = props;
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await login(formData.email, formData.password);
    setIsSubmitting(false);
    if (result.ok) router.push(fromAdmin ? `/${lang}/admin` : `/${lang}`);
    else setError(result.error ?? dict.submit);
  };

  return (
    <div className="container" style={{ padding: 'var(--space-3xl) 0', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-2xl)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '2rem' }}>{dict.title}</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Input label={dict.email} type="email" name="email" value={formData.email} onChange={handleChange} required />
          <Input label={dict.password} type="password" name="password" value={formData.password} onChange={handleChange} required />
          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>}
          <Button type="submit" style={{ marginTop: 'var(--space-sm)' }} disabled={isSubmitting}>
            {isSubmitting ? `${dict.submit}...` : dict.submit}
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center', color: 'var(--color-text-muted)' }}>──── {dict.or} ────</div>
        <a href={`/api/auth/signin/google?callbackUrl=/${lang}`} className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--space-md)' }}>
          🔵 {dict.googleSignIn}
        </a>

        <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {dict.noAccount} <Link href={`/${lang}/register`} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{dict.registerLink}</Link>
        </div>
      </div>
    </div>
  );
}
