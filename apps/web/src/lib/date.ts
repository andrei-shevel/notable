// Intl.DateTimeFormat instances are non-trivial to construct; cache at module
// scope and let the browser pick the user's locale via `undefined`.
const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const MONTH_DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const MONTH_DAY_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Short, sidebar-friendly relative label:
//   today      → "3:42 PM"
//   yesterday  → "Yesterday"
//   <7 days    → "Mon"
//   same year  → "May 14"
//   older      → "May 14, 2024"
export function formatRelativeShort(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const dayDiff = Math.floor((startOfLocalDay(now) - startOfLocalDay(d)) / DAY_MS);
  if (dayDiff <= 0) return TIME.format(d);
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return WEEKDAY.format(d);
  if (d.getFullYear() === now.getFullYear()) return MONTH_DAY.format(d);
  return MONTH_DAY_YEAR.format(d);
}
