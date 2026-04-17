import { getTagBySlug, pickDisplayTagSlugs, type TagDefinition } from '@/lib/tourTags';

type Lang = 'en' | 'tr' | 'zh';

interface TourTagBadgesProps {
  tagSlugs: string[] | null | undefined;
  lang: Lang | string;
  variant?: 'card' | 'detail';
  max?: number;
  className?: string;
}

/**
 * Compact badge strip for admin-selected sales tags. Picks up to `max`
 * tags via the category-round-robin helper in lib/tourTags, respecting
 * the admin-chosen order inside each category.
 */
export function TourTagBadges({
  tagSlugs,
  lang,
  variant = 'card',
  max = variant === 'detail' ? 6 : 2,
  className,
}: TourTagBadgesProps) {
  if (!Array.isArray(tagSlugs) || tagSlugs.length === 0) return null;
  const picked = pickDisplayTagSlugs(tagSlugs, max)
    .map((slug) => getTagBySlug(slug))
    .filter((t): t is TagDefinition => Boolean(t));
  if (picked.length === 0) return null;

  const loc: Lang = lang === 'tr' || lang === 'zh' ? lang : 'en';

  return (
    <div className={`tour-tag-badges tour-tag-badges-${variant}${className ? ` ${className}` : ''}`}>
      {picked.map((tag) => {
        const Icon = tag.icon;
        const label = loc === 'tr' ? tag.labelTr : loc === 'zh' ? tag.labelZh : tag.labelEn;
        return (
          <span
            key={tag.slug}
            className={`tour-tag-badge tour-tag-badge-${tag.color}`}
            title={label}
          >
            <Icon size={variant === 'detail' ? 14 : 12} aria-hidden />
            <span>{label}</span>
          </span>
        );
      })}
    </div>
  );
}
