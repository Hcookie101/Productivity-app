/** Convert "HH:mm" to minutes since midnight */
export function toMin(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

/** Convert minutes since midnight to "HH:mm" (24h), clamped to [0, 1439] */
export function fromMin(minutes: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "09:30" -> "9:30 AM" */
export function to12h(clock: string): string {
  const m = toMin(clock);
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(mm).padStart(2, "0")} ${ampm}`;
}

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, toMin(end) - toMin(start));
}

export function formatDuration(totalMinutes: number): string {
  const mins = Math.round(totalMinutes);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatSeconds(totalSeconds: number): string {
  return formatDuration(totalSeconds / 60);
}

/** human short hours like "3.5h" */
export function formatHours(totalMinutes: number): string {
  const h = totalMinutes / 60;
  if (h < 10 && h % 1 !== 0) return h.toFixed(1).replace(/\.0$/, "") + "h";
  return `${Math.round(h)}h`;
}

/** range label e.g. "9:00 – 11:00 AM" */
export function formatRange(start: string, end: string): string {
  return `${to12h(start)} – ${to12h(end)}`;
}

export function formatClockMins(mins: number): string {
  return to12h(fromMin(mins));
}

export function isClockInRange(clock: string, start: string, end: string): boolean {
  const c = toMin(clock);
  const a = toMin(start);
  const b = toMin(end);
  if (a <= b) return c >= a && c <= b;
  return c >= a || c <= b;
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const a1 = toMin(aStart);
  const a2 = toMin(aEnd);
  const b1 = toMin(bStart);
  const b2 = toMin(bEnd);
  return a1 < b2 && b1 < a2;
}

export function todayISOWeekday(): number {
  // 0 = Monday ... 6 = Sunday
  return (new Date().getDay() + 6) % 7;
}

/** Re-exported for convenience so callers can use one time module. */
export { formatDateISO } from "./utils";