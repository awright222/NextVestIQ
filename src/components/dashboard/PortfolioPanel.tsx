// ============================================
// PortfolioPanel — Multi-deal aggregate metrics
// ============================================
// Shows portfolio-level KPIs, type breakdown,
// deal ranking table, and allocation charts.

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  Building2,
  Briefcase,
  Store,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import type { Deal } from '@/types';
import { calcPortfolioMetrics, type PortfolioMetrics } from '@/lib/calculations/portfolio';

interface PortfolioPanelProps {
  deals: Deal[];
}

// ─── Formatters ──────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ─── Score helpers ───────────────────────────────────

function scoreLabel(total: number): string {
  if (total >= 80) return 'Strong Buy';
  if (total >= 65) return 'Good Deal';
  if (total >= 50) return 'Fair';
  if (total >= 35) return 'Below Avg';
  return 'Weak';
}

function scoreColorClass(total: number): string {
  if (total >= 80) return 'text-green-600 dark:text-green-400';
  if (total >= 65) return 'text-blue-600 dark:text-blue-400';
  if (total >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreBgClass(total: number): string {
  if (total >= 80) return 'bg-green-50 dark:bg-green-900/20';
  if (total >= 65) return 'bg-blue-50 dark:bg-blue-900/20';
  if (total >= 50) return 'bg-amber-50 dark:bg-amber-900/20';
  return 'bg-red-50 dark:bg-red-900/20';
}

// ─── Type icons & colors ─────────────────────────────

const typeConfig = {
  'real-estate': { icon: Building2, label: 'Real Estate', color: 'bg-blue-500' },
  business: { icon: Briefcase, label: 'Business', color: 'bg-violet-500' },
  hybrid: { icon: Store, label: 'Hybrid', color: 'bg-emerald-500' },
} as const;

// ─── Component ───────────────────────────────────────

export default function PortfolioPanel({ deals }: PortfolioPanelProps) {
  const router = useRouter();
  const metrics = useMemo(() => calcPortfolioMetrics(deals), [deals]);

  if (deals.length === 0) return null;

  const kpis: { label: string; value: string; icon: typeof DollarSign; subtext?: string }[] = [
    {
      label: 'Portfolio Value',
      value: fmtCompact(metrics.totalPortfolioValue),
      icon: DollarSign,
      subtext: `${metrics.dealCount} deal${metrics.dealCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Total Equity',
      value: fmtCompact(metrics.totalEquity),
      icon: Landmark,
      subtext: `LTV ${pct(metrics.portfolioLTV)}`,
    },
    {
      label: 'Annual Cash Flow',
      value: fmtCompact(metrics.totalAnnualCashFlow),
      icon: PiggyBank,
      subtext: `${fmtCompact(metrics.totalAnnualCashFlow / 12)}/mo`,
    },
    {
      label: 'Wtd Cash-on-Cash',
      value: pct(metrics.weightedCashOnCash),
      icon: TrendingUp,
      subtext: `ROI ${pct(metrics.weightedROI)}`,
    },
    {
      label: 'Avg Score',
      value: `${Math.round(metrics.averageScore)}`,
      icon: BarChart3,
      subtext: scoreLabel(metrics.averageScore),
    },
    {
      label: 'Annual Debt Service',
      value: fmtCompact(metrics.totalAnnualDebtService),
      icon: Landmark,
      subtext: `${fmtCompact(metrics.totalDebt)} total debt`,
    },
  ];

  // Allocation bar segments
  const totalValue = metrics.totalPortfolioValue || 1;
  const segments = (['real-estate', 'business', 'hybrid'] as const)
    .map((type) => {
      const dealsOfType = metrics.deals.filter((d) => d.dealType === type);
      const value = dealsOfType.reduce((sum, d) => sum + d.price, 0);
      return { type, value, pct: (value / totalValue) * 100 };
    })
    .filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      {/* ─── KPI Cards ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <kpi.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{kpi.label}</span>
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">{kpi.value}</p>
            {kpi.subtext && (
              <p className="mt-0.5 text-xs text-muted-foreground">{kpi.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* ─── Allocation Bar ───────────────────── */}
      {segments.length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Portfolio Allocation</h3>
          <div className="flex h-4 overflow-hidden rounded-full bg-secondary">
            {segments.map((seg) => (
              <div
                key={seg.type}
                className={`${typeConfig[seg.type].color} transition-all`}
                style={{ width: `${seg.pct}%` }}
                title={`${typeConfig[seg.type].label}: ${fmtCompact(seg.value)} (${pct(seg.pct)})`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-4">
            {segments.map((seg) => {
              const conf = typeConfig[seg.type];
              return (
                <div key={seg.type} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${conf.color}`} />
                  {conf.label}: {fmtCompact(seg.value)} ({pct(seg.pct)})
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Deal Ranking Table ───────────────── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Deal Rankings</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="hidden px-2 py-2.5 sm:table-cell sm:px-4">#</th>
                <th className="px-2 py-2.5 sm:px-4">Deal</th>
                <th className="hidden px-2 py-2.5 sm:table-cell sm:px-4">Type</th>
                <th className="px-2 py-2.5 text-right sm:px-4">Price</th>
                <th className="px-2 py-2.5 text-right sm:px-4">Cash Flow</th>
                <th className="hidden px-2 py-2.5 text-right sm:table-cell sm:px-4">CoC</th>
                <th className="hidden px-2 py-2.5 text-right sm:table-cell sm:px-4">ROI</th>
                <th className="px-2 py-2.5 text-right sm:px-4">Score</th>
              </tr>
            </thead>
            <tbody>
              {metrics.deals.map((d, i) => {
                const conf = typeConfig[d.dealType];
                const Icon = conf.icon;
                return (
                  <tr
                    key={d.id}
                    onClick={() => router.push(`/dashboard/${d.id}`)}
                    className="cursor-pointer border-b border-border transition hover:bg-secondary/50 last:border-0"
                  >
                    <td className="hidden px-2 py-3 text-muted-foreground sm:table-cell sm:px-4">{i + 1}</td>
                    <td className="px-2 py-3 font-medium text-foreground sm:px-4">{d.name}</td>
                    <td className="hidden px-2 py-3 sm:table-cell sm:px-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{conf.label}</span>
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right text-foreground sm:px-4">{fmtCompact(d.price)}</td>
                    <td className="px-2 py-3 text-right sm:px-4">
                      <span className={`flex items-center justify-end gap-1 ${d.annualCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {d.annualCashFlow >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {fmtCompact(d.annualCashFlow)}
                      </span>
                    </td>
                    <td className="hidden px-2 py-3 text-right text-foreground sm:table-cell sm:px-4">{pct(d.cashOnCash)}</td>
                    <td className="hidden px-2 py-3 text-right text-foreground sm:table-cell sm:px-4">{pct(d.roi)}</td>
                    <td className="px-2 py-3 text-right sm:px-4">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${scoreBgClass(d.score.total)} ${scoreColorClass(d.score.total)}`}>
                        {d.score.total}
                        <span className="hidden font-normal sm:inline">· {d.score.label}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer with totals */}
        <div className="border-t border-border bg-secondary/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="font-semibold text-foreground">Portfolio Totals</span>
            <span className="text-muted-foreground">
              Value: <span className="font-medium text-foreground">{fmtCompact(metrics.totalPortfolioValue)}</span>
            </span>
            <span className="text-muted-foreground">
              Cash Flow: <span className={`font-medium ${metrics.totalAnnualCashFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtCompact(metrics.totalAnnualCashFlow)}/yr</span>
            </span>
            <span className="text-muted-foreground">
              Cash Invested: <span className="font-medium text-foreground">{fmtCompact(metrics.totalCashInvested)}</span>
            </span>
            <span className="text-muted-foreground">
              Avg Score: <span className={`font-medium ${scoreColorClass(metrics.averageScore)}`}>{Math.round(metrics.averageScore)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
