import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '../../types/expense';
import { monthKey, formatMonthYear } from '../../utils/formatters';
import { ExpenseChart } from './ExpenseChart';
import { TransactionList } from './TransactionList';
import { ALL_CATEGORIES } from '../../constants/categoryKeywords';

interface Props {
  transactions: Transaction[];
}

export function MonthlyView({ transactions }: Props) {
  const months = useMemo(() => {
    const keys = [...new Set(transactions.map(t => monthKey(t.date)))].sort().reverse();
    return keys;
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState(() => months[0] ?? '');

  // Sync selectedMonth when transactions load from cloud on a fresh device
  useEffect(() => {
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[0]);
  }, [months, selectedMonth]);

  const monthTransactions = useMemo(
    () => transactions
      .filter(t => monthKey(t.date) === selectedMonth)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, selectedMonth]
  );

  const { debits, credits, totalSpend, totalIncome } = useMemo(() => {
    const d = monthTransactions.filter(t => t.type === 'debit');
    const c = monthTransactions.filter(t => t.type === 'credit');
    return {
      debits: d,
      credits: c,
      totalSpend: d.filter(t => t.category !== 'Transfers & Payments').reduce((s, t) => s + t.amount, 0),
      // Exclude transfers & payments from income — CC bill payments are not income
      totalIncome: c.filter(t => t.category !== 'Transfers & Payments').reduce((s, t) => s + t.amount, 0),
    };
  }, [monthTransactions]);

  const net = totalIncome - totalSpend;

  const chartData = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const t of debits) {
      if (t.category === 'Transfers & Payments') continue;
      cats[t.category] = (cats[t.category] ?? 0) + t.amount;
    }
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [debits]);

  if (months.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No transactions yet.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-500">Month:</label>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {months.map(m => <option key={m} value={m}>{formatMonthYear(m + '-01')}</option>)}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Total Spend</div>
          <div className="text-lg font-semibold text-gray-900">S${totalSpend.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Total Income</div>
          <div className="text-lg font-semibold text-green-600">S${totalIncome.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Net</div>
          <div className={`text-lg font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            S${net.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Spend by Category</h4>
          <ExpenseChart data={chartData} currency="SGD" />
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Transactions</h4>
        <TransactionList transactions={monthTransactions} />
      </div>
    </div>
  );
}
