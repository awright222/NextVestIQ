// ============================================
// Landing Page — DealForge
// ============================================

import Image from 'next/image';
import Link from 'next/link';
import {
  BarChart3,
  Calculator,
  GitCompareArrows,
  TrendingUp,
  Shield,
  Zap,
  Building2,
  Briefcase,
  Store,
  FileText,
  Target,
  LineChart,
  ArrowRight,
  CheckCircle2,
  Scale,
  Brain,
  Gauge,
  Download,
} from 'lucide-react';

// ─── Feature cards (top section) ─────────────────────

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
    title: 'Live Market Rates',
    description:
      'Current SBA 7(a), SBA 504, and conventional loan rates from the Federal Reserve, auto-updated.',
  },
];

// ─── Deal types ──────────────────────────────────────

const dealTypes = [
  {
    icon: Building2,
    title: 'Real Estate',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    metrics: ['NOI', 'Cap Rate', 'Cash-on-Cash', 'IRR', 'DSCR'],
    examples: 'Single-Family Rentals, Duplexes, Apartments, Commercial',
  },
  {
    icon: Briefcase,
    title: 'Business Acquisition',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    border: 'border-violet-200 dark:border-violet-800',
    metrics: ['EBITDA', 'SDE', 'SDE Multiple', 'Revenue Multiple', 'Break-Even'],
    examples: 'Restaurants, E-Commerce, Service Companies, Franchises',
  },
  {
    icon: Store,
    title: 'Hybrid (RE + Business)',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    metrics: ['Property NOI', 'Business SDE', 'Combined DSCR', 'Cap Rate', 'Cash-on-Cash'],
    examples: 'Laundromats, Car Washes, Self-Storage, Gas Stations',
  },
];

// ─── How it works steps ──────────────────────────────

const steps = [
  {
    num: '01',
    title: 'Create a Deal',
    description: 'Pick a deal type, enter the financials, or start from a pre-filled template. The Quick Calc screener lets you filter listings in seconds.',
    icon: Calculator,
  },
  {
    num: '02',
    title: 'Run the Analysis',
    description: 'Instantly see key metrics, investment score, sensitivity analysis, and AI-powered deal feedback. Run what-if scenarios and recession stress tests.',
    icon: Brain,
  },
  {
    num: '03',
    title: 'Export & Negotiate',
    description: 'Generate professional PDF reports, lender packets, and data-backed negotiation briefs. Share with partners, lenders, or sellers.',
    icon: FileText,
  },
];

// ─── Analysis capabilities ───────────────────────────

const capabilities = [
  { icon: Gauge, title: 'Investment Score (0-100)', desc: 'Weighted composite across deal-specific metrics with risk penalties' },
  { icon: LineChart, title: 'Sensitivity Analysis', desc: 'Vary any input ±4 steps and see impact on 6 output metrics' },
  { icon: Shield, title: 'Recession Stress Test', desc: 'See how your deal performs under adverse economic conditions' },
  { icon: Scale, title: 'Negotiation Brief', desc: 'Data-backed PDF with fair market value, DSCR ceiling, and offer range' },
  { icon: Download, title: 'Lender Packet', desc: 'Bank-ready PDF with DSCR analysis, S&U, amortization, projections' },
  { icon: Target, title: 'AI Deal Feedback', desc: 'Narrative analysis that evaluates deals like a disciplined buyer' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Hero ────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-24">
        <Image
          src="/img/Logo.png"
          alt="DealForge"
          width={160}
          height={160}
          className="mx-auto mb-4 logo-adaptive"
          priority
        />
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
          Forge Better
          <br />
          <span className="text-primary">Investments</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Professional underwriting software for acquisition entrepreneurs.
          Analyze real estate, businesses, and hybrid deals with institutional-grade tools — in minutes, not hours.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Start Analyzing
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#how-it-works"
            className="rounded-lg border border-border px-6 py-3 text-base font-semibold text-foreground transition hover:bg-secondary"
          >
            See How It Works
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Free to use — no credit card required
        </p>
      </section>

      {/* ─── Deal Types ──────────────────────── */}
      <section className="border-t border-border bg-card/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Three Deal Types. One Platform.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Whether you&apos;re buying a rental property, acquiring a business, or purchasing a property with an operating business inside — DealForge speaks your language.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {dealTypes.map((dt) => (
              <div
                key={dt.title}
                className={`rounded-xl border ${dt.border} ${dt.bg} p-6 transition hover:shadow-md`}
              >
                <dt.icon className={`mb-4 h-8 w-8 ${dt.color}`} />
                <h3 className="text-lg font-bold text-foreground">{dt.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{dt.examples}</p>
                <ul className="mt-4 space-y-1.5">
                  {dt.metrics.map((m) => (
                    <li key={m} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${dt.color}`} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ───────────────────── */}
      <section id="features" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Everything You Need to Underwrite with Confidence
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Built by investors who got tired of spreadsheets.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </section>

      {/* ─── How It Works ────────────────────── */}
      <section id="how-it-works" className="border-t border-border bg-card/50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            From Listing to Offer in Three Steps
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Stop guessing. Start with the numbers.
          </p>

          <div className="mt-12 space-y-8">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="flex gap-5 rounded-xl border border-border bg-card p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
                  {step.num}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Analysis Capabilities ────────────── */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Deeper Analysis Than a Spreadsheet Can Offer
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Go beyond basic metrics with tools designed for serious buyers.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <div
                key={c.title}
                className="flex items-start gap-4 rounded-lg border border-border p-4 transition hover:bg-card"
              >
                <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ──────────────────────── */}
      <section className="border-t border-border bg-card/50 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Ready to Underwrite Your Next Deal?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Create your first deal in under two minutes. Start from scratch or use a pre-filled template.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────── */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} DealForge. Built for investors, by
        investors.
      </footer>
    </div>
  );
}
