import { RawTransaction, Transaction, BankSource } from '../../types/expense';
import { Currency } from '../../types/networth';
import { assignCategory } from '../../utils/categoriser';
import { buildDuplicateSet, isDuplicate } from '../../utils/duplicateDetector';

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function normaliseDate(raw: string): string {
  // Handles: DD MMM YYYY, MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
  raw = raw.trim();

  // YYYY-MM-DD already normalised
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD MMM YYYY  e.g. 15 Jan 2025
  const dmy = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dmy) {
    const m = MONTH_MAP[dmy[2].toLowerCase()];
    return `${dmy[3]}-${m}-${dmy[1].padStart(2, '0')}`;
  }

  // MM/DD/YYYY (Chase, Amex, BofA) — must be checked before DD/MM/YYYY
  // since the regexes are identical; US banks always use MM/DD so this branch wins
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`;

  return raw; // fallback, leave as-is
}

export function normaliseTransactions(
  raw: RawTransaction[],
  source: BankSource,
  currency: Currency,
  existing: Transaction[],
  memory: Record<string, string>
): Transaction[] {
  const existingSet = buildDuplicateSet(existing);
  const batchSet = new Set<string>();
  const now = new Date().toISOString();

  return raw.map(r => {
    const date = normaliseDate(r.date);
    const key = `${date}|${r.description.trim()}|${r.amount}`;
    const duplicate = isDuplicate(date, r.description, r.amount, existingSet) || batchSet.has(key);
    if (!duplicate) batchSet.add(key);
    const category = assignCategory(r.description, source, memory);
    return {
      id: crypto.randomUUID(),
      date,
      description: r.description,
      amount: r.amount,
      type: r.type,
      currency,
      category,
      source,
      importedAt: now,
      isDuplicate: duplicate,
    };
  });
}
