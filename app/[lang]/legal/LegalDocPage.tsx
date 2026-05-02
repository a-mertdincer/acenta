import Link from 'next/link';
import { LegalDocumentBody } from '@/app/components/LegalDocumentBody';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { getDictionary } from '../../dictionaries/getDictionary';
import { normalizeLocale } from '@/lib/i18n';
import { readLegalDocument, type LegalDocKey } from '@/lib/legalDocuments';

export async function LegalDocPage({
  params,
  docKey,
  titleKey,
}: {
  params: Promise<{ lang: string }>;
  docKey: LegalDocKey;
  titleKey: string;
}) {
  const { lang: raw } = await params;
  const lang = normalizeLocale(raw);
  const dict = await getDictionary(lang);
  const footer = (dict as { footer?: Record<string, string> }).footer;
  const title = footer?.[titleKey] ?? titleKey;
  const text = readLegalDocument(docKey);

  return (
    <div className="container legal-page">
      <Breadcrumbs
        items={[
          { label: dict.navigation?.home ?? 'Home', href: `/${lang}` },
          { label: title },
        ]}
      />
      <h1 className="legal-page-title">{title}</h1>
      <LegalDocumentBody text={text} />
      <p className="legal-page-back">
        <Link href={`/${lang}`} className="btn btn-secondary">
          {dict.navigation.home}
        </Link>
      </p>
    </div>
  );
}
