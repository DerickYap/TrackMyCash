import { useState } from 'react';
import { Transaction } from '../../types/expense';
import { useExpense } from '../../store/AppContext';
import { UploadArea } from './UploadArea';
import { ReviewScreen } from './ReviewScreen';
import { MonthlyView } from './MonthlyView';
import { ManualTransactionModal } from './ManualTransactionModal';

export function ExpenseTab() {
  const { state, dispatch } = useExpense();
  const [pendingImport, setPendingImport] = useState<Transaction[] | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  function handleParsed(txs: Transaction[]) {
    setPendingImport(txs);
  }

  function handleConfirmImport(txs: Transaction[]) {
    dispatch({ type: 'IMPORT_TRANSACTIONS', payload: txs });
    setPendingImport(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <UploadArea onParsed={handleParsed} />

      {pendingImport && (
        <ReviewScreen
          transactions={pendingImport}
          onConfirm={handleConfirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {!pendingImport && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 transition-colors"
            >
              + Add Manual Transaction
            </button>
          </div>
          <MonthlyView transactions={state.transactions} />
        </>
      )}

      {showManualModal && <ManualTransactionModal onClose={() => setShowManualModal(false)} />}
    </div>
  );
}
