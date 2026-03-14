export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDaysInMonth(year: number, month: number): { dateStr: string; day: number; isCurrentMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const firstWeekday = first.getDay();
  const lastDay = last.getDate();
  const cells: { dateStr: string; day: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    const d = new Date(year, month - 1, -firstWeekday + i + 1);
    cells.push({
      dateStr: toLocalDateStr(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  for (let d = 1; d <= lastDay; d += 1) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 0; i < remaining; i += 1) {
    const d = new Date(year, month, i + 1);
    cells.push({
      dateStr: toLocalDateStr(d),
      day: d.getDate(),
      isCurrentMonth: false,
    });
  }
  return cells;
}

export function expandDateRange(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
