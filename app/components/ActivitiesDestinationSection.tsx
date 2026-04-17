import Link from 'next/link';
import {
  Flame,
  Map as MapIcon,
  Mountain,
  Building2,
  Bus,
  Palette,
  Package,
  Sparkles,
  Car,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import {
  getActiveDestinations,
  getDestinationName,
  getCategoryLabel,
  type Lang,
} from '@/lib/destinations';

interface ActivitiesDestinationSectionProps {
  lang: Lang;
  title: string;
  /** Slug of currently selected destination (for tours page) */
  currentDestination?: string;
  /** Slug of currently selected category (for tours category page) */
  currentCategory?: string;
  /** Label for "View all" / "View All Activities" CTA (homepage only) */
  viewAllLabel?: string;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'balloon-flights': Flame,
  'daily-tours': MapIcon,
  'adventure-activities': Mountain,
  'cultural-experiences': Building2,
  workshops: Palette,
  packages: Package,
  concierge: Sparkles,
  transfers: Bus,
  'rent-a-car-bike': Car,
};

export function ActivitiesDestinationSection({
  lang,
  title,
  currentDestination,
  currentCategory,
  viewAllLabel,
}: ActivitiesDestinationSectionProps) {
  const destinations = getActiveDestinations();
  const selectedDest = currentDestination
    ? destinations.find((d) => d.slug === currentDestination) ?? destinations[0]
    : destinations[0];
  const categories = selectedDest?.categories ?? [];

  return (
    <section className="home-activities page-section section-alt">
      <div className="container">
        <h2 className="section-title home-section-title">{title}</h2>

        {destinations.length > 1 && (
          <div className="activities-destination-tabs">
            {destinations.map((d) => {
              const isActive = selectedDest?.slug === d.slug;
              const href = `/${lang}/tours/${d.slug}`;
              return (
                <Link
                  key={d.id}
                  href={href}
                  className={`activities-destination-tab ${isActive ? 'is-active' : ''}`}
                >
                  {getDestinationName(d, lang)}
                </Link>
              );
            })}
          </div>
        )}

        <ul className="home-tour-types-pills">
          {categories.map((cat) => {
            const href = `/${lang}/tours/${selectedDest!.slug}/${cat.slug}`;
            const isActive = currentCategory === cat.slug;
            const Icon = CATEGORY_ICONS[cat.slug] ?? LayoutGrid;
            return (
              <li key={cat.id}>
                <Link
                  href={href}
                  className={`home-tour-types-pill${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={16} className="home-tour-types-pill-icon" aria-hidden />
                  <span>{getCategoryLabel(cat, lang)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {viewAllLabel && (
          <div className="section-cta home-view-all">
            <Link href={`/${lang}/tours`} className="btn btn-secondary">
              {viewAllLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
