import { useSettings } from '../../store/AppContext';

interface Props {
  onSettingsOpen: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  cooldownActive: boolean;
}

export function TopBar({ onSettingsOpen, onRefresh, isRefreshing, cooldownActive }: Props) {
  const { state, dispatch } = useSettings();

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-800 text-lg">Track My Cash</span>
      </div>

      <div className="flex items-center gap-3">
        {/* FX rate display */}
        <span className="text-xs text-gray-400">
          1 SGD = {state.fxRate.toFixed(4)} USD
          {state.fxSource === 'manual' && <span className="ml-1 text-amber-500">(manual)</span>}
        </span>

        {/* Currency toggle */}
        <div className="flex bg-gray-100 rounded-md p-0.5">
          {(['SGD', 'USD'] as const).map(c => (
            <button
              key={c}
              onClick={() => dispatch({ type: 'SET_CURRENCY', payload: c })}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                state.displayCurrency === c
                  ? 'bg-white text-blue-600 font-semibold shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={cooldownActive || isRefreshing}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isRefreshing ? 'Refreshing…' : cooldownActive ? 'Wait…' : 'Refresh Prices'}
        </button>

        {/* Settings */}
        <button
          onClick={onSettingsOpen}
          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
