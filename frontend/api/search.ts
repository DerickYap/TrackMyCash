import type { VercelRequest, VercelResponse } from '@vercel/node';
import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const query = req.query.query as string;
  if (!query) {
    return res.status(400).json({ error: 'query parameter is required' });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (yf as any).search(query, { quotesCount: 8, newsCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = data?.quotes ?? [];

    const results = quotes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.symbol && q.isYahooFinance !== false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname ?? q.shortname ?? q.symbol,
        exchange: q.exchDisp ?? q.exchange ?? '',
        currency: q.currency ?? 'USD',
        type: q.typeDisp ?? q.quoteType ?? 'Equity',
      }));

    return res.json({ results });
  } catch {
    return res.status(502).json({ error: 'Failed to fetch from Yahoo Finance' });
  }
}
