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

const FULL_MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01', feb: '02', february: '02',
  mar: '03', march: '03', apr: '04', april: '04',
  may: '05', jun: '06', june: '06',
  jul: '07', july: '07', aug: '08', august: '08',
  sep: '09', september: '09', oct: '10', october: '10',
  nov: '11', november: '11', dec: '12', december: '12',
};

function parseCCDate(raw: string): string | null {
  // "16 may 2026" or "16 May 2026"
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const mon = FULL_MONTH_MAP[m[2].toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

function cleanDescription(raw: string): string {
  // Strip trailing merchant location like "   singapore   sg"
  return raw.replace(/\s{2,}[a-z\s]+\s+sg\s*$/i, '').replace(/\s+/g, ' ').trim();
}

// UOB credit card XLS format:
// Columns: transaction date | posting date | description | foreign currency type |
//          transaction amount(foreign) | local currency type | transaction amount(local)
function parseUOBCreditCardXLS(rows: string[][]): RawTransaction[] {
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some(c => c.trim().toLowerCase() === 'transaction date')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];

  const headers = rows[headerIdx].map(h => h.trim().toLowerCase());
  const dateCol = headers.findIndex(h => h === 'transaction date');
  const descCol = headers.findIndex(h => h === 'description');
  const amountCol = headers.findIndex(h => h === 'transaction amount(local)');
  if (dateCol === -1 || amountCol === -1) return [];

  const transactions: RawTransaction[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = (row[dateCol] ?? '').trim();
    const rawDesc = descCol >= 0 ? (row[descCol] ?? '').trim() : '';

    if (!rawDate || !rawDesc) continue;
    if (SKIP_DESCRIPTIONS.some(s => rawDesc.toLowerCase().includes(s))) continue;

    const date = parseCCDate(rawDate);
    if (!date) continue;

    const amount = parseFloat((row[amountCol] ?? '').replace(/,/g, '')) || 0;
    if (amount <= 0) continue;

    const description = cleanDescription(rawDesc);
    transactions.push({ date, description, amount, type: 'debit' });
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
    // Route to the correct sub-parser based on which header format is present
    const isCreditCard = rows.some(r => r.some(c => c.trim().toLowerCase() === 'transaction date'));
    return isCreditCard ? parseUOBCreditCardXLS(rows) : parseRows(rows);
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
