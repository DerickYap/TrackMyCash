const BASE = 'https://api.coingecko.com/api/v3';

export async function fetchCryptoPrices(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  try {
    const url = `${BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const prices: Record<string, number> = {};
    for (const id of ids) {
      if (data[id]?.usd != null) prices[id] = data[id].usd;
    }
    return prices;
  } catch {
    return {};
  }
}

export async function searchCoinGecko(query: string): Promise<Array<{ id: string; name: string; symbol: string }>> {
  try {
    const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.coins || []).slice(0, 10).map((c: { id: string; name: string; symbol: string }) => ({
      id: c.id,
      name: c.name,
      symbol: c.symbol,
    }));
  } catch {
    return [];
  }
}
