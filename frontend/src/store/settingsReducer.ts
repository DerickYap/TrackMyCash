import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';
import { Currency } from '../types/networth';
import { ReturnAssumptions } from '../types/projection';

export type SettingsAction =
  | { type: 'SET_CURRENCY'; payload: Currency }
  | { type: 'SET_FX'; payload: { fxRate: number; fxFetchedAt: string; fxSource: 'live' | 'manual' } }
  | { type: 'SET_PROXY_URL'; payload: string }
  | { type: 'SET_MONTHLY_INCOME'; payload: number | null }
  | { type: 'SET_RETURN_ASSUMPTIONS'; payload: ReturnAssumptions }
  | { type: 'LOAD'; payload: AppSettings };

export function settingsReducer(state: AppSettings, action: SettingsAction): AppSettings {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'SET_CURRENCY':
      return { ...state, displayCurrency: action.payload };
    case 'SET_FX':
      return {
        ...state,
        fxRate: action.payload.fxRate,
        fxFetchedAt: action.payload.fxFetchedAt,
        fxSource: action.payload.fxSource,
      };
    case 'SET_PROXY_URL':
      return { ...state, proxyBaseUrl: action.payload };
    case 'SET_MONTHLY_INCOME':
      return { ...state, monthlyIncome: action.payload };
    case 'SET_RETURN_ASSUMPTIONS':
      return { ...state, returnAssumptions: action.payload };
    default:
      return state;
  }
}

export { DEFAULT_SETTINGS };
