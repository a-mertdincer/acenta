'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';
import { Button } from '../../components/Button';
import { CheckoutSteps } from '../../components/CheckoutSteps';

export default function CartPage(props: { params: Promise<{ lang: string }> }) {
    const params = use(props.params);
    const { lang } = params;

    // Use hydration-safe zustand selector (https://zustand.docs.pmnd.rs/integrations/persisting-store-data#how-can-i-check-if-my-store-has-been-hydrated)
    // For simplicity, we just use local state mounted check
    const [mounted, setMounted] = useState(false);
    const { items, removeItem, getTotal } = useCartStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="container loading-block">
                <div className="loading-spinner" style={{ marginBottom: 'var(--space-md)' }} />
                <p>Loading Cart...</p>
            </div>
        );
    }

    const total = getTotal();

    return (
        <div className="container cart-page">
            <CheckoutSteps current={1} />
            <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Your Cart</h1>

            {items.length === 0 ? (
                <div className="cart-empty-state">
                    <div className="cart-empty-icon" aria-hidden>🛒</div>
                    <p>Your cart is empty.</p>
                    <Link href={`/${lang}/tours`}>
                        <Button>Browse Tours</Button>
                    </Link>
                </div>
            ) : (
                <div className="cart-grid">
                    {/* Cart Items List */}
                    <div>
                        {items.map(item => (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-lg)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: 'var(--space-md)' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                                        <span style={{ backgroundColor: 'var(--color-bg-card)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>{item.tourType}</span>
                                        <h3 style={{ margin: 0 }}>{item.title}</h3>
                                    </div>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xs)' }}>
                                        Date: {item.date} | Pax: {item.pax}
                                        {item.transferAirport && (
                                            <span> | {item.transferAirport === 'ASR' ? 'Kayseri (ASR)' : 'Nevşehir (NAV)'}</span>
                                        )}
                                    </p>
                                    {item.options.length > 0 && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                            <strong>Options:</strong> {item.options.map(o => o.title).join(', ')}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--color-primary)' }}>€{item.totalPrice}</span>
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Order Summary */}
                    <div>
                        <div className="card" style={{ padding: 'var(--space-xl)', position: 'sticky', top: '20px' }}>
                            <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>Order Summary</h3>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                                <span>Subtotal</span>
                                <span>€{total}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
                                <span>Tax</span>
                                <span>Included</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--color-primary)' }}>€{total}</span>
                            </div>

                            <Link href={`/${lang}/checkout`}>
                                <Button style={{ width: '100%', marginTop: 'var(--space-xl)' }}>Proceed to Checkout</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
