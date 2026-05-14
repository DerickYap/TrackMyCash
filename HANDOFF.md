# Track My Cash — Handoff Document

## Project Overview
Personal finance web app. React + Vite + TypeScript + Tailwind v4 frontend. Node.js + Express backend proxy. All data in localStorage (no database, no login). Two currencies: SGD and USD with live FX conversion.

**Dev commands:**
```bash
# Terminal 1 — backend
cd backend && npm run dev        # runs on localhost:3001

# Terminal 2 — frontend
cd frontend && npm run dev       # runs on localhost:5173
```

---

## What's Been Built

### Infrastructure
- Vite + React + TypeScript + Tailwind v4 (`@tailwindcss/vite` plugin — NOT the old PostCSS setup)
- Express backend proxy on port 3001 (CORS restricted to localhost:5173)
- Vite `/api` proxy in dev: frontend calls `/api/quote` → Vite forwards to `localhost:3001/api/quote`
- 4 separate React context slices (Networth, Expense, Projection, Settings) — prevents cross-module re-renders
- localStorage keys: `nw_entries`, `nw_transactions`, `nw_settings`, `nw_category_memory`, `nw_projection_scenarios`

### Networth Module ✅
- `SummaryStrip` — total assets, liabilities, net worth
- `AllocationChart` — horizontal bar breakdown by asset category (Cash, CPF, Stocks, ETFs, Mutual Funds, Crypto, Metals, etc.)
- `CategoryGroup` + `EntryRow` — grouped entry list with stale price badge
- `AddEditEntryModal` → `ManualEntryForm` + `HoldingEntryForm`
- `DeleteConfirmModal`
- Group-by toggle: **Type** (bank/cpf/stock/etc.) or **Account** (Robinhood/IBKR/401k/etc.)
- `usePriceRefresh` hook — staggered 800ms between requests, 15-min passive interval, 60s manual cooldown
- `useFxRate` hook — frankfurter.app, 60-min cache, manual override

**HoldingEntryForm ticker flow:**
- While typing → calls `searchStocks` (symbol search) only — shows dropdown suggestions
- On blur (leaving field) → calls `fetchQuote` for price
- On selecting a suggestion → calls `fetchQuote` for that symbol immediately
- Crypto: CoinGecko search + price (direct, no proxy needed)
- Metals: gold `XAU/USD`, silver `XAG/USD` via Twelve Data proxy

### Expense Module ✅
Parsers in `frontend/src/services/parsers/`:
| Bank | File | Format |
|------|------|--------|
| DBS | `dbsParser.ts` | CSV |
| UOB | `uobParser.ts` + `uobCreditPdfParser.ts` | PDF (credit card), XLS, or CSV |
| Chase | `chaseParser.ts` | CSV |
| Amex | `amexParser.ts` | CSV (SGD or USD selectable) |
| BofA | `bofaParser.ts` | CSV or XLS |

- `normaliser.ts` — bank-agnostic: assigns UUID, normalises dates, deduplicates, auto-categorises
- `UploadArea` → `ReviewScreen` → confirm → dispatch
- `MonthlyView` + `ExpenseChart` (Recharts donut) + `TransactionList`

### Settings & Import ✅
- `SettingsPanel` — proxy URL, FX override, JSON export/import, clear data (double-confirm)
- `SpreadsheetImportModal` — imports from the user's specific Google Sheets CSV column layout (col 2-3: summary, col 5-7: individual assets, col 9-11: Robinhood, col 14-16: 401k, col 19-21: IBKR)

### Backend Routes
- `GET /health` — health check
- `GET /api/quote?symbol=` — proxies Twelve Data `/quote` (encodes symbol for XAU/USD)
- `GET /api/search?query=` — proxies Twelve Data `/symbol_search`

---

## What's NOT Done Yet

### 🔴 Priority: Switch from Twelve Data to Yahoo Finance
**Why:** Twelve Data free plan = 8 API credits/minute. Hits the cap easily with multiple holdings + searching.

**Yahoo Finance advantages:** Free, no API key, ~unlimited rate, supports SGX (`.SI` suffix), spot metals (`XAUUSD=X`, `XAGUSD=X`).

**What needs changing:**
1. `backend/src/routes/quote.ts` — replace Twelve Data URL with Yahoo Finance chart endpoint:
   ```
   GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d
   ```
   Response path: `data.chart.result[0].meta.regularMarketPrice` and `data.chart.result[0].meta.currency`

2. `backend/src/routes/search.ts` — replace with Yahoo Finance quote search:
   ```
   GET https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=8&newsCount=0
   ```
   Response path: `data.quotes[]` with fields `symbol`, `longname`/`shortname`, `exchange`, `currency`, `typeDisp`

3. `frontend/src/services/api/twelveData.ts` — update `fetchQuote` to parse Yahoo response format

4. `frontend/src/services/parsers/spreadsheetImporter.ts` — gold ticker `XAU/USD` → `XAUUSD=X`, silver `XAG/USD` → `XAGUSD=X`

5. `backend/.env` — remove `TWELVE_DATA_API_KEY` (no longer needed)

6. `backend/src/routes/quote.ts` — no API key needed, but add `User-Agent` header to Yahoo requests to avoid 429s:
   ```
   'User-Agent': 'Mozilla/5.0'
   ```

### 🟡 Goal Projector Module (Phase 6 from plan)
Not started. All types are defined in `frontend/src/types/projection.ts`.

Files to create:
- `frontend/src/store/projectionReducer.ts`
- `frontend/src/hooks/useProjection.ts` — forward: `nw += nw * blendedMonthlyRate + surplus` until target or 540 months; backward: solve for required surplus given fixed target date; blended rate = `Σ(allocationWeight_i × annualReturn_i) / 12`
- `frontend/src/components/projection/ProjectionTab.tsx`
- `frontend/src/components/projection/InputPanel.tsx`
- `frontend/src/components/projection/ReturnAssumptionsPanel.tsx`
- `frontend/src/components/projection/ProjectionChart.tsx` — Recharts LineChart + ReferenceLine for target
- `frontend/src/components/projection/ScenarioControls.tsx`
- `frontend/src/components/projection/SummaryCard.tsx`

Default return rates are in `frontend/src/constants/defaultReturnRates.ts`. The projection tab is already wired in `App.tsx` but renders a placeholder.

### 🟡 Distribution / Packaging
User asked how to distribute the app for others to run locally. Three options were presented but never decided:
1. **Single Node.js bundle** — Express serves built React files, distribute as zip
2. **Docker Compose** — one command `docker compose up`
3. **Electron desktop app** — double-click `.app`/`.exe`

---

## Key Files Reference

```
track-my-cash/
├── backend/
│   ├── .env                          ← TWELVE_DATA_API_KEY (to be replaced)
│   ├── src/
│   │   ├── index.ts                  ← Express app, port 3001
│   │   ├── routes/quote.ts           ← /api/quote proxy
│   │   ├── routes/search.ts          ← /api/search proxy
│   │   └── middleware/rateLimiter.ts ← 60 req/min (raised from 10)
└── frontend/
    ├── src/
    │   ├── types/networth.ts         ← ManualEntry, HoldingEntry, EntryUnion
    │   ├── types/settings.ts         ← AppSettings, DEFAULT_SETTINGS, fxRate=0.74
    │   ├── store/AppContext.tsx       ← 4 context slices, localStorage init
    │   ├── hooks/usePriceRefresh.ts  ← staggered 800ms between requests
    │   ├── services/api/twelveData.ts ← fetchQuote, fetchQuotes, searchStocks
    │   ├── services/api/coinGecko.ts  ← fetchCryptoPrices, searchCoinGecko
    │   ├── services/api/frankfurter.ts ← FX rate fetch
    │   ├── services/parsers/
    │   │   ├── uobParser.ts          ← routes PDF→uobCreditPdfParser, XLS, CSV
    │   │   └── uobCreditPdfParser.ts ← pdfjs-dist, credit card PDF format
    │   └── components/
    │       ├── layout/TopBar.tsx
    │       ├── layout/SettingsPanel.tsx
    │       ├── layout/SpreadsheetImportModal.tsx
    │       ├── networth/NetworthTab.tsx
    │       ├── networth/AllocationChart.tsx
    │       └── networth/modals/HoldingEntryForm.tsx
```

## Known Gotchas
- **Tailwind v4** uses `@import "tailwindcss"` in CSS and `@tailwindcss/vite` plugin — NOT `@tailwind base/components/utilities` or PostCSS config
- **UOB credit card PDF** columns: Post Date | Trans Date | Description | Amount (CR suffix = credit). Year extracted from "Statement Date DD MMM YYYY" on page 1
- **CPF double-counting**: UI shows warning "Exclude CPFIS amount" on CPF OA field
- **Metal values**: stored as original weight + unit; converted to troy oz at display time via `toTroyOz()` in `metalConversion.ts`
- **XAU/USD slash** must be `encodeURIComponent`-encoded in proxy URL (→ `XAU%2FUSD`) — Yahoo Finance uses `XAUUSD=X` which has no encoding issue
- **Projection tab**: wired in App.tsx, currently renders a placeholder `<div>`
