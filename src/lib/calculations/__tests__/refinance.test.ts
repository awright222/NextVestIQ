// ============================================
// Refinance Calculation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { calcRefinance, DEFAULT_REFI, type RefinanceInputs } from '../refinance';
import type { RealEstateDeal, HybridDeal } from '@/types';

const baseDeal: RealEstateDeal = {
  type: 'real-estate',
  purchasePrice: 250_000,
  closingCosts: 5_000,
  rehabCosts: 10_000,
  grossRentalIncome: 24_000,
  otherIncome: 0,
  vacancyRate: 5,
  propertyTax: 3_000,
  insurance: 1_200,
  maintenance: 2_000,
  propertyManagement: 8,
  utilities: 0,
  otherExpenses: 500,
  financing: {
    loanType: 'conventional',
    loanAmount: 200_000,
    downPayment: 20,
    interestRate: 7.25,
    loanTermYears: 30,
    amortizationYears: 30,
  },
  annualRentGrowth: 3,
  annualExpenseGrowth: 2,
  annualAppreciation: 3,
};

describe('calcRefinance', () => {
  it('calculates future property value with appreciation', () => {
    const result = calcRefinance(baseDeal, { ...DEFAULT_REFI, refiYear: 1 });
    // 250000 * 1.03 = 257,500
    expect(result.futurePropertyValue).toBe(257500);
  });

  it('calculates new loan amount based on LTV', () => {
    const result = calcRefinance(baseDeal, { ...DEFAULT_REFI, refiYear: 1, newLTV: 75 });
    // 257500 * 0.75 = 193,125
    expect(result.newLoanAmount).toBe(193125);
  });

  it('calculates positive cash out when new loan > old balance', () => {
    const inputs: RefinanceInputs = {
      refiYear: 2,
      newRate: 6.5,
      newTermYears: 30,
      newAmortYears: 30,
      newLTV: 80,
      refiClosingCosts: 3000,
    };
    const result = calcRefinance(baseDeal, inputs);
    // After 2 years appreciation: 250000 * 1.03^2 = ~265,225
    // 80% LTV = ~212,180
    // Old balance after 24 months is less than 200k
    expect(result.cashOut).toBeGreaterThan(0);
    expect(result.newLoanAmount).toBeGreaterThan(result.originalBalanceAtRefi);
  });

  it('calculates zero cash out when equity is negative', () => {
    const inputs: RefinanceInputs = {
      refiYear: 1,
      newRate: 6.5,
      newTermYears: 30,
      newAmortYears: 30,
      newLTV: 50, // Very low LTV
      refiClosingCosts: 3000,
    };
    const result = calcRefinance(baseDeal, inputs);
    // 50% LTV on 257,500 = 128,750 — well below the ~197k remaining balance
    expect(result.cashOut).toBe(0);
  });

  it('returns new monthly payment', () => {
    const result = calcRefinance(baseDeal, DEFAULT_REFI);
    expect(result.newMonthlyPayment).toBeGreaterThan(0);
    expect(result.originalMonthlyPayment).toBeGreaterThan(0);
  });

  it('computes monthly payment delta', () => {
    const result = calcRefinance(baseDeal, DEFAULT_REFI);
    // Delta is independently rounded so allow ±1 rounding error
    const expected = result.newMonthlyPayment - result.originalMonthlyPayment;
    expect(Math.abs(result.monthlyPaymentDelta - expected)).toBeLessThanOrEqual(1);
  });

  it('calculates equity after refi', () => {
    const result = calcRefinance(baseDeal, DEFAULT_REFI);
    expect(result.equityAfterRefi).toBe(
      result.futurePropertyValue - result.newLoanAmount
    );
  });

  it('handles longer hold periods correctly', () => {
    const inputs: RefinanceInputs = {
      refiYear: 5,
      newRate: 5.5,
      newTermYears: 30,
      newAmortYears: 30,
      newLTV: 75,
      refiClosingCosts: 4000,
    };
    const result = calcRefinance(baseDeal, inputs);
    // 5 years of 3% appreciation
    const expected = Math.round(250000 * Math.pow(1.03, 5));
    expect(result.futurePropertyValue).toBe(expected);
    expect(result.cashOut).toBeGreaterThan(0);
  });

  it('calculates new cash-on-cash return', () => {
    const result = calcRefinance(baseDeal, DEFAULT_REFI);
    expect(result.newCashOnCash).toBeDefined();
    expect(typeof result.newCashOnCash).toBe('number');
  });

  it('handles zero loan amount gracefully', () => {
    const noLoan: RealEstateDeal = {
      ...baseDeal,
      financing: { ...baseDeal.financing, loanAmount: 0, downPayment: 100 },
    };
    const result = calcRefinance(noLoan, DEFAULT_REFI);
    expect(result.originalBalanceAtRefi).toBe(0);
    expect(result.originalMonthlyPayment).toBe(0);
  });

  it('works with hybrid deals', () => {
    const hybrid: HybridDeal = {
      type: 'hybrid',
      purchasePrice: 500_000,
      propertyValue: 300_000,
      businessValue: 200_000,
      closingCosts: 10_000,
      rehabCosts: 20_000,
      grossRentalIncome: 12_000,
      otherPropertyIncome: 0,
      vacancyRate: 5,
      propertyTax: 5_000,
      insurance: 2_500,
      maintenance: 3_000,
      propertyManagement: 8,
      utilities: 1_200,
      otherPropertyExpenses: 500,
      annualRevenue: 200_000,
      costOfGoods: 40_000,
      businessOperatingExpenses: 60_000,
      ownerSalary: 50_000,
      depreciation: 10_000,
      amortization: 5_000,
      interest: 8_000,
      taxes: 12_000,
      otherAddBacks: 5_000,
      financing: {
        loanType: 'sba-7a',
        loanAmount: 400_000,
        downPayment: 20,
        interestRate: 10.5,
        loanTermYears: 25,
        amortizationYears: 25,
      },
      annualRevenueGrowth: 5,
      annualRentGrowth: 3,
      annualExpenseGrowth: 2,
      annualAppreciation: 3,
    };

    const result = calcRefinance(hybrid, DEFAULT_REFI);
    expect(result.futurePropertyValue).toBeGreaterThan(hybrid.purchasePrice);
    expect(result.newMonthlyPayment).toBeGreaterThan(0);
  });
});
