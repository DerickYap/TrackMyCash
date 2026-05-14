import { useState } from 'react';
import { ImportPreviewEntry, parseSpreadsheet } from '../../services/parsers/spreadsheetImporter';
import { useNetworth } from '../../store/AppContext';
import { ManualEntry, HoldingEntry } from '../../types/networth';

interface Props {
  onClose: () => void;
}

export function SpreadsheetImportModal({ onClose }: Props) {
  const { dispatch } = useNetworth();
  const [preview, setPreview] = useState<ImportPreviewEntry[] | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    file.text().then(text => {
      try {
        const entries = parseSpreadsheet(text);
        if (entries.length === 0) { setError('No entries found. Check the file format.'); return; }
        setPreview(entries);
      } catch {
        setError('Failed to parse file.');
      }
    });
  }

  function handleConfirm() {
    if (!preview) return;
    const now = new Date().toISOString();
    for (const item of preview) {
      if (item.kind === 'manual') {
        const entry: ManualEntry = {
          ...(item.data as Omit<ManualEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>),
          id: crypto.randomUUID(),
          entryType: 'manual',
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: 'ADD_ENTRY', payload: entry });
      } else {
        const entry: HoldingEntry = {
          ...(item.data as Omit<HoldingEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>),
          id: crypto.randomUUID(),
          entryType: 'holding',
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: 'ADD_ENTRY', payload: entry });
      }
    }
    setDone(true);
  }

  const manualEntries = preview?.filter(e => e.kind === 'manual') ?? [];
  const holdings = preview?.filter(e => e.kind === 'holding') ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Import from Spreadsheet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {done ? (
            <div className="text-center py-8">
              <div className="text-green-500 text-4xl mb-3">✓</div>
              <p className="text-sm font-medium text-gray-800">{preview?.length} entries imported successfully.</p>
              <p className="text-xs text-gray-400 mt-1">Remember to update SGD balances (DBS, UOB, CPF) to their actual SGD amounts.</p>
              <button onClick={onClose} className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Done</button>
            </div>
          ) : !preview ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Upload your exported Google Sheets CSV. The importer will detect your asset structure automatically.
              </p>
              <input
                type="file" accept=".csv"
                onChange={handleFile}
                className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">
                Found <span className="font-medium text-gray-800">{manualEntries.length} manual entries</span> and{' '}
                <span className="font-medium text-gray-800">{holdings.length} holdings</span>. Review below then confirm.
              </p>

              {manualEntries.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Manual Entries</h3>
                  <div className="space-y-1">
                    {manualEntries.map((item, i) => {
                      const d = item.data as Omit<ManualEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>;
                      return (
                        <div key={i} className={`flex items-start justify-between rounded-lg px-3 py-2 text-sm border ${item.note ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                          <div>
                            <span className="font-medium text-gray-800">{d.name}</span>
                            <span className="ml-2 text-xs text-gray-400">{d.category}{d.cpfType ? ` · ${d.cpfType.toUpperCase()}` : ''}</span>
                            {item.note && <div className="text-xs text-amber-600 mt-0.5">{item.note}</div>}
                          </div>
                          <span className="text-gray-700 font-medium whitespace-nowrap ml-4">
                            {d.currency} {d.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {holdings.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Holdings</h3>
                  <div className="space-y-1">
                    {holdings.map((item, i) => {
                      const d = item.data as Omit<HoldingEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>;
                      const qty = d.assetClass === 'metal'
                        ? `${d.quantity} ${d.weightUnit?.replace('_', ' ')}`
                        : `${d.quantity} shares`;
                      return (
                        <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm border border-gray-100 bg-gray-50">
                          <div>
                            <span className="font-medium text-gray-800">{d.ticker}</span>
                            <span className="ml-2 text-xs text-gray-400">{d.assetClass} · {qty}</span>
                            {d.notes && <span className="ml-2 text-xs text-gray-400">· {d.notes}</span>}
                          </div>
                          <span className="text-gray-500 text-xs whitespace-nowrap ml-4">
                            @ ${d.lastPrice?.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {preview && !done && (
          <div className="flex gap-3 justify-end px-5 py-4 border-t border-gray-100">
            <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Back</button>
            <button onClick={handleConfirm} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Import {preview.length} entries
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
