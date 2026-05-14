import { useState } from 'react';
import { ReturnAssumptions } from '../../types/projection';
import { RETURN_RATE_LABELS } from '../../constants/defaultReturnRates';

interface Props {
  assumptions: ReturnAssumptions;
  onChange: (assumptions: ReturnAssumptions) => void;
}

export function ReturnAssumptionsPanel({ assumptions, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function updateRate(key: keyof ReturnAssumptions, value: string) {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    onChange({ ...assumptions, [key]: num / 100 });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">Return Assumptions</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? '' : '-rotate-90'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          {(Object.keys(RETURN_RATE_LABELS) as Array<keyof ReturnAssumptions>).map(key => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">{RETURN_RATE_LABELS[key]}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={(assumptions[key] * 100).toFixed(1)}
                  onChange={e => updateRate(key, e.target.value)}
                  className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
