# NextVestIQ

Real estate and business investment analysis platform. Evaluate deals with institutional-grade metrics, AI-powered deal analysis, scenario modeling, and side-by-side comparison.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit
- **Database / Auth**: Firebase (Firestore + Auth)
- **Charts**: Recharts
- **PDF Export**: jsPDF + autoTable
- **Testing**: Vitest (79 unit tests)
- **AI Analysis**: OpenAI GPT (optional) + built-in rule engine
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and add your credentials
cp .env.local.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

```env
# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# OpenAI (optional — enables AI-enhanced deal analysis)
OPENAI_API_KEY=sk-...
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analyze/route.ts    # AI deal analysis endpoint
│   │   └── rates/route.ts      # Lending rates endpoint
│   ├── auth/page.tsx           # Login / Signup / Reset
│   ├── dashboard/
│   │   ├── page.tsx            # Deal list dashboard
│   │   └── [id]/page.tsx       # Deal detail + analysis
│   ├── profile/page.tsx
│   ├── layout.tsx              # Root layout (providers)
│   └── page.tsx                # Landing page
├── components/
│   ├── charts/
│   │   ├── CashFlowChart.tsx
│   │   ├── ExpenseBreakdownChart.tsx
│   │   └── ScenarioComparisonChart.tsx
│   ├── dashboard/
│   │   ├── AlertCriteriaPanel.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── DealAnalysisPanel.tsx    # AI + rule-based deal feedback
│   │   ├── DealCard.tsx
│   │   ├── DealForm.tsx
│   │   ├── FinancingSidebar.tsx
│   │   ├── MetricsPanel.tsx
│   │   └── ScenarioPanel.tsx
│   ├── layout/Navbar.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── FirestoreSyncProvider.tsx
│   │   └── StoreProvider.tsx
│   └── ui/
│       ├── FormField.tsx
│       ├── Modal.tsx
│       ├── SectionHeader.tsx
│       ├── SelectField.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useFirestoreSync.ts
│   └── useRedux.ts
├── lib/
│   ├── alerts.ts              # Alert criteria matching
│   ├── analysis.ts            # Rule-based deal analysis engine
│   ├── auth.ts
│   ├── exportPdf.ts
│   ├── firebase.ts
│   ├── firestore.ts           # Firestore CRUD (deals + criteria)
│   └── calculations/
│       ├── business.ts
│       ├── hybrid.ts
│       ├── real-estate.ts
│       └── __tests__/         # 79 unit tests
├── store/
│   ├── criteriaSlice.ts
│   ├── dealsSlice.ts
│   ├── index.ts
│   └── uiSlice.ts
└── types/index.ts
```

## Features

### Deal Analysis (3 Property Types)
- **Real Estate** — Rental properties: NOI, Cap Rate, Cash-on-Cash, IRR, DSCR
- **Business** — Acquisitions: EBITDA, SDE, revenue/SDE multiples, break-even
- **Hybrid** — Combined RE + business (laundromats, car washes, restaurants)

### AI-Powered Deal Feedback
- Narrative analysis that evaluates deals like a disciplined buyer
- Covers: what the business produces (SDE), what rational buyers pay (multiples), reasonable price range, debt service test, and risk flags
- **Two modes**: built-in rule engine (always works) + OpenAI-enhanced analysis for richer narrative
- Add `OPENAI_API_KEY` to `.env.local` to enable AI mode

### What-If Scenarios
- Adjust any variable and see real-time metric impact
- Save, load, and compare named scenarios
- Scenario comparison chart

### Dashboard & Comparison
- Tab filtering, search, sort, grid/list toggle
- Side-by-side comparison table with sortable columns
- Investment alert badges on matching deals

### Charts & Export
- Cash flow projection (10-year area chart)
- Expense breakdown donut chart
- PDF deal reports with metrics, projections, and notes

### Auth & Persistence
- Firebase Auth (email/password + Google)
- Firestore auto-sync for deals and alert criteria
- Protected routes

## Scripts

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run test       # 79 unit tests
npm run test:watch # Watch mode
npm run lint       # ESLint
```

## Deploy

Deploy to [Vercel](https://vercel.com). Set environment variables in project settings.
