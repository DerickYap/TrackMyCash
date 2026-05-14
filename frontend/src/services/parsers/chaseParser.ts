import Papa from 'papaparse';
import { RawTransaction } from '../../types/expense';

export function parseChase(csvText: string): RawTransaction[] {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const rows = result.data;
  const transactions: RawTransaction[] = [];

  for (const row of rows) {
    const date = row['Transaction Date'] || row['Posting Date'] || '';
    const description = (row['Description'] || '').trim();
    const rawAmount = parseFloat(row['Amount'] || '0');
    if (!date || !description || isNaN(rawAmount)) continue;

    // Chase: negative = debit (charge), positive = credit (refund/payment)
    transactions.push({
      date,
      description,
      amount: Math.abs(rawAmount),
      type: rawAmount < 0 ? 'debit' : 'credit',
    });
  }
  return transactions;
}
