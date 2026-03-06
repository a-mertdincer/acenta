import Link from 'next/link';

export default async function BookingDonePage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ padding: 'var(--space-2xl)', maxWidth: 520 }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)', lineHeight: 1 }}>✓</div>
        <h1 style={{ marginBottom: 'var(--space-md)', fontSize: '1.75rem' }}>
          REZERVASYON TALEBİN ALINDI!!!!
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
          Teşekkür ederiz.
        </p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-xl)' }}>
          Ekibimiz en kısa sürede sizinle iletişime geçecek.
        </p>
        <Link href={`/${lang}/`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
