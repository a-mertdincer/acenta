/**
 * Guest-editable reservation notes: sanitization (XSS) and structured format.
 * Stored in Reservation.notes as JSON or legacy "Hotel | Room".
 */

const MAX_FIELD = 200;
const MAX_OTHER = 500;

/** Strip HTML/script and control chars, limit length. Use for all guest text input. */
export function sanitizeGuestInput(value: string | null | undefined, maxLength: number = MAX_FIELD): string {
  if (value == null || typeof value !== 'string') return '';
  return value
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/\0/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export type GuestNotesParsed = {
  hotel: string;
  room: string;
  flight: string;
  other: string;
};

const EMPTY: GuestNotesParsed = { hotel: '', room: '', flight: '', other: '' };

/** Parse notes from DB: legacy "Hotel | Room" or JSON { hotel, room, flight, other }. */
export function parseGuestNotes(notes: string | null | undefined): GuestNotesParsed {
  if (!notes || typeof notes !== 'string') return { ...EMPTY };
  const t = notes.trim();
  if (!t) return { ...EMPTY };
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    if (j && typeof j === 'object') {
      return {
        hotel: sanitizeGuestInput(String(j.hotel ?? ''), MAX_FIELD),
        room: sanitizeGuestInput(String(j.room ?? ''), MAX_FIELD),
        flight: sanitizeGuestInput(String(j.flight ?? ''), MAX_FIELD),
        other: sanitizeGuestInput(String(j.other ?? ''), MAX_OTHER),
      };
    }
  } catch {
    // Legacy: "Hotel | Room"
    const parts = t.split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      return {
        hotel: sanitizeGuestInput(parts[0], MAX_FIELD),
        room: sanitizeGuestInput(parts[1], MAX_FIELD),
        flight: '',
        other: sanitizeGuestInput(parts.slice(2).join(' | '), MAX_OTHER),
      };
    }
    return { ...EMPTY, other: sanitizeGuestInput(t, MAX_OTHER) };
  }
  return { ...EMPTY };
}

/** Build notes string to store: JSON with sanitized fields. */
export function formatGuestNotesForStorage(parsed: GuestNotesParsed): string {
  const o = {
    hotel: sanitizeGuestInput(parsed.hotel, MAX_FIELD),
    room: sanitizeGuestInput(parsed.room, MAX_FIELD),
    flight: sanitizeGuestInput(parsed.flight, MAX_FIELD),
    other: sanitizeGuestInput(parsed.other, MAX_OTHER),
  };
  return JSON.stringify(o);
}

/** One-line summary for display (no HTML). */
export function formatGuestNotesDisplay(parsed: GuestNotesParsed): string {
  const parts: string[] = [];
  if (parsed.hotel) parts.push(`Otel: ${parsed.hotel}`);
  if (parsed.room) parts.push(`Oda: ${parsed.room}`);
  if (parsed.flight) parts.push(`Uçuş: ${parsed.flight}`);
  if (parsed.other) parts.push(parsed.other);
  return parts.join(' · ');
}
