import { useState, useRef } from 'react';
import { BankSource, Transaction, RawTransaction } from '../../types/expense';
import { Currency } from '../../types/networth';
import { parseDBS } from '../../services/parsers/dbsParser';
import { parseUOB } from '../../services/parsers/uobParser';
import { parseChase } from '../../services/parsers/chaseParser';
import { parseAmex } from '../../services/parsers/amexParser';
import { parseBofA } from '../../services/parsers/bofaParser';
import { normaliseTransactions } from '../../services/parsers/normaliser';
import { useExpense } from '../../store/AppContext';

interface Props {
  onParsed: (transactions: Transaction[]) => void;
}

const BANKS: { value: BankSource; label: string; accept: string }[] = [
  { value: 'DBS', label: 'DBS', accept: '.csv' },
  { value: 'UOB', label: 'UOB', accept: '.pdf,.xls,.xlsx,.csv' },
  { value: 'Chase', label: 'Chase', accept: '.csv' },
  { value: 'Amex', label: 'American Express', accept: '.csv' },
  { value: 'BofA', label: 'Bank of America', accept: '.csv,.xls,.xlsx' },
];

export function UploadArea({ onParsed }: Props) {
  const { state } = useExpense();
  const [bank, setBank] = useState<BankSource>('DBS');
  const [amexCurrency, setAmexCurrency] = useState<Currency>('SGD');
  const [uobYear, setUobYear] = useState('');
  const [needsYear, setNeedsYear] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const bankConfig = BANKS.find(b => b.value === bank)!;

  async function processFile(file: File, confirmedYear?: number) {
    setError('');
    const currency: Currency = bank === 'Chase' || bank === 'BofA' ? 'USD' : (bank === 'Amex' ? amexCurrency : 'SGD');
    let raw: RawTransaction[] = [];

    try {
      if (bank === 'DBS') {
        raw = parseDBS(await file.text());
      } else if (bank === 'UOB') {
        const result = await parseUOB(file, confirmedYear);
        if ('needsYearConfirmation' in result) {
          setPendingFile(file);
          setNeedsYear(true);
          return;
        }
        raw = result;
      } else if (bank === 'Chase') {
        raw = parseChase(await file.text());
      } else if (bank === 'Amex') {
        raw = parseAmex(await file.text());
      } else if (bank === 'BofA') {
        raw = await parseBofA(file);
      }
    } catch {
      setError('Failed to parse file. Please check the format and try again.');
      return;
    }

    if (raw.length === 0) {
      setError('No transactions found. Please check the file format.');
      return;
    }

    const normalised = normaliseTransactions(raw, bank, currency, state.transactions, state.categoryMemory);
    onParsed(normalised);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleYearConfirm() {
    const year = parseInt(uobYear);
    if (!year || !pendingFile) return;
    setNeedsYear(false);
    setPendingFile(null);
    setUobYear('');
    processFile(pendingFile, year);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Import Statement</h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bank / Card</label>
          <select
            value={bank}
            onChange={e => { setBank(e.target.value as BankSource); setError(''); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {BANKS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>

        {bank === 'Amex' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Card Currency</label>
            <select
              value={amexCurrency}
              onChange={e => setAmexCurrency(e.target.value as Currency)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">File</label>
          <input
            ref={fileRef}
            type="file"
            accept={bankConfig.accept}
            onChange={handleFileChange}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
          />
        </div>
      </div>

      {bank === 'BofA' && (
        <p className="text-xs text-gray-400 mt-2">Bank of America: save the XLS download as CSV before uploading, or upload the XLS directly.</p>
      )}

      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {needsYear && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700 mb-2">UOB statement year could not be inferred. Please confirm the year:</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={uobYear}
              onChange={e => setUobYear(e.target.value)}
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
