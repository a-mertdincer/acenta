/**
 * Short teaser for home carousel — first paragraph / block, then length cap at word boundary.
 */
export function attractionCardSummary(raw: string, maxChars = 140): string {
  const t = raw.trim();
  if (!t) return '';
  const firstBlock = t.split(/\n\s*\n/)[0] ?? t;
  const text = firstBlock.replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 32 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}
