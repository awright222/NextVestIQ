// ============================================
// Deal Card — Dashboard tile for a single deal
// ============================================

'use client';

import {
  Building2,
  Briefcase,
  Star,
  GitCompareArrows,
  Pencil,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import type { Deal } from '@/types';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import type { RealEstateDeal, BusinessDeal } from '@/types';

interface DealCardProps {
  deal: Deal;
  isComparing: boolean;
  onToggleCompare: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
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
  onToggleCompare,
  onToggleFavorite,
  onEdit,
}: DealCardProps) {
  const isRE = deal.dealType === 'real-estate';

  // Calculate metrics on the fly
  const metrics = isRE
    ? calcRealEstateMetrics(deal.data as RealEstateDeal)
    : calcBusinessMetrics(deal.data as BusinessDeal);

  const price = isRE
    ? (deal.data as RealEstateDeal).purchasePrice
    : (deal.data as BusinessDeal).askingPrice;

  return (
    <div
      className={`group relative rounded-xl border bg-card p-5 transition hover:shadow-md ${
        isComparing ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Top row: type badge + actions */}
      <div className="mb-3 flex items-start justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isRE
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
          }`}
        >
          {isRE ? (
            <Building2 className="h-3 w-3" />
          ) : (
            <Briefcase className="h-3 w-3" />
          )}
          {isRE ? 'Real Estate' : 'Business'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
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
            onClick={onToggleCompare}
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
            onClick={onEdit}
            className="rounded p-1 transition hover:bg-secondary"
            title="Edit deal"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
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
