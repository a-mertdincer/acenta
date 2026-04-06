import Link from 'next/link';
import type { SiteLocale } from '@/lib/i18n';

type Lang = SiteLocale;

interface FooterDict {
  about: string;
  contact: string;
  phone: string;
  email: string;
  privacy: string;
  cancellation: string;
  rights: string;
  quickLinks?: string;
  home?: string;
  tours?: string;
  aboutLink?: string;
  contactLink?: string;
}

interface FooterProps {
  lang: Lang;
  footer?: FooterDict;
}

const defaultFooter: FooterDict = {
  about: 'About us',
  contact: 'Contact',
  phone: 'Phone',
  email: 'Email',
  privacy: 'Privacy Policy',
  cancellation: 'Cancellation Policy',
  rights: 'All rights reserved.',
  quickLinks: 'Quick links',
  home: 'Home',
  tours: 'Tours',
  aboutLink: 'About',
  contactLink: 'Contact',
};

const FOOTER_SOCIAL = [
  { href: 'https://www.tripadvisor.com', label: 'TripAdvisor' },
  { href: 'https://www.instagram.com', label: 'Instagram' },
];

function TripAdvisorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M12.006 4.697c-2.87 0-5.207 2.34-5.207 5.207s2.34 5.207 5.207 5.207 5.207-2.34 5.207-5.207-2.34-5.207-5.207-5.207zM12.006 13.11c-1.77 0-3.206-1.44-3.206-3.206S10.236 6.697 12.006 6.697s3.206 1.44 3.206 3.206-1.435 3.206-3.206 3.206zM9.2 9.2c0 .77.63 1.4 1.4 1.4s1.4-.63 1.4-1.4-.63-1.4-1.4-1.4-1.4.63-1.4 1.4zm5.612 0c0 .77.63 1.4 1.4 1.4s1.4-.63 1.4-1.4-.63-1.4-1.4-1.4-1.4.63-1.4 1.4zm.994 3.206c-.385-.96-1.19-1.735-2.206-2.206.96-.385 1.735-1.19 2.206-2.206.385.96 1.19 1.735 2.206 2.206-1.015.47-1.82 1.246-2.206 2.206zM12.006 0C5.383 0 0 5.383 0 12.006s5.383 12.006 12.006 12.006 12.006-5.383 12.006-12.006S18.629 0 12.006 0zm0 21.61c-5.297 0-9.604-4.307-9.604-9.604S6.71 2.402 12.006 2.402s9.604 4.307 9.604 9.604-4.307 9.604-9.604 9.604z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function Footer({ lang, footer: f }: FooterProps) {
  const footer = f ?? defaultFooter;
  return (
    <footer id="contact" className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-block">
            <h3 className="site-footer-title">{footer.about}</h3>
            <p className="site-footer-text">
              Kısmet Göreme Travel — premium tours and hot air balloon experiences in Cappadocia.
            </p>
            <div className="site-footer-social">
              {FOOTER_SOCIAL.map(({ href, label }, i) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" aria-label={label}>
                  {i === 0 ? <TripAdvisorIcon /> : <InstagramIcon />}
                </a>
              ))}
            </div>
          </div>
          <div className="site-footer-block">
            <h3 className="site-footer-title">{footer.quickLinks ?? 'Quick links'}</h3>
            <nav className="site-footer-quicklinks" aria-label="Footer navigation">
              <Link href={`/${lang}`}>{footer.home ?? 'Home'}</Link>
              <Link href={`/${lang}/tours`}>{footer.tours ?? 'Tours'}</Link>
              <Link href={`/${lang}/about`}>{footer.aboutLink ?? 'About'}</Link>
              <Link href={`/${lang}/contact`}>{footer.contactLink ?? 'Contact'}</Link>
            </nav>
          </div>
          <div className="site-footer-block">
            <h3 className="site-footer-title">{footer.contact}</h3>
            <p className="site-footer-text">
              <span className="site-footer-label">{footer.phone}:</span>{' '}
              <a href="tel:+903842123456" className="site-footer-link">+90 384 212 34 56</a>
              <br />
              <span className="site-footer-label">{footer.email}:</span>{' '}
              <a href="mailto:info@kismetgoreme.com" className="site-footer-link">info@kismetgoreme.com</a>
            </p>
          </div>
          <div className="site-footer-block">
            <h3 className="site-footer-title">Legal</h3>
            <p className="site-footer-text">
              <Link href={`/${lang}/legal/privacy`} className="site-footer-link">{footer.privacy}</Link>
              <br />
              <Link href={`/${lang}/legal/cancellation`} className="site-footer-link">{footer.cancellation}</Link>
            </p>
          </div>
        </div>
        <div className="site-footer-bottom">
          <p className="site-footer-copy">&copy; {new Date().getFullYear()} Kısmet Göreme Travel. {footer.rights}</p>
        </div>
      </div>
    </footer>
  );
}
