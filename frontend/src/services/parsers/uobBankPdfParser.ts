import { extractRows, TextRow } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const SKIP_LINES = ['balance b/f', 'balance c/f', 'total'];

// "DD Mon" with no year (e.g. "01 Apr")
const DATE_RE = /^\d{1,2}\s+[A-Za-z]{3}$/;

function parseDDMon(raw: string, year: number): string | null {
  const m = raw.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})$/);
  if (!m) return null;
  const month = MONTH_MAP[m[2].toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${m[1].padStart(2, '0')}`;
}

function inferYear(lines: string[]): number {
  for (const line of lines) {
    // "Period: 01 Apr 2026 to 30 Apr 2026"
    const m = line.match(/\bperiod[:\s].*?\b(20\d{2})\b/i);
    if (m) return parseInt(m[1]);
    // "as at DD Mon YYYY" or "DD Mon YYYY"
    const dm = line.match(/\b\d{1,2}\s+[A-Za-z]{3}\s+(20\d{2})\b/);
    if (dm) return parseInt(dm[1]);
  }
  return new Date().getFullYear();
}

function findColumns(rows: TextRow[]): { withdrawalX: number; depositX: number } | null {
  for (const row of rows) {
    const lower = row.joined.toLowerCase();
    if (!lower.includes('withdrawal') || !lower.includes('deposit')) continue;
    let withdrawalX = -1;
    let depositX = -1;
    for (const item of row.items) {
      const t = item.text.toLowerCase();
      if (t.includes('withdrawal')) withdrawalX = item.x;
      if (t.includes('deposit')) depositX = item.x;
    }
    if (withdrawalX > 0 && depositX > 0) return { withdrawalX, depositX };
  }
  return null;
}

// Pure-digit strings longer than 7 chars are account/card numbers — exclude from descriptions
const ACCOUNT_NUM_RE = /^\d{8,}$/;

export async function parseUOBBankPdf(file: File): Promise<RawTransaction[]> {
  const rows = await extractRows(file);
  const lines = rows.map(r => r.joined);
  const year = inferYear(lines);
  const cols = findColumns(rows);
  const COL_TOL = 60;

  const transactions: RawTransaction[] = [];

  let currentDate: string | null = null;
  let descParts: string[] = [];
  let currentAmount: number | null = null;
  let currentType: 'debit' | 'credit' | null = null;

  function flush() {
    if (currentDate && currentAmount !== null && currentType !== null) {
      const description = descParts.join(' ').trim();
      if (description.length >= 2) {
        transactions.push({ date: currentDate, description, amount: currentAmount, type: currentType });
      }
    }
    currentDate = null;
    descParts = [];
    currentAmount = null;
    currentType = null;
  }

  for (const row of rows) {
    const lower = row.joined.toLowerCase();
    if (SKIP_LINES.some(s => lower.startsWith(s))) continue;

    const t0 = row.items[0]?.text ?? '';
    const t1 = row.items[1]?.text ?? '';
    const dateCandidate = `${t0} ${t1}`.trim();

    if (DATE_RE.test(dateCandidate)) {
      flush();

      const date = parseDDMon(dateCandidate, year);
      if (!date) continue;
      currentDate = date;

      // Numeric items (currency amounts)
      const numItems = row.items.filter(item => /^[\d,]+\.\d{2}$/.test(item.text));
      const firstNumIdx = row.items.findIndex(item => /^[\d,]+\.\d{2}$/.test(item.text));

      // Description tokens: between date pair and first amount
      descParts = row.items
        .slice(2, firstNumIdx < 0 ? row.items.length : firstNumIdx)
        .map(i => i.text)
        .filter(t => t.trim());

      if (cols) {
        for (const item of numItems) {
          const val = parseFloat(item.text.replace(/,/g, ''));
          if (isNaN(val) || val <= 0) continue;
          const distW = Math.abs(item.x - cols.withdrawalX);
          const distD = Math.abs(item.x - cols.depositX);
          if (distW < COL_TOL && distW <= distD) { currentAmount = val; currentType = 'debit'; break; }
          if (distD < COL_TOL && distD < distW) { currentAmount = val; currentType = 'credit'; break; }
        }
      } else if (numItems.length >= 2) {
        // Fallback: second-to-last number is the transaction amount
        const val = parseFloat(numItems[numItems.length - 2].text.replace(/,/g, ''));
        if (!isNaN(val) && val > 0) { currentAmount = val; currentType = 'debit'; }
      }
    } else if (currentDate) {
      // Continuation row — append non-numeric, non-account-number text to description
      const extra = row.items
        .filter(item => !/^[\d,]+\.\d{2}$/.test(item.text))
        .map(i => i.text)
        .filter(t => t.trim() && !ACCOUNT_NUM_RE.test(t.replace(/\s/g, '')))
        .join(' ')
        .trim();
      if (extra) descParts.push(extra);
    }
  }
  flush();

  return transactions;
}
