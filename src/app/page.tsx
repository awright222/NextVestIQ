// ============================================
// Landing Page — NextVestIQ
// ============================================

import Link from 'next/link';
import {
  BarChart3,
  Calculator,
  GitCompareArrows,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: 'Automated Metrics',
    description:
      'Cap Rate, Cash-on-Cash, IRR, DSCR, EBITDA, SDE — calculated instantly from your inputs.',
  },
  {
    icon: GitCompareArrows,
    title: 'What-If Scenarios',
    description:
      'Adjust any variable and see how it impacts every metric in real time.',
  },
  {
    icon: BarChart3,
    title: 'Side-by-Side Comparison',
    description:
      'Compare multiple deals with sortable, filterable columns across all key metrics.',
  },
  {
    icon: TrendingUp,
    title: 'Cash Flow Projections',
    description:
      'Visualize 10-year cash flow, ROI trends, and scenario comparisons with interactive charts.',
  },
  {
    icon: Shield,
    title: 'Deal Alerts',
    description:
      'Set investment criteria and get notified when deals meet your thresholds.',
  },
  {
    icon: Zap,
    title: 'Auto-Populated Rates',
    description:
      'Current SBA 7(a), SBA 504, and conventional loan rates auto-filled with manual override.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Nav ─────────────────────────────── */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">
              NextVestIQ
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-foreground">
          Smarter Investment
          <br />
          <span className="text-primary">Analysis in Seconds</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Evaluate real estate properties and business acquisitions with
          institutional-grade metrics, scenario modeling, and side-by-side
          deal comparison — all in one platform.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Start Analyzing
          </Link>
          <Link
            href="#features"
            className="rounded-lg border border-border px-6 py-3 text-base font-semibold text-foreground transition hover:bg-secondary"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* ─── Features ────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 transition hover:shadow-md"
            >
              <f.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold text-card-foreground">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ──────────────────────────── */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} NextVestIQ. Built for investors, by
        investors.
      </footer>
    </div>
  );
}
