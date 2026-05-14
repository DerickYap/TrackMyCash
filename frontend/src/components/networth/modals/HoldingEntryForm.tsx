import { useState, useEffect, useRef } from 'react';
import { HoldingEntry, AssetClass, MetalType, WeightUnit, Currency } from '../../../types/networth';
import { fetchQuote, searchStocks, StockSuggestion } from '../../../services/api/twelveData';
import { fetchCryptoPrices, searchCoinGecko } from '../../../services/api/coinGecko';

interface Props {
  initial?: HoldingEntry;
  onSave: (data: Omit<HoldingEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'mutualfund', label: 'Mutual Fund' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'metal', label: 'Precious Metal' },
];

export function HoldingEntryForm({ initial, onSave, onCancel }: Props) {
  const [assetClass, setAssetClass] = useState<AssetClass>(initial?.assetClass ?? 'stock');
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [fetchedName, setFetchedName] = useState(initial?.name ?? '');
  const [fetchedCurrency, setFetchedCurrency] = useState<Currency>(initial?.currency ?? 'USD');
  const [fetchedPrice, setFetchedPrice] = useState<number | null>(initial?.lastPrice ?? null);
  const [tickerStatus, setTickerStatus] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '');
  const [metalType, setMetalType] = useState<MetalType>(initial?.metalType ?? 'gold');
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initial?.weightUnit ?? 'troy_oz');
  const [account, setAccount] = useState(initial?.account ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [cryptoSuggestions, setCryptoSuggestions] = useState<Array<{ id: string; name: string; symbol: string }>>([]);
  const [stockSuggestions, setStockSuggestions] = useState<StockSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initial) return; // don't re-fetch when editing
    if (!ticker.trim()) { setTickerStatus('idle'); return; }
    if (assetClass === 'metal') return; // metals don't need ticker lookup

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTickerStatus('loading');
      if (assetClass === 'crypto') {
        const suggestions = await searchCoinGecko(ticker);
        setCryptoSuggestions(suggestions);
        if (suggestions.length > 0) {
          const prices = await fetchCryptoPrices([suggestions[0].id]);
          setFetchedPrice(prices[suggestions[0].id] ?? null);
          setFetchedName(suggestions[0].name);
          setFetchedCurrency('USD');
          setTickerStatus('found');
        } else {
          setTickerStatus('notfound');
        }
      } else {
        // Only search while typing — quote is fetched when a suggestion is selected or on blur
        const suggestions = await searchStocks(ticker.trim());
        setStockSuggestions(suggestions);
        setTickerStatus(suggestions.length > 0 ? 'idle' : 'idle');
      }
    }, 500);
  }, [ticker, assetClass]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    onSave({
      ticker: assetClass === 'metal' ? (metalType === 'gold' ? 'GC=F' : 'SI=F') : ticker.trim(),
      name: assetClass === 'metal' ? (metalType === 'gold' ? 'Gold' : 'Silver') : fetchedName || ticker,
      assetClass,
      metalType: assetClass === 'metal' ? metalType : null,
      quantity: parseFloat(quantity) || 0,
      weightUnit: assetClass === 'metal' ? weightUnit : null,
      currency: assetClass === 'metal' ? 'USD' : fetchedCurrency,
      lastPrice: fetchedPrice,
      lastFetchedAt: fetchedPrice != null ? now : null,
      account: account.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Class</label>
        <select
          value={assetClass}
          onChange={e => { setAssetClass(e.target.value as AssetClass); setTicker(''); setTickerStatus('idle'); setFetchedName(''); setStockSuggestions([]); setCryptoSuggestions([]); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ASSET_CLASSES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>

      {assetClass === 'metal' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metal</label>
            <select
              value={metalType}
              onChange={e => setMetalType(e.target.value as MetalType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gold">Gold (XAU)</option>
              <option value="silver">Silver (XAG)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
              <input
                type="number" required min="0" step="any"
                value={quantity} onChange={e => setQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select
                value={weightUnit} onChange={e => setWeightUnit(e.target.value as WeightUnit)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="troy_oz">Troy oz</option>
                <option value="grams">Grams</option>
              </select>
            </div>
          </div>
        </>
      ) : assetClass === 'crypto' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coin ID (CoinGecko)</label>
            <input
              type="text" required
              value={ticker} onChange={e => setTicker(e.target.value)}
              placeholder="e.g. bitcoin, ethereum"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {cryptoSuggestions.length > 0 && ticker && (
              <ul className="mt-1 border border-gray-200 rounded-lg overflow-hidden text-sm">
                {cryptoSuggestions.slice(0, 5).map(s => (
                  <li key={s.id}>
                    <button type="button"
                      className="w-full text-left px-3 py-2 hover:bg-blue-50"
                      onClick={() => { setTicker(s.id); setFetchedName(s.name); setCryptoSuggestions([]); }}
                    >
                      {s.name} <span className="text-gray-400 uppercase">{s.symbol}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {tickerStatus === 'notfound' && <p className="text-xs text-red-500 mt-1">Coin not found. Check the ID and try again.</p>}
            {tickerStatus === 'found' && fetchedName && <p className="text-xs text-green-600 mt-1">{fetchedName} · ${fetchedPrice?.toFixed(4)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number" required min="0" step="any"
              value={quantity} onChange={e => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticker Symbol</label>
            <input
              type="text" required
              value={ticker}
              onChange={e => { setTicker(e.target.value.toUpperCase()); setStockSuggestions([]); setTickerStatus('idle'); setFetchedPrice(null); }}
              onBlur={() => {
                if (!ticker.trim() || tickerStatus === 'found') return;
                setTickerStatus('loading');
                fetchQuote(ticker.trim()).then(q => {
                  if (q) { setFetchedName(q.name); setFetchedCurrency(q.currency === 'SGD' ? 'SGD' : 'USD'); setFetchedPrice(q.price); setTickerStatus('found'); }
                  else { setFetchedName(''); setFetchedPrice(null); setTickerStatus('notfound'); }
                });
              }}
              placeholder="e.g. AAPL, D05.SI, VINIX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {stockSuggestions.length > 0 && ticker && (
              <ul className="absolute z-10 w-full mt-1 border border-gray-200 rounded-lg overflow-hidden text-sm bg-white shadow-lg">
                {stockSuggestions.map(s => (
                  <li key={`${s.symbol}-${s.exchange}`}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-baseline justify-between gap-2"
                      onClick={() => {
                        setTicker(s.symbol);
                        setFetchedName(s.name);
                        setFetchedCurrency(s.currency === 'SGD' ? 'SGD' : 'USD');
                        setStockSuggestions([]);
                        setTickerStatus('loading');
                        fetchQuote(s.symbol).then(q => {
                          if (q) { setFetchedPrice(q.price); setTickerStatus('found'); }
                          else setTickerStatus('notfound');
                        });
                      }}
                    >
                      <span className="font-medium text-gray-900">{s.symbol}</span>
                      <span className="text-gray-500 truncate flex-1 mx-2">{s.name}</span>
                      <span className="text-gray-400 text-xs shrink-0">{s.exchange} · {s.currency}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400 mt-1">For SGX stocks, append .SI — e.g. D05.SI for DBS, ES3.SI for STI ETF</p>
            {tickerStatus === 'loading' && <p className="text-xs text-gray-400 mt-1">Looking up…</p>}
            {tickerStatus === 'notfound' && <p className="text-xs text-red-500 mt-1">Ticker not found. Check the symbol and try again.</p>}
            {tickerStatus === 'found' && <p className="text-xs text-green-600 mt-1">{fetchedName} · {fetchedCurrency} {fetchedPrice?.toFixed(2)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity / Shares</label>
            <input
              type="number" required min="0" step="any"
              value={quantity} onChange={e => setQuantity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account / Brokerage (optional)</label>
        <input
          type="text" value={account} onChange={e => setAccount(e.target.value)}
          placeholder="e.g. Robinhood, IBKR, 401k"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <input
          type="text" value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
      </div>
    </form>
  );
}
