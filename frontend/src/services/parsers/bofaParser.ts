import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { RawTransaction } from '../../types/expense';

function parseFromCsv(csvText: string): RawTransaction[] {
  const result = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  const transactions: RawTransaction[] = [];

  for (const row of result.data) {
    const date = row['Date'] || '';
    const description = (row['Description'] || '').trim();
    const rawAmount = parseFloat(row['Amount'] || '0');
    if (!date || !description || isNaN(rawAmount)) continue;

    // BofA: negative = debit, positive = credit
    transactions.push({
      date,
      description,
      amount: Math.abs(rawAmount),
      type: rawAmount < 0 ? 'debit' : 'credit',
    });
  }
  return transactions;
}

export async function parseBofA(file: File): Promise<RawTransaction[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseFromCsv(text);
  }

  // XLS / XLSX path
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return parseFromCsv(csv);
}
