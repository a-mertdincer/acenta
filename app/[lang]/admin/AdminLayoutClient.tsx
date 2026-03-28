'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getPendingReservationCount } from '@/app/actions/reservations';

const SIDEBAR_SECTIONS = [
  {
    title: 'OPERASYON',
    items: [
      { path: 'admin', label: 'Pano', icon: '📊', badge: true },
      { path: 'admin/reservations', label: 'Rezervasyon Takvimi', icon: '📅' },
    ],
  },
  {
    title: 'ÜRÜN YÖNETİMİ',
    items: [
      { path: 'admin/tours', label: 'Ürünler', icon: '📦' },
      { path: 'admin/pricing', label: 'Fiyatlandırma ve Müsaitlik', icon: '💰' },
      { path: 'admin/flights', label: 'Uçuş Listesi', icon: '✈️' },
    ],
  },
  {
    title: 'MİSAFİR İLİŞKİLERİ',
    items: [
      { path: 'admin/users', label: 'Kullanıcılar', icon: '👥' },
      { path: 'admin/coupons', label: 'Kuponlar', icon: '🎟' },
    ],
  },
  {
    title: 'CARİ HESAP',
    items: [
      { path: 'admin/cari', label: 'Gelir-Gider Tablosu', icon: '💰' },
    ],
  },
];

export default function AdminLayoutClient(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const params = use(props.params);
  const { lang } = params;
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchPending = () => {
      getPendingReservationCount().then((n) => {
        if (mounted) setPendingCount(n);
      });
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const base = `/${lang}`;

  return (
    <div className="admin-shell" style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', backgroundColor: 'var(--color-bg-light)' }}>
      <aside
        className="admin-sidebar"
        style={{
          width: 240,
          background: '#1E2A38',
          color: 'white',
          minHeight: '100%',
          position: 'sticky',
          top: 0,
          overflowY: 'auto',
          padding: 'var(--space-xl) 0',
        }}
      >
        <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Kısmet Göreme</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>Yönetim Paneli</p>
        </div>

        <nav>
          {SIDEBAR_SECTIONS.map((section) => (
            <div key={section.title} className="admin-sidebar-section" style={{ marginTop: 20 }}>
              <div
                className="admin-sidebar-section-title"
                style={{
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'rgba(255,255,255,0.4)',
                  padding: '0 20px',
                  marginBottom: 4,
                }}
              >
                {section.title}
              </div>
              {section.items.map((item) => {
                const fullPath = `${base}/${item.path === 'admin' ? 'admin' : item.path}`;
                const isActive = pathname === fullPath || (item.path !== 'admin' && pathname?.startsWith(fullPath));
                const showBadge = item.badge && pendingCount > 0;
                return (
                  <Link
                    key={item.path}
                    href={fullPath}
                    className="admin-sidebar-link"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 20px',
                      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      transition: 'all 0.15s',
                      borderLeft: isActive ? '3px solid var(--color-accent, #C45B28)' : '3px solid transparent',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                    }}
                  >
                    <span style={{ opacity: 0.9 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {showBadge && (
                      <span
                        className="badge"
                        style={{
                          marginLeft: 'auto',
                          background: 'var(--color-accent, #C45B28)',
                          color: 'white',
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: 10,
                        }}
                      >
                        {pendingCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="admin-content" style={{ flex: 1, padding: '24px' }}>
        {props.children}
      </main>
    </div>
  );
}
