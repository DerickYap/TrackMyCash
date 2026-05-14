import { useState, useRef } from 'react';
import { BankSource, Transaction, RawTransaction } from '../../types/expense';
import { Currency } from '../../types/networth';
import { parseDBS } from '../../services/parsers/dbsParser';
import { parseUOB } from '../../services/parsers/uobParser';
import { parseChase } from '../../services/parsers/chaseParser';
import { parseAmex } from '../../services/parsers/amexParser';
import { parseBofA } from '../../services/parsers/bofaParser';
import { parseDBSPdf } from '../../services/parsers/dbsPdfParser';
import { parseChasePdf } from '../../services/parsers/chasePdfParser';
import { parseAmexPdf } from '../../services/parsers/amexPdfParser';
import { parseBofAPdf } from '../../services/parsers/bofaPdfParser';
import { normaliseTransactions } from '../../services/parsers/normaliser';
import { detectBank } from '../../services/parsers/detectBank';
import { useExpense } from '../../store/AppContext';

interface Props {
  onParsed: (transactions: Transaction[]) => void;
}

const BANKS: { value: BankSource; label: string }[] = [
  { value: 'DBS', label: 'DBS' },
  { value: 'UOB', label: 'UOB' },
  { value: 'Chase', label: 'Chase' },
  { value: 'Amex', label: 'American Express' },
  { value: 'BofA', label: 'Bank of America' },
];

export function UploadArea({ onParsed }: Props) {
  const { state } = useExpense();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [bank, setBank] = useState<BankSource | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectionFailed, setDetectionFailed] = useState(false);
  const [amexCurrency, setAmexCurrency] = useState<Currency>('SGD');
  const [uobYear, setUobYear] = useState('');
  const [needsYear, setNeedsYear] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setNeedsYear(false);
    setDetectionFailed(false);
    setPendingFile(file);
    setDetecting(true);
    const detected = await detectBank(file);
    setDetecting(false);
    if (detected) {
      setBank(detected);
    } else {
      setDetectionFailed(true);
      setBank(null);
    }
  }

  async function processFile(file: File, resolvedBank: BankSource, confirmedYear?: number) {
    setError('');
    const currency: Currency =
      resolvedBank === 'Chase' || resolvedBank === 'BofA' ? 'USD' :
      resolvedBank === 'Amex' ? amexCurrency : 'SGD';
    let raw: RawTransaction[] = [];

    const isPdf = file.name.toLowerCase().endsWith('.pdf');

    try {
      if (resolvedBank === 'DBS') {
        raw = isPdf ? await parseDBSPdf(file) : parseDBS(await file.text());
      } else if (resolvedBank === 'UOB') {
        const result = await parseUOB(file, confirmedYear);
        if ('needsYearConfirmation' in result) {
          setNeedsYear(true);
          return;
        }
        raw = result;
      } else if (resolvedBank === 'Chase') {
        raw = isPdf ? await parseChasePdf(file) : parseChase(await file.text());
      } else if (resolvedBank === 'Amex') {
        raw = isPdf ? await parseAmexPdf(file) : parseAmex(await file.text());
      } else if (resolvedBank === 'BofA') {
        raw = isPdf ? await parseBofAPdf(file) : await parseBofA(file);
      }
    } catch {
      setError('Failed to parse file. Please check the format and try again.');
      return;
    }

    if (raw.length === 0) {
      setError('No transactions found. Please check the file format.');
      return;
    }

    const normalised = normaliseTransactions(raw, resolvedBank, currency, state.transactions, state.categoryMemory);
    onParsed(normalised);
    setPendingFile(null);
    setBank(null);
    setDetectionFailed(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleImport() {
    if (!pendingFile || !bank) return;
    processFile(pendingFile, bank);
  }

  function handleYearConfirm() {
    const year = parseInt(uobYear);
    if (!year || !pendingFile || !bank) return;
    setNeedsYear(false);
    setUobYear('');
    processFile(pendingFile, bank, year);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Import Statement</h3>

      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.pdf,.xls,.xlsx"
            onChange={handleFileChange}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
          />
        </div>

        {detecting && (
          <span className="text-xs text-gray-400 self-center">Detecting…</span>
        )}

        {!detecting && pendingFile && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {detectionFailed ? 'Select bank' : 'Detected bank'}
              </label>
              <select
                value={bank ?? ''}
                onChange={e => { setBank(e.target.value as BankSource); setError(''); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {detectionFailed && <option value="" disabled>Select bank…</option>}
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

            <button
              onClick={handleImport}
              disabled={!bank}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              Import
            </button>
          </>
        )}
      </div>

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
