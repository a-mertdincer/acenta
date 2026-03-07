'use client';

import { useEffect } from 'react';

export default function LangError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lang segment error:', error.digest ?? error.message);
  }, [error]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1rem' }}>Something went wrong</h1>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>
        We couldn&apos;t load this page. This can happen if the database is temporarily unavailable.
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
    </div>
  );
}
