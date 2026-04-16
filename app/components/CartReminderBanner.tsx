'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/app/store/cartStore';

const SESSION_KEY = 'cart_reminder_dismissed_v1';

interface CartReminderBannerProps {
  lang: string;
  labels: {
    text: string;
    items: string;
    guests: string;
    suffix: string;
    dismiss: string;
    goToCart: string;
  };
}

export function CartReminderBanner({ lang, labels }: CartReminderBannerProps) {
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  // Avoid hydration mismatch: only render after mount.
  if (!mounted || dismissed || items.length === 0) return null;

  const totalGuests = items.reduce((sum, i) => sum + (i.pax ?? 0), 0);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div className="cart-reminder-banner" role="status" aria-live="polite">
      <div className="container cart-reminder-inner">
        <p className="cart-reminder-text">
          🛒 {labels.text} <strong>{items.length}</strong> {labels.items} ({totalGuests} {labels.guests}) {labels.suffix}.
        </p>
        <div className="cart-reminder-actions">
          <Link href={`/${lang}/cart`} className="btn btn-primary btn-sm">
            {labels.goToCart}
          </Link>
          <button
            type="button"
            className="cart-reminder-dismiss"
            onClick={handleDismiss}
            aria-label={labels.dismiss}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
