import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { RawTransaction } from '../../types/expense';
import { parseUOBCreditPdf } from './uobCreditPdfParser';
import { parseUOBBankPdf } from './uobBankPdfParser';
import { extractFirstPageText } from './pdfUtils';

const SKIP_DESCRIPTIONS = ['balance b/f', 'balance c/f'];

function inferYear(filename: string): number | null {
  const match = filename.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1]) : null;
}

function parseDate(raw: string, confirmedYear?: number): string | null {
  // DD/MM/YYYY
  const full = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (full) return `${full[3]}-${full[2].padStart(2, '0')}-${full[1].padStart(2, '0')}`;

  // DD MMM YYYY
  const long = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (long) {
    const months: Record<string, string> = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const m = months[long[2]];
    if (m) return `${long[3]}-${m}-${long[1].padStart(2, '0')}`;
  }

  // DD/MM (CSV — needs year)
  const short = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (short && confirmedYear) {
    return `${confirmedYear}-${short[2].padStart(2, '0')}-${short[1].padStart(2, '0')}`;
  }

  return null;
}

function parseRows(rows: string[][], confirmedYear?: number): RawTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(cell => cell.trim().toLowerCase() === 'date')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map(h => h.trim().toLowerCase());
  const dateCol = headers.findIndex(h => h === 'date');
  const descCol = headers.findIndex(h =>
    h.includes('description') || h.includes('particulars') || h.includes('ref') || h.includes('transaction'),
  );
  const debitCol = headers.findIndex(h => h.includes('withdrawal') || h.includes('debit'));
  const creditCol = headers.findIndex(h => h.includes('deposit') || h.includes('credit'));
  if (dateCol === -1) return [];

  const transactions: RawTransaction[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = (row[dateCol] ?? '').trim();
    const description = (row[descCol] ?? '').trim();
    if (!rawDate || !description) continue;
    if (SKIP_DESCRIPTIONS.some(s => description.toLowerCase().includes(s))) continue;

    const date = parseDate(rawDate, confirmedYear);
    if (!date) continue;

    const debit = debitCol >= 0 ? parseFloat((row[debitCol] ?? '').replace(/,/g, '')) || 0 : 0;
    const credit = creditCol >= 0 ? parseFloat((row[creditCol] ?? '').replace(/,/g, '')) || 0 : 0;

    if (debit > 0) transactions.push({ date, description, amount: debit, type: 'debit' });
    else if (credit > 0) transactions.push({ date, description, amount: credit, type: 'credit' });
  }
  return transactions;
}

export async function parseUOB(
  file: File,
  confirmedYear?: number,
): Promise<RawTransaction[] | { needsYearConfirmation: true }> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    const firstPage = await extractFirstPageText(file);
    const lower = firstPage.toLowerCase();
    // UOB bank account page 1 says "Statement of Account";
    // credit card PDFs say "Credit Card" or similar — never "Statement of Account"
    if (lower.includes('statement of account') || lower.includes('withdrawals') || lower.includes('balance b/f')) {
      return parseUOBBankPdf(file);
    }
    return parseUOBCreditPdf(file);
  }

  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'DD/MM/YYYY' }) as string[][];
    return parseRows(rows);
  }

  // CSV fallback
  const text = await file.text();
  const year = confirmedYear ?? inferYear(file.name);
  if (year === null) return { needsYearConfirmation: true };

  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const withHeader: string[][] = [
    result.meta.fields ?? [],
    ...result.data.map(row => (result.meta.fields ?? []).map(f => row[f] ?? '')),
  ];
  return parseRows(withHeader, year);
}
