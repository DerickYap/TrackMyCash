import { EntryUnion, HoldingEntry, ManualEntry, Currency } from '../../types/networth';
import { getEntryValue } from './SummaryStrip';
import { formatCompact } from '../../utils/currency';

interface Props {
  entries: EntryUnion[];
  displayCurrency: Currency;
  fxRate: number;
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  bank:       { label: 'Cash & Bank',      color: '#3b82f6' },
  cpf:        { label: 'CPF',              color: '#06b6d4' },
  cpfis:      { label: 'CPFIS',            color: '#0891b2' },
  retirement: { label: 'Retirement',       color: '#8b5cf6' },
  stock:      { label: 'Stocks',           color: '#22c55e' },
  etf:        { label: 'ETFs',             color: '#16a34a' },
  mutualfund: { label: 'Mutual Funds',     color: '#f97316' },
  crypto:     { label: 'Crypto',           color: '#f59e0b' },
  metal:      { label: 'Precious Metals',  color: '#d97706' },
};

function getCategoryKey(entry: EntryUnion): string {
  if (entry.entryType === 'manual') return (entry as ManualEntry).category;
  return (entry as HoldingEntry).assetClass;
}

export function AllocationChart({ entries, displayCurrency, fxRate }: Props) {
  const totals: Record<string, number> = {};

  for (const e of entries) {
    if (e.entryType === 'manual' && (e as ManualEntry).category === 'liability') continue;
    const key = getCategoryKey(e);
    const val = getEntryValue(e, displayCurrency, fxRate);
    totals[key] = (totals[key] ?? 0) + val;
  }

  const totalAssets = Object.values(totals).reduce((s, v) => s + v, 0);
  if (totalAssets <= 0) return null;

  const rows = Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Asset Allocation
      </h3>
      <div className="space-y-2.5">
        {rows.map(([key, value]) => {
          const meta = CATEGORY_META[key] ?? { label: key, color: '#9ca3af' };
          const pct = (value / totalAssets) * 100;
          return (
            <div key={key} className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-xs text-gray-600 truncate">{meta.label}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                />
              </div>
              <div className="w-10 shrink-0 text-right text-xs text-gray-500">
                {pct.toFixed(1)}%
              </div>
              <div className="w-16 shrink-0 text-right text-xs font-medium text-gray-700">
                {formatCompact(value, displayCurrency)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
