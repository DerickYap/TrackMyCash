import { useState, useRef } from 'react';
import { Transaction } from '../../types/expense';
import { parseFile } from '../../services/parsers/parseFile';
import { detectBank } from '../../services/parsers/detectBank';
import { useExpense } from '../../store/AppContext';

interface Props {
  onParsed: (transactions: Transaction[]) => void;
  onImageUpload: (file: File) => void;
}

export function UploadArea({ onParsed, onImageUpload }: Props) {
  const { state } = useExpense();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [needsYear, setNeedsYear] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [year, setYear] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setNeedsYear(false);
    setPendingFile(null);

    // Hand off image files immediately
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
      onImageUpload(file);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    await run(file);
  }

  async function run(file: File, confirmedYear?: number) {
    setParsing(true);
    setError('');

    const result = await parseFile(file, state.transactions, state.categoryMemory, confirmedYear);

    setParsing(false);

    if (result.ok) {
      onParsed(result.transactions);
      setPendingFile(null);
      setNeedsYear(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    if (!result.ok && 'needsYear' in result) {
      setPendingFile(file);
      setNeedsYear(true);
      return;
    }

    setError(result.error);
  }

  function handleYearConfirm() {
    const y = parseInt(year);
    if (!y || !pendingFile) return;
    setNeedsYear(false);
    setYear('');
    run(pendingFile, y);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Import Statement or Receipt</h3>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.pdf,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={parsing}
          className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer disabled:opacity-50"
        />
        {parsing && (
          <span className="text-xs text-gray-400 animate-pulse">Parsing…</span>
        )}
      </div>

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {needsYear && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 mb-2">
            Statement year couldn't be detected. Please confirm:
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder={String(new Date().getFullYear())}
              className="border border-gray-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleYearConfirm}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
