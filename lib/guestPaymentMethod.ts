/** Misafir checkout ödeme yöntemi — Reservation.paymentMethod ile uyumlu. */
export type GuestPaymentMethod = 'cash' | 'transfer' | 'card';

const ALLOWED = new Set<string>(['cash', 'transfer', 'card']);

/** Eski veya beklenmeyen değerleri güvenli şekilde normalize eder. */
export function normalizeGuestPaymentMethod(raw: string | null | undefined): GuestPaymentMethod {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'mail_order' || v === 'mail-order') return 'card';
  if (v === 'cash_on_arrival') return 'cash';
  if (v === 'bank_transfer' || v === 'havale') return 'transfer';
  if (ALLOWED.has(v)) return v as GuestPaymentMethod;
  return 'cash';
}

/** Admin / cari tablolarında gösterim (TR). */
export function guestPaymentMethodLabelTr(code: string | null | undefined): string {
  if (code == null || String(code).trim() === '') return 'Belirtilmemiş';
  const m = normalizeGuestPaymentMethod(code);
  switch (m) {
    case 'cash':
      return 'Nakit (varışta)';
    case 'transfer':
      return 'Banka havalesi';
    case 'card':
      return 'Kredi kartı (mail order)';
    default:
      return 'Belirtilmemiş';
  }
}

/** Checkout İngilizce etiketleri (mevcut checkout dili). */
export function guestPaymentMethodLabelEn(code: GuestPaymentMethod): string {
  switch (code) {
    case 'cash':
      return 'Pay on arrival';
    case 'transfer':
      return 'Bank transfer';
    case 'card':
      return 'Mail order / card guarantee';
    default:
      return code;
  }
}
