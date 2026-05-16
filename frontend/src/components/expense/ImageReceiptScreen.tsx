import { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../../types/expense';
import { Currency } from '../../types/networth';
import { ALL_CATEGORIES, FALLBACK_CATEGORY } from '../../constants/categoryKeywords';

interface Props {
  file: File;
  onSubmit: (transaction: Transaction) => void;
  onCancel: () => void;
}

export function ImageReceiptScreen({ file, onSubmit, onCancel }: Props) {
  const [objectUrl, setObjectUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(() => file.name.replace(/\.[^.]+$/, ''));
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('debit');
  const [currency, setCurrency] = useState<Currency>('SGD');
  const [category, setCategory] = useState(FALLBACK_CATEGORY);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tx: Transaction = {
      id: crypto.randomUUID(),
      date,
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      currency,
      category,
      source: 'receipt',
      importedAt: new Date().toISOString(),
      isDuplicate: false,
    };
    onSubmit(tx);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-700">Add Receipt</h3>
          <p className="text-xs text-gray-400 mt-0.5">Fill in the details from your receipt</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-sm">Cancel</button>
      </div>

      <div className="flex flex-col md:flex-row gap-0">
        {/* Image panel */}
        <div className="md:w-1/2 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 flex items-center justify-center p-4 min-h-64">
          {objectUrl && (
            <img
              src={objectUrl}
              alt="Receipt"
              className="max-w-full max-h-96 object-contain rounded shadow-sm"
            />
          )}
        </div>

        {/* Form panel */}
        <div className="md:w-1/2 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date" required value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={type} onChange={e => setType(e.target.value as TransactionType)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="debit">Debit</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text" required value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={currency} onChange={e => setCurrency(e.target.value as Currency)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SGD">SGD</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Add Transaction
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
