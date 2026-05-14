import { ReturnAssumptions } from '../types/projection';

export const DEFAULT_RETURN_RATES: ReturnAssumptions = {
  bank: 0.015,
  cpf_oa: 0.025,
  cpf_sa: 0.04,
  cpfis: 0.05,
  retirement: 0.07,
  equity: 0.07,
  crypto: 0.0,
  metals: 0.02,
};

export const RETURN_RATE_LABELS: Record<keyof ReturnAssumptions, string> = {
  bank: 'Cash & Bank',
  cpf_oa: 'CPF OA',
  cpf_sa: 'CPF SA / MA',
  cpfis: 'CPFIS',
  retirement: 'Retirement (401k)',
  equity: 'Equities (Stocks, ETFs)',
  crypto: 'Crypto',
  metals: 'Precious Metals',
};
