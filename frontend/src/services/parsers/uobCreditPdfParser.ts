import { extractLines } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};

const MON_PAT = Object.keys(MONTH_MAP).join('|');
const DATE_RE = new RegExp(`^(\\d{1,2})\\s+(${MON_PAT})$`, 'i');
// Matches: DD MMM  DD MMM  description  amount [CR]
const TX_RE = new RegExp(
  `^(\\d{1,2}\\s+(?:${MON_PAT}))\\s+(\\d{1,2}\\s+(?:${MON_PAT}))\\s+(.+?)\\s+([\\d,]+\\.\\d{2})\\s*(CR)?\\s*$`,
  'i',
);

const SKIP_PREFIXES = [
  'previous balance', 'sub total', 'total balance', 'ref no',
  'end of transaction', 'statement date', 'page ',
  'payment received', 'payment - thank you', 'autopay', 'auto pay',
  'minimum payment', 'new balance', 'credit limit',
];

function inferYear(lines: string[]): number {
  // Look for "Statement Date DD MMM YYYY"
  for (const line of lines) {
    const m = line.match(/statement\s+date\s+\d{1,2}\s+[A-Z]{3}\s+(\d{4})/i);
    if (m) return parseInt(m[1]);
  }
  return new Date().getFullYear();
}

function toIsoDate(dayMon: string, year: number): string {
  const [d, mon] = dayMon.trim().split(/\s+/);
  const month = MONTH_MAP[mon.toUpperCase()];
  // If transaction month is numerically after statement month, it belongs to prior year
  // (e.g. Jan statement with Dec transactions)
  return `${year}-${month}-${d.padStart(2, '0')}`;
}

function adjustYear(postDate: string, stmtYear: number, stmtMonth: number): number {
  const txMonth = parseInt(postDate.split('-')[1]);
  // If tx month is more than 6 months ahead of statement month, it's prior year
  return txMonth > stmtMonth + 1 ? stmtYear - 1 : stmtYear;
}

export async function parseUOBCreditPdf(file: File): Promise<RawTransaction[]> {
  const lines = await extractLines(file);
  const year = inferYear(lines);
  const stmtMonth = (() => {
    for (const line of lines) {
      const m = line.match(/statement\s+date\s+\d{1,2}\s+([A-Z]{3})\s+\d{4}/i);
      if (m) return parseInt(MONTH_MAP[m[1].toUpperCase()] ?? '1');
    }
    return new Date().getMonth() + 1;
  })();

  const transactions: RawTransaction[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_PREFIXES.some(p => lower.startsWith(p))) continue;

    // Check if it looks like a transaction: starts with DD MMM
    const firstTokens = line.split(/\s+/);
    if (firstTokens.length < 2) continue;
    if (!DATE_RE.test(`${firstTokens[0]} ${firstTokens[1]}`)) continue;

    const m = TX_RE.exec(line);
    if (!m) continue;

    const [, postDateRaw, , description, amountRaw, crFlag] = m;
    const isoBase = toIsoDate(postDateRaw, year);
    const txYear = adjustYear(isoBase, year, stmtMonth);
    const date = toIsoDate(postDateRaw, txYear);

    const amount = parseFloat(amountRaw.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    const isCredit = !!crFlag;
    const desc = description.trim();
    if (!desc) continue;

    transactions.push({ date, description: desc, amount, type: isCredit ? 'credit' : 'debit' });
  }

  return transactions;
}
