export type Currency = 'SGD' | 'USD';

export type ManualCategory = 'bank' | 'cpf' | 'cpfis' | 'retirement' | 'liability';
export type CpfType = 'oa' | 'sa' | 'ma';

export interface ManualEntry {
  id: string;
  entryType: 'manual';
  name: string;
  category: ManualCategory;
  cpfType: CpfType | null;
  currency: Currency;
  balance: number;
  account: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AssetClass = 'stock' | 'etf' | 'crypto' | 'metal' | 'mutualfund';
export type MetalType = 'gold' | 'silver';
export type WeightUnit = 'troy_oz' | 'grams';

export interface HoldingEntry {
  id: string;
  entryType: 'holding';
  ticker: string;
  name: string;
  assetClass: AssetClass;
  metalType: MetalType | null;
  quantity: number;
  weightUnit: WeightUnit | null;
  currency: Currency;
  lastPrice: number | null;
  lastFetchedAt: string | null;
  account: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EntryUnion = ManualEntry | HoldingEntry;

export interface PriceUpdate {
  id: string;
  lastPrice: number;
  lastFetchedAt: string;
}
