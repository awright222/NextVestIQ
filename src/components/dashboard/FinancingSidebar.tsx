// ============================================
// Financing Sidebar — Live lending rates from FRED
// ============================================
// Auto-fetches current rates from /api/rates on mount.
// Shows derived lending rates + underlying benchmark indicators.
// Users can override any value before applying to a deal.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Info, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { useAppDispatch } from '@/hooks';
import { setSidebarOpen } from '@/store/uiSlice';
import type { LendingRate } from '@/types';

/** Underlying benchmark rates returned by /api/rates */
interface Underlying {
  '30yr_fixed': number | null;
  '15yr_fixed': number | null;
  prime: number | null;
  '10yr_treasury': number | null;
}

/** Fallback rates used while the API is loading */
const FALLBACK_RATES: LendingRate[] = [
  { loanType: 'sba-7a', label: 'SBA 7(a)', interestRate: 11.25, termYears: 25, maxLtv: 90, downPaymentMin: 10, lastUpdated: '2026-01-01' },
  { loanType: 'sba-504', label: 'SBA 504', interestRate: 6.65, termYears: 25, maxLtv: 90, downPaymentMin: 10, lastUpdated: '2026-01-01' },
  { loanType: 'conventional', label: 'Conventional', interestRate: 7.25, termYears: 30, maxLtv: 80, downPaymentMin: 20, lastUpdated: '2026-01-01' },
  { loanType: 'fha', label: 'FHA Loan', interestRate: 6.50, termYears: 30, maxLtv: 96.5, downPaymentMin: 3.5, lastUpdated: '2026-01-01' },
  { loanType: 'hard-money', label: 'Hard Money / Bridge', interestRate: 13.0, termYears: 2, maxLtv: 70, downPaymentMin: 30, lastUpdated: '2026-01-01' },
];

export default function FinancingSidebar() {
  const dispatch = useAppDispatch();
  const [rates, setRates] = useState<LendingRate[]>(FALLBACK_RATES);
  const [underlying, setUnderlying] = useState<Underlying | null>(null);
  const [source, setSource] = useState<'loading' | 'fred' | 'cache' | 'fallback'>('loading');
  const [loading, setLoading] = useState(false);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates);
        setSource(data.source ?? 'fred');
        if (data.underlying) setUnderlying(data.underlying);
      }
    } catch {
      setSource('fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => { fetchRates(); }, [fetchRates]);

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full border-l border-border bg-card sm:static sm:w-80 sm:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-card-foreground">
          Current Lending Rates
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchRates}
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
      <div className="space-y-3 overflow-y-auto p-4" style={{ maxHeight: 'calc(100vh - 56px)' }}>
        {/* Source indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          {source === 'fred' || source === 'cache' ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Live rates from Federal Reserve (FRED)</span>
            </>
          ) : source === 'loading' ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Fetching live rates...</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">Offline — showing approximate rates</span>
            </>
          )}
        </div>

        {/* Underlying benchmarks */}
        {underlying && (
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Benchmarks</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {underlying['30yr_fixed'] != null && (
                <div>
                  <p className="text-muted-foreground">30-Yr Fixed</p>
                  <p className="font-semibold text-foreground">{underlying['30yr_fixed']}%</p>
                </div>
              )}
              {underlying.prime != null && (
                <div>
                  <p className="text-muted-foreground">Prime Rate</p>
                  <p className="font-semibold text-foreground">{underlying.prime}%</p>
                </div>
              )}
              {underlying['10yr_treasury'] != null && (
                <div>
                  <p className="text-muted-foreground">10-Yr Treasury</p>
                  <p className="font-semibold text-foreground">{underlying['10yr_treasury']}%</p>
                </div>
              )}
              {underlying['15yr_fixed'] != null && (
                <div>
                  <p className="text-muted-foreground">15-Yr Fixed</p>
                  <p className="font-semibold text-foreground">{underlying['15yr_fixed']}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          Rates derived from FRED data (updated weekly). Click a rate to see details. Actual rates vary by lender and borrower.
        </p>

        {rates.map((rate) => (
          <RateCard key={rate.loanType} rate={rate} />
        ))}

        {/* FRED attribution */}
        <a
          href="https://fred.stlouisfed.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-muted-foreground transition hover:text-foreground"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Data: Federal Reserve Bank of St. Louis (FRED)
        </a>
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
