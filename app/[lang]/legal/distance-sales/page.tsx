import { LegalDocPage } from '../LegalDocPage';

export default async function DistanceSalesPage(props: { params: Promise<{ lang: string }> }) {
  return <LegalDocPage params={props.params} docKey="distanceSales" titleKey="legalDistanceSales" />;
}
