import { extractRows, TextRow } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const SKIP_LINES = [
  'beginning balance', 'ending balance', 'total deposits', 'total withdrawals',
  'service fee', 'interest paid', 'minimum payment', 'new balance', 'previous balance',
  'account number', 'customer since',
];

// MM/DD/YY or MM/DD/YYYY → YYYY-MM-DD
function parseMDY(raw: string, fallbackYear: number): string | null {
  const full = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (full) {
    const y = parseInt(full[3]);
    return `${y < 100 ? 2000 + y : y}-${full[1].padStart(2, '0')}-${full[2].padStart(2, '0')}`;
  }
  // MM/DD without year
  const short = raw.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (short) {
    return `${fallbackYear}-${short[1].padStart(2, '0')}-${short[2].padStart(2, '0')}`;
  }
  return null;
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
// Month name followed (within ~20 chars) by a 4-digit year — last match wins (closing date)
const MONTH_YEAR_RE = /(?:january|february|march|april|may|june|july|august|september|october|november|december)\b.{0,20}?\b(20\d{2})\b/gi;

// Returns the statement closing month (1-12) and year so we can bridge two-month cycles.
function inferStatementEnd(lines: string[]): { year: number; month: number } {
  const now = new Date();
  for (const line of lines) {
    // "MM/DD/YYYY" - last slash-date on line is the closing date
    const slashMatches = [...line.matchAll(/\b(\d{1,2})\/\d{1,2}\/(20\d{2})\b/g)];
    if (slashMatches.length > 0) {
      const last = slashMatches[slashMatches.length - 1];
      return { year: parseInt(last[2]), month: parseInt(last[1]) };
    }
    // "November 8 - December 7, 2025" — last month name + year on the line
    const allDated = [...line.matchAll(MONTH_YEAR_RE)];
    if (allDated.length > 0) {
      const lastMatch = allDated[allDated.length - 1];
      const idx = MONTH_NAMES.findIndex(n => lastMatch[0].toLowerCase().startsWith(n));
      if (idx >= 0) return { year: parseInt(lastMatch[1]), month: idx + 1 };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function assignYear(txMonth: number, endYear: number, endMonth: number): number {
  return txMonth > endMonth + 1 ? endYear - 1 : endYear;
}

// ── Bank account mode ──────────────────────────────────────────────────────
// BofA checking/savings: MM/DD/YY  Description  Deposits/Credits  Withdrawals/Debits  Balance
// Use x-coordinates of column headers.

interface ColumnPositions {
  depositsX: number;
  withdrawalsX: number;
}

function findBankAccountColumns(rows: TextRow[]): ColumnPositions | null {
  for (const row of rows) {
    const lower = row.joined.toLowerCase();
    if (!lower.includes('deposits') && !lower.includes('withdrawals')) continue;
    let depositsX = -1;
    let withdrawalsX = -1;
    for (const item of row.items) {
      const t = item.text.toLowerCase();
      if (t.includes('deposit') || t.includes('credit')) depositsX = item.x;
      if (t.includes('withdrawal') || t.includes('debit')) withdrawalsX = item.x;
    }
    if (depositsX > 0 && withdrawalsX > 0) return { depositsX, withdrawalsX };
  }
  return null;
}

function parseBankAccountRows(rows: TextRow[], year: number): RawTransaction[] {
  const cols = findBankAccountColumns(rows);
  const transactions: RawTransaction[] = [];
  const COL_TOL = 60;

  for (const row of rows) {
    const lower = row.joined.toLowerCase();
    if (SKIP_LINES.some(s => lower.includes(s))) continue;

    const firstToken = row.items[0]?.text ?? '';
    const date = parseMDY(firstToken, year);
    if (!date) continue;

    // Currency amounts in this row
    const numItems = row.items.filter(item => /^[\d,]+\.\d{2}$/.test(item.text));
    if (numItems.length === 0) continue;

    const description = row.items
      .slice(1)
      .filter(item => !/^[\d,]+\.\d{2}$/.test(item.text))
      .map(i => i.text)
      .join(' ')
      .trim();
    if (!description) continue;

    if (cols) {
      for (const item of numItems) {
        const val = parseFloat(item.text.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) continue;
        const distD = Math.abs(item.x - cols.depositsX);
        const distW = Math.abs(item.x - cols.withdrawalsX);
        if (distD < COL_TOL && distD < distW) {
          transactions.push({ date, description, amount: val, type: 'credit' });
          break;
        }
        if (distW < COL_TOL && distW < distD) {
          transactions.push({ date, description, amount: val, type: 'debit' });
          break;
        }
      }
    } else {
      // Fallback: use sign of amount if available, otherwise second-to-last number
      const lastNum = numItems[numItems.length - 1];
      const txItem = numItems.length >= 2 ? numItems[numItems.length - 2] : lastNum;
      const val = parseFloat(txItem.text.replace(/,/g, ''));
      if (!isNaN(val) && val > 0) {
        transactions.push({ date, description, amount: val, type: 'debit' });
      }
    }
  }

  return transactions;
}

// ── Credit card mode ───────────────────────────────────────────────────────
// BofA CC row layout (from PDF): TX_DATE POST_DATE DESCRIPTION REF ACCT AMOUNT
// Example: "11/11 11/12 OPENAI *CHATGPT SUBSCR OPENAI.COM CA 0491 9534 22.07"
// Negative amount = payment/credit

const CC_TX_RE = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(?:\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+)?(.+?)\s+(-?[\d,]+\.\d{2})\s*$/;

// BofA appends "RRRR AAAA" (4-digit ref + 4-digit account suffix) before the amount
const BOFA_SUFFIX_RE = /\s+\d{4}\s+\d{4}$/;

function parseCreditCardLines(
  lines: string[],
  endYear: number,
  endMonth: number,
): RawTransaction[] {
  const transactions: RawTransaction[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_LINES.some(s => lower.includes(s))) continue;

    const m = CC_TX_RE.exec(line);
    if (!m) continue;

    // For dates without an explicit year, assign based on statement closing month
    const txMonth = parseInt(m[1].split('/')[0]);
    const txYear = assignYear(txMonth, endYear, endMonth);
    const date = parseMDY(m[1], txYear);
    if (!date) continue;

    const amount = parseFloat(m[3].replace(/,/g, ''));
    if (isNaN(amount) || amount === 0) continue;

    // Strip trailing "RRRR AAAA" reference/account suffix from description
    const description = m[2].replace(BOFA_SUFFIX_RE, '').trim();
    if (!description || description.length < 2) continue;

    // BofA credit card: negative = payment/credit, positive = purchase/debit
    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? 'credit' : 'debit',
    });
  }

  return transactions;
}

// ── Entry point ────────────────────────────────────────────────────────────

export async function parseBofAPdf(file: File): Promise<RawTransaction[]> {
  const rows = await extractRows(file);
  const lines = rows.map(r => r.joined);
  const { year: endYear, month: endMonth } = inferStatementEnd(lines);

  const sample = lines.slice(0, 40).join('\n').toLowerCase();
  if (sample.includes('deposits') && sample.includes('withdrawals')) {
    return parseBankAccountRows(rows, endYear);
  }
  return parseCreditCardLines(lines, endYear, endMonth);
}
