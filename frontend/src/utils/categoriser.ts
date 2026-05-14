import { CATEGORY_KEYWORDS, FALLBACK_CATEGORY } from '../constants/categoryKeywords';
import { BankSource } from '../types/expense';

export function assignCategory(
  description: string,
  source: BankSource,
  memory: Record<string, string>
): string {
  const memKey = `${source}:${description.toLowerCase().trim()}`;
  if (memory[memKey]) return memory[memKey];

  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return category;
    }
  }
  return FALLBACK_CATEGORY;
}
