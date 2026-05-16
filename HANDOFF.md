# Track My Cash — Handoff Document

## Project Overview
Personal finance web app. React + Vite + TypeScript + Tailwind v4 frontend. Node.js + Express backend proxy. Data stored in Supabase PostgreSQL per user, with localStorage as a same-device cache. Google OAuth login via Supabase Auth. Two currencies: SGD and USD with live FX conversion.

**Dev commands:**
```bash
# Option A — Vercel CLI (recommended, tests API functions locally too)
cd frontend && vercel dev        # runs frontend + API functions together

# Option B — two terminals (no Vercel CLI needed)
cd backend && npm run dev        # Express backend on localhost:3001
cd frontend && npm run dev       # Vite frontend on localhost:5173 (proxies /api → 3001)
```

**Production deploy:** Vercel. Set **Root Directory → `frontend`** in the Vercel dashboard. The `frontend/vercel.json` handles the rest (installs from monorepo root, Vite framework).

**Required env file:** `frontend/.env.local` (see `frontend/.env.local.example`)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## What's Been Built

### Infrastructure
- Vite + React + TypeScript + Tailwind v4 (`@tailwindcss/vite` plugin — NOT the old PostCSS setup)
- Express backend proxy on port 3001 (CORS restricted to localhost:5173 in dev; serves frontend/dist in production)
- Vite `/api` proxy in dev: frontend calls `/api/quote` → Vite forwards to `localhost:3001/api/quote`
- 4 separate React context slices (Networth, Expense, Projection, Settings) + SyncContext — prevents cross-module re-renders
- localStorage keys: `nw_entries`, `nw_transactions`, `nw_settings`, `nw_category_memory`, `nw_projection_scenarios`
- `packages/ui` design system package (npm workspaces) — Button, Input, Select, Modal, Badge, Card, Label, FormField + design tokens (`@theme` CSS block) + `chartColors.ts`

### Authentication & Cloud Storage ✅
- **Google OAuth** via Supabase Auth (PKCE flow) — `frontend/src/store/AuthContext.tsx`
- **Supabase PostgreSQL** — single `user_data` table, one row per user, JSONB columns per data type
- **Row Level Security** — users can only read/write their own row (`auth.uid() = user_id`)
- **Sync strategy**: localStorage initialises reducers instantly on load (same-device cache), then Supabase data loads and overwrites via `LOAD` dispatch
- **Write-through**: debounced upsert to Supabase on every state change (1s for entries, 500ms for others)
- **Migration banner**: shown on first login if localStorage has existing data — offers to import or discard
- **Sign-out**: clears localStorage + resets all reducers, returns to login page

**Supabase table schema:**
```sql
CREATE TABLE user_data (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entries         JSONB DEFAULT '[]',       -- EntryUnion[]
  transactions    JSONB DEFAULT '[]',       -- Transaction[]
  settings        JSONB,                    -- AppSettings
  category_memory JSONB DEFAULT '{}',       -- Record<string,string>
  categories      JSONB DEFAULT '[]',       -- string[] (user-defined, reserved for future use)
  scenarios       JSONB DEFAULT '[]',       -- Scenario[]
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Key auth/sync files:**
- `frontend/src/lib/supabase.ts` — Supabase client singleton
- `frontend/src/store/AuthContext.tsx` — `AuthProvider`, `useAuth()` — Google sign-in/out, session state
- `frontend/src/services/cloudStorage.ts` — `fetchUserData`, `upsertUserData`
- `frontend/src/components/auth/LoginPage.tsx` — Google sign-in page
- `frontend/src/components/auth/MigrationBanner.tsx` — first-login local data migration prompt
- `frontend/src/store/AppContext.tsx` — SyncContext, cloud load on login, debounced write-through

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
| Bank | CSV/XLS file | PDF file |
|------|-------------|----------|
| DBS | `dbsParser.ts` | `dbsPdfParser.ts` — auto-detects CC vs bank account; column x-coords distinguish withdrawal/deposit |
| UOB | `uobParser.ts` (XLS + CSV) | `uobCreditPdfParser.ts` (CC) + `uobBankPdfParser.ts` (One Account/savings) — detected by "statement of account" on page 1 |
| Chase | `chaseParser.ts` | `chasePdfParser.ts` |
| Amex | `amexParser.ts` (SGD or USD selectable) | `amexPdfParser.ts` — handles SGD `DD Mon` and USD `MM/DD/YY` formats |
| BofA | `bofaParser.ts` | `bofaPdfParser.ts` — auto-detects CC vs bank account |

- `pdfUtils.ts` — shared pdfjs-dist text extraction used by all PDF parsers (`extractRows`, `extractLines`, `extractFirstPageText`)
- `detectBank.ts` — auto-detects bank from file content: PDFs scan first-page text for bank name; CSVs fingerprint header row; XLS converted to CSV first
- All PDF parsers handle **two-month billing cycles** (e.g. Dec 8 → Jan 7): extracts statement closing month + year, assigns each transaction to the correct year using the same `assignYear` logic as UOB
- `normaliser.ts` — bank-agnostic: assigns UUID, normalises dates, deduplicates, auto-categorises
- `UploadArea` — file picker → auto-detect → show detected bank (overridable) → Import
- `MonthlyView` + `ExpenseChart` (Recharts donut) + `TransactionList`

### Settings & Import ✅
- `SettingsPanel` — proxy URL, FX override, JSON export/import (awaits Supabase write before reload), clear data (double-confirm, also clears Supabase)
- `SpreadsheetImportModal` — imports from the user's specific Google Sheets CSV column layout (col 2-3: summary, col 5-7: individual assets, col 9-11: Robinhood, col 14-16: 401k, col 19-21: IBKR)

### API Routes (Vercel Functions)
- `GET /api/quote?symbol=` — `frontend/api/quote.ts` — fetches quote via `yahoo-finance2`
- `GET /api/search?query=` — `frontend/api/search.ts` — searches symbols via `yahoo-finance2`

**No API key required.** `yahoo-finance2` handles cookie/crumb auth internally.

In production these are Vercel serverless functions. For local dev, `vercel dev` serves them alongside the Vite frontend, or the Express `backend/` can be used as a fallback (Vite proxy points to `localhost:3001`).

---

## What's NOT Done Yet

### 🟡 Goal Projector Module
Not started. All types are defined in `frontend/src/types/projection.ts`.

Files to create:
- `frontend/src/hooks/useProjection.ts` — forward: `nw += nw * blendedMonthlyRate + surplus` until target or 540 months; backward: solve for required surplus given fixed target date
- `frontend/src/components/projection/ProjectionTab.tsx`
- `frontend/src/components/projection/InputPanel.tsx`
- `frontend/src/components/projection/ReturnAssumptionsPanel.tsx`
- `frontend/src/components/projection/ProjectionChart.tsx` — Recharts LineChart + ReferenceLine for target
- `frontend/src/components/projection/ScenarioControls.tsx`
- `frontend/src/components/projection/SummaryCard.tsx`

Default return rates are in `frontend/src/constants/defaultReturnRates.ts`. The projection tab is already wired in `App.tsx` but renders a placeholder.

### 🟡 User-Defined Expense Categories
The `categories` column exists in the `user_data` Supabase table (JSONB `string[]`) but the UI to create/rename/delete categories hasn't been built yet. Currently, categories are auto-assigned by the normaliser and edited per-transaction. The `category_memory` column remembers past assignments for auto-categorisation.

### ✅ Bank Statement Auto-Detection (done)
`detectBank.ts` fingerprints the file on upload — no manual bank selection needed. PDFs scan first-page text; CSVs check the header row. The detected bank shows in a dropdown the user can override if detection fails.

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
├── start.command                         ← macOS double-click launcher
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
    ├── .env.local                        ← Supabase URL + anon key (not committed)
    ├── .env.local.example                ← template for above
    └── src/
        ├── lib/supabase.ts               ← Supabase client singleton
        ├── types/networth.ts             ← ManualEntry, HoldingEntry, EntryUnion
        ├── types/settings.ts             ← AppSettings, DEFAULT_SETTINGS, fxRate=0.74
        ├── store/AuthContext.tsx          ← Google OAuth auth state (AuthProvider, useAuth)
        ├── store/AppContext.tsx           ← 4 context slices + SyncContext, cloud sync
        ├── hooks/usePriceRefresh.ts      ← staggered 800ms between requests
        ├── services/cloudStorage.ts      ← fetchUserData, upsertUserData (both wrapped in try/catch with console.error)
        ├── services/api/yahooFinance.ts  ← fetchQuote, searchStocks, fetchQuotes (yahoo-finance2 proxy)
        ├── services/api/coinGecko.ts     ← fetchCryptoPrices, searchCoinGecko
        ├── services/api/frankfurter.ts   ← FX rate fetch
        ├── services/parsers/
        │   ├── pdfUtils.ts               ← shared pdfjs-dist extraction (extractRows, extractLines, extractFirstPageText)
        │   ├── detectBank.ts             ← auto-detects bank from PDF text / CSV headers
        │   ├── uobParser.ts              ← routes PDF→CC or bank parser; handles XLS + CSV
        │   ├── uobCreditPdfParser.ts     ← UOB CC PDF (uses pdfUtils)
        │   ├── uobBankPdfParser.ts       ← UOB One Account / savings PDF (balance-direction debit/credit)
        │   ├── chasePdfParser.ts         ← Chase CC PDF
        │   ├── dbsPdfParser.ts           ← DBS CC + bank account PDF
        │   ├── amexPdfParser.ts          ← Amex CC PDF (SGD + USD)
        │   └── bofaPdfParser.ts          ← BofA CC + bank account PDF
        └── components/
            ├── auth/LoginPage.tsx        ← Google sign-in page
            ├── auth/MigrationBanner.tsx  ← first-login local data import prompt
            ├── layout/TopBar.tsx         ← user avatar + sign-out button
            ├── layout/SettingsPanel.tsx
            ├── layout/SpreadsheetImportModal.tsx
            ├── networth/NetworthTab.tsx
            ├── networth/AllocationChart.tsx
            └── networth/modals/HoldingEntryForm.tsx
```

---

## Performance Patterns (established 2026-05-16)
- **React.memo**: `CategoryGroup`, `EntryRow`, `TransactionList` are all wrapped — new list-item components should be too
- **useMemo**: group/sort derivations in `NetworthTab`, totals in `MonthlyView`, filtered list in `TransactionList` — any expensive derivation in render should be memoized
- **useCallback**: all handlers passed as props in `NetworthTab` use `useCallback` — keeps memoized children from re-rendering
- **UPDATE_PRICES**: uses a `Map` for O(n) lookups — don't revert to `.find()` inside `.map()`
- **ALL_CATEGORIES**: exported from `constants/categoryKeywords.ts` — don't redefine it locally in components
- **cloudStorage error handling**: both `fetchUserData` and `upsertUserData` have try/catch + `console.error` — new Supabase calls should follow the same pattern

---

## Known Gotchas
- **Tailwind v4** uses `@import "tailwindcss"` in CSS and `@tailwindcss/vite` plugin — NOT `@tailwind base/components/utilities` or PostCSS config
- **UOB credit card PDF** columns: Post Date | Trans Date | Description | Amount (CR suffix = credit). Year extracted from "Statement Date DD MMM YYYY" on page 1
- **CPF double-counting**: UI shows warning "Exclude CPFIS amount" on CPF OA field
- **Metal values**: stored as original weight + unit; converted to troy oz at display time via `toTroyOz()` in `metalConversion.ts`. Price source is `GC=F` (gold) and `SI=F` (silver) futures — tracks spot closely
- **Metal tickers in localStorage**: existing entries saved before this session may have `ticker: 'XAU/USD'` or `'XAG/USD'`. Price refresh still works because `usePriceRefresh` derives the Yahoo ticker from `metalType`, not the stored ticker value
- **yahoo-finance2 v3 API**: must use `new YahooFinance()` — the old singleton default export no longer works (throws "Call new YahooFinance() first")
- **Projection tab**: wired in App.tsx, currently renders a placeholder `<div>`
- **Frankfurter CORS on localhost**: `api.frankfurter.app` blocks direct browser requests from localhost in some configurations. FX rate fetch may silently fail in dev; falls back to stored rate. Works fine in production.
- **npm workspaces + Vite hoisting**: React gets hoisted to root `node_modules` by npm. `vite.config.ts` has explicit `resolve.alias` entries pointing to `../node_modules/react` to fix Vite's Rolldown optimizer. If you add new packages and see "cannot find react", run `npm install` from the repo root.
- **Supabase RLS**: if data isn't saving, check Authentication → Policies in the Supabase dashboard. The `user_data_self` policy must exist on the `user_data` table.
- **Import JSON race condition (fixed)**: `SettingsPanel` now `await`s the Supabase upsert before calling `window.location.reload()` — previously the reload happened before the write completed.
- **PDF year detection**: parsers only extract years from date-like contexts (month name + year, or `MM/DD/YYYY`). Raw numbers like zip codes (`75267-2050`) or account numbers won't be misread as years.
- **Two-month billing cycles**: all PDF parsers extract the statement closing month alongside the year. Each transaction is assigned to the correct year via `assignYear(txMonth, endYear, endMonth)` — same logic UOB has always used.
- **UOB bank account PDF detection**: `extractFirstPageText` only reads page 1. The "Withdrawals" column header is on page 2 of UOB bank statements, so detection uses `"statement of account"` (page 1 title) instead.
- **UOB bank account debit/credit**: determined by balance direction — if the running balance goes up, it's a credit; if it goes down, it's a debit. More reliable than x-coordinate column matching for this layout.
- **useFxRate dependency**: `useEffect` depends on `state.fxFetchedAt` and `state.fxSource` — if you see the FX rate not refreshing after login, check these deps haven't been removed.
- **AppContext debounce cleanup**: `debounceRef` timers are cleared on unmount via a `useEffect` cleanup — keeps pending debounces from firing on a dead component.
- **Transfers & Payments excluded from both spend and income**: CC bill payments from bank account statements are `type: 'debit'` but not real spending; GIRO payments received on CC statements are `type: 'credit'` but not income. Both are filtered in `MonthlyView.tsx`.
- **Category priority — Income before Transfers & Payments**: Salary GIRO descriptions contain both `giro` and `salary`/`payroll`. `CATEGORY_KEYWORDS` object order determines match priority; Income is listed first so salary keywords win before `giro` matches.
- **`paymt` keyword**: UOB abbreviates "PAYMENT" as "PAYMT" in bank account descriptions (e.g. `PAYMT THRU E-BANK`). Added to Transfers & Payments keywords.
- **CC payment skip lines**: DBS and UOB CC parsers skip `payment received`, `autopay`, `auto pay` lines at parse time, matching Chase/Amex behavior — these entries never appear in the transaction list.
