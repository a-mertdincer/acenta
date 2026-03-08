'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '../store/cartStore';

type Lang = 'en' | 'tr' | 'zh';

interface NavDict {
  home: string;
  tours: string;
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
  isLoggedIn?: boolean;
  isAdmin?: boolean;
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

export function Header({ lang, nav, isLoggedIn = false, isAdmin = false }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cartCount = useCartStore((s) => s.items.length);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: `/${lang}`, label: nav.home },
    { href: `/${lang}/tours`, label: nav.tours },
    ...(isAdmin ? [{ href: `/${lang}/admin`, label: nav.admin }] : []),
  ];

  const langLinks: { lang: Lang; label: string }[] = [
    { lang: 'en', label: 'EN' },
    { lang: 'tr', label: 'TR' },
    { lang: 'zh', label: 'ZH' },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
              {langLinks.map(({ lang: l, label }) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className={`site-top-bar-lang-link ${lang === l ? 'site-top-bar-lang-active' : ''}`}
                >
                  {label}
                </Link>
              ))}
          </div>
        </div>
      </div>

      {/* Main header: logo + nav + actions */}
      <div className="site-header">
        <div className="site-header-inner">
          <Link href={`/${lang}`} className="site-logo" onClick={() => setMobileOpen(false)} aria-label={nav.home}>
            <Image src="/logo.png" alt="Kısmet Göreme" width={280} height={72} className="site-logo-img" priority />
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
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href} className="site-nav-link" onClick={() => setMobileOpen(false)}>
                  {item.label}
                </Link>
              ))}
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
                      <Link href={`/${lang}/account`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        {nav.account}
                      </Link>
                      <a href={`/${lang}/logout`} className="site-nav-dropdown-item" onClick={() => { setMobileOpen(false); setUserMenuOpen(false); }}>
                        {nav.logout}
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

              <Link href={`/${lang}/cart`} className="site-nav-icon-btn site-nav-cart-btn site-nav-cart-wrap" aria-label={`${nav.cart}${mounted && cartCount > 0 ? ` (${cartCount})` : ''}`} onClick={() => setMobileOpen(false)}>
                <CartIcon />
                {mounted && cartCount > 0 && (
                  <span className="site-nav-cart-badge" aria-hidden>{cartCount > 99 ? '99+' : cartCount}</span>
                )}
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
