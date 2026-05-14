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
- `packages/ui` design system package (npm workspaces) — Button, Input, Select, Modal, Badge, Card, Label, FormField + design tokens (`@theme` CSS block) + `chartColors.ts`

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
- While typing → calls `searchStocks` (symbol search) — shows dropdown suggestions
- On blur (leaving field) → calls `fetchQuote` for price
- On selecting a suggestion → calls `fetchQuote` for that symbol immediately
- Crypto: CoinGecko search + price (direct, no proxy needed)
- Metals: gold `GC=F`, silver `SI=F` via yahoo-finance2 (futures, tracks spot price)

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
- `GET /api/quote?symbol=` — fetches quote via `yahoo-finance2` (`new YahooFinance()`)
- `GET /api/search?query=` — searches symbols via `yahoo-finance2`

**No API key required.** `yahoo-finance2` handles cookie/crumb auth internally.

---

## What's NOT Done Yet

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

### 🟡 Desktop Launcher
Goal: double-click to open the app without VSCode or a terminal.
Decided approach: **Express serves the built React files** (single process, single port).
- Express on port 3001 serves both `/api/*` and `frontend/dist` static files
- Frontend `fetch('/api/...')` calls work same-origin — no proxy needed in production
- Wrap in a macOS `.command` file: builds frontend, starts Express, opens `localhost:3001` in browser
- Vite dev server still works unchanged for development

### 🟡 Design System Migration (packages/ui)
The `packages/ui` package is set up with components and tokens but the existing app components haven't been migrated yet to use them. Migration order when ready:
1. `components/networth/modals/` — highest duplication density
2. `components/expense/`
3. `components/layout/`
4. `components/projection/`
5. Chart color sweep — replace local `COLORS` arrays with `chartColorArray` from `@trackmycash/ui/tokens/chartColors`

---

## Key Files Reference

```
track-my-cash/
├── package.json                          ← npm workspaces root (packages/*, frontend, backend)
├── packages/ui/                          ← design system package (@trackmycash/ui)
│   └── src/
│       ├── tokens/tokens.css             ← Tailwind v4 @theme design tokens
│       ├── tokens/chartColors.ts         ← single source for Recharts color constants
│       └── components/                   ← Button, Input, Select, Modal, Badge, Card, Label, FormField
├── backend/
│   ├── .env                              ← ALLOWED_ORIGIN, PORT (no API key needed)
│   └── src/
│       ├── index.ts                      ← Express app, port 3001
│       ├── routes/quote.ts               ← /api/quote via yahoo-finance2
│       ├── routes/search.ts              ← /api/search via yahoo-finance2
│       └── middleware/rateLimiter.ts     ← 60 req/min
└── frontend/
    └── src/
        ├── types/networth.ts             ← ManualEntry, HoldingEntry, EntryUnion
        ├── types/settings.ts             ← AppSettings, DEFAULT_SETTINGS, fxRate=0.74
        ├── store/AppContext.tsx           ← 4 context slices, localStorage init
        ├── hooks/usePriceRefresh.ts      ← staggered 800ms between requests
        ├── services/api/twelveData.ts    ← fetchQuote, fetchQuotes, searchStocks (parses yahoo-finance2 response)
        ├── services/api/coinGecko.ts     ← fetchCryptoPrices, searchCoinGecko
        ├── services/api/frankfurter.ts   ← FX rate fetch
        ├── services/parsers/
        │   ├── uobParser.ts              ← routes PDF→uobCreditPdfParser, XLS, CSV
        │   └── uobCreditPdfParser.ts     ← pdfjs-dist, credit card PDF format
        └── components/
            ├── layout/TopBar.tsx
            ├── layout/SettingsPanel.tsx
            ├── layout/SpreadsheetImportModal.tsx
            ├── networth/NetworthTab.tsx
            ├── networth/AllocationChart.tsx
            └── networth/modals/HoldingEntryForm.tsx
```

## Known Gotchas
- **Tailwind v4** uses `@import "tailwindcss"` in CSS and `@tailwindcss/vite` plugin — NOT `@tailwind base/components/utilities` or PostCSS config
- **UOB credit card PDF** columns: Post Date | Trans Date | Description | Amount (CR suffix = credit). Year extracted from "Statement Date DD MMM YYYY" on page 1
- **CPF double-counting**: UI shows warning "Exclude CPFIS amount" on CPF OA field
- **Metal values**: stored as original weight + unit; converted to troy oz at display time via `toTroyOz()` in `metalConversion.ts`. Price source is `GC=F` (gold) and `SI=F` (silver) futures — tracks spot closely
- **Metal tickers in localStorage**: existing entries saved before this session may have `ticker: 'XAU/USD'` or `'XAG/USD'`. Price refresh still works because `usePriceRefresh` derives the Yahoo ticker from `metalType`, not the stored ticker value
- **yahoo-finance2 v3 API**: must use `new YahooFinance()` — the old singleton default export no longer works (throws "Call new YahooFinance() first")
- **`services/api/twelveData.ts`**: filename is a misnomer — it now parses yahoo-finance2 responses. Rename to `yahooFinance.ts` when convenient (2 import sites: `HoldingEntryForm.tsx`, `usePriceRefresh.ts`)
- **Projection tab**: wired in App.tsx, currently renders a placeholder `<div>`
