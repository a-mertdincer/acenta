/** TourVariant.reservationType → kısa Türkçe etiket (admin tabloları). */
export function variantReservationKindLabel(reservationType: string | null | undefined): string | null {
  if (reservationType == null || reservationType.trim() === '') return null;
  const v = reservationType.toLowerCase();
  if (v === 'private') return 'Özel';
  if (v === 'regular') return 'Grup';
  return null;
}
