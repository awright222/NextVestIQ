// ============================================
// RecessionToggle — Stress test mode for deals
// ============================================
// Toggle to apply recession scenarios showing how
// a deal performs under pessimistic conditions.

'use client';

import { useState, useMemo } from 'react';
import { CloudRain, ChevronDown, ChevronUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Deal, RealEstateDeal, BusinessDeal, HybridDeal } from '@/types';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';
import { calcInvestmentScore } from '@/lib/calculations/score';
import { applyRecessionOverrides, getRecessionLabels, DEFAULT_RECESSION } from '@/lib/calculations/recession';

interface RecessionToggleProps {
  deal: Deal;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function RecessionToggle({ deal }: RecessionToggleProps) {
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isRE = deal.dealType === 'real-estate';
  const isHybrid = deal.dealType === 'hybrid';

  // Base metrics & score
  const baseScore = useMemo(() => calcInvestmentScore(deal), [deal]);
  const baseMetrics = useMemo(() => {
    if (isRE) return calcRealEstateMetrics(deal.data as RealEstateDeal);
    if (isHybrid) return calcHybridMetrics(deal.data as HybridDeal);
    return calcBusinessMetrics(deal.data as BusinessDeal);
  }, [deal, isRE, isHybrid]);

  // Stressed metrics & score
  const stressedData = useMemo(
    () => applyRecessionOverrides(deal.data, deal.dealType, DEFAULT_RECESSION),
    [deal.data, deal.dealType]
  );

  const stressedScore = useMemo(
    () => calcInvestmentScore({ ...deal, data: stressedData }),
    [deal, stressedData]
  );

  const stressedMetrics = useMemo(() => {
    if (isRE) return calcRealEstateMetrics(stressedData as RealEstateDeal);
    if (isHybrid) return calcHybridMetrics(stressedData as HybridDeal);
    return calcBusinessMetrics(stressedData as BusinessDeal);
  }, [stressedData, isRE, isHybrid]);

  const scoreDelta = stressedScore.total - baseScore.total;
  const cashFlowDelta = stressedMetrics.annualCashFlow - baseMetrics.annualCashFlow;
  const labels = getRecessionLabels(deal.dealType);

  // Color for the score delta
  const deltaColor = scoreDelta >= 0
    ? 'text-green-600 dark:text-green-400'
    : scoreDelta >= -15
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  const stressedScoreColor = stressedScore.total >= 65
    ? 'text-green-600 dark:text-green-400'
    : stressedScore.total >= 50
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* ─── Toggle Header ─────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CloudRain className={`h-5 w-5 ${active ? 'text-red-500' : 'text-muted-foreground'}`} />
          <h3 className="text-sm font-semibold text-card-foreground">Recession Mode</h3>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Stress Test
          </span>
        </div>
        <button
          onClick={() => setActive(!active)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            active ? 'bg-red-500' : 'bg-secondary'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {active && (
        <div className="mt-4 space-y-4">
          {/* ─── What Changed ────────────────────── */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Adjustments applied
          </button>

          {expanded && (
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400"
                >
                  <TrendingDown className="h-2.5 w-2.5" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* ─── Score Comparison ─────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Base Score</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{baseScore.total}</p>
              <p className="text-[10px] text-muted-foreground">{baseScore.label}</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className={`text-xl font-bold ${deltaColor}`}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                </p>
                <p className="text-[10px] text-muted-foreground">score change</p>
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground">Stressed Score</p>
              <p className={`mt-1 text-2xl font-bold ${stressedScoreColor}`}>{stressedScore.total}</p>
              <p className="text-[10px] text-muted-foreground">{stressedScore.label}</p>
            </div>
          </div>

          {/* ─── Key Metric Deltas ───────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricDelta
              label="Annual Cash Flow"
              base={baseMetrics.annualCashFlow}
              stressed={stressedMetrics.annualCashFlow}
              format={fmt}
            />
            {(isRE || isHybrid) && (
              <MetricDelta
                label="DSCR"
                base={'dscr' in baseMetrics ? baseMetrics.dscr : 0}
                stressed={'dscr' in stressedMetrics ? stressedMetrics.dscr : 0}
                format={(n) => isFinite(n) ? n.toFixed(2) : '∞'}
              />
            )}
            <MetricDelta
              label="ROI"
              base={'roi' in baseMetrics ? baseMetrics.roi : 0}
              stressed={'roi' in stressedMetrics ? stressedMetrics.roi : 0}
              format={(n) => `${n.toFixed(1)}%`}
            />
            {(isRE || isHybrid) && (
              <MetricDelta
                label="Cap Rate"
                base={'capRate' in baseMetrics ? baseMetrics.capRate : 0}
                stressed={'capRate' in stressedMetrics ? stressedMetrics.capRate : 0}
                format={(n) => `${n.toFixed(2)}%`}
              />
            )}
          </div>

          {/* ─── Warning ─────────────────────────── */}
          {cashFlowDelta < 0 && stressedMetrics.annualCashFlow < 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                  Negative cash flow under stress
                </p>
                <p className="mt-0.5 text-[10px] text-red-600 dark:text-red-400/80">
                  This deal would lose {fmt(Math.abs(stressedMetrics.annualCashFlow))}/year in a recession.
                  Consider building more cash reserves or negotiating a lower purchase price.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricDelta({
  label,
  base,
  stressed,
  format,
}: {
  label: string;
  base: number;
  stressed: number;
  format: (n: number) => string;
}) {
  const diff = stressed - base;
  const isPositive = diff >= 0;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{format(stressed)}</p>
      <p className={`text-[10px] font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '+' : ''}{format(diff)} from base
      </p>
    </div>
  );
}
