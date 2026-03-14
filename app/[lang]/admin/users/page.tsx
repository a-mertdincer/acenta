import { redirect } from 'next/navigation';
import { getSession, getUsers } from '../../../actions/auth';
import { assignCouponToUser, getCoupons } from '../../../actions/coupons';

export default async function AdminUsersPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') redirect(`/${lang}/login?from=admin`);

  const usersRes = await getUsers();
  const users = usersRes.ok ? usersRes.users ?? [] : [];
  const couponsRes = await getCoupons('all');
  const coupons = couponsRes.ok ? couponsRes.coupons ?? [] : [];

  async function onAssignCoupon(formData: FormData) {
    'use server';
    const userId = String(formData.get('userId') ?? '');
    const couponId = String(formData.get('couponId') ?? '');
    if (!userId || !couponId) return;
    await assignCouponToUser({ userId, couponId });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1>👥 Kullanıcılar</h1>
      </div>

      <h2 style={{ marginBottom: 'var(--space-md)' }}>Kullanıcı Listesi</h2>
      <div className="card" style={{ overflowX: 'auto', marginTop: 'var(--space-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
<th style={{ padding: 'var(--space-md)' }}>Ad</th>
                            <th style={{ padding: 'var(--space-md)' }}>E-posta</th>
                            <th style={{ padding: 'var(--space-md)' }}>Rol</th>
                            <th style={{ padding: 'var(--space-md)' }}>Katılım</th>
                            <th style={{ padding: 'var(--space-md)' }}>Kupon Ata</th>
                            <th style={{ padding: 'var(--space-md)' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: 'var(--space-md)', fontWeight: 'bold' }}>{u.name}</td>
                <td style={{ padding: 'var(--space-md)' }}>{u.email}</td>
                <td style={{ padding: 'var(--space-md)' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      backgroundColor: u.role === 'ADMIN' ? '#dbeafe' : 'var(--color-bg-light)',
                      color: u.role === 'ADMIN' ? '#1e40af' : 'inherit',
                    }}
                  >
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: 'var(--space-md)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: 'var(--space-md)' }}>
                  <form action={onAssignCoupon} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="couponId" className="input" style={{ minWidth: 180 }}>
                      <option value="">Kupon seç</option>
                      {coupons.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} {c.userId ? '(atanmış)' : ''}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                      🎟 Kupon Ata
                    </button>
                  </form>
                </td>
                <td style={{ padding: 'var(--space-md)' }}>
                  <a href={`mailto:${u.email}`} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-block' }}>E-posta</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p style={{ padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>Henüz kullanıcı yok.</p>
        )}
      </div>
    </div>
  );
}
