import { useState } from 'react';
import { Transaction } from '../../types/expense';
import { useExpense } from '../../store/AppContext';
import { buildDuplicateSet, isDuplicate } from '../../utils/duplicateDetector';
import { UploadArea } from './UploadArea';
import { ReviewScreen } from './ReviewScreen';
import { MonthlyView } from './MonthlyView';
import { ManualTransactionModal } from './ManualTransactionModal';
import { ImageReceiptScreen } from './ImageReceiptScreen';

export function ExpenseTab() {
  const { state, dispatch } = useExpense();
  const [pendingImport, setPendingImport] = useState<Transaction[] | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Transaction | null>(null);

  function handleParsed(txs: Transaction[]) {
    setPendingImport(txs);
  }

  function handleConfirmImport(txs: Transaction[]) {
    dispatch({ type: 'IMPORT_TRANSACTIONS', payload: txs });
    setPendingImport(null);
  }

  function handleImageUpload(file: File) {
    setPendingImport(null);
    setPendingImageFile(file);
  }

  function handleImageSubmit(tx: Transaction) {
    const existing = buildDuplicateSet(state.transactions);
    if (isDuplicate(tx.date, tx.description, tx.amount, existing)) {
      setDuplicateWarning(tx);
      return;
    }
    dispatch({ type: 'ADD_TRANSACTION', payload: tx });
    setPendingImageFile(null);
  }

  function confirmDuplicateImport() {
    if (!duplicateWarning) return;
    dispatch({ type: 'ADD_TRANSACTION', payload: duplicateWarning });
    setDuplicateWarning(null);
    setPendingImageFile(null);
  }

  const showMain = !pendingImport && !pendingImageFile;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <UploadArea onParsed={handleParsed} onImageUpload={handleImageUpload} />

      {pendingImageFile && (
        <ImageReceiptScreen
          file={pendingImageFile}
          onSubmit={handleImageSubmit}
          onCancel={() => setPendingImageFile(null)}
        />
      )}

      {duplicateWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800 font-medium mb-1">Possible duplicate</p>
          <p className="text-xs text-amber-700 mb-3">
            A transaction with the same date, description and amount already exists.
            Import anyway?
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmDuplicateImport}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Import anyway
            </button>
            <button
              onClick={() => setDuplicateWarning(null)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingImport && (
        <ReviewScreen
          transactions={pendingImport}
          onConfirm={handleConfirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {showMain && (
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
