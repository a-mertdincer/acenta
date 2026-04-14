import { LegalDocPage } from '../LegalDocPage';

export default async function CancellationPage(props: { params: Promise<{ lang: string }> }) {
  return <LegalDocPage params={props.params} docKey="cancellation" titleKey="cancellation" />;
}
