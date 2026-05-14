import { useCallback, useEffect, useRef, useState } from 'react';
import { useNetworth } from '../store/AppContext';
import { HoldingEntry } from '../types/networth';
import { fetchQuotes } from '../services/api/twelveData';
import { fetchCryptoPrices } from '../services/api/coinGecko';
import { toTroyOz } from '../utils/metalConversion';
import { PriceUpdate } from '../types/networth';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

export function usePriceRefresh() {
  const { state, dispatch } = useNetworth();
  const lastManualRefreshRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);

  const refresh = useCallback(async () => {
    const holdings = state.entries.filter((e): e is HoldingEntry => e.entryType === 'holding');
    if (holdings.length === 0) return;

    setIsRefreshing(true);
    const now = new Date().toISOString();

    // Split by source
    const stockTickers = holdings
      .filter(h => ['stock', 'etf', 'mutualfund'].includes(h.assetClass))
      .map(h => h.ticker);

    const metalTickers = holdings
      .filter(h => h.assetClass === 'metal')
      .map(h => h.metalType === 'gold' ? 'XAU/USD' : 'XAG/USD');

    const cryptoIds = holdings
      .filter(h => h.assetClass === 'crypto')
      .map(h => h.ticker);

    const [stockQuotes, cryptoPrices] = await Promise.all([
      fetchQuotes([...new Set([...stockTickers, ...metalTickers])]),
      fetchCryptoPrices([...new Set(cryptoIds)]),
    ]);

    const updates: PriceUpdate[] = [];

    for (const holding of holdings) {
      if (holding.assetClass === 'crypto') {
        const price = cryptoPrices[holding.ticker];
        if (price != null) updates.push({ id: holding.id, lastPrice: price, lastFetchedAt: now });
      } else if (holding.assetClass === 'metal') {
        const symbol = holding.metalType === 'gold' ? 'XAU/USD' : 'XAG/USD';
        const quote = stockQuotes[symbol];
        if (quote) {
          // price is per troy oz; adjust for quantity stored in holding's unit
          const troyOzQty = toTroyOz(holding.quantity, holding.weightUnit ?? 'troy_oz');
          // store per-troy-oz price so value = troyOzQty * lastPrice
          // we store raw price here; value calculation accounts for weight
          updates.push({ id: holding.id, lastPrice: quote.price, lastFetchedAt: now });
          // override quantity interpretation: store troy oz equivalent as lastPrice's base
          // actual value computed as: toTroyOz(quantity, unit) * lastPrice
          void troyOzQty; // used in value computation in EntryRow
        }
      } else {
        const quote = stockQuotes[holding.ticker];
        if (quote) updates.push({ id: holding.id, lastPrice: quote.price, lastFetchedAt: now });
      }
    }

    if (updates.length > 0) dispatch({ type: 'UPDATE_PRICES', payload: updates });
    setIsRefreshing(false);
  }, [state.entries, dispatch]);

  // Fetch on mount
  useEffect(() => { refresh(); }, []);

  // 15-min passive interval
  useEffect(() => {
    const id = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const manualRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastManualRefreshRef.current < COOLDOWN_MS) return;
    lastManualRefreshRef.current = now;
    setCooldownActive(true);
    refresh().then(() => {
      setTimeout(() => setCooldownActive(false), COOLDOWN_MS);
    });
  }, [refresh]);

  return { isRefreshing, cooldownActive, manualRefresh };
}
