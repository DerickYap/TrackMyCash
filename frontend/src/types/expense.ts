import { Currency } from './networth';

export type BankSource = 'DBS' | 'UOB' | 'Chase' | 'Amex' | 'BofA' | 'manual' | 'receipt' | 'generic';
export type TransactionType = 'debit' | 'credit';

export type DetectionResult =
  | { type: 'bank'; source: BankSource }
  | { type: 'generic-pdf' }
  | { type: 'image' }
  | { type: 'unknown' };

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive
  type: TransactionType;
  currency: Currency;
  category: string;
  source: BankSource;
  importedAt: string;
  isDuplicate: boolean;
}

export interface RawTransaction {
  date: string; // raw, pre-normalisation
  description: string;
  amount: number;
  type: TransactionType;
}
