import { extractLines } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const SKIP_LINES = [
  'payment received', 'autopay', 'auto pay', 'minimum payment',
  'new balance', 'previous balance', 'credit limit', 'available credit',
];

// Matches "Jan 2026", "January 2026", "15 Jan 2026" etc.
const MY_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b.{0,15}?\b(20\d{2})\b/gi;

// Returns statement closing month (1-12) and year.
function inferStatementEnd(lines: string[]): { year: number; month: number } {
  const now = new Date();
  for (const line of lines) {
    // Explicit MM/DD/YYYY — pick the last occurrence (closing date)
    const slashMatches = [...line.matchAll(/\b(\d{1,2})\/\d{1,2}\/(20\d{2})\b/g)];
    if (slashMatches.length > 0) {
      const last = slashMatches[slashMatches.length - 1];
      return { year: parseInt(last[2]), month: parseInt(last[1]) };
    }
    // Month name + year — last match on line is the closing date
    const allMY = [...line.matchAll(MY_RE)];
    if (allMY.length > 0) {
      const last = allMY[allMY.length - 1];
      const mon = MONTH_MAP[last[1].toLowerCase()];
      if (mon) return { year: parseInt(last[2]), month: parseInt(mon) };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function assignYear(txMonth: number, endYear: number, endMonth: number): number {
  return txMonth > endMonth + 1 ? endYear - 1 : endYear;
}

// DD Mon [YY|YYYY] → YYYY-MM-DD
function parseDDMon(raw: string, fallbackYear: number): string | null {
  const m = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{2,4}))?$/);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (!month) return null;
  let year = fallbackYear;
  if (m[3]) {
    const y = parseInt(m[3]);
    year = y < 100 ? 2000 + y : y;
  }
  return `${year}-${month}-${m[1].padStart(2, '0')}`;
}

// MM/DD/YY or MM/DD/YYYY → YYYY-MM-DD
function parseMDY(raw: string): string | null {
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return null;
  const y = parseInt(m[3]);
  return `${y < 100 ? 2000 + y : y}-${m[1]}-${m[2]}`;
}

export async function parseAmexPdf(file: File): Promise<RawTransaction[]> {
  const lines = await extractLines(file);
  const { year: endYear, month: endMonth } = inferStatementEnd(lines);
  const transactions: RawTransaction[] = [];

  // Two patterns:
  // SGD: "15 Jan [26]  [REF]  Description  45.67[-]"   (trailing - = credit/payment)
  // USD: "01/15/26  Description  $45.67"  (negative = credit)

  // SGD format: DD Mon [YY]  optRef  description  amount[-]
  const SGD_RE = /^(\d{1,2}\s+[A-Za-z]{3}(?:\s+\d{2,4})?)\s+(?:[A-Z0-9]{6,}\s+)?(.+?)\s+([\d,]+\.\d{2})(-?)\s*$/;
  // USD format: MM/DD/YY  description  $?-?amount
  const USD_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+(.+?)\s+\$?(-?[\d,]+\.\d{2})\s*$/;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_LINES.some(s => lower.includes(s))) continue;

    // Try USD format first (has explicit year — no bridge needed)
    const usdMatch = USD_RE.exec(line);
    if (usdMatch) {
      const date = parseMDY(usdMatch[1]);
      if (date) {
        const amount = parseFloat(usdMatch[3].replace(/,/g, ''));
        if (!isNaN(amount) && amount !== 0) {
          const description = usdMatch[2].trim();
          if (description.length >= 2) {
            transactions.push({ date, description, amount: Math.abs(amount), type: amount < 0 ? 'credit' : 'debit' });
          }
        }
        continue;
      }
    }

    // Try SGD format — assign year based on statement closing month
    const sgdMatch = SGD_RE.exec(line);
    if (sgdMatch) {
      const txDateRaw = sgdMatch[1].trim();
      const monMatch = txDateRaw.match(/^\d{1,2}\s+([A-Za-z]{3})/);
      const txMonStr = monMatch ? MONTH_MAP[monMatch[1].toLowerCase()] : null;
      const txYear = txMonStr ? assignYear(parseInt(txMonStr), endYear, endMonth) : endYear;

      const date = parseDDMon(txDateRaw, txYear);
      if (date) {
        const amount = parseFloat(sgdMatch[3].replace(/,/g, ''));
        const trailingMinus = sgdMatch[4] === '-';
        if (!isNaN(amount) && amount > 0) {
          const description = sgdMatch[2].trim();
          if (description.length >= 2) {
            transactions.push({ date, description, amount, type: trailingMinus ? 'credit' : 'debit' });
          }
        }
      }
    }
  }

  return transactions;
}
