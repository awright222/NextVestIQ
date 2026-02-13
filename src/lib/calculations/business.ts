// ============================================
// Business Acquisition Calculation Engine
// ============================================
// All functions are pure — no side effects, easy to test.

import type { BusinessDeal, BusinessMetrics, FinancingTerms } from '@/types';

/**
 * Monthly debt service payment (same formula as real estate).
 */
export function calcMonthlyDebtService(financing: FinancingTerms): number {
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

/**
 * EBITDA = Revenue − COGS − Operating Expenses
 * (adds back interest, taxes, depreciation, amortization)
 */
export function calcEBITDA(deal: BusinessDeal): number {
  return (
    deal.annualRevenue -
    deal.costOfGoods -
    deal.operatingExpenses +
    deal.depreciation +
    deal.amortization +
    deal.interest +
    deal.taxes
  );
}

/**
 * Seller's Discretionary Earnings = EBITDA + Owner Salary + Other Add-backs
 * Key metric for small business valuation.
 */
export function calcSDE(deal: BusinessDeal): number {
  return calcEBITDA(deal) + deal.ownerSalary + deal.otherAddBacks;
}

/** Total cash the buyer puts in upfront */
export function calcTotalCashInvested(deal: BusinessDeal): number {
  const downPayment = deal.askingPrice * (deal.financing.downPayment / 100);
  return downPayment + deal.closingCosts;
}

/**
 * Annual Cash Flow to buyer = SDE − Owner's replacement salary − Annual Debt Service
 * Assumes buyer takes a market-rate salary (use SDE for owner-operator view).
 */
export function calcAnnualCashFlow(deal: BusinessDeal): number {
  const annualDebt = calcMonthlyDebtService(deal.financing) * 12;
  // Cash flow after paying yourself and debt
  return calcSDE(deal) - deal.ownerSalary - annualDebt;
}

/** ROI = Annual Cash Flow / Total Cash Invested */
export function calcROI(deal: BusinessDeal): number {
  const cashInvested = calcTotalCashInvested(deal);
  if (cashInvested === 0) return 0;
  return (calcAnnualCashFlow(deal) / cashInvested) * 100;
}

/**
 * Break-even Revenue: the revenue level at which cash flow = 0.
 * Simplified: fixed costs / gross margin ratio.
 */
export function calcBreakEvenRevenue(deal: BusinessDeal): number {
  if (deal.annualRevenue === 0) return 0;

  const grossMargin = (deal.annualRevenue - deal.costOfGoods) / deal.annualRevenue;
  if (grossMargin <= 0) return Infinity;

  const fixedCosts =
    deal.operatingExpenses +
    deal.ownerSalary +
    calcMonthlyDebtService(deal.financing) * 12;

  return fixedCosts / grossMargin;
}

/** Revenue multiple = Asking Price / Annual Revenue */
export function calcRevenueMultiple(deal: BusinessDeal): number {
  if (deal.annualRevenue === 0) return 0;
  return deal.askingPrice / deal.annualRevenue;
}

/** SDE multiple = Asking Price / SDE */
export function calcSDEMultiple(deal: BusinessDeal): number {
  const sde = calcSDE(deal);
  if (sde === 0) return 0;
  return deal.askingPrice / sde;
}

/** Compute all business metrics at once */
export function calcBusinessMetrics(deal: BusinessDeal): BusinessMetrics {
  return {
    ebitda: calcEBITDA(deal),
    sde: calcSDE(deal),
    roi: calcROI(deal),
    annualCashFlow: calcAnnualCashFlow(deal),
    breakEvenRevenue: calcBreakEvenRevenue(deal),
    monthlyDebtService: calcMonthlyDebtService(deal.financing),
    totalCashInvested: calcTotalCashInvested(deal),
    revenueMultiple: calcRevenueMultiple(deal),
    sdeMultiple: calcSDEMultiple(deal),
  };
}

/**
 * Project cash flows year-by-year for charting.
 */
export function projectBusinessCashFlows(
  deal: BusinessDeal,
  years = 10
): { year: number; revenue: number; cashFlow: number; cumulativeCashFlow: number }[] {
  const annualDebt = calcMonthlyDebtService(deal.financing) * 12;
  let currentRevenue = deal.annualRevenue;
  let currentExpenses = deal.operatingExpenses + deal.costOfGoods;
  let cumulative = 0;

  const projections = [];

  for (let y = 1; y <= years; y++) {
    const sde =
      currentRevenue -
      currentExpenses +
      deal.depreciation +
      deal.amortization +
      deal.interest +
      deal.taxes +
      deal.ownerSalary +
      deal.otherAddBacks;

    const cashFlow = sde - deal.ownerSalary - annualDebt;
    cumulative += cashFlow;

    projections.push({
      year: y,
      revenue: Math.round(currentRevenue),
      cashFlow: Math.round(cashFlow),
      cumulativeCashFlow: Math.round(cumulative),
    });

    currentRevenue *= 1 + deal.annualRevenueGrowth / 100;
    currentExpenses *= 1 + deal.annualExpenseGrowth / 100;
  }

  return projections;
}
