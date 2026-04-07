'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { register } from '../../actions/auth';

type RegisterDict = {
  title: string;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  submit: string;
  or: string;
  googleSignIn: string;
  hasAccount: string;
  loginLink: string;
};

export default function RegisterClient(props: { lang: string; dict: RegisterDict }) {
  const { lang, dict } = props;
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError(dict.confirmPassword);
      return;
    }
    setIsSubmitting(true);
    const result = await register(formData.name, formData.email, formData.password);
    setIsSubmitting(false);
    if (result.ok) router.push(`/${lang}`);
    else setError(result.error ?? dict.submit);
  };

  return (
    <div className="container" style={{ padding: 'var(--space-3xl) 0', display: 'flex', justifyContent: 'center' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 'var(--space-2xl)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '2rem' }}>{dict.title}</h1>
        {error && <div style={{ color: 'red', marginBottom: 'var(--space-md)', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Input label={dict.name} type="text" name="name" value={formData.name} onChange={handleChange} required />
          <Input label={dict.email} type="email" name="email" value={formData.email} onChange={handleChange} required />
          <Input label={dict.password} type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} />
          <Input label={dict.confirmPassword} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={6} />
          <Button type="submit" style={{ marginTop: 'var(--space-sm)' }} disabled={isSubmitting}>
            {isSubmitting ? `${dict.submit}...` : dict.submit}
          </Button>
        </form>

        <div style={{ marginTop: 'var(--space-md)', textAlign: 'center', color: 'var(--color-text-muted)' }}>──── {dict.or} ────</div>
        <a href={`/api/auth/signin/google?callbackUrl=/${lang}`} className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--space-md)' }}>
          🔵 {dict.googleSignIn}
        </a>

        <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          {dict.hasAccount} <Link href={`/${lang}/login`} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{dict.loginLink}</Link>
        </div>
      </div>
    </div>
  );
}
