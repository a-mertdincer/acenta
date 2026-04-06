import Link from 'next/link';
import { getDictionary } from '@/app/dictionaries/getDictionary';
import { getAttractions } from '@/app/actions/attractions';
import type { SiteLocale } from '@/lib/i18n';

export default async function AttractionsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  const locale = (lang || 'en') as SiteLocale;
  const dict = await getDictionary(locale);
  const rows = await getAttractions();

  return (
    <div className="container page-section">
      <h1>{locale === 'tr' ? 'Kapadokya Kesfet' : locale === 'zh' ? '探索卡帕多奇亚' : 'Discover Cappadocia'}</h1>
      <p className="tours-page-subtitle">
        {locale === 'tr'
          ? 'Gezi noktalarina tiklayarak o bolgedeki turlari gorebilirsiniz.'
          : locale === 'zh'
            ? '点击景点查看包含该景点的所有行程。'
            : 'Click an attraction to see all tours that include it.'}
      </p>

      <div className="tours-grid">
        {rows.map((row) => {
          const name = locale === 'tr' ? row.nameTr : locale === 'zh' ? (row.nameZh ?? row.nameEn) : row.nameEn;
          const description = locale === 'tr' ? row.descriptionTr : locale === 'zh' ? row.descriptionZh : row.descriptionEn;
          return (
            <article key={row.id} className="tour-card tour-card-clickable">
              <Link href={`/${lang}/attractions/${row.slug}`} className="tour-card-link-area" aria-label={name}>
                <div className="tour-card-image">
                  <img
                    src={row.imageUrl ?? '/images/activities/tour-placeholder.svg'}
                    alt={name}
                    className="tour-card-image-img"
                  />
                </div>
                <div className="tour-card-body">
                  <div className="tour-card-header">
                    <h2 className="tour-card-title">{name}</h2>
                    <span className="tour-type-badge">{row.tourCount} {locale === 'tr' ? 'tur' : locale === 'zh' ? '个行程' : 'tours'}</span>
                  </div>
                  <p className="tour-card-desc">{description ?? (dict.home?.popularExperiences ?? '')}</p>
                  <div className="tour-card-footer">
                    <span className="tour-card-price">{locale === 'tr' ? 'Kesfet' : locale === 'zh' ? '探索' : 'Explore'}</span>
                    <span className="btn btn-primary tour-card-cta">{dict.tours?.bookNow ?? 'View'}</span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
