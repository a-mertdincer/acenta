'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { register } from '../../actions/auth';

export default function RegisterPage(props: { params: Promise<{ lang: string }> }) {
    const params = use(props.params);
    const { lang } = params;
    const router = useRouter();

    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsSubmitting(true);
        const result = await register(formData.name, formData.email, formData.password);
        setIsSubmitting(false);
        if (result.ok) router.push(`/${lang}`);
        else setError(result.error ?? 'Registration failed');
    };

    return (
        <div className="container" style={{ padding: 'var(--space-3xl) 0', display: 'flex', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 'var(--space-2xl)' }}>
                <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', fontSize: '2rem' }}>Register</h1>

                {error && <div style={{ color: 'red', marginBottom: 'var(--space-md)', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <Input
                        label="Full Name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
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
                        minLength={6}
                    />
                    <Input
                        label="Confirm Password"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        minLength={6}
                    />

                    <Button type="submit" style={{ marginTop: 'var(--space-sm)' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account...' : 'Create Account'}
                    </Button>
                </form>
                <div style={{ marginTop: 'var(--space-md)', textAlign: 'center', color: 'var(--color-text-muted)' }}>──── or ────</div>
                <a
                    href={`/api/auth/signin/google?callbackUrl=/${lang}`}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: 'var(--space-md)' }}
                >
                    🔵 Sign in with Google
                </a>

                <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Already have an account? <Link href={`/${lang}/login`} style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Login here</Link>
                </div>
            </div>
        </div>
    );
}
