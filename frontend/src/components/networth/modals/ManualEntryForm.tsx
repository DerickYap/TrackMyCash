import { useState } from 'react';
import { ManualEntry, ManualCategory, CpfType, Currency } from '../../../types/networth';

interface Props {
  initial?: ManualEntry;
  onSave: (data: Omit<ManualEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

const CATEGORIES: { value: ManualCategory; label: string }[] = [
  { value: 'bank', label: 'Cash & Bank' },
  { value: 'cpf', label: 'CPF' },
  { value: 'cpfis', label: 'CPFIS' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'liability', label: 'Liability' },
];

const CPF_TYPES: { value: CpfType; label: string }[] = [
  { value: 'oa', label: 'Ordinary Account (OA)' },
  { value: 'sa', label: 'Special Account (SA)' },
  { value: 'ma', label: 'MediSave (MA)' },
];

export function ManualEntryForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<ManualCategory>(initial?.category ?? 'bank');
  const [cpfType, setCpfType] = useState<CpfType | ''>(initial?.cpfType ?? '');
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? 'SGD');
  const [balance, setBalance] = useState(initial ? String(initial.balance) : '');
  const [account, setAccount] = useState(initial?.account ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      name: name.trim(),
      category,
      cpfType: category === 'cpf' ? (cpfType as CpfType) || null : null,
      currency,
      balance: parseFloat(balance) || 0,
      account: account.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. DBS Multiplier"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as ManualCategory)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {category === 'cpf' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CPF Account</label>
          <select
            value={cpfType}
            onChange={e => setCpfType(e.target.value as CpfType)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select account</option>
            {CPF_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {cpfType === 'oa' && (
            <p className="text-xs text-amber-600 mt-1">Exclude CPFIS amount to avoid double-counting.</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Balance</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={balance}
            onChange={e => setBalance(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value as Currency)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SGD">SGD</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account / Brokerage (optional)</label>
        <input
          type="text"
          value={account}
          onChange={e => setAccount(e.target.value)}
          placeholder="e.g. DBS, Chase, Robinhood"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Save
        </button>
      </div>
    </form>
  );
}
