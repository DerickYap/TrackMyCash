import Papa from 'papaparse';
import { ManualEntry, HoldingEntry } from '../../types/networth';

export interface ImportPreviewEntry {
  kind: 'manual' | 'holding';
  data: Omit<ManualEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>
      | Omit<HoldingEntry, 'id' | 'entryType' | 'createdAt' | 'updatedAt'>;
  note?: string;
}

function parseUSD(raw: string): number {
  return parseFloat(raw.replace(/[$,]/g, '')) || 0;
}

// Entries in the summary column that are covered by individual holdings — skip them
const SUMMARY_SKIP = new Set([
  'mtch stocks', 'gold', 'silver', '401k', 'robinhood', 'ibkr',
  'coinbase wallet', 'dcent', 'balance', // dcent & coinbase overlap with individual crypto
]);

// Accounts we know are SGD-denominated
const SGD_ACCOUNTS = new Set(['dbs', 'uob', 'cpf (oa)', 'cpf (sa)', 'cpf (ma)']);

const CPF_TYPE_MAP: Record<string, 'oa' | 'sa' | 'ma'> = {
  'cpf (oa)': 'oa',
  'cpf (sa)': 'sa',
  'cpf (ma)': 'ma',
};

export function parseSpreadsheet(csvText: string): ImportPreviewEntry[] {
  const { data: rows } = Papa.parse<string[]>(csvText, { skipEmptyLines: false });
  const entries: ImportPreviewEntry[] = [];

  // ── 1. Summary column (col 2 = name, col 3 = value) ─────────────────────
  for (const row of rows) {
    const name = (row[2] ?? '').trim();
    const valueRaw = (row[3] ?? '').trim();
    if (!name || !valueRaw || name === 'Networth' || name === 'Total') continue;

    const key = name.toLowerCase();
    if (SUMMARY_SKIP.has(key)) continue;

    const balance = parseUSD(valueRaw);
    if (balance <= 0) continue;

    const isCPF = key.startsWith('cpf');
    const isSGD = SGD_ACCOUNTS.has(key);

    entries.push({
      kind: 'manual',
      data: {
        name,
        category: isCPF ? 'cpf' : 'bank',
        cpfType: CPF_TYPE_MAP[key] ?? null,
        currency: isSGD ? 'SGD' : 'USD',
        balance,
        account: null,
        notes: isSGD ? 'Value shown in USD from spreadsheet — update to actual SGD amount' : null,
      },
      note: isSGD ? 'Shown in USD — please update to actual SGD balance' : undefined,
    });
  }

  // ── 2. Individual Assets (col 5 = name, col 6 = price, col 7 = qty) ──────
  const INDIVIDUAL_CRYPTO: Record<string, string> = {
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'usdc': 'usd-coin',
  };

  for (const row of rows) {
    const name = (row[5] ?? '').trim();
    const priceRaw = (row[6] ?? '').trim();
    const qtyRaw = (row[7] ?? '').trim();
    if (!name || !priceRaw || !qtyRaw) continue;
    if (name === 'Asset') continue; // header row

    const price = parseUSD(priceRaw);
    const qty = parseFloat(qtyRaw) || 0;
    if (qty <= 0) continue;

    const key = name.toLowerCase().replace(' price', '').replace(' (per oz)', '').trim();

    // Gold / Silver
    if (key === 'gold') {
      entries.push({
        kind: 'holding',
        data: {
          ticker: 'GC=F', name: 'Gold', assetClass: 'metal', metalType: 'gold',
          quantity: qty, weightUnit: 'troy_oz', currency: 'USD',
          lastPrice: price, lastFetchedAt: new Date().toISOString(), account: null, notes: null,
        },
      });
      continue;
    }
    if (key === 'silver') {
      entries.push({
        kind: 'holding',
        data: {
          ticker: 'SI=F', name: 'Silver', assetClass: 'metal', metalType: 'silver',
          quantity: qty, weightUnit: 'troy_oz', currency: 'USD',
          lastPrice: price, lastFetchedAt: new Date().toISOString(), account: null, notes: null,
        },
      });
      continue;
    }

    // Crypto
    const cryptoId = INDIVIDUAL_CRYPTO[key];
    if (cryptoId) {
      entries.push({
        kind: 'holding',
        data: {
          ticker: cryptoId, name: key.charAt(0).toUpperCase() + key.slice(1),
          assetClass: 'crypto', metalType: null, quantity: qty, weightUnit: null,
          currency: 'USD', lastPrice: price, lastFetchedAt: new Date().toISOString(), account: 'Coinbase', notes: null,
        },
      });
      continue;
    }

    // Stock (MTCH etc)
    const ticker = key.replace(' price', '').toUpperCase();
    entries.push({
      kind: 'holding',
      data: {
        ticker, name: ticker, assetClass: 'stock', metalType: null,
        quantity: qty, weightUnit: null, currency: 'USD',
        lastPrice: price, lastFetchedAt: new Date().toISOString(), account: null, notes: null,
      },
    });
  }

  // ── 3. Robinhood (col 9 = name, col 10 = price, col 11 = qty) ─────────────
  for (const row of rows) {
    const name = (row[9] ?? '').trim();
    const priceRaw = (row[10] ?? '').trim();
    const qtyRaw = (row[11] ?? '').trim();
    if (!name || !priceRaw || !qtyRaw || name === 'Asset') continue;

    const price = parseUSD(priceRaw);
    const qty = parseFloat(qtyRaw) || 0;
    if (qty <= 0) continue;

    if (name.toLowerCase() === 'cash') {
      entries.push({
        kind: 'manual',
        data: {
          name: 'Robinhood Cash', category: 'bank', cpfType: null,
          currency: 'USD', balance: price * qty, account: 'Robinhood', notes: null,
        },
      });
      continue;
    }

    entries.push({
      kind: 'holding',
      data: {
        ticker: name, name, assetClass: 'stock', metalType: null,
        quantity: qty, weightUnit: null, currency: 'USD',
        lastPrice: price, lastFetchedAt: new Date().toISOString(), account: 'Robinhood', notes: null,
      },
    });
  }

  // ── 4. 401k (col 14 = name, col 15 = price, col 16 = qty) ────────────────
  for (const row of rows) {
    const name = (row[14] ?? '').trim();
    const priceRaw = (row[15] ?? '').trim();
    const qtyRaw = (row[16] ?? '').trim();
    if (!name || !priceRaw || !qtyRaw || name === 'Asset') continue;

    const price = parseUSD(priceRaw);
    const qty = parseFloat(qtyRaw) || 0;
    if (qty <= 0) continue;

    if (name === 'VINIX') {
      entries.push({
        kind: 'holding',
        data: {
          ticker: 'VINIX', name: 'Vanguard Institutional Index (VINIX)',
          assetClass: 'mutualfund', metalType: null,
          quantity: qty, weightUnit: null, currency: 'USD',
          lastPrice: price, lastFetchedAt: new Date().toISOString(), account: '401k', notes: null,
        },
      });
    } else {
      // T. Rowe Price 2065 Trust-F — no public ticker, manual balance
      const balance = price * qty;
      entries.push({
        kind: 'manual',
        data: {
          name: 'T. Rowe Price 2065 Trust-F (401k)', category: 'retirement', cpfType: null,
          currency: 'USD', balance, account: '401k',
          notes: 'No public ticker — update balance quarterly from 401k portal',
        },
        note: 'Manual balance only — no live price feed',
      });
    }
  }

  // ── 5. IBKR (col 19 = name, col 20 = price, col 21 = qty) ───────────────
  for (const row of rows) {
    const name = (row[19] ?? '').trim();
    const priceRaw = (row[20] ?? '').trim();
    const qtyRaw = (row[21] ?? '').trim();
    if (!name || !priceRaw || !qtyRaw || name === 'Asset') continue;

    const price = parseUSD(priceRaw);
    const qty = parseFloat(qtyRaw) || 0;
    if (qty <= 0) continue;

    if (name.toLowerCase() === 'cash') {
      entries.push({
        kind: 'manual',
        data: {
          name: 'IBKR Cash', category: 'bank', cpfType: null,
          currency: 'USD', balance: price * qty, account: 'IBKR', notes: null,
        },
      });
      continue;
    }

    entries.push({
      kind: 'holding',
      data: {
        ticker: name, name, assetClass: 'stock', metalType: null,
        quantity: qty, weightUnit: null, currency: 'USD',
        lastPrice: price, lastFetchedAt: new Date().toISOString(), account: 'IBKR', notes: null,
      },
    });
  }

  return entries;
}
