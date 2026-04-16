import Link from 'next/link';
import type { ReactNode } from 'react';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Accessible breadcrumb trail. The last item is rendered as plain text with
 * aria-current="page"; everything else is a Link. Separator is decorative.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav className={`breadcrumbs${className ? ` ${className}` : ''}`} aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="breadcrumbs-item">
              {item.href && !isLast ? (
                <Link href={item.href} className="breadcrumbs-link">
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumbs-current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? (
                <span className="breadcrumbs-separator" aria-hidden>
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
