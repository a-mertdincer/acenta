import Link from 'next/link';

export default async function Home(props: { params: Promise<{ lang: string }> }) {
  let lang = 'en';
  try {
    const params = await props.params;
    lang = params?.lang && ['en', 'tr', 'zh'].includes(params.lang) ? params.lang : 'en';
  } catch {
    lang = 'en';
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
      <h1>Kısmet Göreme Travel</h1>
      <p>Welcome to Cappadocia. Premium tours and hot air balloon experiences.</p>
      <Link href={`/${lang}/tours`}>View tours</Link>
    </div>
  );
}
