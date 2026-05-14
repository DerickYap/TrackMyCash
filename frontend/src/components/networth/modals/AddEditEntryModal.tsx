import { useState } from 'react';
import { EntryUnion, ManualEntry, HoldingEntry } from '../../../types/networth';
import { ManualEntryForm } from './ManualEntryForm';
import { HoldingEntryForm } from './HoldingEntryForm';

interface Props {
  initial?: EntryUnion;
  onSave: (entry: EntryUnion) => void;
  onCancel: () => void;
}

type EntryType = 'manual' | 'holding';

export function AddEditEntryModal({ initial, onSave, onCancel }: Props) {
  const [step, setStep] = useState<EntryType | null>(initial ? initial.entryType : null);

  function handleManualSave(data: Omit<ManualEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const entry: ManualEntry = {
      ...data,
      id: initial?.id ?? crypto.randomUUID(),
      entryType: 'manual',
      createdAt: (initial as ManualEntry)?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(entry);
  }

  function handleHoldingSave(data: Omit<HoldingEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const entry: HoldingEntry = {
      ...data,
      id: initial?.id ?? crypto.randomUUID(),
      entryType: 'holding',
      createdAt: (initial as HoldingEntry)?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(entry);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            {initial ? 'Edit Entry' : step ? `Add ${step === 'manual' ? 'Manual' : 'Holding'} Entry` : 'Add Entry'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === null && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">What type of entry would you like to add?</p>
            <button
              onClick={() => setStep('manual')}
              className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-gray-800 text-sm">Manual Entry</div>
              <div className="text-xs text-gray-500 mt-1">Bank accounts, CPF, CPFIS, retirement, liabilities</div>
            </button>
            <button
              onClick={() => setStep('holding')}
              className="w-full text-left border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-gray-800 text-sm">Holding</div>
              <div className="text-xs text-gray-500 mt-1">Stocks, ETFs, crypto, precious metals (live price)</div>
            </button>
          </div>
        )}

        {step === 'manual' && (
          <ManualEntryForm
            initial={initial?.entryType === 'manual' ? initial : undefined}
            onSave={handleManualSave}
            onCancel={onCancel}
          />
        )}

        {step === 'holding' && (
          <HoldingEntryForm
            initial={initial?.entryType === 'holding' ? initial : undefined}
            onSave={handleHoldingSave}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}
