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
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '1rem' }}>Something went wrong</h1>
        <p style={{ marginBottom: '1.5rem', color: '#666' }}>
          We couldn&apos;t load the app. Please try again in a moment.
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
