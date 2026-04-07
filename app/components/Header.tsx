'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore, type CartItem } from '../store/cartStore';
import { SUPPORTED_LOCALES, type SiteLocale } from '@/lib/i18n';
import { usePathname } from 'next/navigation';
import { getCategoriesForDestination, getCategoryLabel } from '@/lib/destinations';

type Lang = SiteLocale;

interface NavDict {
  home: string;
  tours: string;
  attractions: string;
  aboutUs: string;
  contact: string;
  cart: string;
  login: string;
  signUp: string;
  account: string;
  logout: string;
  admin: string;
  search: string;
}

interface HeaderProps {
  lang: Lang;
  nav: NavDict;
  menu: {
    signedInAs: string;
    profile: string;
    myCoupons: string;
    myReservations: string;
    contact: string;
    managementPanel: string;
  };
  categories?: Record<string, string>;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userName?: string;
  activeCouponCount?: number;
}

const SOCIAL_LINKS = [
  { href: 'https://www.tripadvisor.com', label: 'TripAdvisor', icon: 'tripadvisor' },
  { href: 'https://www.instagram.com', label: 'Instagram', icon: 'instagram' },
] as const;

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function TripAdvisorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M12.006 4.697c-2.87 0-5.207 2.34-5.207 5.207s2.34 5.207 5.207 5.207 5.207-2.34 5.207-5.207-2.34-5.207-5.207-5.207zM12.006 13.11c-1.77 0-3.206-1.44-3.206-3.206S10.236 6.697 12.006 6.697s3.206 1.44 3.206 3.206-1.435 3.206-3.206 3.206zM9.2 9.2c0 .77.63 1.4 1.4 1.4s1.4-.63 1.4-1.4-.63-1.4-1.4-1.4-1.4.63-1.4 1.4zm5.612 0c0 .77.63 1.4 1.4 1.4s1.4-.63 1.4-1.4-.63-1.4-1.4-1.4-1.4.63-1.4 1.4zm.994 3.206c-.385-.96-1.19-1.735-2.206-2.206.96-.385 1.735-1.19 2.206-2.206.385.96 1.19 1.735 2.206 2.206-1.015.47-1.82 1.246-2.206 2.206zM12.006 0C5.383 0 0 5.383 0 12.006s5.383 12.006 12.006 12.006 12.006-5.383 12.006-12.006S18.629 0 12.006 0zm0 21.61c-5.297 0-9.604-4.307-9.604-9.604S6.71 2.402 12.006 2.402s9.604 4.307 9.604 9.604-4.307 9.604-9.604 9.604z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function Header({ lang, nav, menu, categories = {}, isLoggedIn = false, isAdmin = false, userName, activeCouponCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const [toursMenuOpen, setToursMenuOpen] = useState(false);
  const [mobileToursOpen, setMobileToursOpen] = useState(false);
  const [removedItem, setRemovedItem] = useState<{ title: string; item: Omit<CartItem, 'id'> } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cartPreviewRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const cartCount = useCartStore((s) => s.items.length);
  const cartItems = useCartStore((s) => s.items);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const addCartItem = useCartStore((s) => s.addItem);
  const cartTotal = useCartStore((s) => s.getTotal());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  const langLabels: Record<string, string> = {
    en: 'English',
    tr: 'Türkçe',
    zh: '中文',
    es: 'Español',
    it: 'Italiano',
    ru: 'Русский',
    de: 'Deutsch',
    fr: 'Français',
    ko: '한국어',
    ja: '日本語',
    nl: 'Nederlands',
    pl: 'Polski',
    ro: 'Română',
  };
  const currentPathWithoutLocale = pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '';
  const categoryLabelLang = (lang === 'tr' || lang === 'zh' ? lang : 'en') as 'en' | 'tr' | 'zh';
  const toursCategories = getCategoriesForDestination('cappadocia');
  const categoryEmoji: Record<string, string> = {
    'balloon-flights': '🎈',
    'daily-tours': '🗺',
    'adventure-activities': '🏔',
    'cultural-experiences': '🏛',
    workshops: '🎨',
    packages: '📦',
    concierge: '🎩',
    transfers: '🚐',
    'rent-a-car-bike': '🚗',
  };
  const toursMenuItems = toursCategories.map((category) => ({
    slug: category.slug,
    label: `${categoryEmoji[category.slug] ?? '•'} ${categories[category.slug] ?? getCategoryLabel(category, categoryLabelLang)}`,
    href: `/${lang}/tours/cappadocia/${category.slug}`,
  }));
  const soonLabel = categories.soon ?? (lang === 'tr' ? 'Yakında' : lang === 'zh' ? '即将推出' : 'Soon');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (cartPreviewRef.current && !cartPreviewRef.current.contains(e.target as Node)) {
        setCartPreviewOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const cartLabels = lang === 'tr'
    ? { title: 'Sepetim', empty: 'Sepetiniz boş', go: 'Sepete Git', total: 'Toplam', removed: 'Kaldırıldı', undo: 'Geri Al' }
    : lang === 'zh'
      ? { title: '购物车', empty: '购物车为空', go: '前往购物车', total: '合计', removed: '已移除', undo: '撤销' }
      : { title: 'My Cart', empty: 'Your cart is empty', go: 'Go to Cart', total: 'Total', removed: 'Removed', undo: 'Undo' };

  const openCartPreview = () => {
    if (!canHover) return;
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    openTimerRef.current = window.setTimeout(() => setCartPreviewOpen(true), 300);
  };
  const closeCartPreview = () => {
    if (!canHover) return;
    if (openTimerRef.current) window.clearTimeout(openTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => setCartPreviewOpen(false), 200);
  };

  const removeFromPreview = (id: string) => {
    const target = cartItems.find((i) => i.id === id);
    if (!target) return;
    removeCartItem(id);
    const { id: _id, ...withoutId } = target;
    setRemovedItem({ title: target.title, item: withoutId });
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setRemovedItem(null), 5000);
  };

  return (
    <header className={`site-header-compact${scrolled ? ' scrolled' : ''}`}>
      {/* Top bar: social + language (Kelebek style) */}
      <div className="site-top-bar">
        <div className="site-top-bar-inner">
          <div className="site-top-bar-social">
            {SOCIAL_LINKS.map(({ href, label, icon }) => (
              <a
                key={icon}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="site-top-bar-icon"
                aria-label={label}
              >
                {icon === 'tripadvisor' ? <TripAdvisorIcon /> : <InstagramIcon />}
              </a>
            ))}
          </div>
          <div className="site-top-bar-lang">
              <select
                value={lang}
                onChange={(e) => {
                  const next = e.target.value;
                  window.location.href = `/${next}${currentPathWithoutLocale || ''}`;
                }}
                style={{ borderRadius: 6, padding: '4px 8px', border: '1px solid var(--color-border)', background: 'transparent', color: '#fff', fontSize: '0.8rem' }}
                aria-label="Language selector"
              >
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale} style={{ color: '#111' }}>
                    {langLabels[locale] ?? locale.toUpperCase()}
                  </option>
                ))}
              </select>
          </div>
        </div>
      </div>

      {/* Main header: logo + nav + actions */}
      <div className="site-header">
        <div className="site-header-inner">
          <Link href={`/${lang}`} className="site-logo" onClick={() => setMobileOpen(false)} aria-label={nav.home}>
            <Image src="/logo.png" alt="Kismet Goreme Travel logo" width={280} height={72} className="site-logo-img" priority />
          </Link>

          <button
            type="button"
            className="site-header-mobile-toggle"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <nav className={`site-nav ${mobileOpen ? 'site-nav-open' : ''}`}>
            <div className="site-nav-links">
              <Link href={`/${lang}`} className="site-nav-link" onClick={() => setMobileOpen(false)}>
                {nav.home}
              </Link>
              <div
                className={`site-nav-tours-wrap ${toursMenuOpen ? 'open' : ''}`}
                onMouseEnter={() => canHover && setToursMenuOpen(true)}
                onMouseLeave={() => canHover && setToursMenuOpen(false)}
              >
                <button
                  type="button"
                  className="site-nav-link site-nav-link-button"
                  onClick={() => {
                    if (mobileOpen) {
                      setMobileToursOpen((v) => !v);
                    } else {
                      window.location.href = `/${lang}/tours`;
                    }
                  }}
                  aria-expanded={mobileOpen ? mobileToursOpen : toursMenuOpen}
                >
                  {nav.tours}
                </button>
                <div className={`site-nav-tours-dropdown ${toursMenuOpen ? 'open' : ''}`}>
                  {toursMenuItems.map((item) => (
                    <Link
                      key={item.slug}
                      href={item.href}
                      className="site-nav-tours-item"
                      onClick={() => {
                        setMobileOpen(false);
                        setToursMenuOpen(false);
                      }}
                    >
                      <span>{item.label}</span>
                      {item.slug === 'rent-a-car-bike' ? <small>{soonLabel}</small> : null}
                    </Link>
                  ))}
                  <div className="site-nav-tours-sep" />
                  <Link
                    href={`/${lang}/tours`}
                    className="site-nav-tours-item site-nav-tours-all"
                    onClick={() => {
                      setMobileOpen(false);
                      setToursMenuOpen(false);
                    }}
                  >
                    {`📋 ${categories.all ?? (lang === 'tr' ? 'Tüm Turlar' : lang === 'zh' ? '所有旅游' : 'All Tours')}`}
                  </Link>
                </div>
                <div className={`site-nav-tours-mobile ${mobileToursOpen ? 'open' : ''}`}>
                  {toursMenuItems.map((item) => (
                    <Link
                      key={`m-${item.slug}`}
                      href={item.href}
                      className="site-nav-tours-item"
                      onClick={() => {
                        setMobileOpen(false);
                        setMobileToursOpen(false);
                      }}
                    >
                      <span>{item.label}</span>
                      {item.slug === 'rent-a-car-bike' ? <small>{soonLabel}</small> : null}
                    </Link>
                  ))}
                  <Link
                    href={`/${lang}/tours`}
                    className="site-nav-tours-item site-nav-tours-all"
                    onClick={() => {
                      setMobileOpen(false);
                      setMobileToursOpen(false);
                    }}
                  >
                    {`📋 ${categories.all ?? (lang === 'tr' ? 'Tüm Turlar' : lang === 'zh' ? '所有旅游' : 'All Tours')}`}
                  </Link>
                </div>
              </div>
              <Link href={`/${lang}/attractions`} className="site-nav-link" onClick={() => setMobileOpen(false)}>
                {nav.attractions}
              </Link>
              <Link href={`/${lang}/about`} className="site-nav-link" onClick={() => setMobileOpen(false)}>
                {nav.aboutUs}
              </Link>
              <Link href={`/${lang}/contact`} className="site-nav-link" onClick={() => setMobileOpen(false)}>
                {nav.contact}
              </Link>
              {isAdmin ? (
                <Link href={`/${lang}/admin`} className="site-nav-link" onClick={() => setMobileOpen(false)}>
                  {nav.admin}
                </Link>
              ) : null}
            </div>

            <div className="site-nav-actions">
              <div className="site-nav-user-wrap" ref={userMenuRef}>
                <button
                  type="button"
                  className="site-nav-icon-btn site-nav-user-btn"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  onMouseEnter={() => setUserMenuOpen(true)}
                  aria-label={nav.account}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <UserIcon />
                </button>
                <div className={`site-nav-user-dropdown ${userMenuOpen ? 'site-nav-user-dropdown-open' : ''}`} onMouseLeave={() => setUserMenuOpen(false)}>
                  {isLoggedIn ? (
                    <>
                      <div className="site-nav-dropdown-item" style={{ fontWeight: 600, cursor: 'default' }}>
                        👤 {menu.signedInAs}: {userName ?? nav.account}
                      </div>
                      <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                      <Link href={`/${lang}/account`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        📋 {menu.profile}
                      </Link>
                      <Link href={`/${lang}/account/coupons`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        🎟 {menu.myCoupons} {activeCouponCount > 0 ? `(${activeCouponCount})` : ''}
                      </Link>
                      <Link href={`/${lang}/account/reservations`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        📅 {menu.myReservations}
                      </Link>
                      <Link href={`/${lang}/account/contact`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        📞 {menu.contact}
                      </Link>
                      {isAdmin && (
                        <>
                          <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                          <Link href={`/${lang}/admin`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                            ⚙️ {menu.managementPanel}
                          </Link>
                        </>
                      )}
                      <div style={{ borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />
                      <a href={`/${lang}/logout`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        🚪 {nav.logout}
                      </a>
                    </>
                  ) : (
                    <>
                      <Link href={`/${lang}/login`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        {nav.login}
                      </Link>
                      <Link href={`/${lang}/register`} className="site-nav-dropdown-item site-nav-dropdown-item-primary" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        {nav.signUp}
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <Link href={`/${lang}/tours`} className="site-nav-icon-btn" aria-label={nav.search} onClick={() => setMobileOpen(false)}>
                <SearchIcon />
              </Link>

              <div
                className="site-nav-cart-wrap"
                ref={cartPreviewRef}
                onMouseEnter={openCartPreview}
                onMouseLeave={closeCartPreview}
              >
                <Link
                  href={`/${lang}/cart`}
                  className="site-nav-icon-btn site-nav-cart-btn"
                  aria-label={`${nav.cart}${mounted && cartCount > 0 ? ` (${cartCount})` : ''}`}
                  onClick={(e) => {
                    setMobileOpen(false);
                    if (!canHover) {
                      e.preventDefault();
                      setCartPreviewOpen((v) => !v);
                    }
                  }}
                >
                  <CartIcon />
                  {mounted && cartCount > 0 && (
                    <span className="site-nav-cart-badge" aria-hidden>{cartCount > 99 ? '99+' : cartCount}</span>
                  )}
                </Link>
                {cartPreviewOpen && (
                  <div className="cart-preview">
                    <div className="cart-preview-title">{cartLabels.title} ({cartItems.length})</div>
                    {cartItems.length === 0 ? (
                      <p className="cart-preview-empty">{cartLabels.empty}</p>
                    ) : (
                      <>
                        <div className="cart-preview-list">
                          {cartItems.map((item) => (
                            <div key={item.id} className="cart-preview-item">
                              <div>
                                <div style={{ fontWeight: 600 }}>{item.title}</div>
                                <div style={{ color: 'var(--color-text-muted)' }}>{item.date} · {item.pax} kişi · €{item.totalPrice.toFixed(2)}</div>
                              </div>
                              <button type="button" className="cart-preview-remove" onClick={() => removeFromPreview(item.id)}>✕</button>
                            </div>
                          ))}
                        </div>
                        <div className="cart-preview-footer">
                          <strong>{cartLabels.total}: €{cartTotal.toFixed(2)}</strong>
                          <Link href={`/${lang}/cart`} className="btn btn-primary btn-sm" onClick={() => setCartPreviewOpen(false)}>
                            {cartLabels.go}
                          </Link>
                        </div>
                      </>
                    )}
                    {removedItem && (
                      <div className="cart-preview-toast">
                        <span>{cartLabels.removed}: {removedItem.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            addCartItem(removedItem.item);
                            setRemovedItem(null);
                          }}
                        >
                          {cartLabels.undo}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
