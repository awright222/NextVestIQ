// ============================================
// Sensitivity Analysis Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { Deal, RealEstateDeal, BusinessDeal, HybridDeal, FinancingTerms } from '@/types';
import {
  runSensitivity,
  getVariablesForDealType,
} from '@/lib/calculations/sensitivity';

// ─── Fixtures ────────────────────────────────────────

const financing: FinancingTerms = {
  loanType: 'conventional',
  loanAmount: 160_000,
  downPayment: 20,
  interestRate: 7,
  loanTermYears: 30,
  amortizationYears: 30,
};

const reDeal: RealEstateDeal = {
  type: 'real-estate',
  purchasePrice: 200_000,
  closingCosts: 5_000,
  rehabCosts: 10_000,
  grossRentalIncome: 24_000,
  otherIncome: 1_200,
  vacancyRate: 5,
  propertyTax: 2_400,
  insurance: 1_200,
  maintenance: 1_500,
  propertyManagement: 8,
  utilities: 600,
  otherExpenses: 300,
  financing,
  annualRentGrowth: 3,
  annualExpenseGrowth: 2,
  annualAppreciation: 3,
};

const bizDeal: BusinessDeal = {
  type: 'business',
  askingPrice: 500_000,
  closingCosts: 10_000,
  annualRevenue: 800_000,
  costOfGoods: 320_000,
  operatingExpenses: 200_000,
  ownerSalary: 80_000,
  depreciation: 15_000,
  amortization: 5_000,
  interest: 20_000,
  taxes: 30_000,
  otherAddBacks: 10_000,
  financing: {
    loanType: 'sba-7a',
    loanAmount: 400_000,
    downPayment: 20,
    interestRate: 6.5,
    loanTermYears: 10,
    amortizationYears: 10,
  },
  annualRevenueGrowth: 3,
  annualExpenseGrowth: 2,
};

function makeDeal(dealType: 'real-estate' | 'business' | 'hybrid', data: RealEstateDeal | BusinessDeal | HybridDeal): Deal {
  return {
    id: 'test',
    userId: 'u1',
    name: 'Test Deal',
    dealType,
    data,
    scenarios: [],
    notes: '',
    tags: [],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── getVariablesForDealType ──────────────────────────

describe('getVariablesForDealType', () => {
  it('returns RE variables for real-estate', () => {
    const vars = getVariablesForDealType('real-estate');
    expect(vars.length).toBeGreaterThanOrEqual(4);
    expect(vars.some((v) => v.key === 'vacancyRate')).toBe(true);
    expect(vars.some((v) => v.key === 'grossRentalIncome')).toBe(true);
  });

  it('returns business variables for business', () => {
    const vars = getVariablesForDealType('business');
    expect(vars.length).toBeGreaterThanOrEqual(4);
    expect(vars.some((v) => v.key === 'annualRevenue')).toBe(true);
    expect(vars.some((v) => v.key === 'askingPrice')).toBe(true);
  });

  it('returns hybrid variables for hybrid', () => {
    const vars = getVariablesForDealType('hybrid');
    expect(vars.length).toBeGreaterThanOrEqual(4);
    expect(vars.some((v) => v.key === 'purchasePrice')).toBe(true);
    expect(vars.some((v) => v.key === 'annualRevenue')).toBe(true);
  });
});

// ─── runSensitivity ───────────────────────────────────

describe('runSensitivity', () => {
  it('returns rows with one marked as base case', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'vacancyRate');
    const baseRows = result.rows.filter((r) => r.isBase);
    expect(baseRows.length).toBe(1);
    expect(baseRows[0].inputValue).toBe(5); // vacancy = 5%
  });

  it('returns multiple rows spanning around the base value', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'vacancyRate', 3);
    expect(result.rows.length).toBeGreaterThanOrEqual(5);
  });

  it('returns correct output metrics for RE', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'vacancyRate');
    expect(result.outputMetrics.some((m) => m.key === 'capRate')).toBe(true);
    expect(result.outputMetrics.some((m) => m.key === 'cashOnCash')).toBe(true);
    expect(result.outputMetrics.some((m) => m.key === 'dscr')).toBe(true);
  });

  it('returns correct output metrics for business', () => {
    const result = runSensitivity(makeDeal('business', bizDeal), 'annualRevenue');
    expect(result.outputMetrics.some((m) => m.key === 'sdeMultiple')).toBe(true);
    expect(result.outputMetrics.some((m) => m.key === 'roi')).toBe(true);
    expect(result.outputMetrics.some((m) => m.key === 'cashFlow')).toBe(true);
  });

  it('higher vacancy produces lower NOI', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'vacancyRate');
    const baseRow = result.rows.find((r) => r.isBase)!;
    const higherRows = result.rows.filter((r) => r.inputValue > baseRow.inputValue);

    if (higherRows.length > 0) {
      const lastRow = higherRows[higherRows.length - 1];
      expect(lastRow.metrics['noi']).toBeLessThan(baseRow.metrics['noi']);
    }
  });

  it('higher revenue produces higher SDE for business', () => {
    const result = runSensitivity(makeDeal('business', bizDeal), 'annualRevenue');
    const baseRow = result.rows.find((r) => r.isBase)!;
    const higherRows = result.rows.filter((r) => r.inputValue > baseRow.inputValue);

    if (higherRows.length > 0) {
      const lastRow = higherRows[higherRows.length - 1];
      expect(lastRow.metrics['sde']).toBeGreaterThan(baseRow.metrics['sde']);
    }
  });

  it('handles financing.interestRate (nested key)', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'financing.interestRate');
    const baseRow = result.rows.find((r) => r.isBase);
    expect(baseRow).toBeDefined();
    expect(baseRow!.inputValue).toBe(7); // 7% interest rate
    expect(result.rows.length).toBeGreaterThanOrEqual(5);
  });

  it('all metric values are numbers', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'vacancyRate');
    for (const row of result.rows) {
      for (const m of result.outputMetrics) {
        expect(typeof row.metrics[m.key]).toBe('number');
      }
    }
  });

  it('rows have formatted input labels', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'vacancyRate');
    for (const row of result.rows) {
      expect(row.inputLabel).toBeTruthy();
      expect(row.inputLabel).toContain('%'); // vacancy is a percent
    }
  });

  it('currency variables have $ in labels', () => {
    const result = runSensitivity(makeDeal('real-estate', reDeal), 'purchasePrice');
    for (const row of result.rows) {
      expect(row.inputLabel).toContain('$');
    }
  });
});
