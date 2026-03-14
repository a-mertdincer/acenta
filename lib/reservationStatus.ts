/**
 * Rezervasyon durumları – tek kaynak.
 * Duruma karar verilen ekran, takvim, detay ve pano hep bunu kullanır.
 */

export const RESERVATION_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHANGE_REQUESTED: 'CHANGE_REQUESTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',   // Geldi
  NO_SHOW: 'NO_SHOW',       // Gelmedi
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  [RESERVATION_STATUS.PENDING]: 'Beklemede',
  [RESERVATION_STATUS.CONFIRMED]: 'Onaylandı',
  [RESERVATION_STATUS.CHANGE_REQUESTED]: 'Değişiklik bekliyor',
  [RESERVATION_STATUS.CANCELLED]: 'İptal',
  [RESERVATION_STATUS.COMPLETED]: 'Geldi',
  [RESERVATION_STATUS.NO_SHOW]: 'Gelmedi',
};

/** Dropdown için sıralı seçenekler (duruma karar ekranında kullanılır) */
export const RESERVATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: RESERVATION_STATUS.PENDING, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.PENDING] },
  { value: RESERVATION_STATUS.CONFIRMED, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.CONFIRMED] },
  { value: RESERVATION_STATUS.CHANGE_REQUESTED, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.CHANGE_REQUESTED] },
  { value: RESERVATION_STATUS.CANCELLED, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.CANCELLED] },
  { value: RESERVATION_STATUS.COMPLETED, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.COMPLETED] },
  { value: RESERVATION_STATUS.NO_SHOW, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.NO_SHOW] },
];

export function getReservationStatusLabel(status: string): string {
  return RESERVATION_STATUS_LABELS[status] ?? status;
}

export function getReservationStatusStyle(status: string): { backgroundColor: string; color: string } {
  switch (status) {
    case RESERVATION_STATUS.CONFIRMED:
      return { backgroundColor: '#d1fae5', color: '#065f46' };
    case RESERVATION_STATUS.PENDING:
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case RESERVATION_STATUS.CHANGE_REQUESTED:
      return { backgroundColor: '#fef3c7', color: '#92400e' };
    case RESERVATION_STATUS.CANCELLED:
      return { backgroundColor: '#fee2e2', color: '#b91c1c' };
    case RESERVATION_STATUS.NO_SHOW:
      return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
    case RESERVATION_STATUS.COMPLETED:
      return { backgroundColor: '#d1fae5', color: '#065f46' };
    default:
      return { backgroundColor: '#e5e7eb', color: '#374151' };
  }
}

/** CSS class for status badge (admin table). */
export function getReservationStatusBadgeClass(status: string): string {
  switch (status) {
    case RESERVATION_STATUS.PENDING: return 'status-pending';
    case RESERVATION_STATUS.CONFIRMED: return 'status-confirmed';
    case RESERVATION_STATUS.CHANGE_REQUESTED: return 'status-pending';
    case RESERVATION_STATUS.CANCELLED: return 'status-cancelled';
    case RESERVATION_STATUS.COMPLETED: return 'status-completed';
    case RESERVATION_STATUS.NO_SHOW: return 'status-noshow';
    default: return 'status-unknown';
  }
}
