# NextVestIQ

Real estate and business investment analysis platform. Evaluate deals with institutional-grade metrics, scenario modeling, and side-by-side comparison.

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit
- **Database / Auth**: Firebase (Firestore + Auth)
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and add your Firebase credentials
cp .env.local.example .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/rates/        # API route for lending rates
│   ├── dashboard/        # Dashboard page
│   ├── layout.tsx        # Root layout (wraps Redux Provider)
│   └── page.tsx          # Landing page
├── components/
│   ├── charts/           # Recharts visualizations
│   │   ├── CashFlowChart.tsx
│   │   └── ScenarioComparisonChart.tsx
│   ├── dashboard/        # Dashboard UI components
│   │   ├── ComparisonTable.tsx
│   │   ├── DealCard.tsx
│   │   └── FinancingSidebar.tsx
│   └── providers/        # Context providers
│       └── StoreProvider.tsx
├── hooks/                # Custom React hooks
│   ├── index.ts
│   └── useRedux.ts       # Typed useDispatch / useSelector
├── lib/
│   ├── firebase.ts       # Firebase init (Auth + Firestore)
│   └── calculations/     # Pure calculation engines
│       ├── business.ts   # EBITDA, SDE, ROI, Break-even
│       ├── index.ts
│       └── real-estate.ts # Cap Rate, CoC, IRR, DSCR, NOI
├── store/                # Redux Toolkit
│   ├── dealsSlice.ts     # Deals CRUD, scenarios, comparisons
│   ├── index.ts          # Store config
│   └── uiSlice.ts        # UI state (sidebar, modals, tabs)
└── types/
    └── index.ts          # All TypeScript interfaces
```

## Key Features (Step 1 — Scaffolded)

- [x] Type-safe data models for real estate & business deals
- [x] Pure calculation engines (Cap Rate, Cash-on-Cash, IRR, DSCR, EBITDA, SDE, ROI, Break-even)
- [x] Redux Toolkit store with deals, scenarios, and UI slices
- [x] Dashboard with deal cards, tab filtering, grid/list toggle
- [x] Side-by-side comparison table with sortable columns
- [x] Financing sidebar with auto-populated lending rates
- [x] Cash flow projection chart (Recharts)
- [x] Scenario comparison bar chart
- [x] API route for lending rates (`/api/rates`)

## Next Steps

- [ ] Deal input form (create/edit real estate & business deals)
- [ ] Scenario builder / what-if panel
- [ ] Firebase Auth integration (login/signup)
- [ ] Firestore persistence (save/load deals)
- [ ] Live lending rate fetching (FRED API, scraping)
- [ ] Alert system for investment criteria
- [ ] Full chart integration on deal detail page

## Deploy

```bash
npm run build   # Production build
```

Deploy to [Vercel](https://vercel.com) for the easiest Next.js hosting.
