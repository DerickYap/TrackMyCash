import { extractRows, TextRow } from './pdfUtils';
import { RawTransaction } from '../../types/expense';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

// "01 Apr" as single item  OR  first two items combine to "01 Apr"
const DATE_RE = /^\d{1,2}\s+[A-Za-z]{3}$/;

// Pure-digit strings 8+ chars = account/card numbers, exclude from descriptions
const ACCOUNT_NUM_RE = /^\d{8,}$/;

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
    const period = line.match(/\bperiod[:\s].*?\b(20\d{2})\b/i);
    if (period) return parseInt(period[1]);
    // "as at 30 Apr 2026" or any "DD Mon YYYY"
    const dmy = line.match(/\b\d{1,2}\s+[A-Za-z]{3}\s+(20\d{2})\b/);
    if (dmy) return parseInt(dmy[1]);
  }
  return new Date().getFullYear();
}

// Detect "DD Mon" at the start of a row, handling both single-item and two-item forms.
// Returns { dateStr, descOffset } or null.
function detectDateStart(row: TextRow): { dateStr: string; descOffset: number } | null {
  const t0 = row.items[0]?.text ?? '';
  const t1 = row.items[1]?.text ?? '';
  if (DATE_RE.test(t0)) return { dateStr: t0, descOffset: 1 };
  if (DATE_RE.test(`${t0} ${t1}`)) return { dateStr: `${t0} ${t1}`, descOffset: 2 };
  return null;
}

export async function parseUOBBankPdf(file: File): Promise<RawTransaction[]> {
  const rows = await extractRows(file);
  const lines = rows.map(r => r.joined);
  const year = inferYear(lines);

  const transactions: RawTransaction[] = [];
  let prevBalance: number | null = null;

  // Accumulator for multi-line descriptions
  let currentDate: string | null = null;
  let descParts: string[] = [];
  let pendingAmount: number | null = null;
  let pendingType: 'debit' | 'credit' | null = null;

  function flush() {
    if (currentDate && pendingAmount !== null && pendingType !== null) {
      const description = descParts.join(' ').trim();
      if (description.length >= 2) {
        transactions.push({ date: currentDate, description, amount: pendingAmount, type: pendingType });
      }
    }
    currentDate = null;
    descParts = [];
    pendingAmount = null;
    pendingType = null;
  }

  for (const row of rows) {
    const detected = detectDateStart(row);

    if (detected) {
      flush();

      const { dateStr, descOffset } = detected;
      const date = parseDDMon(dateStr, year);
      if (!date) continue;

      // Currency-formatted amounts in this row
      const numItems = row.items.filter(item => /^[\d,]+\.\d{2}$/.test(item.text));
      const firstNumIdx = row.items.findIndex(item => /^[\d,]+\.\d{2}$/.test(item.text));

      // Description: tokens between date and first amount
      const descText = row.items
        .slice(descOffset, firstNumIdx < 0 ? row.items.length : firstNumIdx)
        .map(i => i.text)
        .filter(t => t.trim())
        .join(' ');

      // BALANCE B/F / C/F: seed prevBalance and skip
      const descLower = descText.toLowerCase();
      if (descLower.startsWith('balance b/f') || descLower.startsWith('balance c/f') || descLower.startsWith('balance brought')) {
        if (numItems.length > 0) {
          prevBalance = parseFloat(numItems[numItems.length - 1].text.replace(/,/g, ''));
        }
        continue;
      }

      currentDate = date;
      descParts = descText ? [descText] : [];

      // Use balance direction to determine debit vs credit (most reliable approach).
      // Layout: [...tx amounts...] [running balance] — last number is balance, first is tx amount.
      if (numItems.length >= 2) {
        const txAmount = parseFloat(numItems[0].text.replace(/,/g, ''));
        const newBalance = parseFloat(numItems[numItems.length - 1].text.replace(/,/g, ''));

        if (!isNaN(txAmount) && txAmount > 0 && !isNaN(newBalance)) {
          if (prevBalance !== null) {
            pendingType = newBalance >= prevBalance ? 'credit' : 'debit';
          } else {
            // No previous balance context yet — infer from description keywords
            const lower = descText.toLowerCase();
            pendingType = (lower.includes('interest') || lower.includes('deposit') || lower.includes('credit') || lower.includes('inward') || lower.includes('giro') || lower.includes('salary'))
              ? 'credit' : 'debit';
          }
          pendingAmount = txAmount;
          prevBalance = newBalance;
        }
      } else if (numItems.length === 1) {
        // Only a balance amount — update prevBalance, no transaction
        prevBalance = parseFloat(numItems[0].text.replace(/,/g, ''));
      }
    } else if (currentDate) {
      // Continuation row — append non-numeric, non-account-number text
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
