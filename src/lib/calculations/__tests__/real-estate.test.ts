// ============================================
// Real Estate Calculation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { RealEstateDeal, FinancingTerms } from '@/types';
import {
  calcMonthlyMortgage,
  calcEffectiveGrossIncome,
  calcOperatingExpenses,
  calcNOI,
  calcCapRate,
  calcTotalCashInvested,
  calcAnnualCashFlow,
  calcCashOnCash,
  calcDSCR,
  calcROI,
  calcIRR,
  calcRealEstateMetrics,
  projectCashFlows,
} from '@/lib/calculations/real-estate';

// ─── Fixtures ────────────────────────────────────────

const financing: FinancingTerms = {
  loanType: 'conventional',
  loanAmount: 160_000,
  downPayment: 20,
  interestRate: 7,
  loanTermYears: 30,
  amortizationYears: 30,
};

const baseDeal: RealEstateDeal = {
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

// ─── Monthly Mortgage ────────────────────────────────

describe('calcMonthlyMortgage', () => {
  it('returns correct payment for standard loan', () => {
    const payment = calcMonthlyMortgage(financing);
    // $160k @ 7% / 30yr ≈ $1,064.48
    expect(payment).toBeCloseTo(1064.48, 0);
  });

  it('returns 0 when loan amount is 0', () => {
    expect(calcMonthlyMortgage({ ...financing, loanAmount: 0 })).toBe(0);
  });

  it('returns simple division when interest rate is 0', () => {
    const result = calcMonthlyMortgage({ ...financing, interestRate: 0 });
    expect(result).toBeCloseTo(160_000 / 360, 2);
  });

  it('handles negative loan gracefully', () => {
    expect(calcMonthlyMortgage({ ...financing, loanAmount: -1000 })).toBe(0);
  });
});

// ─── Effective Gross Income ──────────────────────────

describe('calcEffectiveGrossIncome', () => {
  it('subtracts vacancy from gross', () => {
    const egi = calcEffectiveGrossIncome(baseDeal);
    // (24000 + 1200) * 0.95 = 23_940
    expect(egi).toBeCloseTo(23_940, 2);
  });

  it('returns full income at 0% vacancy', () => {
    const deal = { ...baseDeal, vacancyRate: 0 };
    expect(calcEffectiveGrossIncome(deal)).toBe(25_200);
  });

  it('returns 0 at 100% vacancy', () => {
    const deal = { ...baseDeal, vacancyRate: 100 };
    expect(calcEffectiveGrossIncome(deal)).toBe(0);
  });
});

// ─── Operating Expenses ──────────────────────────────

describe('calcOperatingExpenses', () => {
  it('includes management fee based on gross income', () => {
    const expenses = calcOperatingExpenses(baseDeal);
    const mgmt = 25_200 * 0.08; // 2016
    const expected = 2400 + 1200 + 1500 + mgmt + 600 + 300;
    expect(expenses).toBeCloseTo(expected, 2);
  });

  it('returns fixed expenses when management is 0%', () => {
    const deal = { ...baseDeal, propertyManagement: 0 };
    const expenses = calcOperatingExpenses(deal);
    expect(expenses).toBe(2400 + 1200 + 1500 + 0 + 600 + 300);
  });
});

// ─── NOI ─────────────────────────────────────────────

describe('calcNOI', () => {
  it('equals EGI minus OpEx', () => {
    const noi = calcNOI(baseDeal);
    const egi = calcEffectiveGrossIncome(baseDeal);
    const opex = calcOperatingExpenses(baseDeal);
    expect(noi).toBeCloseTo(egi - opex, 2);
  });

  it('can be negative when expenses exceed income', () => {
    const deal = { ...baseDeal, grossRentalIncome: 1000, otherIncome: 0 };
    expect(calcNOI(deal)).toBeLessThan(0);
  });
});

// ─── Cap Rate ────────────────────────────────────────

describe('calcCapRate', () => {
  it('divides NOI by purchase price', () => {
    const noi = calcNOI(baseDeal);
    const expected = (noi / 200_000) * 100;
    expect(calcCapRate(baseDeal)).toBeCloseTo(expected, 2);
  });

  it('returns 0 when purchase price is 0', () => {
    const deal = { ...baseDeal, purchasePrice: 0 };
    expect(calcCapRate(deal)).toBe(0);
  });
});

// ─── Total Cash Invested ─────────────────────────────

describe('calcTotalCashInvested', () => {
  it('sums down payment + closing + rehab', () => {
    const result = calcTotalCashInvested(baseDeal);
    // 200k * 20% + 5k + 10k = 55,000
    expect(result).toBe(55_000);
  });
});

// ─── Annual Cash Flow ────────────────────────────────

describe('calcAnnualCashFlow', () => {
  it('equals NOI minus annual debt service', () => {
    const noi = calcNOI(baseDeal);
    const annualDebt = calcMonthlyMortgage(financing) * 12;
    expect(calcAnnualCashFlow(baseDeal)).toBeCloseTo(noi - annualDebt, 2);
  });
});

// ─── Cash on Cash ────────────────────────────────────

describe('calcCashOnCash', () => {
  it('divides annual cash flow by cash invested', () => {
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

// ─── DSCR ────────────────────────────────────────────

describe('calcDSCR', () => {
  it('divides NOI by annual debt service', () => {
    const noi = calcNOI(baseDeal);
    const annualDebt = calcMonthlyMortgage(financing) * 12;
    expect(calcDSCR(baseDeal)).toBeCloseTo(noi / annualDebt, 4);
  });

  it('returns Infinity when no debt', () => {
    const deal = {
      ...baseDeal,
      financing: { ...financing, loanAmount: 0 },
    };
    expect(calcDSCR(deal)).toBe(Infinity);
  });
});

// ─── ROI ─────────────────────────────────────────────

describe('calcROI', () => {
  it('returns a reasonable percentage over 5 years', () => {
    const roi = calcROI(baseDeal, 5);
    expect(roi).toBeGreaterThan(-100);
    expect(roi).toBeLessThan(500);
  });

  it('returns 0 when cash invested is 0', () => {
    const deal = {
      ...baseDeal,
      purchasePrice: 0,
      closingCosts: 0,
      rehabCosts: 0,
      financing: { ...financing, downPayment: 0, loanAmount: 0 },
    };
    expect(calcROI(deal, 5)).toBe(0);
  });

  it('increases with longer hold period (appreciation)', () => {
    const roi3 = calcROI(baseDeal, 3);
    const roi10 = calcROI(baseDeal, 10);
    expect(roi10).toBeGreaterThan(roi3);
  });
});

// ─── IRR ─────────────────────────────────────────────

describe('calcIRR', () => {
  it('returns a finite percentage', () => {
    const irr = calcIRR(baseDeal, 5);
    expect(irr).toBeGreaterThan(-50);
    expect(irr).toBeLessThan(100);
  });
});

// ─── calcRealEstateMetrics (all-in-one) ──────────────

describe('calcRealEstateMetrics', () => {
  it('returns all metric fields', () => {
    const m = calcRealEstateMetrics(baseDeal);
    expect(m).toHaveProperty('noi');
    expect(m).toHaveProperty('capRate');
    expect(m).toHaveProperty('cashOnCashReturn');
    expect(m).toHaveProperty('roi');
    expect(m).toHaveProperty('dscr');
    expect(m).toHaveProperty('irr');
    expect(m).toHaveProperty('monthlyMortgage');
    expect(m).toHaveProperty('annualCashFlow');
    expect(m).toHaveProperty('totalCashInvested');
    expect(m).toHaveProperty('effectiveGrossIncome');
    expect(m).toHaveProperty('operatingExpenses');
  });

  it('metric values match individual functions', () => {
    const m = calcRealEstateMetrics(baseDeal);
    expect(m.noi).toBeCloseTo(calcNOI(baseDeal), 2);
    expect(m.capRate).toBeCloseTo(calcCapRate(baseDeal), 2);
    expect(m.monthlyMortgage).toBeCloseTo(calcMonthlyMortgage(financing), 2);
  });
});

// ─── Cash Flow Projections ───────────────────────────

describe('projectCashFlows', () => {
  it('returns correct number of years', () => {
    const proj = projectCashFlows(baseDeal, 7);
    expect(proj).toHaveLength(7);
    expect(proj[0].year).toBe(1);
    expect(proj[6].year).toBe(7);
  });

  it('cumulative cash flow grows monotonically with positive deals', () => {
    const proj = projectCashFlows(baseDeal, 10);
    for (let i = 1; i < proj.length; i++) {
      // With positive cash flow, cumulative should grow
      if (proj[i].cashFlow > 0) {
        expect(proj[i].cumulativeCashFlow).toBeGreaterThan(
          proj[i - 1].cumulativeCashFlow
        );
      }
    }
  });

  it('NOI grows with rent growth', () => {
    const proj = projectCashFlows(baseDeal, 5);
    expect(proj[4].noi).toBeGreaterThan(proj[0].noi);
  });
});
