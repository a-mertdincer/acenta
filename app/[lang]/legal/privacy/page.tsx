import { LegalDocPage } from '../LegalDocPage';

export default async function PrivacyPage(props: { params: Promise<{ lang: string }> }) {
  return <LegalDocPage params={props.params} docKey="privacy" titleKey="privacy" />;
}
