// ============================================
// Amortization Schedule Engine
// ============================================
// Generates a full loan payment schedule with
// principal/interest split, running balance,
// and annual summaries.

import type { FinancingTerms } from '@/types';

/** A single monthly payment row */
export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

/** Annual summary of amortization */
export interface AnnualAmortizationSummary {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  endingBalance: number;
  principalPercent: number;  // % of year's payment that went to principal
}

/**
 * Generate a full monthly amortization schedule.
 * Uses standard amortization formula with period-by-period tracking.
 */
export function generateAmortizationSchedule(financing: FinancingTerms): AmortizationRow[] {
  const principal = financing.loanAmount;
  if (principal <= 0) return [];

  const monthlyRate = financing.interestRate / 100 / 12;
  const numPayments = financing.amortizationYears * 12;

  // Calculate fixed monthly payment
  let payment: number;
  if (monthlyRate === 0) {
    payment = principal / numPayments;
  } else {
    payment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  const rows: AmortizationRow[] = [];
  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let m = 1; m <= numPayments; m++) {
    const interest = balance * monthlyRate;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    cumulativeInterest += interest;
    cumulativePrincipal += principalPaid;

    rows.push({
      month: m,
      payment: Math.round(payment * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
      cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
    });
  }

  return rows;
}

/**
 * Summarize the amortization schedule by year.
 * Much easier to display in a table for long-term loans.
 */
export function summarizeByYear(rows: AmortizationRow[]): AnnualAmortizationSummary[] {
  if (rows.length === 0) return [];

  const summaries: AnnualAmortizationSummary[] = [];

  for (let yearIdx = 0; yearIdx < Math.ceil(rows.length / 12); yearIdx++) {
    const start = yearIdx * 12;
    const end = Math.min(start + 12, rows.length);
    const yearRows = rows.slice(start, end);

    const totalPayment = yearRows.reduce((s, r) => s + r.payment, 0);
    const totalPrincipal = yearRows.reduce((s, r) => s + r.principal, 0);
    const totalInterest = yearRows.reduce((s, r) => s + r.interest, 0);
    const endingBalance = yearRows[yearRows.length - 1].balance;
    const principalPercent = totalPayment > 0 ? (totalPrincipal / totalPayment) * 100 : 0;

    summaries.push({
      year: yearIdx + 1,
      totalPayment: Math.round(totalPayment * 100) / 100,
      totalPrincipal: Math.round(totalPrincipal * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      endingBalance: Math.round(endingBalance * 100) / 100,
      principalPercent: Math.round(principalPercent * 10) / 10,
    });
  }

  return summaries;
}

/**
 * Quick totals for the full life of the loan.
 */
export function amortizationTotals(rows: AmortizationRow[]) {
  if (rows.length === 0) {
    return { totalPayments: 0, totalInterest: 0, totalPrincipal: 0, loanTerm: 0 };
  }

  const last = rows[rows.length - 1];
  return {
    totalPayments: Math.round(last.cumulativeInterest + last.cumulativePrincipal),
    totalInterest: Math.round(last.cumulativeInterest),
    totalPrincipal: Math.round(last.cumulativePrincipal),
    loanTerm: rows.length,
  };
}
