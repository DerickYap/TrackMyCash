# Product Requirements Document
## Track My Cash — Personal Finance Dashboard
**Version 2.1 (updated to reflect built state)**  
Platform: Web (React + Express) · Currencies: SGD + USD · Storage: localStorage

---

## 1. Overview

Track My Cash is a personal-use web app with three integrated modules:

- **Networth tracker** — manage assets and liabilities with live price feeds, view totals in SGD or USD
- **Expense tracker** — import bank and credit card statements, auto-categorise transactions, track monthly spend
- **Goal projector** — use actual income and spending data to project networth over time and calculate the savings rate needed to hit a target

All personal data is stored in browser localStorage. No login required. A lightweight Express backend proxies stock/metal price API calls so the API key is never exposed to the browser.

### 1.1 Problem Statement

Managing personal finances across two currencies requires juggling multiple banking apps, spreadsheets, and mental FX math. There is no single lightweight tool that combines a live networth snapshot, real spending data from bank statements, and a forward-looking projection — all in one private, no-login app.

### 1.2 Goals

- Single source of truth for networth across SGD and USD with live price feeds
- Frictionless expense tracking via statement imports from all major banks
- Actionable goal projection: given your actual spending, what savings rate hits your target networth by when?
- All personal data stays local — no cloud storage, no login, no third-party access
- Clean foundation for v3 additions: Singpass/CPF sync, Supabase persistence, iOS app

### 1.3 Non-Goals (MVP)

- Singpass / MyInfo CPF integration (v3)
- Supabase or any cloud database (v3)
- Net worth history chart (v3)
- Portfolio P&L, cost basis, or return tracking (v3)
- Multi-device sync (v3)
- iOS / React Native app (v3)

---

## 2. Target User

A single user based in Singapore with assets in both SGD and USD: bank accounts across DBS, UOB, Chase, Amex, and Bank of America; investments in US and SGX stocks and ETFs; CPF (including CPFIS via Endowus); a 401k with two funds (VINIX and T. Rowe Price 2065 Trust-F); physical gold and silver; and crypto holdings. The user wants to track spending via monthly statement imports and project networth growth toward a personal goal.

---

## 3. Architecture

| Component | Responsibility | Deployment |
|---|---|---|
| React frontend | All three modules, localStorage read/write, CoinGecko & FX calls | Vercel / Netlify / local |
| Express proxy | Forward stock/ETF/metals quote requests, hold API key | Railway / Render free tier / local |
| Price API | Live prices: stocks, ETFs, XAU, XAG (via proxy) | External |
| CoinGecko API | Live crypto prices (direct from frontend) | External |
| frankfurter.app | SGD/USD exchange rate (direct from frontend) | External |

CoinGecko and frankfurter.app require no API key and are called directly from the frontend. The stock/metals price API key is kept server-side. No personal financial data is ever sent to the proxy — only ticker symbols.

> **Note on price API:** Originally Twelve Data. The free plan is limited to 8 API credits/minute which can be exhausted quickly with multiple holdings. **Yahoo Finance** (unofficial, no key required) is the preferred replacement — same proxy structure, just different endpoint URLs. See section 8 for details.

---

## 4. Module 1 — Networth Tracker

### 4.1 Asset Categories

| Category | Sub-type | Entry style | Currency | Price feed |
|---|---|---|---|---|
| Cash & bank | — | Manual balance | SGD or USD | — |
| CPF | OA, SA, MA | Manual balance | SGD | — |
| CPFIS | OA invested | Manual balance | SGD | — |
| Retirement | 401k fund | Manual or holding | USD | Price API (VINIX only) |
| Stocks / ETFs | — | Individual holdings | SGD or USD | Price API |
| Mutual funds | — | Individual holdings | USD | Price API |
| Crypto | — | Individual holdings | USD | CoinGecko |
| Precious metals | Gold, Silver | Weight + unit | USD | Price API |
| Liabilities | — | Manual balance | SGD or USD | — |

### 4.2 Manual Entries

Fields: Name, Category, Sub-type (CPF only), Currency, Balance, Account/Brokerage (optional), Notes

- CPF OA balance must exclude CPFIS amount to avoid double-counting (UI shows a reminder)
- Liabilities stored as positive numbers, subtracted in all net worth calculations
- All fields editable via modal; delete requires confirmation

### 4.3 Individual Holdings (Stocks, ETFs, Mutual Funds, Crypto, Metals)

**Add a holding fields:** Asset class, Ticker / Coin ID / Metal type, Quantity / Weight + unit, Account/Brokerage (optional), Notes

**Ticker lookup flow:**
- While typing → symbol search API called (suggestions dropdown with name, exchange, currency)
- On selecting a suggestion → price quote fetched immediately
- On leaving the field without selecting → price quote fetched for the typed ticker
- SGX tickers use `.SI` suffix (e.g. `ES3.SI` for STI ETF, `D05.SI` for DBS)
- Crypto uses CoinGecko coin ID with search suggestions (e.g. `bitcoin`, `ethereum`)
- Metals: select Gold or Silver; enter weight + unit (troy oz or grams)

**Computed value:** `value = quantity × last fetched price`, converted to display currency. Stale badge shown if last fetch > 15 minutes ago.

**Precious metals:** grams converted to troy oz internally (`1 troy oz = 31.1035g`). Value = troy oz weight × spot price.

### 4.4 Account / Brokerage Grouping

Both manual entries and holdings have an optional **Account** field. The networth tab has a **Group by** toggle:

- **Type** — groups by asset class (bank / cpf / stock / etf / etc.)
- **Account** — groups by brokerage/account name (Robinhood / IBKR / 401k / etc.), alphabetical, "No Account" last

### 4.5 Asset Allocation Chart

A horizontal bar chart below the summary strip shows each asset category as a percentage of total assets, sorted by value, with compact value displayed. Liabilities are excluded.

### 4.6 Exchange Rate

- Source: frankfurter.app — fetched on load, cached 60 minutes
- Manual override: user types a custom rate; "Reset to live" restores fetched rate
- All cross-currency conversions use this single SGD/USD rate

### 4.7 Price Refresh

- All prices fetched on app load (staggered 800ms between requests to respect API rate limits)
- Passive refresh every 15 minutes while the tab is open
- "Refresh prices" button for on-demand update; disabled for 60 seconds after use
- Refresh only runs when the user is on the Networth tab (no background polling)

### 4.8 Summary Strip

- Net worth = Total assets − Total liabilities (large, prominent)
- Total assets and total liabilities shown as sub-figures
- Currency toggle (SGD / USD) converts all figures instantly

---

## 5. Module 2 — Expense Tracker

### 5.1 Supported Banks and Formats

| Bank / Card | File format | Amount layout | Notes |
|---|---|---|---|
| DBS | CSV | Separate Debit / Credit columns | Header rows before data; skip to header row |
| UOB | **PDF** (credit card) or XLS/CSV | Single amount (CR suffix = credit) | PDF: Post Date / Trans Date / Description / Amount; XLS: full dates |
| Chase | CSV | Single signed Amount (negative = debit) | Clean format |
| Amex | CSV | Single signed Amount (positive = charge) | User selects SGD or USD on upload |
| Bank of America | CSV or XLS | Single signed Amount (negative = debit) | Direct XLS upload supported |

**UOB PDF format specifics:**
- Columns: Post Date \| Trans Date \| Description of Transaction \| Transaction Amount SGD
- Dates: `DD MMM` format (no year); year extracted from "Statement Date DD MMM YYYY" on page 1
- Credits marked with `CR` suffix (payments, rebates)
- Ref No. lines and totals skipped automatically
- Parsed with `pdfjs-dist`

### 5.2 Upload Flow

1. Select bank from dropdown
2. Upload file (PDF / CSV / XLS accepted per bank)
3. Parser normalises to internal schema
4. Auto-categorisation runs via keyword map
5. Review screen — all transactions listed with assigned category, editable inline
6. Confirm import → saved to localStorage
7. Duplicate detection: identical date + description + amount skipped by default

### 5.3 Normalised Transaction Schema

| Field | Type | Notes |
|---|---|---|
| id | string (UUID) | Auto-generated |
| date | YYYY-MM-DD | Normalised from any source format |
| description | string | Raw from statement |
| amount | number (positive) | Always positive |
| type | enum | `debit` \| `credit` |
| currency | enum | `SGD` \| `USD` |
| category | string \| null | Auto-assigned; user-editable |
| source | enum | `DBS` \| `UOB` \| `Chase` \| `Amex` \| `BofA` \| `manual` |
| importedAt | ISO string | — |
| isDuplicate | boolean | Flagged; skipped on import by default |

### 5.4 Auto-Categorisation Keyword Map

| Category | Example keywords / merchants |
|---|---|
| Food & dining | Grab Food, Deliveroo, McDonald's, Kopitiam, FairPrice, Hawker, Restaurant, Cafe |
| Transport | Grab, ComfortDelGro, SMRT, EZ-Link, Gojek, Taxi, MRT, Bus |
| Utilities & bills | SP Group, Singtel, Starhub, M1, PUB, Town Council |
| Shopping | Shopee, Lazada, Amazon, NTUC, Cold Storage, Uniqlo, Zara |
| Travel | Singapore Airlines, Scoot, Changi Airport, Airbnb, Booking.com |
| Healthcare | Guardian, Watson, Raffles Medical, Clinic, Pharmacy, Hospital |
| Subscriptions | Netflix, Spotify, Apple, Google, ChatGPT, Adobe, Microsoft, iCloud |
| Transfers & payments | PayNow, FAST, GIRO, PayLah, Transfer, Payment |
| Income | Salary, Payroll, Interest, Dividend, Bonus |
| Investments | Brokerage, IBKR, Tiger, Syfe, Endowus, StashAway |
| Others | Everything that doesn't match the above |

Matching is case-insensitive and partial. User corrections are remembered per `source:description` pair and applied to future imports automatically.

### 5.5 Monthly Expense View

- Transactions grouped by month; switch months via selector
- Donut chart showing spend by category
- Total spend, total income, and net (income − spend) shown as summary figures
- Transaction list: date, description, amount, category (editable inline)
- Filter by category, search by description
- Manual transaction entry for cash purchases

---

## 6. Module 3 — Goal Projector

> **Status: Not yet built.** The tab exists in the app with a placeholder. All type definitions are in place.

### 6.1 Overview

Answers two questions:
1. Given my actual monthly surplus, **when** will I hit my target networth?
2. To hit my target by a specific date, **how much** do I need to save per month?

Uses real average monthly surplus from Module 2, applies assumed annual returns per asset class, and projects networth as a curve over time.

### 6.2 Inputs

| Input | Source | User-editable? |
|---|---|---|
| Current networth | Computed from Module 1 | No (live) |
| Average monthly surplus | Last 3 months from Module 2 | Yes — override allowed |
| Monthly income | Settings or Module 2 income transactions | Yes |
| Monthly expenses | Module 2 average | Yes — override allowed |
| Target networth | User sets | Yes |
| Target date (optional) | User sets | Yes |
| Return assumptions per asset class | Defaults provided | Yes |

### 6.3 Default Return Assumptions

| Asset class | Default annual return |
|---|---|
| Equities (stocks, ETFs) | 7% |
| CPF OA | 2.5% |
| CPF SA / MA | 4% |
| CPFIS | 5% |
| Retirement (401k) | 7% |
| Crypto | 0% |
| Precious metals | 2% |
| Cash & bank | 1.5% |

All assumptions are editable; changes trigger immediate recalculation.

### 6.4 Projection Calculations

**Forward:** given surplus, when do I hit the target?
```
each month: networth += (networth × blendedMonthlyReturn) + monthlySurplus
blendedMonthlyReturn = Σ(allocationWeight_i × annualReturn_i) / 12
```
Runs until target reached or 540 months (45 years), whichever comes first.

**Backward:** to hit target by date, what surplus do I need?
- Algebraic solve for required monthly surplus using the same compounding formula
- Output: required monthly savings + comfortable monthly spend (income − required savings)
- Warning if required savings exceeds income

### 6.5 Scenario Comparison

Up to 3 named scenarios with different surplus or return assumptions, plotted as separate curves on the same chart.

### 6.6 Projection Output

- Line chart: networth over time, target as horizontal dashed line
- Key milestones labelled on curve
- Summary card: target date, required monthly savings, comfortable monthly spend
- All figures in selected display currency

---

## 7. Data Model (localStorage)

### 7.1 Keys

| Key | Contents |
|---|---|
| `nw_entries` | JSON array of all manual entries and holdings |
| `nw_transactions` | JSON array of all imported and manual transactions |
| `nw_settings` | Display currency, FX rate, proxy URL, monthly income, return assumptions |
| `nw_category_memory` | `{ "source:description": "category" }` — user correction memory |
| `nw_projection_scenarios` | JSON array of saved projection scenarios |

### 7.2 Manual Entry Schema

```typescript
interface ManualEntry {
  id: string;                  // UUID
  entryType: 'manual';
  name: string;
  category: 'bank' | 'cpf' | 'cpfis' | 'retirement' | 'liability';
  cpfType: 'oa' | 'sa' | 'ma' | null;
  currency: 'SGD' | 'USD';
  balance: number;             // always positive
  account: string | null;      // brokerage / account name
  notes: string | null;
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
}
```

### 7.3 Holding Entry Schema

```typescript
interface HoldingEntry {
  id: string;                  // UUID
  entryType: 'holding';
  ticker: string;              // e.g. AAPL, ES3.SI, VINIX, bitcoin, XAUUSD=X
  name: string;                // auto-filled from price feed
  assetClass: 'stock' | 'etf' | 'crypto' | 'metal' | 'mutualfund';
  metalType: 'gold' | 'silver' | null;
  quantity: number;            // shares, coins, or weight
  weightUnit: 'troy_oz' | 'grams' | null;
  currency: 'SGD' | 'USD';
  lastPrice: number | null;
  lastFetchedAt: string | null;
  account: string | null;      // brokerage / account name
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 7.4 Settings Schema

```typescript
interface AppSettings {
  displayCurrency: 'SGD' | 'USD';
  fxRate: number;              // USD per 1 SGD, default 0.74
  fxSource: 'live' | 'manual';
  fxFetchedAt: string | null;
  proxyBaseUrl: string;        // default 'http://localhost:3001'
  monthlyIncome: number | null;
  returnAssumptions: {
    bank: number;    cpf_oa: number;  cpf_sa: number;
    cpfis: number;   retirement: number;
    equity: number;  crypto: number;  metals: number;
  };
}
```

---

## 8. Backend Proxy (Express)

### 8.1 Current Endpoints (Twelve Data)

| Endpoint | Forwards to | Notes |
|---|---|---|
| `GET /api/quote?symbol=AAPL` | Price API `/quote` | Stocks, ETFs, mutual funds |
| `GET /api/quote?symbol=XAU%2FUSD` | Price API `/quote` | Gold spot price |
| `GET /api/search?query=AAPL` | Price API `/symbol_search` | Ticker suggestions while typing |
| `GET /health` | — | Returns `{ status: 'ok' }` |

### 8.2 Planned: Switch to Yahoo Finance

**Why:** Twelve Data free plan = 8 credits/minute. Yahoo Finance is free, no key, higher limits.

**New endpoint mapping:**

| Route | Yahoo Finance URL | Notes |
|---|---|---|
| `GET /api/quote?symbol=AAPL` | `https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d` | Response: `data.chart.result[0].meta.regularMarketPrice` + `.currency` |
| `GET /api/search?query=AAPL` | `https://query2.finance.yahoo.com/v1/finance/search?q=AAPL&quotesCount=8&newsCount=0` | Response: `data.quotes[]` with `symbol`, `longname`, `exchange`, `currency` |

**Metal symbol changes:**
- Gold: `XAU/USD` → `XAUUSD=X`
- Silver: `XAG/USD` → `XAGUSD=X`

**Required header** to avoid Yahoo 429s:
```
User-Agent: Mozilla/5.0
```

**Files to update:** `backend/src/routes/quote.ts`, `backend/src/routes/search.ts`, `frontend/src/services/api/twelveData.ts`, `frontend/src/services/parsers/spreadsheetImporter.ts`, `backend/.env` (remove API key).

### 8.3 Environment Variables

| Variable | Value |
|---|---|
| `TWELVE_DATA_API_KEY` | Your Twelve Data key *(to be removed when switching to Yahoo Finance)* |
| `ALLOWED_ORIGIN` | Frontend URL for CORS (e.g. `http://localhost:5173`) |
| `PORT` | `3001` or set by host |

### 8.4 Security

- CORS restricted to `ALLOWED_ORIGIN` only
- Rate limiting: 60 requests/minute per IP (raised from original 10 to accommodate search + quote calls)
- No personal financial data sent to proxy — ticker symbols only

---

## 9. External APIs

### 9.1 Yahoo Finance (planned replacement)

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d
```
Key response fields: `chart.result[0].meta.regularMarketPrice`, `chart.result[0].meta.currency`, `chart.result[0].meta.longName`

### 9.2 CoinGecko — crypto (direct from frontend)

```
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd
GET https://api.coingecko.com/api/v3/search?query=bitcoin
```

### 9.3 frankfurter.app — FX rate (direct from frontend)

```
GET https://api.frankfurter.app/latest?from=SGD&to=USD
```
Returns `{ rates: { USD: 0.742 } }`. Fetched on load, cached 60 minutes.

---

## 10. UX Requirements

### 10.1 Navigation

- Three tabs: **Networth**, **Expenses**, **Projection**
- Top bar persistent: SGD/USD toggle, FX rate display, "Refresh prices" button, settings gear icon

### 10.2 Networth Tab Layout (top to bottom)

1. Summary strip: Net worth (large), Total assets, Total liabilities
2. Asset allocation chart (horizontal bars by category)
3. Group-by toggle: Type / Account
4. Entry groups (CategoryGroup rows)
5. Floating "+" add entry button

### 10.3 Add/Edit Entry Modal

- Step 1: choose entry type — **Manual** or **Holding**
- Manual fields: Name, Category, Sub-type (CPF only), Currency, Balance, Account, Notes
- Holding fields: Asset class → ticker search with suggestions → Quantity/Weight, Account, Notes
- Escape or click-outside closes without saving

### 10.4 Expenses Tab

- Upload area: bank selector, file picker (PDF/CSV/XLS accepted)
- Review screen: parsed transactions table, category editable inline
- Monthly view: month selector, summary figures, donut chart, transaction list
- Search and category filter
- Manual transaction entry button

### 10.5 Projection Tab *(to be built)*

- Input panel: current networth (read-only), monthly income, surplus (editable), target, target date
- Return assumptions panel (collapsible, editable per asset class)
- Line chart with target dashed line and milestone labels
- Summary card: time to target, required savings, comfortable monthly spend
- Scenario controls: up to 3 named curves

### 10.6 Settings Panel

- Proxy base URL, FX rate override, display currency
- Monthly income reference
- JSON export / import
- Clear all data (double-confirmation)
- Import from Google Sheets CSV (maps user's specific column layout)

---

## 11. Technical Stack

| Concern | Choice |
|---|---|
| Frontend | React 19 + Vite 8 + TypeScript |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Charts | Recharts |
| CSV parsing | PapaParse |
| XLS parsing | SheetJS (xlsx) |
| PDF parsing | pdfjs-dist (UOB credit card statements) |
| State | React Context + useReducer (4 separate slices) |
| Persistence | localStorage (5 keys) |
| Backend | Node.js + Express |
| Unique IDs | `crypto.randomUUID()` |

---

## 12. MVP vs V3 Scope

| Feature | MVP | V3 |
|---|---|---|
| Manual entries: bank, CPF, CPFIS, retirement, liabilities | ✅ Built | — |
| Individual holdings: stocks, SGX, ETFs, mutual funds | ✅ Built | — |
| Individual holdings: crypto (CoinGecko) | ✅ Built | — |
| Precious metals (XAU/XAG) | ✅ Built | — |
| Account/brokerage grouping | ✅ Built | — |
| Asset allocation chart | ✅ Built | — |
| SGD/USD toggle + live FX | ✅ Built | — |
| Ticker search suggestions | ✅ Built | — |
| Express proxy for price API | ✅ Built | — |
| localStorage + JSON export/import | ✅ Built | — |
| CSV/PDF/XLS import: DBS, UOB, Chase, Amex, BofA | ✅ Built | — |
| Auto-categorisation + correction memory | ✅ Built | — |
| Monthly expense view with chart | ✅ Built | — |
| Google Sheets CSV import | ✅ Built | — |
| Forward projection: surplus → target date | ⏳ Pending | — |
| Backward projection: target date → required savings | ⏳ Pending | — |
| Scenario comparison (up to 3 curves) | ⏳ Pending | — |
| Switch to Yahoo Finance (no API key) | ⏳ Pending | — |
| Networth history chart | — | ✅ |
| Portfolio P&L and cost basis | — | ✅ |
| Singpass / MyInfo CPF sync | — | ✅ |
| Supabase persistence + multi-device sync | — | ✅ |
| iOS app (React Native) | — | ✅ |

---

## 13. Known Constraints & Gotchas

- **Tailwind v4**: uses `@import "tailwindcss"` in CSS and `@tailwindcss/vite` Vite plugin — NOT `@tailwind base/components/utilities` or PostCSS config
- **Twelve Data free plan**: 8 API credits/minute — hit quickly with multiple holdings + search. Yahoo Finance switch is the fix
- **UOB credit card PDF**: dates are `DD MMM` only; year extracted from "Statement Date" line on page 1
- **CPF double-counting**: CPF OA balance should exclude CPFIS amount; UI shows a reminder
- **Metal values**: stored as original weight + unit; converted to troy oz only at display time (`÷ 31.1035`)
- **XAU/USD**: Twelve Data requires URL-encoding (`XAU%2FUSD`); Yahoo Finance uses `XAUUSD=X` (no encoding issue)
- **VINIX**: mutual fund — treated as a holding with `assetClass: 'mutualfund'`
- **T. Rowe Price 2065 Trust-F**: CIT with no public ticker — manual balance entry only
- **SGX tickers**: require `.SI` suffix in both Twelve Data and Yahoo Finance (e.g. `D05.SI`)
- **UOB XLS savings account**: parser exists but untested — only credit card PDF has been validated
- **Projection tab**: wired in `App.tsx` but renders a placeholder `<div>`; reducer and hook not yet created
- **Price refresh stagger**: 800ms between each ticker request to avoid bursting the API rate limit
- **Backend required**: for stock/ETF/metal prices; app degrades gracefully to cached values if proxy is unreachable
