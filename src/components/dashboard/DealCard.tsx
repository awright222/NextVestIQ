// ============================================
// Deal Card — Dashboard tile for a single deal
// ============================================

'use client';

import {
  Building2,
  Briefcase,
  Store,
  Star,
  GitCompareArrows,
  Pencil,
  Trash2,
  DollarSign,
  Bell,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Deal, InvestmentCriteria } from '@/types';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';
import { getMatchingCriteria } from '@/lib/alerts';
import type { RealEstateDeal, BusinessDeal, HybridDeal } from '@/types';

interface DealCardProps {
  deal: Deal;
  isComparing: boolean;
  criteria?: InvestmentCriteria[];
  onToggleCompare: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Format a number as currency */
function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format a number as percentage */
function pct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export default function DealCard({
  deal,
  isComparing,
  criteria,
  onToggleCompare,
  onToggleFavorite,
  onEdit,
  onDelete,
}: DealCardProps) {
  const router = useRouter();
  const isRE = deal.dealType === 'real-estate';
  const isHybrid = deal.dealType === 'hybrid';

  // Calculate metrics on the fly
  const metrics = isRE
    ? calcRealEstateMetrics(deal.data as RealEstateDeal)
    : isHybrid
    ? calcHybridMetrics(deal.data as HybridDeal)
    : calcBusinessMetrics(deal.data as BusinessDeal);

  const price = isRE
    ? (deal.data as RealEstateDeal).purchasePrice
    : isHybrid
    ? (deal.data as HybridDeal).purchasePrice
    : (deal.data as BusinessDeal).askingPrice;

  // Check alert matches
  const matchingAlerts = criteria ? getMatchingCriteria(deal, criteria) : [];

  return (
    <div
      onClick={() => router.push(`/dashboard/${deal.id}`)}
      className={`group relative cursor-pointer rounded-xl border bg-card p-5 transition hover:shadow-md ${
        isComparing ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Top row: type badge + actions */}
      <div className="mb-3 flex items-start justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isRE
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : isHybrid
              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
          }`}
        >
          {isRE ? (
            <Building2 className="h-3 w-3" />
          ) : isHybrid ? (
            <Store className="h-3 w-3" />
          ) : (
            <Briefcase className="h-3 w-3" />
          )}
          {isRE ? 'Real Estate' : isHybrid ? 'Hybrid' : 'Business'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="rounded p-1 transition hover:bg-secondary"
            title="Toggle favorite"
          >
            <Star
              className={`h-4 w-4 ${
                deal.isFavorite
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
            className="rounded p-1 transition hover:bg-secondary"
            title="Add to comparison"
          >
            <GitCompareArrows
              className={`h-4 w-4 ${
                isComparing ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded p-1 transition hover:bg-secondary"
            title="Edit deal"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded p-1 transition hover:bg-red-50 dark:hover:bg-red-950"
            title="Delete deal"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* Deal name & price */}
      <h3 className="text-base font-semibold text-card-foreground">
        {deal.name}
      </h3>
      <p className="mt-1 flex items-center gap-1 text-lg font-bold text-primary">
        <DollarSign className="h-4 w-4" />
        {fmt(price).replace('$', '')}
      </p>

      {/* Key metrics */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {isRE ? (
          <>
            <MetricPill label="Cap Rate" value={pct((metrics as ReturnType<typeof calcRealEstateMetrics>).capRate)} />
            <MetricPill label="Cash-on-Cash" value={pct((metrics as ReturnType<typeof calcRealEstateMetrics>).cashOnCashReturn)} />
            <MetricPill label="NOI" value={fmt((metrics as ReturnType<typeof calcRealEstateMetrics>).noi)} />
            <MetricPill label="DSCR" value={(metrics as ReturnType<typeof calcRealEstateMetrics>).dscr.toFixed(2)} />
          </>
        ) : isHybrid ? (
          <>
            <MetricPill label="Cap Rate" value={pct((metrics as ReturnType<typeof calcHybridMetrics>).capRate)} />
            <MetricPill label="Total NOI" value={fmt((metrics as ReturnType<typeof calcHybridMetrics>).totalNoi)} />
            <MetricPill label="Cash Flow" value={fmt((metrics as ReturnType<typeof calcHybridMetrics>).annualCashFlow)} />
            <MetricPill label="DSCR" value={(metrics as ReturnType<typeof calcHybridMetrics>).dscr.toFixed(2)} />
          </>
        ) : (
          <>
            <MetricPill label="SDE" value={fmt((metrics as ReturnType<typeof calcBusinessMetrics>).sde)} />
            <MetricPill label="EBITDA" value={fmt((metrics as ReturnType<typeof calcBusinessMetrics>).ebitda)} />
            <MetricPill label="ROI" value={pct((metrics as ReturnType<typeof calcBusinessMetrics>).roi)} />
            <MetricPill label="Cash Flow" value={fmt((metrics as ReturnType<typeof calcBusinessMetrics>).annualCashFlow)} />
          </>
        )}
      </div>

      {/* Scenarios count */}
      {deal.scenarios.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {deal.scenarios.length} scenario{deal.scenarios.length > 1 ? 's' : ''} saved
        </p>
      )}

      {/* Alert match badges */}
      {matchingAlerts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {matchingAlerts.map((alert) => (
            <span
              key={alert.id}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300"
              title={`Matches: ${alert.conditions.map((c) => `${c.metric} ${c.operator === 'gte' ? '≥' : c.operator === 'lte' ? '≤' : '='} ${c.value}`).join(', ')}`}
            >
              <Bell className="h-2.5 w-2.5" />
              {alert.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-secondary-foreground">{value}</p>
    </div>
  );
}
