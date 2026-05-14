import Papa from 'papaparse';
import { RawTransaction } from '../../types/expense';

const SKIP_DESCRIPTIONS = ['balance brought forward', 'balance carried forward'];

export function parseDBS(csvText: string): RawTransaction[] {
  const lines = csvText.split('\n');

  // Find the header row
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Transaction Date')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const dataSection = lines.slice(headerIdx).join('\n');
  const result = Papa.parse<Record<string, string>>(dataSection, { header: true, skipEmptyLines: true });
  const transactions: RawTransaction[] = [];

  for (const row of result.data) {
    const date = row['Transaction Date'] || '';
    let description = (row['Transaction Ref1'] || '').trim();
    if (!description) description = (row['Transaction Ref2'] || '').trim();

    if (!date || !description) continue;
    if (SKIP_DESCRIPTIONS.some(s => description.toLowerCase().includes(s))) continue;

    const debit = parseFloat(row['Debit Amount'] || '0') || 0;
    const credit = parseFloat(row['Credit Amount'] || '0') || 0;

    if (debit > 0) {
      transactions.push({ date, description, amount: debit, type: 'debit' });
    } else if (credit > 0) {
      transactions.push({ date, description, amount: credit, type: 'credit' });
    }
  }
  return transactions;
}
