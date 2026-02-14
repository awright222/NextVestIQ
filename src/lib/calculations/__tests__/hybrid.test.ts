// ============================================
// Hybrid Deal Calculation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { HybridDeal, FinancingTerms } from '@/types';
import {
  calcMonthlyMortgage,
  calcPropertyEGI,
  calcPropertyExpenses,
  calcPropertyNOI,
  calcCapRate,
  calcEBITDA,
  calcSDE,
  calcRevenueMultiple,
  calcSDEMultiple,
  calcTotalNOI,
  calcTotalCashInvested,
  calcAnnualCashFlow,
  calcCashOnCash,
  calcROI,
  calcDSCR,
  calcBreakEvenRevenue,
  calcEffectiveGrossIncome,
  calcTotalOperatingExpenses,
  calcHybridMetrics,
  projectHybridCashFlows,
} from '@/lib/calculations/hybrid';

// ─── Fixtures ────────────────────────────────────────

const financing: FinancingTerms = {
  loanType: 'sba-504',
  loanAmount: 400_000,
  downPayment: 20,
  interestRate: 6,
  loanTermYears: 25,
  amortizationYears: 25,
};

const baseDeal: HybridDeal = {
  type: 'hybrid',
  purchasePrice: 500_000,
  propertyValue: 300_000,
  businessValue: 200_000,
  closingCosts: 12_000,
  rehabCosts: 15_000,

  // Property
  grossRentalIncome: 18_000,
  otherPropertyIncome: 2_000,
  vacancyRate: 5,
  propertyTax: 3_600,
  insurance: 1_800,
  maintenance: 2_000,
  propertyManagement: 8,
  utilities: 1_200,
  otherPropertyExpenses: 500,

  // Business
  annualRevenue: 400_000,
  costOfGoods: 120_000,
  businessOperatingExpenses: 150_000,
  ownerSalary: 60_000,
  depreciation: 8_000,
  amortization: 4_000,
  interest: 6_000,
  taxes: 10_000,
  otherAddBacks: 5_000,

  financing,

  annualRevenueGrowth: 4,
  annualRentGrowth: 3,
  annualExpenseGrowth: 2,
  annualAppreciation: 3,
};

// ─── Mortgage ────────────────────────────────────────

describe('calcMonthlyMortgage', () => {
  it('returns correct payment', () => {
    const payment = calcMonthlyMortgage(financing);
    // $400k @ 6% / 25yr ≈ $2,577
    expect(payment).toBeGreaterThan(2_500);
    expect(payment).toBeLessThan(2_700);
  });

  it('returns 0 when amount or rate is zero', () => {
    expect(calcMonthlyMortgage({ ...financing, loanAmount: 0 })).toBe(0);
    expect(calcMonthlyMortgage({ ...financing, interestRate: 0 })).toBe(0);
  });
});

// ─── Property EGI ────────────────────────────────────

describe('calcPropertyEGI', () => {
  it('subtracts vacancy from gross property income', () => {
    // (18000 + 2000) * 0.95 = 19,000
    expect(calcPropertyEGI(baseDeal)).toBeCloseTo(19_000, 2);
  });

  it('returns 0 at 100% vacancy', () => {
    expect(calcPropertyEGI({ ...baseDeal, vacancyRate: 100 })).toBe(0);
  });
});

// ─── Property Expenses ──────────────────────────────

describe('calcPropertyExpenses', () => {
  it('includes management fee based on gross property income', () => {
    const expenses = calcPropertyExpenses(baseDeal);
    const mgmt = 20_000 * 0.08; // 1600
    const expected = 3600 + 1800 + 2000 + mgmt + 1200 + 500;
    expect(expenses).toBeCloseTo(expected, 2);
  });
});

// ─── Property NOI ────────────────────────────────────

describe('calcPropertyNOI', () => {
  it('equals EGI minus property expenses', () => {
    const egi = calcPropertyEGI(baseDeal);
    const exp = calcPropertyExpenses(baseDeal);
    expect(calcPropertyNOI(baseDeal)).toBeCloseTo(egi - exp, 2);
  });
});

// ─── Cap Rate ────────────────────────────────────────

describe('calcCapRate', () => {
  it('divides property NOI by property value', () => {
    const noi = calcPropertyNOI(baseDeal);
    expect(calcCapRate(baseDeal)).toBeCloseTo((noi / 300_000) * 100, 2);
  });

  it('returns 0 when property value is 0', () => {
    expect(calcCapRate({ ...baseDeal, propertyValue: 0 })).toBe(0);
  });
});

// ─── EBITDA ──────────────────────────────────────────

describe('calcEBITDA', () => {
  it('equals revenue - COGS - biz opex', () => {
    // 400k - 120k - 150k = 130,000
    expect(calcEBITDA(baseDeal)).toBe(130_000);
  });
});

// ─── SDE ─────────────────────────────────────────────

describe('calcSDE', () => {
  it('adds back owner salary and discretionary items', () => {
    const ebitda = calcEBITDA(baseDeal);
    const expected = ebitda + 60_000 + 8_000 + 4_000 + 6_000 + 10_000 + 5_000;
    expect(calcSDE(baseDeal)).toBe(expected);
  });
});

// ─── Revenue / SDE Multiples ─────────────────────────

describe('calcRevenueMultiple', () => {
  it('divides business value by revenue', () => {
    expect(calcRevenueMultiple(baseDeal)).toBeCloseTo(200_000 / 400_000, 4);
  });

  it('returns 0 for zero revenue', () => {
    expect(calcRevenueMultiple({ ...baseDeal, annualRevenue: 0 })).toBe(0);
  });
});

describe('calcSDEMultiple', () => {
  it('divides business value by SDE', () => {
    const sde = calcSDE(baseDeal);
    expect(calcSDEMultiple(baseDeal)).toBeCloseTo(200_000 / sde, 4);
  });
});

// ─── Combined Calculations ──────────────────────────

describe('calcTotalNOI', () => {
  it('sums property NOI + business EBITDA', () => {
    const expected = calcPropertyNOI(baseDeal) + calcEBITDA(baseDeal);
    expect(calcTotalNOI(baseDeal)).toBeCloseTo(expected, 2);
  });
});

describe('calcTotalCashInvested', () => {
  it('sums down payment + closing + rehab', () => {
    // 500k * 20% + 12k + 15k = 127,000
    expect(calcTotalCashInvested(baseDeal)).toBe(127_000);
  });
});

describe('calcAnnualCashFlow', () => {
  it('equals total NOI minus annual debt', () => {
    const noi = calcTotalNOI(baseDeal);
    const debt = calcMonthlyMortgage(financing) * 12;
    expect(calcAnnualCashFlow(baseDeal)).toBeCloseTo(noi - debt, 2);
  });
});

describe('calcCashOnCash', () => {
  it('divides annual CF by cash invested', () => {
    const cf = calcAnnualCashFlow(baseDeal);
    const ci = calcTotalCashInvested(baseDeal);
    expect(calcCashOnCash(baseDeal)).toBeCloseTo((cf / ci) * 100, 2);
  });

  it('returns 0 when cash invested is 0', () => {
    const deal = {
      ...baseDeal,
      purchasePrice: 0,
      closingCosts: 0,
      rehabCosts: 0,
      financing: { ...financing, downPayment: 0 },
    };
    expect(calcCashOnCash(deal)).toBe(0);
  });
});

describe('calcROI', () => {
  it('returns a positive value for a profitable deal', () => {
    expect(calcROI(baseDeal)).toBeGreaterThan(0);
  });
});

describe('calcDSCR', () => {
  it('divides total NOI by annual debt', () => {
    const noi = calcTotalNOI(baseDeal);
    const debt = calcMonthlyMortgage(financing) * 12;
    expect(calcDSCR(baseDeal)).toBeCloseTo(noi / debt, 4);
  });

  it('returns Infinity when no debt', () => {
    const deal = {
      ...baseDeal,
      financing: { ...financing, loanAmount: 0, interestRate: 0 },
    };
    expect(calcDSCR(deal)).toBe(Infinity);
  });
});

describe('calcBreakEvenRevenue', () => {
  it('returns a positive number', () => {
    expect(calcBreakEvenRevenue(baseDeal)).toBeGreaterThan(0);
  });
});

describe('calcEffectiveGrossIncome', () => {
  it('sums property EGI + business revenue', () => {
    const expected = calcPropertyEGI(baseDeal) + baseDeal.annualRevenue;
    expect(calcEffectiveGrossIncome(baseDeal)).toBeCloseTo(expected, 2);
  });
});

describe('calcTotalOperatingExpenses', () => {
  it('sums property + business expenses', () => {
    const propExp = calcPropertyExpenses(baseDeal);
    const expected = propExp + 120_000 + 150_000;
    expect(calcTotalOperatingExpenses(baseDeal)).toBeCloseTo(expected, 2);
  });
});

// ─── calcHybridMetrics (all-in-one) ──────────────────

describe('calcHybridMetrics', () => {
  it('returns all metric fields', () => {
    const m = calcHybridMetrics(baseDeal);
    expect(m).toHaveProperty('propertyNoi');
    expect(m).toHaveProperty('capRate');
    expect(m).toHaveProperty('ebitda');
    expect(m).toHaveProperty('sde');
    expect(m).toHaveProperty('revenueMultiple');
    expect(m).toHaveProperty('sdeMultiple');
    expect(m).toHaveProperty('totalNoi');
    expect(m).toHaveProperty('annualCashFlow');
    expect(m).toHaveProperty('cashOnCashReturn');
    expect(m).toHaveProperty('roi');
    expect(m).toHaveProperty('dscr');
    expect(m).toHaveProperty('monthlyMortgage');
    expect(m).toHaveProperty('totalCashInvested');
    expect(m).toHaveProperty('breakEvenRevenue');
    expect(m).toHaveProperty('effectiveGrossIncome');
    expect(m).toHaveProperty('totalOperatingExpenses');
  });
});

// ─── Cash Flow Projections ───────────────────────────

describe('projectHybridCashFlows', () => {
  it('returns correct number of years', () => {
    const proj = projectHybridCashFlows(baseDeal, 10);
    expect(proj).toHaveLength(10);
    expect(proj[0].year).toBe(1);
    expect(proj[9].year).toBe(10);
  });

  it('NOI grows over time', () => {
    const proj = projectHybridCashFlows(baseDeal, 10);
    expect(proj[9].noi).toBeGreaterThan(proj[0].noi);
  });

  it('cumulative cash flow is sum of individual years (within rounding)', () => {
    const proj = projectHybridCashFlows(baseDeal, 5);
    let sum = 0;
    for (const p of proj) {
      sum += p.cashFlow;
      expect(p.cumulativeCashFlow).toBeCloseTo(sum, -1);
    }
  });
});
