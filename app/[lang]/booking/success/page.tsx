import { redirect } from 'next/navigation';
import { getReservationDetailsByIds } from '../../../actions/reservations';
import { formatNotesForDisplay } from '@/lib/guestNotes';
import { BookingSuccessClient } from './BookingSuccessClient';

function parseOptions(optionsStr: string | null): { title: string; price: number }[] {
  if (!optionsStr?.trim()) return [];
  try {
    const arr = JSON.parse(optionsStr);
    if (!Array.isArray(arr)) return [];
    return arr.map((o: { title?: string; price?: number }) => ({
      title: o?.title ?? '',
      price: typeof o?.price === 'number' ? o.price : 0,
    }));
  } catch {
    return [];
  }
}

export default async function BookingSuccessPage(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ ids?: string; from?: string }>;
}) {
  const { lang } = await props.params;
  const { ids, from } = await props.searchParams;
  if (!ids?.trim()) redirect(`/${lang}/`);

  const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
  const reservations = await getReservationDetailsByIds(idList);
  if (reservations.length === 0) redirect(`/${lang}/`);

  const fromAccount = from === 'account';

  const serialized = reservations.map((r) => ({
    id: r.id,
    guestName: r.guestName,
    guestEmail: r.guestEmail,
    guestPhone: r.guestPhone,
    date: r.date.toISOString().split('T')[0],
    pax: r.pax,
    totalPrice: r.totalPrice,
    couponCode: r.couponCode ?? null,
    originalPrice: r.originalPrice ?? null,
    discountAmount: r.discountAmount ?? null,
    options: r.options,
    tourTitle: r.tour?.titleEn ?? r.tour?.titleTr ?? r.tourId,
    notes: r.notes ?? null,
    transferAirport: r.transferAirport ?? null,
    createdAt: r.createdAt.toISOString(),
    optionsParsed: parseOptions(r.options),
    displayNotes: formatNotesForDisplay(r.notes),
  }));

  return <BookingSuccessClient lang={lang} reservations={serialized} skipLoading={fromAccount} />;
}
