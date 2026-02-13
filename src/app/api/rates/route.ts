// ============================================
// API Route: /api/rates — Current Lending Rates
// ============================================
// In production, this route would:
//   1. Scrape or call APIs for current SBA, conventional, and FHA rates
//   2. Cache results in Firestore or in-memory (TTL ~24h)
//   3. Return normalized LendingRate[] to the frontend
//
// Potential data sources:
//   - SBA rates:  https://www.sba.gov/funding-programs/loans
//   - Bankrate API: https://www.bankrate.com (scrape)
//   - FRED API (Federal Reserve): https://fred.stlouisfed.org/docs/api/
//   - Freddie Mac PMMS: https://www.freddiemac.com/pmms
//
// For now, we return sensible defaults that can be overridden.

import { NextResponse } from 'next/server';
import type { LendingRate } from '@/types';

const rates: LendingRate[] = [
  {
    loanType: 'sba-7a',
    label: 'SBA 7(a)',
    interestRate: 10.5,
    termYears: 25,
    maxLtv: 90,
    downPaymentMin: 10,
    lastUpdated: new Date().toISOString(),
  },
  {
    loanType: 'sba-504',
    label: 'SBA 504',
    interestRate: 6.6,
    termYears: 25,
    maxLtv: 90,
    downPaymentMin: 10,
    lastUpdated: new Date().toISOString(),
  },
  {
    loanType: 'conventional',
    label: 'Conventional Multi-Family',
    interestRate: 7.25,
    termYears: 30,
    maxLtv: 80,
    downPaymentMin: 20,
    lastUpdated: new Date().toISOString(),
  },
  {
    loanType: 'fha',
    label: 'FHA Loan',
    interestRate: 6.5,
    termYears: 30,
    maxLtv: 96.5,
    downPaymentMin: 3.5,
    lastUpdated: new Date().toISOString(),
  },
  {
    loanType: 'hard-money',
    label: 'Hard Money / Bridge',
    interestRate: 12.0,
    termYears: 2,
    maxLtv: 70,
    downPaymentMin: 30,
    lastUpdated: new Date().toISOString(),
  },
];

export async function GET() {
  // TODO: Replace with live data fetching + caching
  return NextResponse.json({ rates });
}
