import { redirect } from 'next/navigation';
import { getReservationDetailsByIds } from '../../../actions/reservations';
import { getContactInfo } from '../../../actions/siteSettings';
import { formatNotesForDisplay } from '@/lib/guestNotes';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { getDictionary } from '@/app/dictionaries/getDictionary';
import { normalizeLocale } from '@/lib/i18n';
import { BookingSuccessClient } from './BookingSuccessClient';

function parseOptions(
  optionsStr: string | null
): { title: string; price: number; quantity: number; pricingMode: 'per_person' | 'flat' | 'per_unit' }[] {
  if (!optionsStr?.trim()) return [];
  try {
    const arr = JSON.parse(optionsStr);
    if (!Array.isArray(arr)) return [];
    return arr.map((o: { title?: string; price?: number; quantity?: number; pricingMode?: string }) => {
      const mode: 'per_person' | 'flat' | 'per_unit' =
        o?.pricingMode === 'flat' ? 'flat' : o?.pricingMode === 'per_unit' ? 'per_unit' : 'per_person';
      const qty = typeof o?.quantity === 'number' && o.quantity > 0 ? o.quantity : 1;
      return {
        title: o?.title ?? '',
        price: typeof o?.price === 'number' ? o.price : 0,
        quantity: qty,
        pricingMode: mode,
      };
    });
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

  const contactInfo = await getContactInfo();
  const fromAccount = from === 'account';

  type ReservationDetail = Awaited<ReturnType<typeof getReservationDetailsByIds>>[number];

  const serialized = reservations.map((r: ReservationDetail) => ({
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

  if (!fromAccount) {
    return <BookingSuccessClient lang={lang} reservations={serialized} skipLoading={fromAccount} contactInfo={contactInfo} />;
  }

  const locale = normalizeLocale(lang);
  const dict = await getDictionary(locale);
  const homeLabel = (dict as { navigation?: { home?: string } }).navigation?.home ?? 'Home';
  const accountLabel = (dict as { account?: { title?: string } }).account?.title ?? 'My Account';
  const reservationLabel = (dict as { account?: { reservation?: string } }).account?.reservation ?? 'Reservation';
  const firstId = serialized[0]?.id ?? '';
  const breadcrumbItems = [
    { label: homeLabel, href: `/${lang}` },
    { label: accountLabel, href: `/${lang}/account/reservations` },
    { label: `${reservationLabel} #${firstId.slice(0, 8)}` },
  ];

  return (
    <>
      <div className="container" style={{ paddingTop: 'var(--space-md)' }}>
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      <BookingSuccessClient lang={lang} reservations={serialized} skipLoading={fromAccount} contactInfo={contactInfo} />
    </>
  );
}
