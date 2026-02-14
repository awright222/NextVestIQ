// ============================================
// API Route: /api/rates — Live Lending Rates via FRED
// ============================================
// Fetches current interest rates from the Federal Reserve Economic
// Data (FRED) API and derives common lending rates from them.
//
// Data sources (all free, public domain):
//   - MORTGAGE30US  — 30-Year Fixed Rate Mortgage Average
//   - MORTGAGE15US  — 15-Year Fixed Rate Mortgage Average
//   - DPRIME        — Wall Street Journal Prime Rate
//   - DGS10         — 10-Year Treasury Constant Maturity
//
// From these we derive:
//   - SBA 7(a)      = Prime + 2.75%
//   - SBA 504       = 10-Year Treasury + 2.4% (CDC portion debenture spread)
//   - Conventional  = 30-Year Fixed + 0.5% (commercial spread)
//   - FHA           = 30-Year Fixed - 0.25% (gov-backed discount)
//   - Hard Money    = Prime + 4.5%
//
// Results are cached in-memory for 12 hours. If FRED is unreachable,
// sensible fallback defaults are returned.
//
// Optional: Set FRED_API_KEY in .env.local for live rates.
// Register for a free key at https://fred.stlouisfed.org/docs/api/api_key.html
// Without a key, the route returns sensible default rates.

import { NextResponse } from 'next/server';
import type { LendingRate } from '@/types';

// ─── In-memory cache ─────────────────────────────────────────

interface CacheEntry {
  rates: LendingRate[];
  underlying: Record<string, number | null>;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// ─── FRED API helpers ────────────────────────────────────────

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

/** FRED series IDs we need */
const SERIES = {
  MORTGAGE30: 'MORTGAGE30US',
  MORTGAGE15: 'MORTGAGE15US',
  PRIME: 'DPRIME',
  TREASURY10: 'DGS10',
} as const;

/**
 * Fetch the most recent observation for a FRED series.
 * Returns the numeric value + date, or null on failure.
 */
async function fetchFredSeries(seriesId: string): Promise<{ value: number; date: string } | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null; // No key configured — skip FRED

  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', seriesId);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '5'); // last 5 in case most recent is '.'
  url.searchParams.set('observation_start', getRecentDate());

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    const observations = data?.observations;
    if (!Array.isArray(observations) || observations.length === 0) return null;

    // FRED sometimes returns '.' for missing data — find first valid number
    for (const obs of observations) {
      const val = parseFloat(obs.value);
      if (!isNaN(val)) {
        return { value: val, date: obs.date };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Returns a date string ~90 days ago to limit the FRED query window */
function getRecentDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0];
}

// ─── Rate derivation ────────────────────────────────────────

interface FredData {
  mortgage30: { value: number; date: string } | null;
  mortgage15: { value: number; date: string } | null;
  prime: { value: number; date: string } | null;
  treasury10: { value: number; date: string } | null;
}

function deriveRates(fred: FredData): LendingRate[] {
  // Fall back to sensible defaults if individual series are missing
  const m30 = fred.mortgage30?.value ?? 6.75;
  const prime = fred.prime?.value ?? 8.5;
  const t10 = fred.treasury10?.value ?? 4.25;

  const now = new Date().toISOString();

  return [
    {
      loanType: 'sba-7a',
      label: 'SBA 7(a)',
      interestRate: round(prime + 2.75),
      termYears: 25,
      maxLtv: 90,
      downPaymentMin: 10,
      lastUpdated: fred.prime?.date ?? now,
    },
    {
      loanType: 'sba-504',
      label: 'SBA 504',
      interestRate: round(t10 + 2.40),
      termYears: 25,
      maxLtv: 90,
      downPaymentMin: 10,
      lastUpdated: fred.treasury10?.date ?? now,
    },
    {
      loanType: 'conventional',
      label: 'Conventional',
      interestRate: round(m30 + 0.50),
      termYears: 30,
      maxLtv: 80,
      downPaymentMin: 20,
      lastUpdated: fred.mortgage30?.date ?? now,
    },
    {
      loanType: 'fha',
      label: 'FHA Loan',
      interestRate: round(Math.max(m30 - 0.25, 3.0)),
      termYears: 30,
      maxLtv: 96.5,
      downPaymentMin: 3.5,
      lastUpdated: fred.mortgage30?.date ?? now,
    },
    {
      loanType: 'hard-money',
      label: 'Hard Money / Bridge',
      interestRate: round(prime + 4.5),
      termYears: 2,
      maxLtv: 70,
      downPaymentMin: 30,
      lastUpdated: fred.prime?.date ?? now,
    },
  ];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Fallback rates (if FRED is completely unreachable) ──────

const FALLBACK_RATES: LendingRate[] = [
  { loanType: 'sba-7a', label: 'SBA 7(a)', interestRate: 11.25, termYears: 25, maxLtv: 90, downPaymentMin: 10, lastUpdated: '2026-01-01' },
  { loanType: 'sba-504', label: 'SBA 504', interestRate: 6.65, termYears: 25, maxLtv: 90, downPaymentMin: 10, lastUpdated: '2026-01-01' },
  { loanType: 'conventional', label: 'Conventional', interestRate: 7.25, termYears: 30, maxLtv: 80, downPaymentMin: 20, lastUpdated: '2026-01-01' },
  { loanType: 'fha', label: 'FHA Loan', interestRate: 6.50, termYears: 30, maxLtv: 96.5, downPaymentMin: 3.5, lastUpdated: '2026-01-01' },
  { loanType: 'hard-money', label: 'Hard Money / Bridge', interestRate: 13.0, termYears: 2, maxLtv: 70, downPaymentMin: 30, lastUpdated: '2026-01-01' },
];

// ─── Route handler ───────────────────────────────────────────

export async function GET() {
  // Return cached rates if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return NextResponse.json({
      rates: cache.rates,
      source: 'cache',
      underlying: cache.underlying,
      cachedAt: new Date(cache.fetchedAt).toISOString(),
    });
  }

  // Fetch all four FRED series in parallel
  const [mortgage30, mortgage15, prime, treasury10] = await Promise.all([
    fetchFredSeries(SERIES.MORTGAGE30),
    fetchFredSeries(SERIES.MORTGAGE15),
    fetchFredSeries(SERIES.PRIME),
    fetchFredSeries(SERIES.TREASURY10),
  ]);

  const anyData = mortgage30 || mortgage15 || prime || treasury10;

  if (!anyData) {
    // FRED completely unreachable — return fallbacks
    return NextResponse.json({
      rates: FALLBACK_RATES,
      source: 'fallback',
      note: 'Could not reach FRED API. Showing approximate rates.',
    });
  }

  const underlying = {
    '30yr_fixed': mortgage30?.value ?? null,
    '15yr_fixed': mortgage15?.value ?? null,
    prime: prime?.value ?? null,
    '10yr_treasury': treasury10?.value ?? null,
  };

  const rates = deriveRates({ mortgage30, mortgage15, prime, treasury10 });

  // Populate cache
  cache = { rates, underlying, fetchedAt: Date.now() };

  return NextResponse.json({
    rates,
    source: 'fred',
    underlying,
  });
}
