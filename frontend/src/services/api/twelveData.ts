export interface QuoteResult {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  isMarketOpen: boolean;
}

export async function fetchQuote(symbol: string): Promise<QuoteResult | null> {
  try {
    const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 'error' || !data.close) return null;
    return {
      symbol: data.symbol,
      name: data.name,
      price: parseFloat(data.close),
      currency: data.currency,
      isMarketOpen: data.is_market_open === true,
    };
  } catch {
    return null;
  }
}

export async function fetchQuotes(symbols: string[]): Promise<Record<string, QuoteResult | null>> {
  const results: (QuoteResult | null)[] = [];
  for (const s of symbols) {
    results.push(await fetchQuote(s));
    if (symbols.length > 1) await new Promise(r => setTimeout(r, 800));
  }
  return Object.fromEntries(symbols.map((s, i) => [s, results[i]]));
}

export interface StockSuggestion {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  type: string;
}

export async function searchStocks(query: string): Promise<StockSuggestion[]> {
  try {
    const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.data)) return [];
    return data.data.slice(0, 8).map((item: Record<string, string>) => ({
      symbol: item.symbol,
      name: item.instrument_name,
      exchange: item.exchange,
      currency: item.currency,
      type: item.instrument_type,
    }));
  } catch {
    return [];
  }
}
