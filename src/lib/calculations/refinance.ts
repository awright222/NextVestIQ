// ============================================
// Refinance Modeling Engine
// ============================================
// Models refinancing at a future point:
// new rate, new term, LTV-based loan amount,
// cash-out equity, and updated metrics.

import type { RealEstateDeal, HybridDeal, FinancingTerms } from '@/types';
import { calcMonthlyMortgage } from './real-estate';

// ─── Types ────────────────────────────────────────────

export interface RefinanceInputs {
  /** Year at which refinance occurs (e.g. 1 = end of year 1) */
  refiYear: number;
  /** New interest rate (%) */
  newRate: number;
  /** New loan term (years) */
  newTermYears: number;
  /** New amortization period (years) */
  newAmortYears: number;
  /** LTV for the new loan based on future property value (%) */
  newLTV: number;
  /** Closing costs for the refinance ($) */
  refiClosingCosts: number;
}

export interface RefinanceResult {
  /** Estimated property value at refi year */
  futurePropertyValue: number;
  /** New loan amount (futureValue × LTV) */
  newLoanAmount: number;
  /** Remaining balance on original loan at refi year */
  originalBalanceAtRefi: number;
  /** Cash out from refinance (new loan − old balance − closing costs) */
  cashOut: number;
  /** Original monthly payment */
  originalMonthlyPayment: number;
  /** New monthly payment after refi */
  newMonthlyPayment: number;
  /** Monthly payment change (positive = higher) */
  monthlyPaymentDelta: number;
  /** New financing terms */
  newFinancing: FinancingTerms;
  /** Total equity at refi (property value − new loan) */
  equityAfterRefi: number;
  /** Cash-on-cash return after refi (updated with new debt service) */
  newCashOnCash: number;
  /** Annual cash flow after refi */
  newAnnualCashFlow: number;
  /** Total cash invested including initial + refi costs, minus cash out */
  adjustedCashInvested: number;
}

export const DEFAULT_REFI: RefinanceInputs = {
  refiYear: 1,
  newRate: 6.5,
  newTermYears: 30,
  newAmortYears: 30,
  newLTV: 75,
  refiClosingCosts: 3000,
};

// ─── Remaining Balance Calculator ─────────────────────

function calcRemainingBalance(financing: FinancingTerms, months: number): number {
  const principal = financing.loanAmount;
  if (principal <= 0) return 0;

  const monthlyRate = financing.interestRate / 100 / 12;
  if (monthlyRate === 0) {
    const totalPayments = financing.amortizationYears * 12;
    const paidOff = Math.min(months, totalPayments);
    return principal - (principal / totalPayments) * paidOff;
  }

  const numPayments = financing.amortizationYears * 12;
  const payment = (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  // Balance after n payments: B = P(1+r)^n − payment × [(1+r)^n − 1] / r
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * factor - payment * (factor - 1) / monthlyRate;
}

// ─── Main Refinance Calculator ────────────────────────

export function calcRefinance(
  data: RealEstateDeal | HybridDeal,
  inputs: RefinanceInputs,
): RefinanceResult {
  const isHybrid = data.type === 'hybrid';
  const purchasePrice = data.purchasePrice;
  const appreciation = isHybrid
    ? (data as HybridDeal).annualAppreciation
    : (data as RealEstateDeal).annualAppreciation;

  // Future property value with appreciation
  const futurePropertyValue = purchasePrice * Math.pow(1 + appreciation / 100, inputs.refiYear);

  // New loan based on LTV of future value
  const newLoanAmount = Math.round(futurePropertyValue * (inputs.newLTV / 100));

  // Remaining balance on original loan
  const monthsElapsed = inputs.refiYear * 12;
  const originalBalanceAtRefi = Math.max(0, Math.round(calcRemainingBalance(data.financing, monthsElapsed)));

  // Cash out
  const cashOut = Math.max(0, newLoanAmount - originalBalanceAtRefi - inputs.refiClosingCosts);

  // Original monthly payment
  const originalMonthlyPayment = calcMonthlyMortgage(data.financing);

  // New financing terms
  const newFinancing: FinancingTerms = {
    loanType: 'conventional',
    loanAmount: newLoanAmount,
    downPayment: 100 - inputs.newLTV,
    interestRate: inputs.newRate,
    loanTermYears: inputs.newTermYears,
    amortizationYears: inputs.newAmortYears,
  };

  const newMonthlyPayment = calcMonthlyMortgage(newFinancing);
  const monthlyPaymentDelta = newMonthlyPayment - originalMonthlyPayment;

  // Equity after refi
  const equityAfterRefi = futurePropertyValue - newLoanAmount;

  // Calculate NOI at refi year (with rent growth applied)
  const rentGrowth = isHybrid
    ? (data as HybridDeal).annualRentGrowth
    : (data as RealEstateDeal).annualRentGrowth;

  const grossIncome = isHybrid
    ? (data as HybridDeal).grossRentalIncome + (data as HybridDeal).otherPropertyIncome
    : (data as RealEstateDeal).grossRentalIncome + (data as RealEstateDeal).otherIncome;

  const futureGross = grossIncome * Math.pow(1 + rentGrowth / 100, inputs.refiYear);
  const vacancyRate = data.vacancyRate;
  const egi = futureGross * (1 - vacancyRate / 100);

  // Add business income for hybrid
  let businessIncome = 0;
  if (isHybrid) {
    const h = data as HybridDeal;
    businessIncome = (h.annualRevenue - h.costOfGoods - h.businessOperatingExpenses) *
      Math.pow(1 + h.annualRevenueGrowth / 100, inputs.refiYear);
  }

  // Operating expenses (grown)
  const expGrowth = data.type === 'hybrid'
    ? (data as HybridDeal).annualExpenseGrowth
    : (data as RealEstateDeal).annualExpenseGrowth;

  const propertyTax = data.propertyTax * Math.pow(1 + expGrowth / 100, inputs.refiYear);
  const insurance = data.insurance * Math.pow(1 + expGrowth / 100, inputs.refiYear);
  const maintenance = data.maintenance * Math.pow(1 + expGrowth / 100, inputs.refiYear);
  const mgmtFee = futureGross * (data.propertyManagement / 100);
  const utilities = data.utilities * Math.pow(1 + expGrowth / 100, inputs.refiYear);
  const otherExp = isHybrid
    ? (data as HybridDeal).otherPropertyExpenses * Math.pow(1 + expGrowth / 100, inputs.refiYear)
    : (data as RealEstateDeal).otherExpenses * Math.pow(1 + expGrowth / 100, inputs.refiYear);

  const totalOpEx = propertyTax + insurance + maintenance + mgmtFee + utilities + otherExp;
  const noi = egi + businessIncome - totalOpEx;

  const newAnnualDebtService = newMonthlyPayment * 12;
  const newAnnualCashFlow = noi - newAnnualDebtService;

  // Cash invested: original down + closing + rehab − cash out + refi closing
  const originalDown = purchasePrice * (data.financing.downPayment / 100);
  const rehabCosts = data.rehabCosts;
  const adjustedCashInvested = originalDown + data.closingCosts + rehabCosts - cashOut + inputs.refiClosingCosts;

  const newCashOnCash = adjustedCashInvested > 0
    ? (newAnnualCashFlow / adjustedCashInvested) * 100
    : 0;

  return {
    futurePropertyValue: Math.round(futurePropertyValue),
    newLoanAmount,
    originalBalanceAtRefi,
    cashOut,
    originalMonthlyPayment: Math.round(originalMonthlyPayment),
    newMonthlyPayment: Math.round(newMonthlyPayment),
    monthlyPaymentDelta: Math.round(monthlyPaymentDelta),
    newFinancing,
    equityAfterRefi: Math.round(equityAfterRefi),
    newCashOnCash,
    newAnnualCashFlow: Math.round(newAnnualCashFlow),
    adjustedCashInvested: Math.round(adjustedCashInvested),
  };
}
