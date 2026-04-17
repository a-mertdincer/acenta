'use client';

import { use, useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { CheckoutSteps } from '../../components/CheckoutSteps';
import { useRouter } from 'next/navigation';
import { useExchangeRate } from '../../hooks/useExchangeRate';
import { formatPriceByLang } from '@/lib/currency';

export default function CheckoutPage(props: { params: Promise<{ lang: string }> }) {
    const params = use(props.params);
    const { lang } = params;
    const router = useRouter();

    const { items, getTotal, clearCart } = useCartStore();
    const [mounted, setMounted] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [couponApplied, setCouponApplied] = useState<{
        couponId: string;
        couponCode: string;
        discountAmount: number;
        message: string;
        activityStart?: string;
        activityEnd?: string;
    } | null>(null);
    const [couponError, setCouponError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        hotelName: '',
        roomNumber: '',
        paymentMethod: 'MAIL_ORDER'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { eurTryRate, updatedAt } = useExchangeRate(lang === 'tr');

    const rackSubtotal = items.reduce((s, i) => s + (i.listTotalPrice ?? i.totalPrice), 0);
    const [pricePreview, setPricePreview] = useState<{
        rackSubtotal: number;
        promotionDiscountTotal: number;
        couponDiscount: number;
        effectiveDiscount: number;
        finalTotal: number;
        useCouponNotPromotion: boolean;
    } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (items.length === 0) return;
        let cancelled = false;
        void (async () => {
            const { computeCheckoutPricing } = await import('../../actions/promotions');
            const p = await computeCheckoutPricing({
                items: items.map((i) => ({
                    tourId: i.tourId,
                    date: i.date,
                    totalPrice: i.totalPrice,
                    listTotalPrice: i.listTotalPrice,
                    tourType: i.tourType,
                })),
                couponCode: couponApplied?.couponCode ?? null,
            });
            if (!cancelled) setPricePreview(p);
        })();
        return () => {
            cancelled = true;
        };
    }, [items, couponApplied]);

    if (!mounted) {
        return (
            <div className="container loading-block">
                <div className="loading-spinner" style={{ marginBottom: 'var(--space-md)' }} />
                <p>Loading Checkout...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="container cart-empty-state">
                <div className="cart-empty-icon" aria-hidden>🛒</div>
                <p>Your cart is empty.</p>
                <Button onClick={() => router.push(`/${lang}/tours`)}>Browse Tours</Button>
            </div>
        );
    }

    const displayTotal =
        pricePreview?.finalTotal ??
        (couponApplied ? Math.max(0, rackSubtotal - couponApplied.discountAmount) : getTotal());
    const formatShown = (eur: number) => formatPriceByLang(eur, lang as 'en' | 'tr' | 'zh', eurTryRate);

    const handleApplyCoupon = async () => {
        setCouponError('');
        const { validateCoupon } = await import('../../actions/coupons');
        const result = await validateCoupon({
            code: couponCode,
            subtotal: rackSubtotal,
            items: items.map(i => ({
                date: i.date,
                tourType: i.tourType,
                totalPrice: i.totalPrice,
                title: i.title,
            })),
        });
        if (result.ok) {
            setCouponApplied({
                couponId: result.couponId,
                couponCode: couponCode.trim().toUpperCase(),
                discountAmount: result.discountAmount,
                message: result.message,
                activityStart: result.activityStart,
                activityEnd: result.activityEnd,
            });
        } else {
            setCouponApplied(null);
            setCouponError(result.error ?? 'Invalid coupon');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const { createReservations } = await import('../../actions/reservations');
        const result = await createReservations({
            guestName: formData.fullName,
            guestEmail: formData.email,
            guestPhone: formData.phone,
            hotelName: formData.hotelName,
            roomNumber: formData.roomNumber,
            paymentMethod: formData.paymentMethod,
            couponCode: couponApplied?.couponCode ?? null,
            items: items.map((item) => ({
                tourId: item.tourId,
                date: item.date,
                pax: item.pax,
                totalPrice: item.totalPrice,
                tourType: item.tourType,
                optionsJson: JSON.stringify(item.options),
                ...(item.transferAirport && { transferAirport: item.transferAirport }),
                ...(item.variantId && { variantId: item.variantId }),
                ...(item.transferDirection && { transferDirection: item.transferDirection }),
                ...(item.transferFlightArrival != null && { transferFlightArrival: item.transferFlightArrival }),
                ...(item.transferFlightDeparture != null && { transferFlightDeparture: item.transferFlightDeparture }),
                ...(item.transferHotelName != null && { transferHotelName: item.transferHotelName }),
                ...(item.startTime != null && { startTime: item.startTime }),
                ...(item.childCount != null && { childCount: item.childCount }),
                ...(item.adultCount != null && { adultCount: item.adultCount }),
                ...(item.infantCount != null && { infantCount: item.infantCount }),
                ...(item.listTotalPrice != null && { listTotalPrice: item.listTotalPrice }),
            })),
        });

        if (result.ok) {
            clearCart();
            const ids = result.ids ?? [];
            router.push(`/${lang}/booking/success?ids=${ids.join(',')}`);
        } else {
            alert(result.error ?? 'Something went wrong. Please try again.');
        }
        setIsSubmitting(false);
    };

    return (
        <div className="container checkout-page">
            <CheckoutSteps current={2} />
            <h1 style={{ marginBottom: 'var(--space-2xl)' }}>Checkout</h1>

            <form onSubmit={handleSubmit} className="checkout-form">
                {/* Left: Form Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

                    <div className="card" style={{ padding: 'var(--space-xl)' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Contact Information</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
                            </div>
                            <Input label="Email Address" type="email" name="email" value={formData.email} onChange={handleChange} required />
                            <Input label="Phone Number (WhatsApp preferred)" type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="card" style={{ padding: 'var(--space-xl)' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Hotel Pick-up Details</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-md)' }}>
                            <Input label="Hotel Name (in Cappadocia)" name="hotelName" value={formData.hotelName} onChange={handleChange} required />
                            <Input label="Room Number" name="roomNumber" value={formData.roomNumber} onChange={handleChange} />
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                            * Exact pick-up time will be confirmed via WhatsApp 1 day before the tour.
                        </p>
                    </div>

                    <div className="card" style={{ padding: 'var(--space-xl)' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-lg)' }}>Payment Method</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', backgroundColor: formData.paymentMethod === 'MAIL_ORDER' ? 'var(--color-bg-card)' : 'transparent' }}>
                                <input type="radio" name="paymentMethod" value="MAIL_ORDER" checked={formData.paymentMethod === 'MAIL_ORDER'} onChange={handleChange} />
                                <div>
                                    <span style={{ fontWeight: 'bold', display: 'block' }}>Mail Order Form (Deposit)</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>We will send you a secure form to leave your credit card details as a guarantee.</span>
                                </div>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', backgroundColor: formData.paymentMethod === 'CASH_ON_ARRIVAL' ? 'var(--color-bg-card)' : 'transparent' }}>
                                <input type="radio" name="paymentMethod" value="CASH_ON_ARRIVAL" checked={formData.paymentMethod === 'CASH_ON_ARRIVAL'} onChange={handleChange} />
                                <div>
                                    <span style={{ fontWeight: 'bold', display: 'block' }}>Pay on Arrival</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Pay in cash (EUR/USD/TRY) directly to your guide or driver.</span>
                                </div>
                            </label>
                            <label
                                title={lang === 'tr' ? 'Online odeme ozelligi yakinda aktif olacaktir.' : lang === 'zh' ? '在线支付功能即将上线。' : 'Online payment will be available soon.'}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-sm)',
                                    padding: 'var(--space-md)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: '8px',
                                    cursor: 'not-allowed',
                                    opacity: 0.6,
                                    backgroundColor: 'transparent',
                                }}
                            >
                                <input type="radio" disabled />
                                <div>
                                    <span style={{ fontWeight: 'bold', display: 'block' }}>
                                        Online Payment <small style={{ color: 'var(--color-text-muted)' }}>🔒 {lang === 'tr' ? 'Yakında' : lang === 'zh' ? '即将推出' : 'Coming Soon'}</small>
                                    </span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                        {lang === 'tr'
                                            ? 'Guvenli online odeme secenegi yakinda acilacak.'
                                            : lang === 'zh'
                                                ? '安全在线支付即将开放。'
                                                : 'Secure online payment option is coming soon.'}
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Right: Order Summary */}
                <div>
                    <div className="card" style={{ padding: 'var(--space-xl)', position: 'sticky', top: '20px' }}>
                        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>Order Summary ({items.length} items)</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                            {items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                                    <span style={{ color: 'var(--color-text-muted)' }}>{item.pax}x {item.title}</span>
                                    <span style={{ fontWeight: '500' }}>{formatShown(item.totalPrice).primary}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold', fontSize: '0.9rem' }}>Coupon code</label>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                                    placeholder="Enter code"
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                />
                                <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }} onClick={handleApplyCoupon}>Apply</button>
                            </div>
                            {couponError && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: 'var(--space-xs)' }}>{couponError}</p>}
                            {couponApplied && (
                                <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: 'var(--space-xs)' }}>
                                    <p style={{ fontWeight: '600' }}>✓ {couponApplied.message}</p>
                                    {couponApplied.activityStart && couponApplied.activityEnd && (
                                        <p style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                            Geçerli: {couponApplied.activityStart} – {couponApplied.activityEnd} tarihli aktiviteler için
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
                            <span>Subtotal</span>
                            <span>{formatShown(pricePreview?.rackSubtotal ?? rackSubtotal).primary}</span>
                        </div>
                        {pricePreview &&
                            !pricePreview.useCouponNotPromotion &&
                            pricePreview.promotionDiscountTotal > 0 && (
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        color: 'var(--color-text-muted)',
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    <span>Promotion</span>
                                    <span>-{formatShown(pricePreview.promotionDiscountTotal).primary}</span>
                                </div>
                            )}
                        {couponApplied && pricePreview?.useCouponNotPromotion && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                                <span>Discount ({couponApplied.couponCode})</span>
                                <span>-{formatShown(couponApplied.discountAmount).primary}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px dashed var(--color-border)', paddingTop: 'var(--space-md)', marginTop: 'var(--space-md)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--color-primary)' }}>
                                {formatShown(displayTotal).primary}
                                {formatShown(displayTotal).secondary ? <small style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{formatShown(displayTotal).secondary}</small> : null}
                            </span>
                        </div>
                        {lang === 'tr' && (
                            <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                TL tutarlar bilgilendirme amaçlıdır; ödeme EUR cinsindendir.
                                {updatedAt ? ` Kur güncelleme: ${new Date(updatedAt).toLocaleString('tr-TR')}` : ''}
                            </p>
                        )}

                        <Button
                            type="submit"
                            style={{ width: '100%', marginTop: 'var(--space-xl)' }}
                            disabled={isSubmitting}
                            isLoading={isSubmitting}
                        >
                            {isSubmitting ? 'Processing...' : 'Complete Reservation'}
                        </Button>
                        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>
                            By completing your reservation, you agree to our Terms of Service & Cancellation Policy.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
