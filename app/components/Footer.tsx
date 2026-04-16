import Link from 'next/link';
import Image from 'next/image';
import type { SiteLocale } from '@/lib/i18n';
import { getContactInfo, getSocialLinks, getMessagingLinks } from '@/app/actions/siteSettings';

interface FooterDict {
  about?: string;
  aboutDesc?: string;
  quickLinks?: string;
  contact?: string;
  phone?: string;
  email?: string;
  legal?: string;
  privacy?: string;
  cancellation?: string;
  rights?: string;
  colCompany?: string;
  colLegal?: string;
  colExperience?: string;
  colInfo?: string;
  linkAbout?: string;
  linkContactFooter?: string;
  legalTerms?: string;
  legalDistanceSales?: string;
  legalKvkk?: string;
  expBalloon?: string;
  expDaily?: string;
  expAdventure?: string;
  expCultural?: string;
  expWorkshops?: string;
  infoBrand?: string;
  infoAddress1?: string;
  infoAddress2?: string;
  infoPhoneLabel?: string;
  infoEmailLabel?: string;
  infoTursab?: string;
  caveMansion?: string;
  caveHouse?: string;
  copyrightName?: string;
}

interface FooterProps {
  lang: SiteLocale;
  footer?: FooterDict;
  navigation?: { home: string; tours: string; aboutUs: string; contact: string };
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.394.223-.692.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

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

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M13.5 21v-7.5h2.53l.38-2.94H13.5V8.7c0-.85.24-1.43 1.46-1.43h1.56V4.63c-.27-.04-1.2-.12-2.28-.12-2.25 0-3.8 1.37-3.8 3.9v2.17H7.9v2.94h2.54V21h3.06z" />
    </svg>
  );
}

function RednoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fill="#fff" fontFamily="system-ui">小红</text>
    </svg>
  );
}

/** Footer brand mark — `public/logoyeni.png` (source dimensions match file). */
const FOOTER_LOGO_SRC = '/logoyeni.png' as const;
const FOOTER_LOGO_WIDTH = 711;
const FOOTER_LOGO_HEIGHT = 564;

const HOTEL_LOGO_MANSION = '/images/hotels/kismet-cave-mansion.png';
const HOTEL_LOGO_HOUSE = '/images/hotels/kismet-cave-house.png';

export async function Footer({ lang, footer: f, navigation }: FooterProps) {
  const [contactInfo, social, messaging] = await Promise.all([
    getContactInfo(),
    getSocialLinks(),
    getMessagingLinks(),
  ]);
  const footer = f ?? {};
  const brand = footer.infoBrand ?? 'Kısmet Göreme Travel';
  const phoneTel = `tel:${contactInfo.contact_phone.replace(/[^+\d]/g, '')}`;
  const addressLines = contactInfo.contact_address.split(/\s*,\s*/).filter(Boolean);
  return (
    <footer id="contact" className="site-footer site-footer-v2">
      <div className="container site-footer-inner">
        <div className="site-footer-v2-top">
          <div className="site-footer-v2-brand">
            <Link href={`/${lang}`} className="site-footer-logo-link">
              <Image
                src={FOOTER_LOGO_SRC}
                alt={brand}
                width={FOOTER_LOGO_WIDTH}
                height={FOOTER_LOGO_HEIGHT}
                className="site-footer-logo-img"
                sizes="(max-width: 640px) 160px, 220px"
              />
            </Link>
          </div>
          <div className="site-footer-v2-grid">
            <div>
              <h3 className="site-footer-title">{footer.colCompany ?? 'Company'}</h3>
              <nav className="site-footer-links" aria-label="Company">
                <Link href={`/${lang}/about`}>{footer.linkAbout ?? navigation?.aboutUs ?? 'About'}</Link>
                <Link href={`/${lang}/contact`}>{footer.linkContactFooter ?? navigation?.contact ?? 'Contact'}</Link>
              </nav>
            </div>
            <div>
              <h3 className="site-footer-title">{footer.colLegal ?? 'Legal'}</h3>
              <nav className="site-footer-links" aria-label="Legal">
                <Link href={`/${lang}/legal/terms`}>{footer.legalTerms ?? 'Terms'}</Link>
                <Link href={`/${lang}/legal/cancellation`}>{footer.cancellation ?? 'Cancellation'}</Link>
                <Link href={`/${lang}/legal/distance-sales`}>{footer.legalDistanceSales ?? 'Distance sales'}</Link>
                <Link href={`/${lang}/legal/privacy`}>{footer.privacy ?? 'Privacy'}</Link>
                <Link href={`/${lang}/legal/kvkk`}>{footer.legalKvkk ?? 'KVKK'}</Link>
              </nav>
            </div>
            <div>
              <h3 className="site-footer-title">{footer.colExperience ?? 'Experience'}</h3>
              <nav className="site-footer-links" aria-label="Experience">
                <Link href={`/${lang}/tours?category=balloon-flights`}>{footer.expBalloon ?? 'Balloon'}</Link>
                <Link href={`/${lang}/tours?category=daily-tours`}>{footer.expDaily ?? 'Daily tours'}</Link>
                <Link href={`/${lang}/tours?category=adventure-activities`}>{footer.expAdventure ?? 'Adventure'}</Link>
                <Link href={`/${lang}/tours?category=cultural-experiences`}>{footer.expCultural ?? 'Cultural'}</Link>
                <Link href={`/${lang}/tours?category=workshops`}>{footer.expWorkshops ?? 'Workshops'}</Link>
              </nav>
            </div>
            <div>
              <h3 className="site-footer-title">{footer.colInfo ?? 'Information'}</h3>
              <p className="site-footer-text site-footer-info-block">
                <strong>{brand}</strong>
                <br />
                {addressLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < addressLines.length - 1 ? <br /> : null}
                  </span>
                ))}
                <br />
                <span className="site-footer-label">{footer.infoPhoneLabel ?? footer.phone}:</span>{' '}
                <a href={phoneTel} className="site-footer-link">
                  {contactInfo.contact_phone}
                </a>
                <br />
                <span className="site-footer-label">{footer.infoEmailLabel ?? footer.email}:</span>{' '}
                <a href={`mailto:${contactInfo.contact_email}`} className="site-footer-link">
                  {contactInfo.contact_email}
                </a>
                <br />
                {footer.infoTursab ?? 'TÜRSAB No'}: {contactInfo.contact_tursab}
              </p>
              {contactInfo.contact_maps_embed_url ? (
                <div className="site-footer-map-wrap">
                  <iframe
                    title="Map"
                    src={contactInfo.contact_maps_embed_url}
                    className="site-footer-map"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="site-footer-v2-bottom">
          <div className="site-footer-cave-row">
            <a href="https://kismetcavemansion.com" target="_blank" rel="noopener noreferrer" className="footer-cave-card">
              <img
                src={HOTEL_LOGO_MANSION}
                alt={footer.caveMansion ?? 'Kismet Cave Mansion'}
                className="footer-cave-logo footer-cave-logo--mansion"
                loading="lazy"
              />
              <span className="footer-cave-name">{footer.caveMansion ?? 'Kismet Cave Mansion'}</span>
            </a>
            <a href="https://kismetcavehouse.com" target="_blank" rel="noopener noreferrer" className="footer-cave-card">
              <img
                src={HOTEL_LOGO_HOUSE}
                alt={footer.caveHouse ?? 'Kismet Cave House'}
                className="footer-cave-logo"
                loading="lazy"
              />
              <span className="footer-cave-name">{footer.caveHouse ?? 'Kismet Cave House'}</span>
            </a>
          </div>
          <div className="site-footer-v2-social">
            {social.instagram_link ? (
              <a href={social.instagram_link} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" aria-label="Instagram">
                <InstagramIcon className="site-footer-social-icon" />
              </a>
            ) : null}
            {social.facebook_link ? (
              <a href={social.facebook_link} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" aria-label="Facebook">
                <FacebookIcon className="site-footer-social-icon" />
              </a>
            ) : null}
            {social.tripadvisor_link ? (
              <a href={social.tripadvisor_link} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" aria-label="TripAdvisor">
                <TripAdvisorIcon className="site-footer-social-icon" />
              </a>
            ) : null}
            {social.rednote_link ? (
              <a href={social.rednote_link} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" aria-label="Rednote">
                <RednoteIcon className="site-footer-social-icon" />
              </a>
            ) : null}
            {messaging.whatsapp_link ? (
              <a href={messaging.whatsapp_link} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" aria-label="WhatsApp">
                <WhatsAppIcon className="site-footer-social-icon" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="site-footer-bottom">
          <p className="site-footer-copy">
            &copy; {new Date().getFullYear()} {footer.copyrightName ?? brand}. {footer.rights ?? 'All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  );
}
