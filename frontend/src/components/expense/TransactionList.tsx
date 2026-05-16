import { useState, useMemo, useCallback, memo } from 'react';
import { Transaction } from '../../types/expense';
import { useExpense } from '../../store/AppContext';
import { ALL_CATEGORIES } from '../../constants/categoryKeywords';
import { formatDate } from '../../utils/formatters';

interface Props {
  transactions: Transaction[];
}

export const TransactionList = memo(function TransactionList({ transactions }: Props) {
  const { dispatch } = useExpense();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const filtered = useMemo(() => transactions.filter(t => {
    const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || t.category === filterCategory;
    return matchSearch && matchCat;
  }), [transactions, search, filterCategory]);

  const updateCategory = useCallback((t: Transaction, category: string) => {
    dispatch({ type: 'EDIT_CATEGORY', payload: { id: t.id, category } });
    dispatch({
      type: 'SET_CATEGORY_MEMORY',
      payload: { key: `${t.source}:${t.description.toLowerCase().trim()}`, category },
    });
  }, [dispatch]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search description…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">No transactions found.</p>
      )}

      <div className="space-y-1">
        {filtered.map(t => (
          <div key={t.id} className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200">
            <div className="text-xs text-gray-400 w-20 shrink-0">{formatDate(t.date)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-700 truncate">{t.description}</div>
              <div className="text-xs text-gray-400">{t.source}</div>
            </div>
            <select
              value={t.category}
              onChange={e => updateCategory(t, e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
            >
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className={`text-sm font-medium w-24 text-right shrink-0 ${t.type === 'credit' ? 'text-green-600' : 'text-gray-800'}`}>
              {t.type === 'credit' ? '+' : ''}{t.currency === 'SGD' ? 'S$' : 'US$'}{t.amount.toFixed(2)}
            </div>
            <button
              onClick={() => dispatch({ type: 'DELETE_TRANSACTION', payload: t.id })}
              className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
