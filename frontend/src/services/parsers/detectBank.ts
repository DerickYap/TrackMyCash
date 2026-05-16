import * as XLSX from 'xlsx';
import { BankSource, DetectionResult } from '../../types/expense';
import { extractFirstPageText } from './pdfUtils';

export async function detectBank(file: File): Promise<DetectionResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') {
    return { type: 'image' };
  }

  if (ext === 'pdf') {
    try {
      const text = await extractFirstPageText(file);
      const source = detectFromPdfText(text);
      return source ? { type: 'bank', source } : { type: 'generic-pdf' };
    } catch {
      return { type: 'generic-pdf' };
    }
  }

  if (ext === 'xls' || ext === 'xlsx') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(sheet).toLowerCase();
    // Match both UOB bank account (withdrawal column) and UOB credit card (bank name in header)
    return csv.includes('withdrawal') || csv.includes('united overseas bank')
      ? { type: 'bank', source: 'UOB' }
      : { type: 'unknown' };
  }

  if (ext === 'csv') {
    const source = detectFromCSVText(await file.text());
    return source ? { type: 'bank', source } : { type: 'unknown' };
  }

  return { type: 'unknown' };
}

function detectFromPdfText(text: string): BankSource | null {
  const lower = text.toLowerCase();

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

  if (sample.includes('post date')) return 'Chase';
  if (sample.includes('transaction date')) return 'DBS';
  if (sample.includes('withdrawal')) return 'UOB';
  if (sample.includes('bank of america') || sample.includes('running bal')) return 'BofA';
  if (sample.includes('american express') || sample.includes('amex')) return 'Amex';

  return null;
}
