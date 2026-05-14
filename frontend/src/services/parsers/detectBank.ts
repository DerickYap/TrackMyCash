import * as XLSX from 'xlsx';
import { BankSource } from '../../types/expense';
import { extractFirstPageText } from './pdfUtils';

export async function detectBank(file: File): Promise<BankSource | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'pdf') {
    try {
      const text = await extractFirstPageText(file);
      return detectFromPdfText(text);
    } catch {
      return null;
    }
  }

  if (ext === 'xls' || ext === 'xlsx') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    // UOB XLS has withdrawal/deposit columns; everything else is BofA
    return detectFromCSVText(csv) === 'UOB' ? 'UOB' : 'BofA';
  }

  if (ext === 'csv') {
    return detectFromCSVText(await file.text());
  }

  return null;
}

function detectFromPdfText(text: string): BankSource | null {
  const lower = text.toLowerCase();

  // JPMorgan Chase — use distinctive brand terms to avoid false positives on "chase"
  if (
    lower.includes('jpmorgan chase') ||
    lower.includes('chase freedom') ||
    lower.includes('chase sapphire') ||
    lower.includes('chase flex') ||
    lower.includes('chase amazon') ||
    lower.includes('chase southwest') ||
    lower.includes('chase united') ||
    lower.includes('chase ink') ||
    lower.includes('account activity') && lower.includes('chase')
  ) return 'Chase';

  if (lower.includes('bank of america')) return 'BofA';
  if (lower.includes('american express')) return 'Amex';

  // DBS — check for bank name or common product names
  if (
    lower.includes('dbs bank') ||
    lower.includes('development bank of singapore') ||
    lower.includes('posb') ||
    lower.includes('dbs multiplier') ||
    lower.includes('dbs altitude') ||
    lower.includes('dbs live fresh') ||
    lower.includes('dbs cashback') ||
    lower.includes('dbs treasures')
  ) return 'DBS';

  // UOB — check for bank name or common product names
  if (
    lower.includes('united overseas bank') ||
    lower.includes('uob one') ||
    lower.includes('uob visa') ||
    lower.includes('uob mastercard') ||
    lower.includes('uob absolute') ||
    lower.includes('uob lady') ||
    lower.includes('uob preferred') ||
    lower.includes('uob') && lower.includes('statement of account')
  ) return 'UOB';

  return null;
}

function detectFromCSVText(text: string): BankSource | null {
  const sample = text.split('\n').slice(0, 10).join('\n').toLowerCase();

  // Chase: uniquely has "post date" alongside "transaction date"
  if (sample.includes('post date')) return 'Chase';

  // DBS: has "transaction date" (but not "post date" — already ruled out above)
  if (sample.includes('transaction date')) return 'DBS';

  // UOB: withdrawal/deposit column headers
  if (sample.includes('withdrawal')) return 'UOB';

  // BofA: bank name in file header or "running bal" column
  if (sample.includes('bank of america') || sample.includes('running bal')) return 'BofA';

  // Amex: bank name in file header
  if (sample.includes('american express') || sample.includes('amex')) return 'Amex';

  return null;
}
