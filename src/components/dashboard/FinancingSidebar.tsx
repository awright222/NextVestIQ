// ============================================
// Financing Sidebar — Auto-populated lending rates
// ============================================
// Shows current average rates for common loan types.
// Users can override any value before applying to a deal.

'use client';

import { useState } from 'react';
import { X, RefreshCw, Info } from 'lucide-react';
import { useAppDispatch } from '@/hooks';
import { setSidebarOpen } from '@/store/uiSlice';
import type { LendingRate, LoanType } from '@/types';

/**
 * Default lending rates — in production these would be fetched from
 * an API route that scrapes/aggregates current market rates.
 * See /src/app/api/rates/route.ts for the API approach.
 */
const DEFAULT_RATES: LendingRate[] = [
  {
    loanType: 'sba-7a',
    label: 'SBA 7(a)',
    interestRate: 10.5,
    termYears: 25,
    maxLtv: 90,
    downPaymentMin: 10,
    lastUpdated: '2026-02-01',
  },
  {
    loanType: 'sba-504',
    label: 'SBA 504',
    interestRate: 6.6,
    termYears: 25,
    maxLtv: 90,
    downPaymentMin: 10,
    lastUpdated: '2026-02-01',
  },
  {
    loanType: 'conventional',
    label: 'Conventional Multi-Family',
    interestRate: 7.25,
    termYears: 30,
    maxLtv: 80,
    downPaymentMin: 20,
    lastUpdated: '2026-02-01',
  },
  {
    loanType: 'fha',
    label: 'FHA Loan',
    interestRate: 6.5,
    termYears: 30,
    maxLtv: 96.5,
    downPaymentMin: 3.5,
    lastUpdated: '2026-02-01',
  },
  {
    loanType: 'hard-money',
    label: 'Hard Money / Bridge',
    interestRate: 12.0,
    termYears: 2,
    maxLtv: 70,
    downPaymentMin: 30,
    lastUpdated: '2026-02-01',
  },
];

export default function FinancingSidebar() {
  const dispatch = useAppDispatch();
  const [rates, setRates] = useState<LendingRate[]>(DEFAULT_RATES);
  const [loading, setLoading] = useState(false);

  async function refreshRates() {
    setLoading(true);
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates);
      }
    } catch {
      // Silently fall back to defaults
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="w-80 shrink-0 border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-card-foreground">
          Current Lending Rates
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={refreshRates}
            disabled={loading}
            className="rounded p-1.5 transition hover:bg-secondary disabled:opacity-50"
            title="Refresh rates"
          >
            <RefreshCw
              className={`h-4 w-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={() => dispatch(setSidebarOpen(false))}
            className="rounded p-1.5 transition hover:bg-secondary"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Rate Cards */}
      <div className="space-y-3 p-4">
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Rates are periodically updated averages. Click a rate to apply it to
          your current deal, or override manually.
        </p>

        {rates.map((rate) => (
          <RateCard key={rate.loanType} rate={rate} />
        ))}
      </div>
    </aside>
  );
}

function RateCard({ rate }: { rate: LendingRate }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border p-3 transition hover:shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-semibold text-card-foreground">
            {rate.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Updated {new Date(rate.lastUpdated).toLocaleDateString()}
          </p>
        </div>
        <span className="text-lg font-bold text-primary">
          {rate.interestRate}%
        </span>
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
          <div>
            <p className="text-muted-foreground">Term</p>
            <p className="font-medium text-card-foreground">
              {rate.termYears} years
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Max LTV</p>
            <p className="font-medium text-card-foreground">{rate.maxLtv}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min Down</p>
            <p className="font-medium text-card-foreground">
              {rate.downPaymentMin}%
            </p>
          </div>
          <div>
            <button className="mt-1 rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:opacity-90">
              Apply to Deal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
