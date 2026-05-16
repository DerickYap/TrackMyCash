import { RawTransaction } from '../../types/expense';
import { extractLines } from './pdfUtils';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function extractAmount(lines: string[]): number {
  // Priority: lines containing total keywords
  const priorityLines = lines.filter(l => /\b(total|amount due|grand total|subtotal)\b/i.test(l));
  const searchLines = priorityLines.length > 0 ? priorityLines : lines;

  let best = 0;
  for (const line of searchLines) {
    const matches = line.match(/\b(\d{1,6}\.\d{2})\b/g) ?? [];
    for (const m of matches) {
      const val = parseFloat(m);
      if (val > best && val < 100_000) best = val;
    }
  }
  return best;
}

function extractDate(lines: string[]): string {
  const today = new Date().toISOString().slice(0, 10);

  for (const line of lines) {
    // DD MMM YYYY
    const dmy = line.match(/\b(\d{1,2})\s+([A-Za-z]{3})\s+(20\d{2})\b/);
    if (dmy) {
      const m = MONTH_MAP[dmy[2].toLowerCase()];
      if (m) return `${dmy[3]}-${m}-${dmy[1].padStart(2, '0')}`;
    }

    // DD/MM/YYYY (default for SG)
    const ddmm = line.match(/\b(\d{2})\/(\d{2})\/(20\d{2})\b/);
    if (ddmm) return `${ddmm[3]}-${ddmm[2]}-${ddmm[1]}`;

    // YYYY-MM-DD
    const iso = line.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  return today;
}

function extractMerchant(lines: string[]): string {
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 3 && !/^\d+$/.test(trimmed)) return trimmed;
  }
  return 'Receipt';
}

export async function parseGenericPdf(file: File): Promise<RawTransaction> {
  try {
    const lines = await extractLines(file);
    const amount = extractAmount(lines);
    const date = extractDate(lines);
    const description = extractMerchant(lines);
    return { date, description, amount, type: 'debit' };
  } catch {
    return {
      date: new Date().toISOString().slice(0, 10),
      description: 'Receipt',
      amount: 0,
      type: 'debit',
    };
  }
}
