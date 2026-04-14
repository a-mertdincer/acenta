import { LegalDocPage } from '../LegalDocPage';

export default async function TermsPage(props: { params: Promise<{ lang: string }> }) {
  return <LegalDocPage params={props.params} docKey="terms" titleKey="legalTerms" />;
}
