// ============================================
// Alert Evaluation Engine
// ============================================
// Checks deals against user-defined investment criteria
// and returns which criteria each deal matches.

import type {
  Deal,
  InvestmentCriteria,
  CriteriaCondition,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
} from '@/types';
import { calcRealEstateMetrics } from './calculations/real-estate';
import { calcBusinessMetrics } from './calculations/business';
import { calcHybridMetrics } from './calculations/hybrid';

/** Get the numeric metric value for a deal given a metric key */
function getMetricValue(deal: Deal, metric: string): number | null {
  if (deal.dealType === 'real-estate') {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    const map: Record<string, number> = {
      capRate: m.capRate,
      cashOnCashReturn: m.cashOnCashReturn,
      roi: m.roi,
      irr: m.irr,
      dscr: m.dscr,
      noi: m.noi,
      annualCashFlow: m.annualCashFlow,
      totalCashInvested: m.totalCashInvested,
      monthlyMortgage: m.monthlyMortgage,
    };
    return map[metric] ?? null;
  }

  if (deal.dealType === 'hybrid') {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    const map: Record<string, number> = {
      capRate: m.capRate,
      cashOnCashReturn: m.cashOnCashReturn,
      roi: m.roi,
      dscr: m.dscr,
      totalNoi: m.totalNoi,
      propertyNoi: m.propertyNoi,
      ebitda: m.ebitda,
      sde: m.sde,
      annualCashFlow: m.annualCashFlow,
      totalCashInvested: m.totalCashInvested,
      monthlyMortgage: m.monthlyMortgage,
      breakEvenRevenue: m.breakEvenRevenue,
      revenueMultiple: m.revenueMultiple,
      sdeMultiple: m.sdeMultiple,
    };
    return map[metric] ?? null;
  }

  // business
  const m = calcBusinessMetrics(deal.data as BusinessDeal);
  const map: Record<string, number> = {
    roi: m.roi,
    ebitda: m.ebitda,
    sde: m.sde,
    annualCashFlow: m.annualCashFlow,
    totalCashInvested: m.totalCashInvested,
    monthlyDebtService: m.monthlyDebtService,
    breakEvenRevenue: m.breakEvenRevenue,
    revenueMultiple: m.revenueMultiple,
    sdeMultiple: m.sdeMultiple,
  };
  return map[metric] ?? null;
}

/** Check if a single condition is satisfied */
function checkCondition(deal: Deal, cond: CriteriaCondition): boolean {
  const value = getMetricValue(deal, cond.metric);
  if (value === null) return false;

  switch (cond.operator) {
    case 'gte':
      return value >= cond.value;
    case 'lte':
      return value <= cond.value;
    case 'eq':
      return Math.abs(value - cond.value) < 0.01;
    default:
      return false;
  }
}

/** Check if a deal matches a criteria (all conditions must pass) */
export function dealMatchesCriteria(
  deal: Deal,
  criteria: InvestmentCriteria
): boolean {
  // Check deal type match
  if (criteria.dealType !== 'any' && criteria.dealType !== deal.dealType) {
    return false;
  }

  // All conditions must be true
  return criteria.conditions.every((cond) => checkCondition(deal, cond));
}

/** Get all active criteria that a deal matches */
export function getMatchingCriteria(
  deal: Deal,
  allCriteria: InvestmentCriteria[]
): InvestmentCriteria[] {
  return allCriteria
    .filter((c) => c.isActive)
    .filter((c) => dealMatchesCriteria(deal, c));
}

/** Available metrics per deal type for the criteria builder UI */
export const METRIC_OPTIONS: Record<
  'real-estate' | 'business' | 'hybrid' | 'any',
  { value: string; label: string; hint: string }[]
> = {
  'real-estate': [
    { value: 'capRate', label: 'Cap Rate (%)', hint: 'NOI / Purchase Price' },
    { value: 'cashOnCashReturn', label: 'Cash-on-Cash (%)', hint: 'Cash Flow / Cash Invested' },
    { value: 'roi', label: 'ROI 5yr (%)', hint: '5-year return on investment' },
    { value: 'irr', label: 'IRR (%)', hint: 'Internal rate of return' },
    { value: 'dscr', label: 'DSCR', hint: 'Debt service coverage ratio' },
    { value: 'noi', label: 'NOI ($)', hint: 'Net operating income' },
    { value: 'annualCashFlow', label: 'Annual Cash Flow ($)', hint: 'After debt service' },
  ],
  business: [
    { value: 'roi', label: 'ROI (%)', hint: 'Return on investment' },
    { value: 'ebitda', label: 'EBITDA ($)', hint: 'Earnings before interest, taxes, etc.' },
    { value: 'sde', label: 'SDE ($)', hint: 'Seller discretionary earnings' },
    { value: 'annualCashFlow', label: 'Annual Cash Flow ($)', hint: 'After debt service' },
    { value: 'revenueMultiple', label: 'Revenue Multiple (x)', hint: 'Price / Revenue' },
    { value: 'sdeMultiple', label: 'SDE Multiple (x)', hint: 'Price / SDE' },
    { value: 'breakEvenRevenue', label: 'Break-Even Revenue ($)', hint: 'Revenue to cover all costs' },
  ],
  hybrid: [
    { value: 'capRate', label: 'Cap Rate (%)', hint: 'Property NOI / Property Value' },
    { value: 'cashOnCashReturn', label: 'Cash-on-Cash (%)', hint: 'Cash Flow / Cash Invested' },
    { value: 'roi', label: 'ROI 5yr (%)', hint: '5-year return on investment' },
    { value: 'dscr', label: 'DSCR', hint: 'Debt service coverage ratio' },
    { value: 'totalNoi', label: 'Total NOI ($)', hint: 'Property + Business NOI' },
    { value: 'ebitda', label: 'EBITDA ($)', hint: 'Business earnings' },
    { value: 'sde', label: 'SDE ($)', hint: 'Seller discretionary earnings' },
    { value: 'annualCashFlow', label: 'Annual Cash Flow ($)', hint: 'After debt service' },
  ],
  any: [
    { value: 'roi', label: 'ROI (%)', hint: 'Return on investment' },
    { value: 'annualCashFlow', label: 'Annual Cash Flow ($)', hint: 'After debt service' },
    { value: 'capRate', label: 'Cap Rate (%)', hint: 'NOI / Purchase Price (RE/Hybrid only)' },
    { value: 'cashOnCashReturn', label: 'Cash-on-Cash (%)', hint: 'Cash Flow / Cash Invested (RE/Hybrid only)' },
    { value: 'dscr', label: 'DSCR', hint: 'Debt service coverage ratio (RE/Hybrid only)' },
    { value: 'ebitda', label: 'EBITDA ($)', hint: 'Business earnings (Biz/Hybrid only)' },
    { value: 'sde', label: 'SDE ($)', hint: 'Seller discretionary earnings (Biz/Hybrid only)' },
  ],
};
