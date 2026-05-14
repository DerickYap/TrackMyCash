import { extractRows, TextRow } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const SKIP_LINES = [
  'balance b/f', 'balance c/f', 'balance brought', 'balance carried',
  'previous balance', 'sub total', 'total', 'min. payment', 'minimum payment',
  'new balance', 'credit limit',
  'payment received', 'payment - thank you', 'autopay', 'auto pay',
];

// DD Mon [YY|YYYY] → YYYY-MM-DD, returns null if unrecognised
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

// Matches "15 Jan 2026" or "Jan 2026" — captures month abbrev and year
const DMY_RE = /\b\d{1,2}\s+([A-Za-z]{3})\s+(20\d{2})\b/;
const MY_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b.{0,15}?\b(20\d{2})\b/i;

// Returns statement closing month (1-12) and year.
function inferStatementEnd(lines: string[]): { year: number; month: number } {
  const now = new Date();
  // Walk lines in reverse so we hit the closing/statement date before earlier dates
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const m1 = DMY_RE.exec(line);
    if (m1) {
      const mon = MONTH_MAP[m1[1].toLowerCase()];
      if (mon) return { year: parseInt(m1[2]), month: parseInt(mon) };
    }
    const m2 = MY_RE.exec(line);
    if (m2) {
      const mon = MONTH_MAP[m2[1].toLowerCase()];
      if (mon) return { year: parseInt(m2[2]), month: parseInt(mon) };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function assignYear(txMonth: number, endYear: number, endMonth: number): number {
  return txMonth > endMonth + 1 ? endYear - 1 : endYear;
}

// ── Bank account mode ──────────────────────────────────────────────────────
// Rows have: Date  Description  [Withdrawal]  [Deposit]  Balance
// Use x-coordinates of column headers to classify each amount.

interface ColumnPositions {
  withdrawalX: number;
  depositX: number;
}

function findBankAccountColumns(rows: TextRow[]): ColumnPositions | null {
  for (const row of rows) {
    const lower = row.joined.toLowerCase();
    if (!lower.includes('withdrawal') && !lower.includes('debit')) continue;
    let withdrawalX = -1;
    let depositX = -1;
    for (const item of row.items) {
      const t = item.text.toLowerCase();
      if (t.includes('withdrawal') || t.includes('debit')) withdrawalX = item.x;
      if (t.includes('deposit') || t.includes('credit')) depositX = item.x;
    }
    if (withdrawalX > 0 && depositX > 0) return { withdrawalX, depositX };
  }
  return null;
}

function parseBankAccountRows(rows: TextRow[], year: number): RawTransaction[] {
  const cols = findBankAccountColumns(rows);
  const transactions: RawTransaction[] = [];
  // Tolerance: amount belongs to a column if within 60px of its header x
  const COL_TOL = 60;

  for (const row of rows) {
    const lower = row.joined.toLowerCase();
    if (SKIP_LINES.some(s => lower.includes(s))) continue;

    // Date: first two tokens must form DD Mon
    const tokens = row.items;
    if (tokens.length < 3) continue;
    const datePart = `${tokens[0].text} ${tokens[1].text}`;
    const date = parseDDMon(datePart, year);
    if (!date) continue;

    // Gather all numeric items (currency-formatted)
    const numItems = tokens.filter(item => /^[\d,]+\.\d{2}$/.test(item.text));
    if (numItems.length === 0) continue;

    // Description: non-numeric tokens between date and first amount
    const firstNumIdx = tokens.findIndex(item => /^[\d,]+\.\d{2}$/.test(item.text));
    const description = tokens
      .slice(2, firstNumIdx < 0 ? undefined : firstNumIdx)
      .map(i => i.text)
      .join(' ')
      .trim();
    if (!description) continue;

    if (cols) {
      // Column-aware: classify each amount by x-position
      for (const item of numItems) {
        const val = parseFloat(item.text.replace(/,/g, ''));
        if (isNaN(val) || val <= 0) continue;
        const distW = Math.abs(item.x - cols.withdrawalX);
        const distD = Math.abs(item.x - cols.depositX);
        // Skip if equally far (likely balance column)
        if (distW < COL_TOL && distW < distD) {
          transactions.push({ date, description, amount: val, type: 'debit' });
          break;
        }
        if (distD < COL_TOL && distD < distW) {
          transactions.push({ date, description, amount: val, type: 'credit' });
          break;
        }
      }
    } else {
      // Fallback: use balance tracking (last number = balance, second-to-last = amount)
      if (numItems.length < 2) continue;
      const txAmt = parseFloat(numItems[numItems.length - 2].text.replace(/,/g, ''));
      const balance = parseFloat(numItems[numItems.length - 1].text.replace(/,/g, ''));
      if (isNaN(txAmt) || isNaN(balance) || txAmt <= 0) continue;
      // Can't determine direction without prev balance in fallback — skip ambiguous rows
      transactions.push({ date, description, amount: txAmt, type: 'debit' });
    }
  }

  return transactions;
}

// ── Credit card mode ───────────────────────────────────────────────────────
// Rows: [TX Date] [Post Date] Description  Amount [CR]
// TX Date is always DD Mon [YY], amount at end, CR suffix = credit.

const CC_TX_RE = new RegExp(
  `^(\\d{1,2}\\s+[A-Za-z]{3}(?:\\s+\\d{2,4})?)` + // tx date
  `(?:\\s+\\d{1,2}\\s+[A-Za-z]{3}(?:\\s+\\d{2,4})?)?` + // optional post date
  `\\s+(.+?)` + // description
  `\\s+([\\d,]+\\.\\d{2})` + // amount
  `\\s*(CR)?\\s*$`, // optional CR
  'i',
);

function parseCreditCardLines(
  lines: string[],
  endYear: number,
  endMonth: number,
): RawTransaction[] {
  const transactions: RawTransaction[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (SKIP_LINES.some(s => lower.startsWith(s))) continue;

    const m = CC_TX_RE.exec(line);
    if (!m) continue;

    const [, txDateRaw, description, amountRaw, crFlag] = m;
    // Extract month from the date token to assign correct year
    const monMatch = txDateRaw.trim().match(/^\d{1,2}\s+([A-Za-z]{3})/);
    const txMonthStr = monMatch ? MONTH_MAP[monMatch[1].toLowerCase()] : null;
    const txYear = txMonthStr ? assignYear(parseInt(txMonthStr), endYear, endMonth) : endYear;

    const date = parseDDMon(txDateRaw.trim(), txYear);
    if (!date) continue;

    const amount = parseFloat(amountRaw.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) continue;

    const desc = description.trim();
    if (!desc || desc.length < 2) continue;

    transactions.push({
      date,
      description: desc,
      amount,
      type: crFlag ? 'credit' : 'debit',
    });
  }

  return transactions;
}

// ── Entry point ────────────────────────────────────────────────────────────

export async function parseDBSPdf(file: File): Promise<RawTransaction[]> {
  const rows = await extractRows(file);
  const lines = rows.map(r => r.joined);
  const { year: endYear, month: endMonth } = inferStatementEnd(lines);

  // Bank account statements mention "Withdrawal" or "Balance B/F" near the top
  const sample = lines.slice(0, 40).join('\n').toLowerCase();
  if (sample.includes('withdrawal') || sample.includes('balance b/f') || sample.includes('balance brought')) {
    return parseBankAccountRows(rows, endYear);
  }
  return parseCreditCardLines(lines, endYear, endMonth);
}
