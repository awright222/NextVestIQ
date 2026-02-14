// ============================================
// Amortization Calculation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import {
  generateAmortizationSchedule,
  summarizeByYear,
  amortizationTotals,
} from '../amortization';
import type { FinancingTerms } from '@/types';

const baseLoan: FinancingTerms = {
  loanType: 'conventional',
  loanAmount: 300_000,
  downPayment: 20,
  interestRate: 7,
  loanTermYears: 30,
  amortizationYears: 30,
};

describe('generateAmortizationSchedule', () => {
  it('generates correct number of payments', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    expect(schedule).toHaveLength(360); // 30 years * 12 months
  });

  it('returns empty array for zero loan', () => {
    expect(generateAmortizationSchedule({ ...baseLoan, loanAmount: 0 })).toHaveLength(0);
  });

  it('first payment has correct breakdown', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const first = schedule[0];
    // Monthly rate = 7% / 12 = 0.5833%
    // Interest on $300k = $1,750
    expect(first.interest).toBeCloseTo(1750, 0);
    expect(first.principal).toBeCloseTo(first.payment - 1750, 0);
    expect(first.month).toBe(1);
  });

  it('balance reaches zero at end', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const last = schedule[schedule.length - 1];
    expect(last.balance).toBeCloseTo(0, 0);
  });

  it('cumulative principal matches loan amount', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const last = schedule[schedule.length - 1];
    expect(last.cumulativePrincipal).toBeCloseTo(300_000, 0);
  });

  it('handles 0% interest rate', () => {
    const schedule = generateAmortizationSchedule({ ...baseLoan, interestRate: 0 });
    expect(schedule).toHaveLength(360);
    expect(schedule[0].interest).toBe(0);
    expect(schedule[0].payment).toBeCloseTo(300_000 / 360, 1);
  });

  it('principal portion increases over time', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    expect(schedule[359].principal).toBeGreaterThan(schedule[0].principal);
  });

  it('interest portion decreases over time', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    expect(schedule[359].interest).toBeLessThan(schedule[0].interest);
  });
});

describe('summarizeByYear', () => {
  it('produces correct number of annual summaries', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const annual = summarizeByYear(schedule);
    expect(annual).toHaveLength(30);
  });

  it('each year sums to 12 payments', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const annual = summarizeByYear(schedule);
    // Monthly payment * 12 ≈ annual total
    expect(annual[0].totalPayment).toBeCloseTo(schedule[0].payment * 12, 0);
  });

  it('year 1 has lower principal % than year 30', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const annual = summarizeByYear(schedule);
    expect(annual[29].principalPercent).toBeGreaterThan(annual[0].principalPercent);
  });

  it('ending balance of last year is zero', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const annual = summarizeByYear(schedule);
    expect(annual[29].endingBalance).toBeCloseTo(0, 0);
  });

  it('returns empty for empty schedule', () => {
    expect(summarizeByYear([])).toHaveLength(0);
  });
});

describe('amortizationTotals', () => {
  it('total principal matches loan amount', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const totals = amortizationTotals(schedule);
    expect(totals.totalPrincipal).toBeCloseTo(300_000, -1);
  });

  it('total payments = principal + interest', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const totals = amortizationTotals(schedule);
    expect(totals.totalPayments).toBeCloseTo(totals.totalPrincipal + totals.totalInterest, -1);
  });

  it('loan term matches schedule length', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const totals = amortizationTotals(schedule);
    expect(totals.loanTerm).toBe(360);
  });

  it('handles empty schedule', () => {
    const totals = amortizationTotals([]);
    expect(totals.totalPayments).toBe(0);
    expect(totals.totalInterest).toBe(0);
    expect(totals.loanTerm).toBe(0);
  });

  it('total interest is significant for 30yr 7%', () => {
    const schedule = generateAmortizationSchedule(baseLoan);
    const totals = amortizationTotals(schedule);
    // For $300k at 7% over 30 years, total interest > $400k
    expect(totals.totalInterest).toBeGreaterThan(400_000);
  });
});
