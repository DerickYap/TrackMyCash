import { memo } from 'react';
import { EntryUnion, HoldingEntry, Currency } from '../../types/networth';
import { formatCurrency, convertToDisplay } from '../../utils/currency';
import { toTroyOz } from '../../utils/metalConversion';
import { isStale, formatDate } from '../../utils/formatters';

function getHoldingValue(h: HoldingEntry): number | null {
  if (h.lastPrice == null) return null;
  const qty = h.assetClass === 'metal'
    ? toTroyOz(h.quantity, h.weightUnit ?? 'troy_oz')
    : h.quantity;
  return qty * h.lastPrice;
}

interface Props {
  entry: EntryUnion;
  displayCurrency: Currency;
  fxRate: number;
  onEdit: (entry: EntryUnion) => void;
  onDelete: (id: string) => void;
}

export const EntryRow = memo(function EntryRow({ entry, displayCurrency, fxRate, onEdit, onDelete }: Props) {
  const isHolding = entry.entryType === 'holding';
  const h = isHolding ? (entry as HoldingEntry) : null;
  const nativeValue = isHolding
    ? getHoldingValue(h!)
    : (entry as { balance: number }).balance;
  const nativeCurrency = entry.currency;
  const displayValue = nativeValue != null
    ? convertToDisplay(nativeValue, nativeCurrency, fxRate, displayCurrency)
    : null;

  const stale = isHolding && isStale(h!.lastFetchedAt);
  const hasPrice = isHolding && h!.lastPrice != null;

  return (
    <div className="flex items-center justify-between py-2.5 px-4 hover:bg-gray-50 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 truncate">
            {isHolding ? h!.name || h!.ticker : (entry as { name: string }).name}
          </span>
          {isHolding && stale && hasPrice && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Stale</span>
          )}
          {isHolding && !hasPrice && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">No price</span>
          )}
        </div>
        {isHolding && (
          <div className="text-xs text-gray-400 mt-0.5">
            {h!.quantity} {h!.weightUnit ? h!.weightUnit.replace('_', ' ') : ''} {h!.ticker}
            {h!.lastFetchedAt && (
              <span className="ml-2">Updated {formatDate(h!.lastFetchedAt)}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          {displayValue != null ? (
            <>
              <div className="text-sm font-semibold text-gray-900">
                {formatCurrency(displayValue, displayCurrency)}
              </div>
              {nativeCurrency !== displayCurrency && nativeValue != null && (
                <div className="text-xs text-gray-400">
                  {formatCurrency(nativeValue, nativeCurrency)}
                </div>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(entry)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});
