// ============================================
// Real Estate Calculation Engine
// ============================================
// All functions are pure — no side effects, easy to test.

import type { RealEstateDeal, RealEstateMetrics, FinancingTerms } from '@/types';

/**
 * Calculate monthly mortgage payment using standard amortization formula.
 * P = L[c(1+c)^n] / [(1+c)^n - 1]
 */
export function calcMonthlyMortgage(financing: FinancingTerms): number {
  const principal = financing.loanAmount;
  if (principal <= 0) return 0;

  const monthlyRate = financing.interestRate / 100 / 12;
  const numPayments = financing.amortizationYears * 12;

  if (monthlyRate === 0) return principal / numPayments;

  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}

/** Effective Gross Income = Gross Rental + Other − Vacancy */
export function calcEffectiveGrossIncome(deal: RealEstateDeal): number {
  const grossIncome = deal.grossRentalIncome + deal.otherIncome;
  const vacancy = grossIncome * (deal.vacancyRate / 100);
  return grossIncome - vacancy;
}

/** Total annual operating expenses (does NOT include debt service) */
export function calcOperatingExpenses(deal: RealEstateDeal): number {
  const managementFee =
    (deal.grossRentalIncome + deal.otherIncome) * (deal.propertyManagement / 100);

  return (
    deal.propertyTax +
    deal.insurance +
    deal.maintenance +
    managementFee +
    deal.utilities +
    deal.otherExpenses
  );
}

/** Net Operating Income = EGI − Operating Expenses */
export function calcNOI(deal: RealEstateDeal): number {
  return calcEffectiveGrossIncome(deal) - calcOperatingExpenses(deal);
}

/** Cap Rate = NOI / Purchase Price */
export function calcCapRate(deal: RealEstateDeal): number {
  if (deal.purchasePrice === 0) return 0;
  return (calcNOI(deal) / deal.purchasePrice) * 100;
}

/** Total cash invested upfront */
export function calcTotalCashInvested(deal: RealEstateDeal): number {
  const downPayment = deal.purchasePrice * (deal.financing.downPayment / 100);
  return downPayment + deal.closingCosts + deal.rehabCosts;
}

/** Annual Cash Flow = NOI − Annual Debt Service */
export function calcAnnualCashFlow(deal: RealEstateDeal): number {
  const annualDebtService = calcMonthlyMortgage(deal.financing) * 12;
  return calcNOI(deal) - annualDebtService;
}

/** Cash-on-Cash Return = Annual Cash Flow / Total Cash Invested */
export function calcCashOnCash(deal: RealEstateDeal): number {
  const cashInvested = calcTotalCashInvested(deal);
  if (cashInvested === 0) return 0;
  return (calcAnnualCashFlow(deal) / cashInvested) * 100;
}

/** Debt Service Coverage Ratio = NOI / Annual Debt Service */
export function calcDSCR(deal: RealEstateDeal): number {
  const annualDebtService = calcMonthlyMortgage(deal.financing) * 12;
  if (annualDebtService === 0) return Infinity;
  return calcNOI(deal) / annualDebtService;
}

/**
 * Simple ROI over a hold period (default 5 years).
 * Accounts for cash flow + appreciation − selling costs.
 */
export function calcROI(deal: RealEstateDeal, holdYears = 5): number {
  const cashInvested = calcTotalCashInvested(deal);
  if (cashInvested === 0) return 0;

  let totalCashFlow = 0;
  let currentNOI = calcNOI(deal);
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;

  for (let y = 0; y < holdYears; y++) {
    totalCashFlow += currentNOI - annualDebt;
    currentNOI *= 1 + deal.annualRentGrowth / 100;
  }

  const futureValue =
    deal.purchasePrice * Math.pow(1 + deal.annualAppreciation / 100, holdYears);
  const sellingCosts = futureValue * 0.06; // ~6% realtor + closing
  const equity = futureValue - sellingCosts - deal.financing.loanAmount;

  const totalReturn = totalCashFlow + equity - cashInvested;
  return (totalReturn / cashInvested) * 100;
}

/**
 * IRR approximation using Newton's method on NPV.
 * Cash flows: Year 0 = −cashInvested, Years 1–N = annual cash flow,
 * Year N also adds net sale proceeds.
 */
export function calcIRR(deal: RealEstateDeal, holdYears = 5): number {
  const cashInvested = calcTotalCashInvested(deal);
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;
  let currentNOI = calcNOI(deal);

  // Build cash flow array
  const cashFlows: number[] = [-cashInvested];

  for (let y = 1; y <= holdYears; y++) {
    const cf = currentNOI - annualDebt;
    if (y === holdYears) {
      const futureValue =
        deal.purchasePrice * Math.pow(1 + deal.annualAppreciation / 100, holdYears);
      const sellingCosts = futureValue * 0.06;
      const remainingLoan = deal.financing.loanAmount * 0.85; // simplified
      const saleProceeds = futureValue - sellingCosts - remainingLoan;
      cashFlows.push(cf + saleProceeds);
    } else {
      cashFlows.push(cf);
    }
    currentNOI *= 1 + deal.annualRentGrowth / 100;
  }

  return newtonIRR(cashFlows);
}

/** Newton's method IRR solver */
function newtonIRR(cashFlows: number[], guess = 0.1, maxIter = 100, tol = 1e-6): number {
  let rate = guess;

  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / factor;
      dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }

    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;

    if (Math.abs(newRate - rate) < tol) return newRate * 100;
    rate = newRate;
  }

  return rate * 100;
}

/** Compute all real estate metrics at once */
export function calcRealEstateMetrics(deal: RealEstateDeal): RealEstateMetrics {
  return {
    noi: calcNOI(deal),
    capRate: calcCapRate(deal),
    cashOnCashReturn: calcCashOnCash(deal),
    roi: calcROI(deal),
    dscr: calcDSCR(deal),
    irr: calcIRR(deal),
    monthlyMortgage: calcMonthlyMortgage(deal.financing),
    annualCashFlow: calcAnnualCashFlow(deal),
    totalCashInvested: calcTotalCashInvested(deal),
    effectiveGrossIncome: calcEffectiveGrossIncome(deal),
    operatingExpenses: calcOperatingExpenses(deal),
  };
}

/**
 * Project cash flows year-by-year for charting.
 * Returns array of { year, cashFlow, noi, cumulativeCashFlow }.
 */
export function projectCashFlows(
  deal: RealEstateDeal,
  years = 10
): { year: number; cashFlow: number; noi: number; cumulativeCashFlow: number }[] {
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;
  let currentIncome = calcEffectiveGrossIncome(deal);
  let currentExpenses = calcOperatingExpenses(deal);
  let cumulative = 0;

  const projections = [];

  for (let y = 1; y <= years; y++) {
    const noi = currentIncome - currentExpenses;
    const cashFlow = noi - annualDebt;
    cumulative += cashFlow;

    projections.push({ year: y, cashFlow: Math.round(cashFlow), noi: Math.round(noi), cumulativeCashFlow: Math.round(cumulative) });

    currentIncome *= 1 + deal.annualRentGrowth / 100;
    currentExpenses *= 1 + deal.annualExpenseGrowth / 100;
  }

  return projections;
}
