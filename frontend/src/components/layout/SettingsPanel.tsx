import { useState } from 'react';
import { useSettings, useNetworth, useExpense, useProjection } from '../../store/AppContext';
import { SpreadsheetImportModal } from './SpreadsheetImportModal';
import { useAuth } from '../../store/AuthContext';
import { upsertUserData } from '../../services/cloudStorage';
import { DEFAULT_SETTINGS } from '../../store/settingsReducer';

const STORAGE_KEYS = ['nw_entries', 'nw_transactions', 'nw_settings', 'nw_category_memory', 'nw_projection_scenarios'];

function storageUsageKb(): number {
  let total = 0;
  for (const key of STORAGE_KEYS) {
    total += (localStorage.getItem(key) ?? '').length;
  }
  return total / 1024;
}

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const { state: settings, dispatch: settingsDispatch } = useSettings();
  const { state: networthState } = useNetworth();
  const { state: expenseState } = useExpense();
  const { state: projState } = useProjection();
  const { user } = useAuth();

  const [proxyUrl, setProxyUrl] = useState(settings.proxyBaseUrl);
  const [fxInput, setFxInput] = useState(String(settings.fxRate));
  const [monthlyIncome, setMonthlyIncome] = useState(String(settings.monthlyIncome ?? ''));
  const [clearStep, setClearStep] = useState(0);
  const [showSpreadsheetImport, setShowSpreadsheetImport] = useState(false);

  function saveProxy() {
    settingsDispatch({ type: 'SET_PROXY_URL', payload: proxyUrl });
  }

  function saveFx() {
    const rate = parseFloat(fxInput);
    if (isNaN(rate) || rate <= 0) return;
    settingsDispatch({ type: 'SET_FX', payload: { fxRate: rate, fxFetchedAt: new Date().toISOString(), fxSource: 'manual' } });
  }

  function resetFx() {
    settingsDispatch({ type: 'SET_FX', payload: { fxRate: settings.fxRate, fxFetchedAt: '', fxSource: 'live' } });
  }

  function saveIncome() {
    const val = parseFloat(monthlyIncome);
    settingsDispatch({ type: 'SET_MONTHLY_INCOME', payload: isNaN(val) ? null : val });
  }

  function exportData() {
    const data = {
      nw_entries: networthState.entries,
      nw_transactions: expenseState.transactions,
      nw_category_memory: expenseState.categoryMemory,
      nw_settings: settings,
      nw_projection_scenarios: projState.scenarios,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trackmycash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.nw_entries) localStorage.setItem('nw_entries', JSON.stringify(data.nw_entries));
        if (data.nw_transactions) localStorage.setItem('nw_transactions', JSON.stringify(data.nw_transactions));
        if (data.nw_category_memory) localStorage.setItem('nw_category_memory', JSON.stringify(data.nw_category_memory));
        if (data.nw_settings) localStorage.setItem('nw_settings', JSON.stringify(data.nw_settings));
        if (data.nw_projection_scenarios) localStorage.setItem('nw_projection_scenarios', JSON.stringify(data.nw_projection_scenarios));
        if (user) {
          await upsertUserData(user.id, {
            entries: data.nw_entries ?? [],
            transactions: data.nw_transactions ?? [],
            settings: data.nw_settings ?? DEFAULT_SETTINGS,
            category_memory: data.nw_category_memory ?? {},
            scenarios: data.nw_projection_scenarios ?? [],
          });
        }
        window.location.reload();
      } catch {
        alert('Failed to import: invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function clearAll() {
    for (const key of STORAGE_KEYS) localStorage.removeItem(key);
    if (user) {
      upsertUserData(user.id, {
        entries: [], transactions: [], settings: DEFAULT_SETTINGS,
        category_memory: {}, categories: [], scenarios: [],
      });
    }
    window.location.reload();
  }

  const usageKb = storageUsageKb();

  return (
    <>
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="ml-auto w-full max-w-sm bg-white h-full shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Proxy URL */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Backend Proxy URL</h3>
            <div className="flex gap-2">
              <input
                type="text" value={proxyUrl} onChange={e => setProxyUrl(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="http://localhost:3001"
              />
              <button onClick={saveProxy} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Required for stock, ETF, and metals prices.</p>
          </div>

          {/* FX Rate */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">FX Rate (1 SGD = X USD)</h3>
            <div className="flex gap-2">
              <input
                type="number" step="0.0001" value={fxInput} onChange={e => setFxInput(e.target.value)}
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={saveFx} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Override</button>
              <button onClick={resetFx} className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50">Reset to Live</button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {settings.fxSource === 'manual' ? 'Using manual override.' : `Live rate fetched ${settings.fxFetchedAt ? new Date(settings.fxFetchedAt).toLocaleTimeString() : 'not yet fetched'}.`}
            </p>
          </div>

          {/* Monthly income */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly Income Reference</h3>
            <div className="flex gap-2">
              <input
                type="number" step="100" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)}
                placeholder="e.g. 8000"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={saveIncome} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>

          {/* Data */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Data</h3>
            <p className="text-xs text-gray-400 mb-3">Storage used: {usageKb.toFixed(1)} KB</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowSpreadsheetImport(true)}
                className="w-full px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-left"
              >
                Import from Google Sheets CSV
              </button>
              <button onClick={exportData} className="w-full px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-left">
                Export data (JSON)
              </button>
              <label className="w-full px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer">
                Import data (JSON)
                <input type="file" accept=".json" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>

          {/* Danger zone */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h3>
            {clearStep === 0 && (
              <button onClick={() => setClearStep(1)} className="w-full px-4 py-2 text-sm border border-red-300 text-red-500 rounded-lg hover:bg-red-50">
                Clear all data
              </button>
            )}
            {clearStep === 1 && (
              <div className="space-y-2">
                <p className="text-xs text-red-600">This will delete all entries, transactions, and settings. This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setClearStep(0)} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg">Cancel</button>
                  <button onClick={clearAll} className="flex-1 px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Yes, delete everything</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {showSpreadsheetImport && (
      <SpreadsheetImportModal onClose={() => setShowSpreadsheetImport(false)} />
    )}
    </>
  );
}
