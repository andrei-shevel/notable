const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

// "Saved just now" / "Saved 2m ago" / "Saved 1h ago" — the SavedPill copy.
// Crossing each unit boundary takes a re-render to update; the editor re-renders
// often enough during typing that this is fine for now.
export function savedLabel(updatedAt: string | undefined): string | undefined {
  if (!updatedAt) return undefined;
  const then = new Date(updatedAt).getTime();
  if (Number.isNaN(then)) return undefined;
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 5) return 'Saved just now';
  if (abs < 60) return `Saved ${rtf.format(diffSec, 'second')}`;
  if (abs < 60 * 60) return `Saved ${rtf.format(Math.round(diffSec / 60), 'minute')}`;
  if (abs < 60 * 60 * 24) return `Saved ${rtf.format(Math.round(diffSec / 3600), 'hour')}`;
  return `Saved ${rtf.format(Math.round(diffSec / 86400), 'day')}`;
}
