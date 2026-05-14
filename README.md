# Track My Cash

Personal finance tracker for net worth, expenses, and projections. Runs entirely on your machine — no accounts, no cloud, all data stored locally in your browser.

![Stack](https://img.shields.io/badge/React_19-TypeScript-blue) ![Stack](https://img.shields.io/badge/Node.js-Express-green) ![Stack](https://img.shields.io/badge/Tailwind_v4-CSS-38bdf8)

---

## Features

- **Net Worth** — track bank accounts, CPF, stocks, ETFs, mutual funds, crypto, and precious metals with live prices
- **Expenses** — upload bank statements (DBS, UOB, Chase, Amex, BofA) for automatic parsing and categorisation
- **Projections** — *(coming soon)*
- Live FX rates (SGD ↔ USD), SGX stock support (`.SI` suffix), CoinGecko crypto prices
- No API keys required

---

## Requirements

- [Node.js](https://nodejs.org) v18 or later
- npm v8 or later (comes with Node.js)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/DerickYap/TrackMyCash.git
cd TrackMyCash
```

### 2. Install dependencies

```bash
npm install
```

This installs dependencies for the backend, frontend, and the `packages/ui` design system in one step (npm workspaces).

### 3. Choose how to run it

---

## Option A — macOS Desktop Launcher (recommended)

Build the app once, then double-click to open it any time.

**First-time setup (one time only):**

```bash
# Build the frontend
npm run build --workspace=frontend
```

**Every time after that:**

Double-click **`start.command`** in the project folder. A Terminal window opens, the server starts, and your browser opens automatically at `http://localhost:3001`.

> To stop the app, close the Terminal window that opened.

**To rebuild after pulling new changes:**

```bash
# Delete the old build and rebuild
rm -rf frontend/dist
npm run build --workspace=frontend
```

Then double-click `start.command` as usual.

---

## Option B — Development Mode (for making changes)

Runs the frontend on Vite's dev server with hot reload, and the backend separately.

```bash
# Terminal 1 — backend
cd backend
npm run dev       # starts on http://localhost:3001

# Terminal 2 — frontend
cd frontend
npm run dev       # starts on http://localhost:5173
```

Open `http://localhost:5173` in your browser.

---

## Project Structure

```
TrackMyCash/
├── start.command          ← macOS double-click launcher
├── packages/
│   └── ui/                ← shared component library (@trackmycash/ui)
├── frontend/              ← React + Vite + Tailwind v4
│   └── src/
│       ├── components/    ← feature UI (networth, expense, projection, layout)
│       ├── store/         ← React Context + useReducer (4 slices)
│       ├── services/      ← API clients and bank statement parsers
│       ├── hooks/         ← usePriceRefresh, useFxRate, useProjection
│       ├── types/         ← TypeScript types
│       └── utils/         ← formatters, categoriser, currency helpers
└── backend/               ← Express proxy (Node.js)
    └── src/
        ├── routes/
        │   ├── quote.ts   ← GET /api/quote?symbol=  (yahoo-finance2)
        │   └── search.ts  ← GET /api/search?query=  (yahoo-finance2)
        └── middleware/
            └── rateLimiter.ts
```

---

## Data & Privacy

All your data is stored in your **browser's localStorage** on the device you use. Nothing is sent to any server except the price lookups (Yahoo Finance, CoinGecko, Frankfurter), which only send ticker symbols — never your balances.

Supported banks for statement upload: DBS (CSV), UOB (PDF/XLS/CSV), Chase (CSV), Amex (CSV), Bank of America (CSV/XLS).

---

## Supported Assets

| Type | How prices are fetched |
|------|----------------------|
| Stocks & ETFs | Yahoo Finance (`yahoo-finance2`) |
| SGX stocks | Yahoo Finance with `.SI` suffix (e.g. `D05.SI`) |
| Mutual funds | Yahoo Finance (e.g. `VINIX`) |
| Gold | Yahoo Finance `GC=F` (futures) |
| Silver | Yahoo Finance `SI=F` (futures) |
| Crypto | CoinGecko API (no key needed) |
| FX rates | Frankfurter API (no key needed) |

---

## Troubleshooting

**`start.command` says "permission denied"**
```bash
chmod +x start.command
```

**macOS warning: "start.command can't be opened because it's from an unidentified developer"**

Right-click → Open → Open anyway. You only need to do this once.

**Port 3001 already in use**

```bash
lsof -ti:3001 | xargs kill -9
```
Then try again.

**Prices show as stale after moving to a new device**

Click the refresh button in the top bar. Prices are fetched live — the stale badge just means the stored price is old.

**Frontend looks outdated after pulling changes**

```bash
rm -rf frontend/dist
npm run build --workspace=frontend
```
