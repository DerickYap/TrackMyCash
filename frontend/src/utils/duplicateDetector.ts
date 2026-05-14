import { Transaction } from '../types/expense';

export function buildDuplicateSet(existing: Transaction[]): Set<string> {
  return new Set(existing.map(t => `${t.date}|${t.description.trim()}|${t.amount}`));
}

export function isDuplicate(
  date: string,
  description: string,
  amount: number,
  existingSet: Set<string>
): boolean {
  return existingSet.has(`${date}|${description.trim()}|${amount}`);
}
