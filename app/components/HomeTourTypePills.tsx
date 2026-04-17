import Link from 'next/link';
import {
  Flame,
  Map as MapIcon,
  Mountain,
  Building2,
  Bus,
  Palette,
  type LucideIcon,
} from 'lucide-react';

type Lang = string;

interface TourTypePill {
  slug: string;
  labelEn: string;
  labelTr: string;
  labelZh: string;
  Icon: LucideIcon;
}

const PILLS: TourTypePill[] = [
  { slug: 'balloon-flights',      labelEn: 'Balloon Flights',     labelTr: 'Balon Uçuşları',  labelZh: '热气球飞行', Icon: Flame },
  { slug: 'daily-tours',          labelEn: 'Daily Tours',         labelTr: 'Günlük Turlar',   labelZh: '日间旅游',   Icon: MapIcon },
  { slug: 'adventure-activities', labelEn: 'Adventure Activities', labelTr: 'Macera Aktiviteleri', labelZh: '冒险活动', Icon: Mountain },
  { slug: 'cultural-experiences', labelEn: 'Cultural Experiences', labelTr: 'Kültürel Deneyimler', labelZh: '文化体验', Icon: Building2 },
  { slug: 'transfers',            labelEn: 'Transfers',           labelTr: 'Transferler',     labelZh: '接送',       Icon: Bus },
  { slug: 'workshops',            labelEn: 'Workshops',           labelTr: 'Atölyeler',       labelZh: '工作坊',     Icon: Palette },
];

/**
 * Simple pill strip of the most-browsed tour categories. Each pill links
 * straight to the category filter page. No card layout, just pills.
 */
export function HomeTourTypePills({ lang }: { lang: Lang }) {
  return (
    <section className="home-tour-types" aria-label="Tour categories">
      <div className="container">
        <ul className="home-tour-types-pills">
          {PILLS.map((pill) => {
            const label =
              lang === 'tr' ? pill.labelTr : lang === 'zh' ? pill.labelZh : pill.labelEn;
            const Icon = pill.Icon;
            return (
              <li key={pill.slug}>
                <Link
                  href={`/${lang}/tours?category=${pill.slug}`}
                  className="home-tour-types-pill"
                >
                  <Icon size={16} className="home-tour-types-pill-icon" aria-hidden />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
