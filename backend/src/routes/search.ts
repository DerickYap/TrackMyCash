import { Router, Request, Response } from 'express';
import YahooFinance from 'yahoo-finance2';

const router = Router();
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

router.get('/', async (req: Request, res: Response) => {
  const query = req.query.query as string;
  if (!query) {
    res.status(400).json({ error: 'query parameter is required' });
    return;
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

    res.json({ results });
  } catch {
    res.status(502).json({ error: 'Failed to fetch from Yahoo Finance' });
  }
});

export default router;
