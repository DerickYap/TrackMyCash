import { useState } from 'react';
import { Transaction } from '../../types/expense';
import { useExpense } from '../../store/AppContext';
import { CATEGORY_KEYWORDS, FALLBACK_CATEGORY } from '../../constants/categoryKeywords';
import { formatDate } from '../../utils/formatters';

const ALL_CATEGORIES = [...Object.keys(CATEGORY_KEYWORDS), FALLBACK_CATEGORY];

interface Props {
  transactions: Transaction[];
  onConfirm: (transactions: Transaction[]) => void;
  onCancel: () => void;
}

export function ReviewScreen({ transactions, onConfirm, onCancel }: Props) {
  const { dispatch } = useExpense();
  const [local, setLocal] = useState<Transaction[]>(transactions.filter(t => !t.isDuplicate));
  const duplicates = transactions.filter(t => t.isDuplicate);

  function updateCategory(id: string, category: string) {
    setLocal(prev => prev.map(t => t.id === id ? { ...t, category } : t));
  }

  function handleConfirm() {
    // Persist category corrections to memory
    for (const t of local) {
      const original = transactions.find(o => o.id === t.id);
      if (original && original.category !== t.category) {
        dispatch({
          type: 'SET_CATEGORY_MEMORY',
          payload: { key: `${t.source}:${t.description.toLowerCase().trim()}`, category: t.category },
        });
      }
    }
    onConfirm(local);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Review Import</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {local.length} transactions to import
            {duplicates.length > 0 && ` · ${duplicates.length} duplicates skipped`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Confirm Import
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-24">Date</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Description</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 w-24">Amount</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-40">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {local.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{t.description}</td>
                <td className={`px-4 py-2 text-right whitespace-nowrap font-medium ${t.type === 'debit' ? 'text-gray-800' : 'text-green-600'}`}>
                  {t.type === 'credit' ? '+' : ''}{t.currency === 'SGD' ? 'S$' : 'US$'}{t.amount.toFixed(2)}
                </td>
                <td className="px-4 py-2">
                  <select
                    value={t.category}
                    onChange={e => updateCategory(t.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
