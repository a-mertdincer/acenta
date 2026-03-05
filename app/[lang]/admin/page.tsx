import Link from 'next/link';
import { getAdminDashboardStats, getRecentActivities } from '../../actions/reservations';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = { PENDING: 'Beklemede', CONFIRMED: 'Onaylandı', CANCELLED: 'İptal', COMPLETED: 'Tamamlandı' };

export default async function AdminDashboardPage(props: { params: Promise<{ lang: string }> }) {
    const { lang } = await props.params;
    const [stats, activities] = await Promise.all([
        getAdminDashboardStats(),
        getRecentActivities(10),
    ]);

    return (
        <div>
            <h1 style={{ marginBottom: 'var(--space-xl)' }}>Yönetim Paneli</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-2xl)' }}>
                <div className="card" style={{ padding: 'var(--space-xl)', borderLeft: '4px solid var(--color-primary)' }}>
                    <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xs)' }}>Bugünkü Rezervasyonlar</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.todayReservations}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-xl)', borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xs)' }}>Onay Bekleyenler</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.pendingCount}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-xl)', borderLeft: '4px solid #f59e0b' }}>
                    <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xs)' }}>Toplam Kapasite (Balon)</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.balloonTotalCapacity}</div>
                </div>
                <div className="card" style={{ padding: 'var(--space-xl)', borderLeft: '4px solid #ef4444' }}>
                    <h3 style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xs)' }}>Boş Koltuk (Balon)</h3>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.balloonAvailableSeats}</div>
                </div>
            </div>

            <div className="card" style={{ padding: 'var(--space-xl)' }}>
                <h2 style={{ marginBottom: 'var(--space-lg)' }}>Son Aktiviteler</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-lg)' }}>
                    İsme veya satıra tıklayarak Rezervasyonlar sayfasında detayı açabilirsiniz.
                </p>
                {activities.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>Henüz aktivite yok.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {activities.map((a) => (
                            <Link
                                key={a.id}
                                href={`/${lang}/admin/reservations?highlight=${a.id}`}
                                style={{
                                    display: 'block',
                                    padding: 'var(--space-md)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                                    <div>
                                        <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{a.guestName}</span>
                                        <span style={{ color: 'var(--color-text-muted)', marginLeft: 'var(--space-sm)' }}>
                                            — {a.tourTitle} · {a.dateStr} · {a.pax} kişi · €{a.totalPrice}
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            backgroundColor: a.status === 'CONFIRMED' ? '#d1fae5' : a.status === 'PENDING' ? '#fef3c7' : '#e5e7eb',
                                            color: a.status === 'CONFIRMED' ? '#065f46' : a.status === 'PENDING' ? '#92400e' : '#374151',
                                        }}
                                    >
                                        {statusLabel[a.status] ?? a.status}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                                    {a.description} <span style={{ marginLeft: 'var(--space-sm)' }}>{a.timeAgo}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
