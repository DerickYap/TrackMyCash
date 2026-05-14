import { EntryUnion, HoldingEntry, Currency } from '../../types/networth';
import { convertToDisplay, formatCurrency } from '../../utils/currency';
import { toTroyOz } from '../../utils/metalConversion';

function getEntryValue(entry: EntryUnion, displayCurrency: Currency, fxRate: number): number {
  if (entry.entryType === 'manual') {
    return convertToDisplay(entry.balance, entry.currency, fxRate, displayCurrency);
  }
  const h = entry as HoldingEntry;
  if (h.lastPrice == null) return 0;
  const qty = h.assetClass === 'metal'
    ? toTroyOz(h.quantity, h.weightUnit ?? 'troy_oz')
    : h.quantity;
  const nativeValue = qty * h.lastPrice;
  return convertToDisplay(nativeValue, h.currency, fxRate, displayCurrency);
}

interface Props {
  entries: EntryUnion[];
  displayCurrency: Currency;
  fxRate: number;
}

export function SummaryStrip({ entries, displayCurrency, fxRate }: Props) {
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const e of entries) {
    const value = getEntryValue(e, displayCurrency, fxRate);
    if (e.entryType === 'manual' && e.category === 'liability') {
      totalLiabilities += value;
    } else {
      totalAssets += value;
    }
  }

  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5">
      <div className="text-3xl font-bold text-gray-900 mb-1">
        {formatCurrency(netWorth, displayCurrency)}
      </div>
      <div className="text-sm text-gray-400 mb-4">Net Worth</div>
      <div className="flex gap-8">
        <div>
          <div className="text-lg font-semibold text-green-600">{formatCurrency(totalAssets, displayCurrency)}</div>
          <div className="text-xs text-gray-400">Total Assets</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-red-500">{formatCurrency(totalLiabilities, displayCurrency)}</div>
          <div className="text-xs text-gray-400">Total Liabilities</div>
        </div>
      </div>
    </div>
  );
}

export { getEntryValue };
