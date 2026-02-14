// ============================================
// Recession Mode — Stress-test deal metrics
// ============================================
// Applies pessimistic adjustments to a deal's data
// to simulate recession conditions: higher vacancy,
// lower revenue, higher interest rates.

import type { RealEstateDeal, BusinessDeal, HybridDeal, DealType } from '@/types';

export interface RecessionOverrides {
  vacancyIncrease: number;       // percentage points added (e.g. 7)
  revenueReduction: number;      // percentage reduction (e.g. 10 means -10%)
  interestRateIncrease: number;  // percentage points added (e.g. 1.5)
  expenseGrowthIncrease: number; // percentage points added (e.g. 1)
}

export const DEFAULT_RECESSION: RecessionOverrides = {
  vacancyIncrease: 7,
  revenueReduction: 10,
  interestRateIncrease: 1.5,
  expenseGrowthIncrease: 1,
};

/**
 * Apply recession overrides to a deal's data.
 * Returns a new data object with stressed values.
 */
export function applyRecessionOverrides(
  data: RealEstateDeal | BusinessDeal | HybridDeal,
  dealType: DealType,
  overrides: RecessionOverrides = DEFAULT_RECESSION,
): RealEstateDeal | BusinessDeal | HybridDeal {
  const stressed = JSON.parse(JSON.stringify(data));

  // Interest rate increase
  stressed.financing.interestRate += overrides.interestRateIncrease;

  if (dealType === 'real-estate') {
    const re = stressed as RealEstateDeal;
    re.vacancyRate = Math.min(re.vacancyRate + overrides.vacancyIncrease, 50);
    re.grossRentalIncome = Math.round(re.grossRentalIncome * (1 - overrides.revenueReduction / 100));
    re.annualRentGrowth = Math.max(re.annualRentGrowth - 2, -5);
    re.annualExpenseGrowth += overrides.expenseGrowthIncrease;
    re.annualAppreciation = Math.max(re.annualAppreciation - 3, -5);
  } else if (dealType === 'business') {
    const biz = stressed as BusinessDeal;
    biz.annualRevenue = Math.round(biz.annualRevenue * (1 - overrides.revenueReduction / 100));
    biz.annualRevenueGrowth = Math.max(biz.annualRevenueGrowth - 3, -10);
    biz.annualExpenseGrowth += overrides.expenseGrowthIncrease;
  } else {
    const hyb = stressed as HybridDeal;
    hyb.vacancyRate = Math.min(hyb.vacancyRate + overrides.vacancyIncrease, 50);
    hyb.grossRentalIncome = Math.round(hyb.grossRentalIncome * (1 - overrides.revenueReduction / 100));
    hyb.annualRevenue = Math.round(hyb.annualRevenue * (1 - overrides.revenueReduction / 100));
    hyb.annualRevenueGrowth = Math.max(hyb.annualRevenueGrowth - 3, -10);
    hyb.annualRentGrowth = Math.max(hyb.annualRentGrowth - 2, -5);
    hyb.annualExpenseGrowth += overrides.expenseGrowthIncrease;
    hyb.annualAppreciation = Math.max(hyb.annualAppreciation - 3, -5);
  }

  return stressed;
}

/**
 * Get human-readable labels for what recession mode changes.
 */
export function getRecessionLabels(
  dealType: DealType,
  overrides: RecessionOverrides = DEFAULT_RECESSION,
): string[] {
  const labels: string[] = [];
  labels.push(`Interest rate +${overrides.interestRateIncrease}%`);
  labels.push(`Revenue -${overrides.revenueReduction}%`);
  if (dealType !== 'business') {
    labels.push(`Vacancy +${overrides.vacancyIncrease}%`);
  }
  labels.push(`Expense growth +${overrides.expenseGrowthIncrease}%`);
  if (dealType !== 'business') {
    labels.push('Appreciation reduced');
  }
  return labels;
}
