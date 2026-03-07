'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        <h1 style={{ marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          We couldn&apos;t load the app. Please try again.
        </p>
        <p style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: '#999' }}>
          If this keeps happening, check that <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>DATABASE_URL</code> is set in production (e.g. Vercel env). View server logs for the exact error.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '0.5rem 1rem',
            background: '#D4A853',
            color: '#1B2838',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
