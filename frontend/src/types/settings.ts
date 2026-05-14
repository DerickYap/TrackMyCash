import { Currency } from './networth';
import { ReturnAssumptions } from './projection';

export interface AppSettings {
  displayCurrency: Currency;
  fxRate: number;        // USD per 1 SGD
  fxSource: 'live' | 'manual';
  fxFetchedAt: string | null;
  proxyBaseUrl: string;
  monthlyIncome: number | null;
  returnAssumptions: ReturnAssumptions;
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayCurrency: 'SGD',
  fxRate: 0.74,
  fxSource: 'live',
  fxFetchedAt: null,
  proxyBaseUrl: 'http://localhost:3001',
  monthlyIncome: null,
  returnAssumptions: {
    bank: 0.015,
    cpf_oa: 0.025,
    cpf_sa: 0.04,
    cpfis: 0.05,
    retirement: 0.07,
    equity: 0.07,
    crypto: 0.0,
    metals: 0.02,
  },
};
