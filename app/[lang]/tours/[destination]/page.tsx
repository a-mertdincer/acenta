import { notFound } from 'next/navigation';
import { getDictionary } from '../../../dictionaries/getDictionary';
import { getDestinationBySlug } from '@/lib/destinations';
import { ActivitiesDestinationSection } from '../../../components/ActivitiesDestinationSection';

export default async function ToursDestinationPage(props: {
  params: Promise<{ lang: string; destination: string }>;
}) {
  const params = await props.params;
  const lang = params.lang as 'en' | 'tr' | 'zh';
  const { destination } = params;

  const dest = getDestinationBySlug(destination);
  if (!dest) notFound();

  const dict = await getDictionary(lang);
  const title = (dict.tours as { allTours?: string })?.allTours ?? (dict.navigation as { tours?: string })?.tours ?? 'Tours';

  return (
    <>
      <ActivitiesDestinationSection
        lang={lang}
        title={title}
        currentDestination={destination}
      />
      <div className="container" style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--color-text-muted)' }}>
        <p>Yukarıdan bir kategori seçin.</p>
      </div>
    </>
  );
}
