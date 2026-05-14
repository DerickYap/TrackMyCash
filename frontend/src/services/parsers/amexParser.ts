import Papa from 'papaparse';
import { RawTransaction } from '../../types/expense';

export function parseAmex(csvText: string): RawTransaction[] {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const transactions: RawTransaction[] = [];

  for (const row of result.data) {
    const date = row['Date'] || '';
    const description = (row['Description'] || '').trim();
    const rawAmount = parseFloat(row['Amount'] || '0');
    if (!date || !description || isNaN(rawAmount)) continue;

    // Amex: positive = charge (debit), negative = payment/refund (credit)
    transactions.push({
      date,
      description,
      amount: Math.abs(rawAmount),
      type: rawAmount > 0 ? 'debit' : 'credit',
    });
  }
  return transactions;
}
