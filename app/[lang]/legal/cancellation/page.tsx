import { getDictionary } from '../../../dictionaries/getDictionary';
import Link from 'next/link';

export default async function CancellationPage(props: { params: Promise<{ lang: string }> }) {
  const params = await props.params;
  const lang = params.lang as 'en' | 'tr' | 'zh';
  const dict = await getDictionary(lang);

  return (
    <div className="container" style={{ padding: 'var(--space-2xl) 0' }}>
      <h1>{lang === 'tr' ? 'İptal Koşulları' : lang === 'zh' ? '取消政策' : 'Cancellation Policy'}</h1>
      <p style={{ color: 'var(--color-text-muted)' }}>
        This page will contain the cancellation policy. Contact info@kismetgoreme.com for details.
      </p>
      <Link href={`/${lang}`} className="btn btn-secondary" style={{ marginTop: 'var(--space-lg)' }}>
        {dict.navigation.home}
      </Link>
    </div>
  );
}
