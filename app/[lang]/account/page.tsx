import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '../../actions/auth';
import { getReservationsByUserId } from '../../actions/reservations';
import { MyReservationsList } from '../../components/MyReservationsList';

export default async function UserAccountPage(props: { params: Promise<{ lang: string }> }) {
    const params = await props.params;
    const lang = params.lang as 'en' | 'tr' | 'zh';
    const session = await getSession();
    if (!session) redirect(`/${lang}/login`);

    const reservations = await getReservationsByUserId(session.id);
    const serialized = reservations.map((res) => ({
        id: res.id,
        tourId: res.tourId,
        date: res.date.toISOString(),
        pax: res.pax,
        totalPrice: res.totalPrice,
        status: res.status,
        notes: res.notes ?? null,
        tour: res.tour ? { titleEn: res.tour.titleEn } : null,
    }));

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
                        <MyReservationsList reservations={serialized} lang={lang} />
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
