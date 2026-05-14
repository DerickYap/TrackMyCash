export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatMonthYear(iso: string): string {
  const [year, month] = iso.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function isStale(lastFetchedAt: string | null, thresholdMs = 15 * 60 * 1000): boolean {
  if (!lastFetchedAt) return true;
  return Date.now() - new Date(lastFetchedAt).getTime() > thresholdMs;
}
