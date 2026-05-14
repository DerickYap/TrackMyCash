import { Router, Request, Response } from 'express';
import YahooFinance from 'yahoo-finance2';

const router = Router();
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

router.get('/', async (req: Request, res: Response) => {
  const symbol = req.query.symbol as string;
  if (!symbol) {
    res.status(400).json({ error: 'symbol query parameter is required' });
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = await (yf as any).quote(symbol);

    if (!quote || quote.regularMarketPrice == null) {
      res.status(404).json({ error: 'Symbol not found' });
      return;
    }

    res.json({
      symbol: quote.symbol,
      name: quote.longName ?? quote.shortName ?? quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency ?? 'USD',
      marketState: quote.marketState ?? 'CLOSED',
    });
  } catch {
    res.status(404).json({ error: 'Symbol not found' });
  }
});

export default router;
