import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '../../actions/auth';
import { getReservationsByUserId } from '../../actions/reservations';

export default async function UserAccountPage(props: { params: Promise<{ lang: string }> }) {
    const params = await props.params;
    const lang = params.lang as 'en' | 'tr' | 'zh';
    const session = await getSession();
    if (!session) redirect(`/${lang}/login`);

    const reservations = await getReservationsByUserId(session.id);

    return (
        <div className="container" style={{ padding: 'var(--space-2xl) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                <h1>My Account</h1>
                <a href={`/${lang}/logout`} className="btn btn-secondary">Sign Out</a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-2xl)' }}>
                <div>
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>My Reservations</h2>
                    {reservations.length === 0 ? (
                        <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>You have no reservations yet.</p>
                            <Link href={`/${lang}/tours`} className="btn btn-primary" style={{ marginTop: 'var(--space-md)' }}>Browse Tours</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            {reservations.map((res) => (
                                <div key={res.id} className="card" style={{ padding: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ marginBottom: 'var(--space-xs)' }}>{res.tour?.titleEn ?? res.tourId}</h3>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                            Date: {res.date.toISOString().split('T')[0]} | Pax: {res.pax} | Total: <span style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>€{res.totalPrice}</span>
                                        </div>
                                        <span style={{
                                            display: 'inline-block',
                                            marginTop: 'var(--space-sm)',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            backgroundColor: res.status === 'CONFIRMED' ? '#d1fae5' : res.status === 'PENDING' ? '#fef3c7' : '#e5e7eb',
                                            color: res.status === 'CONFIRMED' ? '#065f46' : res.status === 'PENDING' ? '#92400e' : '#374151'
                                        }}>
                                            {res.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <div className="card" style={{ padding: 'var(--space-xl)' }}>
                        <h2 style={{ marginBottom: 'var(--space-lg)' }}>Loyalty</h2>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
                            Use your coupon code at checkout for member discounts. Contact us for special offers.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
