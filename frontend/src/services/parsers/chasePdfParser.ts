import { extractLines } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Returns the statement closing month (1-12) and year.
// A billing cycle of "Dec 1 - Jan 7" has endMonth=1, endYear=2026.
function inferStatementEnd(lines: string[]): { year: number; month: number } {
  const now = new Date();
  for (const line of lines) {
    const lower = line.toLowerCase();
    // "Closing Date 12/01/25 - 01/07/26" — pick the LAST MM/DD/YY on the line
    const slashMatches = [...lower.matchAll(/(\d{2})\/\d{2}\/(\d{2,4})/g)];
    if (slashMatches.length > 0 && lower.match(/closing|statement|period|opening/)) {
      const last = slashMatches[slashMatches.length - 1];
      const y = parseInt(last[2]);
      return { year: y < 100 ? 2000 + y : y, month: parseInt(last[1]) };
    }
    // "January 31, 2026" — last month name + year on the line
    for (let i = MONTH_NAMES.length - 1; i >= 0; i--) {
      if (lower.includes(MONTH_NAMES[i])) {
        const m = line.match(/(20\d{2})/);
        if (m) return { year: parseInt(m[1]), month: i + 1 };
      }
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// If a transaction month is much later in the year than the closing month,
// it belongs to the prior year (e.g. Dec tx on a Jan-closing statement).
function assignYear(txMonth: number, endYear: number, endMonth: number): number {
  return txMonth > endMonth + 1 ? endYear - 1 : endYear;
}

const SKIP_LINES = ['payment thank you', 'automatic payment', 'minimum payment due', 'account total'];

// MM/DD at start, description, optional $ sign, optional negative, amount at end
const TX_RE = /^(\d{2})\/(\d{2})\s+(.+?)\s+\$?(-?[\d,]+\.\d{2})\s*$/;

export async function parseChasePdf(file: File): Promise<RawTransaction[]> {
  const lines = await extractLines(file);
  const { year: endYear, month: endMonth } = inferStatementEnd(lines);
  const transactions: RawTransaction[] = [];

  for (const line of lines) {
    const m = TX_RE.exec(line);
    if (!m) continue;

    const [, mm, dd, descRaw, amountRaw] = m;
    const amount = parseFloat(amountRaw.replace(/,/g, ''));
    if (isNaN(amount) || amount === 0) continue;

    const description = descRaw.replace(/\$/g, '').trim();
    if (!description || description.length < 2) continue;
    if (SKIP_LINES.some(s => description.toLowerCase().includes(s))) continue;

    const year = assignYear(parseInt(mm), endYear, endMonth);

    // Chase: negative amount = payment/credit, positive = purchase/debit
    transactions.push({
      date: `${year}-${mm}-${dd}`,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? 'credit' : 'debit',
    });
  }

  return transactions;
}
