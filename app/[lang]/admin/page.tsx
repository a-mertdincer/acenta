import { getAdminDashboardStats, getRecentActivities } from '../../actions/reservations';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
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
                {activities.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)' }}>Henüz aktivite yok.</p>
                ) : (
                    activities.map((a) => (
                        <div key={a.id} style={{ padding: 'var(--space-md) 0', borderBottom: '1px solid var(--color-border)' }}>
                            <p><strong>{a.guestName}</strong> <strong>{a.tourTitle}</strong> için {a.description}</p>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.timeAgo}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
