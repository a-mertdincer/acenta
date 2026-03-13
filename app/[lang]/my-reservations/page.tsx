import { redirect } from 'next/navigation';

export default async function LegacyMyReservationsPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  redirect(`/${lang}/account/reservations`);
}
