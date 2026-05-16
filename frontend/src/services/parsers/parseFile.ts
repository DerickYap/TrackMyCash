import { BankSource, Transaction, RawTransaction } from '../../types/expense';
import { Currency } from '../../types/networth';
import { detectBank } from './detectBank';
import { normaliseTransactions } from './normaliser';
import { parseDBS } from './dbsParser';
import { parseUOB } from './uobParser';
import { parseChase } from './chaseParser';
import { parseAmex } from './amexParser';
import { parseBofA } from './bofaParser';
import { parseDBSPdf } from './dbsPdfParser';
import { parseChasePdf } from './chasePdfParser';
import { parseAmexPdf } from './amexPdfParser';
import { parseBofAPdf } from './bofaPdfParser';
import { parseGenericPdf } from './genericPdfParser';

export type ParseFileResult =
  | { ok: true; transactions: Transaction[] }
  | { ok: false; needsYear: true }
  | { ok: false; error: string };

// Amex statements come in two currencies; detect from date format in file content.
// USD Amex uses MM/DD/YY dates; SGD uses DD Mon format.
async function detectAmexCurrency(file: File): Promise<Currency> {
  try {
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const sample = isPdf
      ? await file.slice(0, 50_000).text().catch(() => '')
      : (await file.text()).slice(0, 1000);
    return /\b\d{2}\/\d{2}\/\d{2}\b/.test(sample) ? 'USD' : 'SGD';
  } catch {
    return 'SGD';
  }
}

export async function parseFile(
  file: File,
  existing: Transaction[],
  categoryMemory: Record<string, string>,
  confirmedYear?: number,
): Promise<ParseFileResult> {
  const detection = await detectBank(file);

  if (detection.type === 'image') {
    return { ok: false, error: 'Use the image receipt flow for photo files.' };
  }

  const isPdf = file.name.toLowerCase().endsWith('.pdf');
  let raw: RawTransaction[] = [];
  let source: BankSource = 'generic';
  let currency: Currency = 'SGD';

  try {
    if (detection.type === 'bank') {
      source = detection.source;

      if (source === 'Chase' || source === 'BofA') currency = 'USD';
      if (source === 'Amex') currency = await detectAmexCurrency(file);

      if (source === 'DBS') {
        raw = isPdf ? await parseDBSPdf(file) : parseDBS(await file.text());
      } else if (source === 'UOB') {
        const result = await parseUOB(file, confirmedYear);
        if ('needsYearConfirmation' in result) return { ok: false, needsYear: true };
        raw = result;
      } else if (source === 'Chase') {
        raw = isPdf ? await parseChasePdf(file) : parseChase(await file.text());
      } else if (source === 'Amex') {
        raw = isPdf ? await parseAmexPdf(file) : parseAmex(await file.text());
      } else if (source === 'BofA') {
        raw = isPdf ? await parseBofAPdf(file) : await parseBofA(file);
      }
    } else if (detection.type === 'generic-pdf') {
      raw = [await parseGenericPdf(file)];
    } else {
      return { ok: false, error: 'Could not recognise this file format. Try a PDF, or a CSV/XLS from a supported bank.' };
    }
  } catch {
    return { ok: false, error: 'Failed to parse the file. Please check the format and try again.' };
  }

  if (raw.length === 0) {
    return { ok: false, error: 'No transactions found in this file.' };
  }

  const transactions = normaliseTransactions(raw, source, currency, existing, categoryMemory);
  return { ok: true, transactions };
}
