// ============================================
// Business Calculation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { BusinessDeal, FinancingTerms } from '@/types';
import {
  calcMonthlyDebtService,
  calcEBITDA,
  calcSDE,
  calcTotalCashInvested,
  calcAnnualCashFlow,
  calcROI,
  calcBreakEvenRevenue,
  calcRevenueMultiple,
  calcSDEMultiple,
  calcBusinessMetrics,
  projectBusinessCashFlows,
} from '@/lib/calculations/business';

// ─── Fixtures ────────────────────────────────────────

const financing: FinancingTerms = {
  loanType: 'sba-7a',
  loanAmount: 350_000,
  downPayment: 10,
  interestRate: 6.5,
  loanTermYears: 10,
  amortizationYears: 10,
};

const baseDeal: BusinessDeal = {
  type: 'business',
  askingPrice: 500_000,
  closingCosts: 15_000,
  annualRevenue: 600_000,
  costOfGoods: 180_000,
  operatingExpenses: 200_000,
  ownerSalary: 80_000,
  depreciation: 10_000,
  amortization: 5_000,
  interest: 8_000,
  taxes: 15_000,
  otherAddBacks: 12_000,
  financing,
  annualRevenueGrowth: 5,
  annualExpenseGrowth: 3,
};

// ─── Monthly Debt Service ────────────────────────────

describe('calcMonthlyDebtService', () => {
  it('returns correct payment', () => {
    const payment = calcMonthlyDebtService(financing);
    // $350k @ 6.5% / 10yr ≈ $3,975
    expect(payment).toBeGreaterThan(3_900);
    expect(payment).toBeLessThan(4_100);
  });

  it('returns 0 for zero loan', () => {
    expect(calcMonthlyDebtService({ ...financing, loanAmount: 0 })).toBe(0);
  });

  it('returns simple division at 0% interest', () => {
    const result = calcMonthlyDebtService({ ...financing, interestRate: 0 });
    expect(result).toBeCloseTo(350_000 / 120, 2);
  });
});

// ─── EBITDA ──────────────────────────────────────────

describe('calcEBITDA', () => {
  it('computes revenue - COGS - opex + add-backs', () => {
    const ebitda = calcEBITDA(baseDeal);
    // 600k - 180k - 200k + 10k + 5k + 8k + 15k = 258,000
    expect(ebitda).toBe(258_000);
  });

  it('can be negative when expenses dominate', () => {
    const deal = { ...baseDeal, annualRevenue: 100_000 };
    expect(calcEBITDA(deal)).toBeLessThan(0);
  });
});

// ─── SDE ─────────────────────────────────────────────

describe('calcSDE', () => {
  it('equals EBITDA + owner salary + add-backs', () => {
    const sde = calcSDE(baseDeal);
    const ebitda = calcEBITDA(baseDeal);
    expect(sde).toBe(ebitda + 80_000 + 12_000);
  });
});

// ─── Total Cash Invested ─────────────────────────────

describe('calcTotalCashInvested', () => {
  it('sums down payment + closing costs', () => {
    // 500k * 10% + 15k = 65,000
    expect(calcTotalCashInvested(baseDeal)).toBe(65_000);
  });
});

// ─── Annual Cash Flow ────────────────────────────────

describe('calcAnnualCashFlow', () => {
  it('equals SDE minus owner salary minus debt service', () => {
    const sde = calcSDE(baseDeal);
    const annualDebt = calcMonthlyDebtService(financing) * 12;
    const expected = sde - baseDeal.ownerSalary - annualDebt;
    expect(calcAnnualCashFlow(baseDeal)).toBeCloseTo(expected, 2);
  });
});

// ─── ROI ─────────────────────────────────────────────

describe('calcROI', () => {
  it('returns annual cash flow / cash invested as percentage', () => {
    const cf = calcAnnualCashFlow(baseDeal);
    const ci = calcTotalCashInvested(baseDeal);
    expect(calcROI(baseDeal)).toBeCloseTo((cf / ci) * 100, 2);
  });

  it('returns 0 when cash invested is 0', () => {
    const deal = {
      ...baseDeal,
      askingPrice: 0,
      closingCosts: 0,
      financing: { ...financing, downPayment: 0 },
    };
    expect(calcROI(deal)).toBe(0);
  });
});

// ─── Break-Even Revenue ──────────────────────────────

describe('calcBreakEvenRevenue', () => {
  it('returns positive value', () => {
    expect(calcBreakEvenRevenue(baseDeal)).toBeGreaterThan(0);
  });

  it('is below actual revenue for a profitable deal', () => {
    expect(calcBreakEvenRevenue(baseDeal)).toBeLessThan(baseDeal.annualRevenue);
  });

  it('returns 0 for zero revenue', () => {
    const deal = { ...baseDeal, annualRevenue: 0 };
    expect(calcBreakEvenRevenue(deal)).toBe(0);
  });

  it('returns Infinity when margin is zero or negative', () => {
    const deal = { ...baseDeal, costOfGoods: 700_000 };
    expect(calcBreakEvenRevenue(deal)).toBe(Infinity);
  });
});

// ─── Revenue Multiple ────────────────────────────────

describe('calcRevenueMultiple', () => {
  it('divides asking price by revenue', () => {
    // 500k / 600k ≈ 0.833
    expect(calcRevenueMultiple(baseDeal)).toBeCloseTo(500_000 / 600_000, 4);
  });

  it('returns 0 for zero revenue', () => {
    const deal = { ...baseDeal, annualRevenue: 0 };
    expect(calcRevenueMultiple(deal)).toBe(0);
  });
});

// ─── SDE Multiple ────────────────────────────────────

describe('calcSDEMultiple', () => {
  it('divides asking price by SDE', () => {
    const sde = calcSDE(baseDeal);
    expect(calcSDEMultiple(baseDeal)).toBeCloseTo(500_000 / sde, 4);
  });

  it('returns 0 for zero SDE', () => {
    const deal = {
      ...baseDeal,
      annualRevenue: 0,
      costOfGoods: 0,
      operatingExpenses: 0,
      ownerSalary: 0,
      depreciation: 0,
      amortization: 0,
      interest: 0,
      taxes: 0,
      otherAddBacks: 0,
    };
    expect(calcSDEMultiple(deal)).toBe(0);
  });
});

// ─── calcBusinessMetrics (all-in-one) ────────────────

describe('calcBusinessMetrics', () => {
  it('returns all metric fields', () => {
    const m = calcBusinessMetrics(baseDeal);
    expect(m).toHaveProperty('ebitda');
    expect(m).toHaveProperty('sde');
    expect(m).toHaveProperty('roi');
    expect(m).toHaveProperty('annualCashFlow');
    expect(m).toHaveProperty('breakEvenRevenue');
    expect(m).toHaveProperty('monthlyDebtService');
    expect(m).toHaveProperty('totalCashInvested');
    expect(m).toHaveProperty('revenueMultiple');
    expect(m).toHaveProperty('sdeMultiple');
  });

  it('metric values match individual functions', () => {
    const m = calcBusinessMetrics(baseDeal);
    expect(m.ebitda).toBe(calcEBITDA(baseDeal));
    expect(m.sde).toBe(calcSDE(baseDeal));
    expect(m.totalCashInvested).toBe(calcTotalCashInvested(baseDeal));
  });
});

// ─── Cash Flow Projections ───────────────────────────

describe('projectBusinessCashFlows', () => {
  it('returns correct number of years', () => {
    const proj = projectBusinessCashFlows(baseDeal, 8);
    expect(proj).toHaveLength(8);
    expect(proj[0].year).toBe(1);
    expect(proj[7].year).toBe(8);
  });

  it('revenue grows with annualRevenueGrowth', () => {
    const proj = projectBusinessCashFlows(baseDeal, 5);
    expect(proj[4].revenue).toBeGreaterThan(proj[0].revenue);
  });

  it('cumulative cash flow is sum of individual years (within rounding)', () => {
    const proj = projectBusinessCashFlows(baseDeal, 5);
    let sum = 0;
    for (const p of proj) {
      sum += p.cashFlow;
      expect(p.cumulativeCashFlow).toBeCloseTo(sum, -1);
    }
  });
});
