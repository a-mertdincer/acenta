import { LegalDocPage } from '../LegalDocPage';

export default async function KvkkPage(props: { params: Promise<{ lang: string }> }) {
  return <LegalDocPage params={props.params} docKey="kvkk" titleKey="legalKvkk" />;
}
