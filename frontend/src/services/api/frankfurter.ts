const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes

export async function fetchFxRate(fxFetchedAt: string | null): Promise<{ fxRate: number; fxFetchedAt: string } | null> {
  if (fxFetchedAt) {
    const age = Date.now() - new Date(fxFetchedAt).getTime();
    if (age < CACHE_DURATION_MS) return null; // still fresh
  }
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=SGD&to=USD');
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const rate = data.rates?.USD;
    if (!rate) return null;
    return { fxRate: rate, fxFetchedAt: new Date().toISOString() };
  } catch {
    // retry once
    try {
      const res = await fetch('https://api.frankfurter.app/latest?from=SGD&to=USD');
      if (!res.ok) return null;
      const data = await res.json();
      const rate = data.rates?.USD;
      if (!rate) return null;
      return { fxRate: rate, fxFetchedAt: new Date().toISOString() };
    } catch {
      return null;
    }
  }
}
