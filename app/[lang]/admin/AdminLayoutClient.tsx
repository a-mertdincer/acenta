'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayoutClient(props: {
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}) {
    const params = use(props.params);
    const { lang } = params;
    const pathname = usePathname();

    const navItems = [
        { path: `/${lang}/admin`, label: 'Pano' },
        { path: `/${lang}/admin/reservations`, label: 'Rezervasyonlar' },
        { path: `/${lang}/admin/calendar`, label: 'Takvim' },
        { path: `/${lang}/admin/balloon-calendar`, label: 'Balon Fiyat Takvimi' },
        { path: `/${lang}/admin/tours`, label: 'Turlar ve Fiyatlandırma' },
        { path: `/${lang}/admin/users`, label: 'Kullanıcılar ve Kuponlar' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)', backgroundColor: 'var(--color-bg-light)' }}>

            {/* Admin Sidebar */}
            <aside style={{ width: '250px', backgroundColor: 'var(--color-bg-card)', borderRight: '1px solid var(--color-border)', padding: 'var(--space-xl) var(--space-md)' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-xl)', paddingLeft: 'var(--space-sm)' }}>Yönetim Paneli</h2>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {navItems.map(item => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                style={{
                                    padding: 'var(--space-sm) var(--space-md)',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                                    color: isActive ? 'white' : 'var(--color-text-main)'
                                }}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Admin Main Content */}
            <main style={{ flex: 1, padding: 'var(--space-2xl)' }}>
                {props.children}
            </main>
        </div>
    );
}
