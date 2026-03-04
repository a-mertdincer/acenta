'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { login } from '../../actions/auth';

export default function LoginPage(props: { params: Promise<{ lang: string }> }) {
    const params = use(props.params);
    const { lang } = params;
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromAdmin = searchParams.get('from') === 'admin';

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        const result = await login(formData.email, formData.password);
        setIsSubmitting(false);
        if (result.ok) router.push(fromAdmin ? `/${lang}/admin` : `/${lang}`);
        else setError(result.error ?? 'Login failed');
    };

    return (
        <div className="container" style={{ padding: 'var(--space-3xl) 0', display: 'flex', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-2xl)' }}>
                <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '2rem' }}>Login</h1>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    {error && <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>}
                    <Button type="submit" style={{ marginTop: 'var(--space-sm)' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Don't have an account? <Link href={`/${lang}/register`} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Register here</Link>
                </div>
            </div>
        </div>
    );
}
