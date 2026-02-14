// ============================================
// Comparison Table — Side-by-side deal metrics
// ============================================

'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, X } from 'lucide-react';
import type { Deal, RealEstateDeal, BusinessDeal, HybridDeal } from '@/types';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';
import { useAppDispatch } from '@/hooks';
import { toggleComparison } from '@/store/dealsSlice';

interface ComparisonTableProps {
  deals: Deal[];
}

type SortDir = 'asc' | 'desc';

/** Format a number as currency */
function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** The rows we display in the comparison table */
const metricRows = [
  { key: 'price', label: 'Price', format: fmt },
  { key: 'cashFlow', label: 'Annual Cash Flow', format: fmt },
  { key: 'roi', label: 'ROI', format: pct },
  { key: 'capRateOrSde', label: 'Cap Rate / SDE', format: (n: number) => n > 100 ? fmt(n) : pct(n) },
  { key: 'totalCashInvested', label: 'Cash Invested', format: fmt },
  { key: 'debtService', label: 'Monthly Debt Service', format: fmt },
] as const;

type MetricKey = (typeof metricRows)[number]['key'];

/** Extract a comparable numeric value for a deal */
function getMetricValue(deal: Deal, key: MetricKey): number {
  const isRE = deal.dealType === 'real-estate';
  const isHybrid = deal.dealType === 'hybrid';

  if (isRE) {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    switch (key) {
      case 'price': return (deal.data as RealEstateDeal).purchasePrice;
      case 'cashFlow': return m.annualCashFlow;
      case 'roi': return m.roi;
      case 'capRateOrSde': return m.capRate;
      case 'totalCashInvested': return m.totalCashInvested;
      case 'debtService': return m.monthlyMortgage;
    }
  } else if (isHybrid) {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    switch (key) {
      case 'price': return (deal.data as HybridDeal).purchasePrice;
      case 'cashFlow': return m.annualCashFlow;
      case 'roi': return m.roi;
      case 'capRateOrSde': return m.capRate;
      case 'totalCashInvested': return m.totalCashInvested;
      case 'debtService': return m.monthlyMortgage;
    }
  } else {
    const m = calcBusinessMetrics(deal.data as BusinessDeal);
    switch (key) {
      case 'price': return (deal.data as BusinessDeal).askingPrice;
      case 'cashFlow': return m.annualCashFlow;
      case 'roi': return m.roi;
      case 'capRateOrSde': return m.sde;
      case 'totalCashInvested': return m.totalCashInvested;
      case 'debtService': return m.monthlyDebtService;
    }
  }
}

export default function ComparisonTable({ deals }: ComparisonTableProps) {
  const dispatch = useAppDispatch();
  const [sortKey, setSortKey] = useState<MetricKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sortedDeals = useMemo(() => {
    if (!sortKey) return deals;
    return [...deals].sort((a, b) => {
      const va = getMetricValue(a, sortKey);
      const vb = getMetricValue(b, sortKey);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [deals, sortKey, sortDir]);

  function handleSort(key: MetricKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-base font-semibold text-card-foreground">
          Deal Comparison
        </h2>
      </div>

      <p className="mb-1 px-5 text-xs text-muted-foreground sm:hidden">← Scroll to compare →</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-2 py-3 text-left font-medium text-muted-foreground sm:px-4">
                Metric
              </th>
              {sortedDeals.map((deal) => (
                <th key={deal.id} className="px-2 py-3 text-right sm:px-4">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-medium text-card-foreground">
                      {deal.name}
                    </span>
                    <button
                      onClick={() => dispatch(toggleComparison(deal.id))}
                      className="rounded p-0.5 hover:bg-secondary"
                      title="Remove from comparison"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metricRows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-border last:border-0 hover:bg-secondary/30"
              >
                <td className="px-2 py-3 sm:px-4">
                  <button
                    onClick={() => handleSort(row.key)}
                    className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                  >
                    {row.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </td>
                {sortedDeals.map((deal) => {
                  const value = getMetricValue(deal, row.key);
                  return (
                    <td
                      key={deal.id}
                      className="px-2 py-3 text-right font-semibold text-card-foreground sm:px-4"
                    >
                      {row.format(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
