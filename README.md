# DealForge

Forge Better Investments. Institutional-grade underwriting and scenario modeling for real estate and business acquisitions. Built for Serious Investors.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit
- **Database / Auth**: Firebase (Firestore + Auth)
- **Charts**: Recharts
- **PDF Export**: jsPDF + autoTable
- **Testing**: Vitest
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
│   ├── breakdowns/
│   │   ├── AssetSchedule.tsx       # Fixed asset & depreciation detail
│   │   ├── InterestBreakdown.tsx   # Loan-by-loan interest schedule
│   │   ├── LeaseBreakdown.tsx      # Per-location lease agreements
│   │   ├── PayrollBreakdown.tsx    # Employee roster + employer taxes
│   │   └── UtilityBreakdown.tsx    # Per-location utility costs
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
│   │   ├── MetricsPanel.tsx         # Includes score ring gauge
│   │   ├── ScenarioPanel.tsx
│   │   └── SensitivityGrid.tsx      # Interactive what-if grid
│   ├── layout/Navbar.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── FirestoreSyncProvider.tsx
│   │   ├── StoreProvider.tsx
│   │   └── ThemeProvider.tsx         # Dark mode context + toggle
│   └── ui/
│       ├── BreakdownDrawer.tsx     # Slide-out detail panel
│       ├── FormField.tsx
│       ├── Modal.tsx
│       ├── SectionHeader.tsx
│       ├── SelectField.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useChartColors.ts       # Theme-aware chart palette
│   ├── useFirestoreSync.ts
│   └── useRedux.ts
├── lib/
│   ├── alerts.ts              # Alert criteria matching
│   ├── analysis.ts            # Rule-based deal analysis engine
│   ├── auth.ts
│   ├── exportPdf.ts
│   ├── firebase.ts
│   ├── firestore.ts           # Firestore CRUD (deals + criteria)
│   ├── templates.ts           # 8 pre-filled deal starter templates
│   └── calculations/
│       ├── business.ts
│       ├── hybrid.ts
│       ├── real-estate.ts
│       ├── score.ts           # 0-100 investment score engine
│       ├── sensitivity.ts     # Single-variable sensitivity grid
│       └── __tests__/         # 146 unit tests
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

### Financial Detail Breakdowns
Optional drill-down schedules that auto-calculate parent totals — keeps the form simple for quick deals, with professional-grade detail when you need it:
- **Payroll** — Employee roster with headcount, hourly/salary rates, and employer taxes (FICA, FUTA, SUI, WC)
- **Assets** — Fixed asset & depreciation schedule (straight-line + MACRS methods)
- **Interest** — Loan-by-loan debt/interest schedule with lender and balance detail
- **Leases** — Per-location lease agreements with dates, escalation, NNN/CAM, and term warnings
- **Utilities** — Per-location utility costs by category (electric, gas, water, trash, internet)

### Investment Score (0–100)
- Weighted composite score across deal-type-specific metrics
- **Real Estate** — Cap Rate (25%), Cash-on-Cash (20%), DSCR (20%), IRR (15%), Cash Flow (10%), Expense Ratio (10%)
- **Business** — SDE Multiple (25%), ROI (20%), SDE Margin (20%), Cash Flow (20%), Revenue Multiple (15%)
- **Hybrid** — 7 components spanning both RE and business metrics
- Risk flag penalties deduct up to 25 points (negative cash flow, high vacancy, low DSCR, etc.)
- Labels: Strong Buy (80+), Good Deal (65+), Fair (50+), Below Average (35+), Weak (<35)
- Displayed as SVG ring gauge in MetricsPanel, colored badge on DealCard, and in PDF exports

### Sensitivity Analysis
- Single-variable grid: vary one input ±4 steps around base case
- 6 input variables per deal type (vacancy, interest rate, purchase price, etc.)
- 6 output metrics per row — see how Cap Rate, Cash-on-Cash, DSCR, etc. shift
- Base case row highlighted; green/red color coding shows direction of change
- Interactive variable selector dropdown

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

### Dark Mode
- System / Light / Dark toggle in navbar (Sun/Moon icon)
- Class-based `.dark` theming with CSS variables — no flash of wrong theme
- Theme-aware charts (grid lines, ticks, tooltips adapt automatically)
- Persists preference to localStorage

### Deal Templates
- 8 pre-filled starter templates with realistic financials
- **Real Estate** — Single-Family Rental, Duplex, 8-Unit Apartment
- **Business** — Restaurant, E-Commerce Store, Service Company (HVAC)
- **Hybrid** — Laundromat, Car Wash
- One-click populate: fills deal name, type, and all financial fields
- Shown in DealForm for new deals only — pick a template or start from scratch

### Empty States
- Welcoming first-time dashboard with feature icons and CTA
- Separate "no search results" state with clear messaging

## Scripts

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run test       # Unit tests
npm run test:watch # Watch mode
npm run lint       # ESLint
```

## Deploy

Deploy to [Vercel](https://vercel.com). Set environment variables in project settings.
