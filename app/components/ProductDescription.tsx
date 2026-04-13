type DescriptionBlock =
  | { kind: 'p'; content: string }
  | { kind: 'h2'; content: string }
  | { kind: 'h3'; content: string }
  | { kind: 'ul'; items: string[] };

export function parseDescriptionBlocks(source: string): DescriptionBlock[] {
  const normalized = source
    .replace(/\r\n?/g, '\n')
    .replace(/\s+•\s+/g, '\n• ')
    .trim();
  if (!normalized) return [];
  const lines = normalized.split('\n');
  const blocks: DescriptionBlock[] = [];
  let listBuffer: string[] = [];
  const flushList = () => {
    if (listBuffer.length > 0) {
      blocks.push({ kind: 'ul', items: listBuffer });
      listBuffer = [];
    }
  };
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const bullet = line.match(/^(?:[-*•])\s+(.+)$/);
    if (bullet) {
      listBuffer.push(bullet[1].trim());
      continue;
    }
    flushList();
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      blocks.push({ kind: 'h2', content: h2[1].trim() });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      blocks.push({ kind: 'h3', content: h3[1].trim() });
      continue;
    }
    blocks.push({ kind: 'p', content: line });
  }
  flushList();
  return blocks;
}

export function ProductDescription({ text }: { text: string }) {
  const blocks = parseDescriptionBlocks(text);
  if (blocks.length === 0) return null;
  return (
    <div className="product-description">
      {blocks.map((block, idx) => {
        if (block.kind === 'ul') {
          return (
            <ul key={`ul-${idx}`}>
              {block.items.map((item, itemIdx) => (
                <li key={`li-${idx}-${itemIdx}`}>{item}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'h2') return <h2 key={`h2-${idx}`}>{block.content}</h2>;
        if (block.kind === 'h3') return <h3 key={`h3-${idx}`}>{block.content}</h3>;
        return <p key={`p-${idx}`}>{block.content}</p>;
      })}
    </div>
  );
}
