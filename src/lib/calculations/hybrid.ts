// ============================================
// Hybrid Deal Calculations
// ============================================
// For deals that combine real estate property ownership
// with a business operating inside the property
// (e.g., laundromats, car washes, restaurants with real estate).
//
// All functions are pure — no side effects.

import type { HybridDeal, HybridMetrics, FinancingTerms } from '@/types';

// ─── Mortgage / Debt Service ─────────────────────────────────

export function calcMonthlyMortgage(f: FinancingTerms): number {
  if (f.loanAmount <= 0 || f.interestRate <= 0 || f.amortizationYears <= 0) return 0;
  const r = f.interestRate / 100 / 12;
  const n = f.amortizationYears * 12;
  return (f.loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Property-Side Calculations ──────────────────────────────

/** Effective Gross Income from property (rent + other, minus vacancy) */
export function calcPropertyEGI(deal: HybridDeal): number {
  const gross = deal.grossRentalIncome + deal.otherPropertyIncome;
  return gross * (1 - deal.vacancyRate / 100);
}

/** Property operating expenses */
export function calcPropertyExpenses(deal: HybridDeal): number {
  const mgmtFee =
    (deal.grossRentalIncome + deal.otherPropertyIncome) *
    (deal.propertyManagement / 100);
  return (
    deal.propertyTax +
    deal.insurance +
    deal.maintenance +
    mgmtFee +
    deal.utilities +
    deal.otherPropertyExpenses
  );
}

/** Property NOI = EGI - property operating expenses */
export function calcPropertyNOI(deal: HybridDeal): number {
  return calcPropertyEGI(deal) - calcPropertyExpenses(deal);
}

/** Cap rate based on property value allocation */
export function calcCapRate(deal: HybridDeal): number {
  if (deal.propertyValue <= 0) return 0;
  return (calcPropertyNOI(deal) / deal.propertyValue) * 100;
}

// ─── Business-Side Calculations ──────────────────────────────

/** EBITDA from the business operations */
export function calcEBITDA(deal: HybridDeal): number {
  return (
    deal.annualRevenue -
    deal.costOfGoods -
    deal.businessOperatingExpenses
  );
}

/** SDE = EBITDA + owner salary + add-backs */
export function calcSDE(deal: HybridDeal): number {
  return (
    calcEBITDA(deal) +
    deal.ownerSalary +
    deal.depreciation +
    deal.amortization +
    deal.interest +
    deal.taxes +
    deal.otherAddBacks
  );
}

/** Revenue multiple relative to business value allocation */
export function calcRevenueMultiple(deal: HybridDeal): number {
  if (deal.annualRevenue <= 0) return 0;
  return deal.businessValue / deal.annualRevenue;
}

/** SDE multiple relative to business value allocation */
export function calcSDEMultiple(deal: HybridDeal): number {
  const sde = calcSDE(deal);
  if (sde <= 0) return 0;
  return deal.businessValue / sde;
}

// ─── Combined Calculations ──────────────────────────────────

/** Total net operating income = property NOI + business EBITDA */
export function calcTotalNOI(deal: HybridDeal): number {
  return calcPropertyNOI(deal) + calcEBITDA(deal);
}

/** Total cash invested = down payment + closing costs + rehab */
export function calcTotalCashInvested(deal: HybridDeal): number {
  const downPayment = deal.purchasePrice * (deal.financing.downPayment / 100);
  return downPayment + deal.closingCosts + deal.rehabCosts;
}

/** Annual cash flow after debt = total NOI - annual debt service */
export function calcAnnualCashFlow(deal: HybridDeal): number {
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;
  return calcTotalNOI(deal) - annualDebt;
}

/** Cash-on-cash return = annual cash flow / total cash invested */
export function calcCashOnCash(deal: HybridDeal): number {
  const invested = calcTotalCashInvested(deal);
  if (invested <= 0) return 0;
  return (calcAnnualCashFlow(deal) / invested) * 100;
}

/** ROI over 5-year hold = (total gains / cash invested) × 100 */
export function calcROI(deal: HybridDeal): number {
  const invested = calcTotalCashInvested(deal);
  if (invested <= 0) return 0;

  const cashFlow5yr = calcAnnualCashFlow(deal) * 5;
  const appreciation =
    deal.propertyValue * Math.pow(1 + deal.annualAppreciation / 100, 5) -
    deal.propertyValue;

  return ((cashFlow5yr + appreciation) / invested) * 100;
}

/** Debt service coverage ratio = total NOI / annual debt */
export function calcDSCR(deal: HybridDeal): number {
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;
  if (annualDebt <= 0) return Infinity;
  return calcTotalNOI(deal) / annualDebt;
}

/** Break-even revenue = business expenses + property expenses + debt service - property income */
export function calcBreakEvenRevenue(deal: HybridDeal): number {
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;
  const propertyExpenses = calcPropertyExpenses(deal);
  const propertyIncome = calcPropertyEGI(deal);
  return (
    deal.costOfGoods +
    deal.businessOperatingExpenses +
    propertyExpenses +
    annualDebt -
    propertyIncome
  );
}

/** Effective gross income = property EGI + business revenue */
export function calcEffectiveGrossIncome(deal: HybridDeal): number {
  return calcPropertyEGI(deal) + deal.annualRevenue;
}

/** Total operating expenses = property + business */
export function calcTotalOperatingExpenses(deal: HybridDeal): number {
  return (
    calcPropertyExpenses(deal) +
    deal.costOfGoods +
    deal.businessOperatingExpenses
  );
}

// ─── All-in-one metrics ──────────────────────────────────────

export function calcHybridMetrics(deal: HybridDeal): HybridMetrics {
  return {
    // Property
    propertyNoi: calcPropertyNOI(deal),
    capRate: calcCapRate(deal),

    // Business
    ebitda: calcEBITDA(deal),
    sde: calcSDE(deal),
    revenueMultiple: calcRevenueMultiple(deal),
    sdeMultiple: calcSDEMultiple(deal),

    // Combined
    totalNoi: calcTotalNOI(deal),
    annualCashFlow: calcAnnualCashFlow(deal),
    cashOnCashReturn: calcCashOnCash(deal),
    roi: calcROI(deal),
    dscr: calcDSCR(deal),
    monthlyMortgage: calcMonthlyMortgage(deal.financing),
    totalCashInvested: calcTotalCashInvested(deal),
    breakEvenRevenue: calcBreakEvenRevenue(deal),
    effectiveGrossIncome: calcEffectiveGrossIncome(deal),
    totalOperatingExpenses: calcTotalOperatingExpenses(deal),
  };
}

// ─── Cash Flow Projection ────────────────────────────────────

export function projectHybridCashFlows(
  deal: HybridDeal,
  years = 10
): { year: number; cashFlow: number; noi: number; cumulativeCashFlow: number }[] {
  const annualDebt = calcMonthlyMortgage(deal.financing) * 12;

  let currentPropertyIncome = calcPropertyEGI(deal);
  let currentPropertyExpenses = calcPropertyExpenses(deal);
  let currentRevenue = deal.annualRevenue;
  let currentBizExpenses = deal.costOfGoods + deal.businessOperatingExpenses;
  let cumulative = 0;

  const projections = [];

  for (let y = 1; y <= years; y++) {
    const propertyNoi = currentPropertyIncome - currentPropertyExpenses;
    const bizEbitda = currentRevenue - currentBizExpenses;
    const totalNoi = propertyNoi + bizEbitda;
    const cashFlow = totalNoi - annualDebt;
    cumulative += cashFlow;

    projections.push({
      year: y,
      cashFlow: Math.round(cashFlow),
      noi: Math.round(totalNoi),
      cumulativeCashFlow: Math.round(cumulative),
    });

    // Apply growth rates
    currentPropertyIncome *= 1 + deal.annualRentGrowth / 100;
    currentPropertyExpenses *= 1 + deal.annualExpenseGrowth / 100;
    currentRevenue *= 1 + deal.annualRevenueGrowth / 100;
    currentBizExpenses *= 1 + deal.annualExpenseGrowth / 100;
  }

  return projections;
}
