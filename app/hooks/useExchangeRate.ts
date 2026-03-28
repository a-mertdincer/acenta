'use client';

import { useEffect, useState } from 'react';

export function useExchangeRate(enabled: boolean) {
  const [eurTryRate, setEurTryRate] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetch('/api/exchange-rate')
      .then((r) => r.json())
      .then((data: { rate?: number; updatedAt?: string }) => {
        if (cancelled) return;
        if (typeof data.rate === 'number') setEurTryRate(data.rate);
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      })
      .catch(() => {
        // keep eurTryRate as null on fetch failure
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { eurTryRate, updatedAt };
}
