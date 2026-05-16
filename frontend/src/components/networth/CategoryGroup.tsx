import { useState, useMemo, memo } from 'react';
import { EntryUnion, Currency } from '../../types/networth';
import { EntryRow } from './EntryRow';
import { getEntryValue } from './SummaryStrip';
import { formatCurrency } from '../../utils/currency';

const CATEGORY_LABELS: Record<string, string> = {
  bank: 'Cash & Bank',
  cpf: 'CPF',
  cpfis: 'CPFIS',
  retirement: 'Retirement',
  liability: 'Liabilities',
  stock: 'Stocks',
  etf: 'ETFs',
  crypto: 'Crypto',
  metal: 'Precious Metals',
  mutualfund: 'Mutual Funds',
};

interface Props {
  groupKey: string;
  entries: EntryUnion[];
  displayCurrency: Currency;
  fxRate: number;
  onEdit: (entry: EntryUnion) => void;
  onDelete: (id: string) => void;
}

export const CategoryGroup = memo(function CategoryGroup({ groupKey, entries, displayCurrency, fxRate, onEdit, onDelete }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const total = useMemo(
    () => entries.reduce((sum, e) => sum + getEntryValue(e, displayCurrency, fxRate), 0),
    [entries, displayCurrency, fxRate]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          {CATEGORY_LABELS[groupKey] ?? groupKey}
        </span>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold ${groupKey === 'liability' ? 'text-red-500' : 'text-gray-900'}`}>
            {formatCurrency(total, displayCurrency)}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {!collapsed && (
        <div className="divide-y divide-gray-100">
          {entries.map(e => (
            <EntryRow
              key={e.id}
              entry={e}
              displayCurrency={displayCurrency}
              fxRate={fxRate}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
});
