import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const symbol = req.query.symbol as string;
  if (!symbol) {
    return res.status(400).json({ error: 'symbol query parameter is required' });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await (yf as any).quote(symbol);
    if (!quote || quote.regularMarketPrice == null) {
      return res.status(404).json({ error: 'Symbol not found' });
    }
    return res.json({
      symbol: quote.symbol,
      name: quote.longName ?? quote.shortName ?? quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency ?? 'USD',
      marketState: quote.marketState ?? 'CLOSED',
    });
  } catch {
    return res.status(404).json({ error: 'Symbol not found' });
  }
}
