import { Currency } from '../types/networth';

export function convertToDisplay(
  amount: number,
  fromCurrency: Currency,
  fxRate: number, // USD per 1 SGD
  displayCurrency: Currency
): number {
  if (fromCurrency === displayCurrency) return amount;
  if (fromCurrency === 'SGD' && displayCurrency === 'USD') return amount * fxRate;
  if (fromCurrency === 'USD' && displayCurrency === 'SGD') return amount / fxRate;
  return amount;
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompact(amount: number, currency: Currency): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = currency === 'SGD' ? 'S$' : 'US$';
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toFixed(2)}`;
}
