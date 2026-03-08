import { redirect } from 'next/navigation';

export default async function AdminCalendarRedirect(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  redirect(`/${lang}/admin/reservations`);
}
