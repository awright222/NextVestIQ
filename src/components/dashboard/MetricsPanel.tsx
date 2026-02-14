// ============================================
// MetricsPanel — Live metrics display for a deal
// ============================================
// Shows all calculated metrics with color-coded indicators.
// Re-renders instantly when the underlying deal data changes.

'use client';

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  BarChart3,
} from 'lucide-react';
import type { RealEstateDeal, BusinessDeal, HybridDeal, RealEstateMetrics, BusinessMetrics, HybridMetrics } from '@/types';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';
import { calcScoreFromMetrics, type InvestmentScore } from '@/lib/calculations/score';

interface MetricsPanelProps {
  dealType: 'real-estate' | 'business' | 'hybrid';
  data: RealEstateDeal | BusinessDeal | HybridDeal;
  /** Optional: base metrics to compare against (for scenario diff) */
  baseMetrics?: RealEstateMetrics | BusinessMetrics | HybridMetrics;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function ratio(n: number): string {
  if (!isFinite(n)) return '∞';
  return n.toFixed(2);
}

/** Show the diff from base value as a colored badge */
function DiffBadge({ current, base }: { current: number; base?: number }) {
  if (base === undefined) return null;
  const diff = current - base;
  if (Math.abs(diff) < 0.01) return null;

  const isPos = diff > 0;
  return (
    <span
      className={`ml-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
        isPos
          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      }`}
    >
      {isPos ? (
        <TrendingUp className="h-2.5 w-2.5" />
      ) : (
        <TrendingDown className="h-2.5 w-2.5" />
      )}
      {isPos ? '+' : ''}
      {Math.abs(diff) > 1000 ? fmt(diff) : diff.toFixed(2)}
    </span>
  );
}

export default function MetricsPanel({ dealType, data, baseMetrics }: MetricsPanelProps) {
  if (dealType === 'real-estate') {
    const m = calcRealEstateMetrics(data as RealEstateDeal);
    const b = baseMetrics as RealEstateMetrics | undefined;
    const score = calcScoreFromMetrics(dealType, data, m);

    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Key Metrics
          </h3>
          <ScoreRing score={score} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="Cap Rate" value={pct(m.capRate)}>
            <DiffBadge current={m.capRate} base={b?.capRate} />
          </Metric>
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="Cash-on-Cash" value={pct(m.cashOnCashReturn)}>
            <DiffBadge current={m.cashOnCashReturn} base={b?.cashOnCashReturn} />
          </Metric>
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="ROI (5yr)" value={pct(m.roi)}>
            <DiffBadge current={m.roi} base={b?.roi} />
          </Metric>
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="IRR" value={pct(m.irr)}>
            <DiffBadge current={m.irr} base={b?.irr} />
          </Metric>
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="NOI" value={fmt(m.noi)}>
            <DiffBadge current={m.noi} base={b?.noi} />
          </Metric>
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Annual Cash Flow" value={fmt(m.annualCashFlow)}>
            <DiffBadge current={m.annualCashFlow} base={b?.annualCashFlow} />
          </Metric>
          <Metric label="DSCR" value={ratio(m.dscr)}>
            <DiffBadge current={m.dscr} base={b?.dscr} />
          </Metric>
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Monthly Mortgage" value={fmt(m.monthlyMortgage)} />
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Cash Invested" value={fmt(m.totalCashInvested)} />
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Effective Gross Income" value={fmt(m.effectiveGrossIncome)} />
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Operating Expenses" value={fmt(m.operatingExpenses)} />
        </div>
      </div>
    );
  }

  // Hybrid
  if (dealType === 'hybrid') {
    const m = calcHybridMetrics(data as HybridDeal);
    const b = baseMetrics as HybridMetrics | undefined;
    const score = calcScoreFromMetrics(dealType, data, m);

    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Key Metrics
          </h3>
          <ScoreRing score={score} />
        </div>
        {/* Property + Business sub-headers */}
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-4">
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Property NOI" value={fmt(m.propertyNoi)}>
            <DiffBadge current={m.propertyNoi} base={b?.propertyNoi} />
          </Metric>
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="Cap Rate" value={pct(m.capRate)}>
            <DiffBadge current={m.capRate} base={b?.capRate} />
          </Metric>
        </div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 mb-4">
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="EBITDA" value={fmt(m.ebitda)}>
            <DiffBadge current={m.ebitda} base={b?.ebitda} />
          </Metric>
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="SDE" value={fmt(m.sde)}>
            <DiffBadge current={m.sde} base={b?.sde} />
          </Metric>
          <Metric label="Revenue Multiple" value={`${ratio(m.revenueMultiple)}x`} />
          <Metric label="SDE Multiple" value={`${ratio(m.sdeMultiple)}x`} />
        </div>
        <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Combined</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Total NOI" value={fmt(m.totalNoi)}>
            <DiffBadge current={m.totalNoi} base={b?.totalNoi} />
          </Metric>
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Annual Cash Flow" value={fmt(m.annualCashFlow)}>
            <DiffBadge current={m.annualCashFlow} base={b?.annualCashFlow} />
          </Metric>
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="Cash-on-Cash" value={pct(m.cashOnCashReturn)}>
            <DiffBadge current={m.cashOnCashReturn} base={b?.cashOnCashReturn} />
          </Metric>
          <Metric icon={<Percent className="h-3.5 w-3.5" />} label="ROI (5yr)" value={pct(m.roi)}>
            <DiffBadge current={m.roi} base={b?.roi} />
          </Metric>
          <Metric label="DSCR" value={ratio(m.dscr)}>
            <DiffBadge current={m.dscr} base={b?.dscr} />
          </Metric>
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Monthly Mortgage" value={fmt(m.monthlyMortgage)} />
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Cash Invested" value={fmt(m.totalCashInvested)} />
          <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Break-Even Revenue" value={fmt(m.breakEvenRevenue)}>
            <DiffBadge current={m.breakEvenRevenue} base={b?.breakEvenRevenue} />
          </Metric>
        </div>
      </div>
    );
  }

  // Business
  const m = calcBusinessMetrics(data as BusinessDeal);
  const b = baseMetrics as BusinessMetrics | undefined;
  const score = calcScoreFromMetrics(dealType, data, m);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Key Metrics
        </h3>
        <div data-tour="score-ring"><ScoreRing score={score} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="SDE" value={fmt(m.sde)}>
          <DiffBadge current={m.sde} base={b?.sde} />
        </Metric>
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="EBITDA" value={fmt(m.ebitda)}>
          <DiffBadge current={m.ebitda} base={b?.ebitda} />
        </Metric>
        <Metric icon={<Percent className="h-3.5 w-3.5" />} label="ROI" value={pct(m.roi)}>
          <DiffBadge current={m.roi} base={b?.roi} />
        </Metric>
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Annual Cash Flow" value={fmt(m.annualCashFlow)}>
          <DiffBadge current={m.annualCashFlow} base={b?.annualCashFlow} />
        </Metric>
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Break-Even Revenue" value={fmt(m.breakEvenRevenue)}>
          <DiffBadge current={m.breakEvenRevenue} base={b?.breakEvenRevenue} />
        </Metric>
        <Metric label="Revenue Multiple" value={`${ratio(m.revenueMultiple)}x`} />
        <Metric label="SDE Multiple" value={`${ratio(m.sdeMultiple)}x`} />
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Monthly Debt Service" value={fmt(m.monthlyDebtService)} />
        <Metric icon={<DollarSign className="h-3.5 w-3.5" />} label="Cash Invested" value={fmt(m.totalCashInvested)} />
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: InvestmentScore }) {
  // SVG ring gauge
  const size = 64;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score.total / 100) * circumference;

  const ringColor =
    score.total >= 80
      ? 'stroke-green-500'
      : score.total >= 65
      ? 'stroke-emerald-500'
      : score.total >= 50
      ? 'stroke-yellow-500'
      : score.total >= 35
      ? 'stroke-orange-500'
      : 'stroke-red-500';

  return (
    <div className="flex items-center gap-3" title={score.summary}>
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-secondary"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className={ringColor}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-card-foreground">
          {score.total}
        </span>
      </div>
      <div>
        <p className={`text-sm font-semibold ${score.color}`}>{score.label}</p>
        <p className="max-w-[200px] text-[11px] leading-tight text-muted-foreground">
          {score.summary}
        </p>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2.5">
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-card-foreground">
        {value}
        {children}
      </p>
    </div>
  );
}
