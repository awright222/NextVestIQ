// ============================================
// Negotiation Analysis Engine
// ============================================
// Builds data-backed justification for a buyer's
// offer price. Designed to produce a professional
// document you can share with a seller or broker.

import type {
  Deal,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
} from '@/types';
import { calcRealEstateMetrics } from './calculations/real-estate';
import { calcBusinessMetrics } from './calculations/business';
import { calcHybridMetrics } from './calculations/hybrid';
import { calcInvestmentScore } from './calculations/score';
import { applyRecessionOverrides } from './calculations/recession';
import { runSensitivity } from './calculations/sensitivity';

// ─── Types ───────────────────────────────────────────

export interface ValuationRange {
  low: number;
  high: number;
  method: string;       // "Cap Rate", "SDE Multiple", "Dual (Property + Business)"
  details: string[];    // Explanation lines
}

export interface DSCRConstraint {
  maxSupportablePrice: number;
  dscr: number;
  minDSCR: number;
  noi: number;
  annualDebtService: number;
  explanation: string;
}

export interface PriceGap {
  askingPrice: number;
  fairValueMid: number;
  maxSupportable: number;
  suggestedOfferLow: number;
  suggestedOfferHigh: number;
  overpayAmount: number;   // How much over fair value the asking is (can be negative = discount)
  overpayPercent: number;
}

export interface NegotiationPoint {
  category: 'risk' | 'valuation' | 'market' | 'financial';
  title: string;
  detail: string;
  impact: 'high' | 'medium' | 'low';
}

export interface StressTestResult {
  baseScore: number;
  baseLabel: string;
  stressedScore: number;
  stressedLabel: string;
  baseCashFlow: number;
  stressedCashFlow: number;
}

export interface NegotiationAnalysis {
  dealName: string;
  dealType: string;
  askingPrice: number;
  valuation: ValuationRange;
  dscrConstraint: DSCRConstraint;
  priceGap: PriceGap;
  negotiationPoints: NegotiationPoint[];
  stressTest: StressTestResult;
  sensitivityAtPrice: { price: number; cashFlow: number; dscr: number; returnMetric: number; returnLabel: string }[];
}

// ─── Helpers ─────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

function calcMonthlyPayment(principal: number, rate: number, years: number): number {
  if (principal <= 0) return 0;
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return principal / n;
  return (principal * (monthlyRate * Math.pow(1 + monthlyRate, n))) / (Math.pow(1 + monthlyRate, n) - 1);
}

function capRateRange(deal: RealEstateDeal | HybridDeal): { low: number; high: number; label: string } {
  const price = deal.type === 'real-estate'
    ? (deal as RealEstateDeal).purchasePrice
    : (deal as HybridDeal).propertyValue;
  if (price < 500_000) return { low: 6, high: 10, label: 'small residential/commercial' };
  if (price < 2_000_000) return { low: 5, high: 8, label: 'mid-market commercial' };
  return { low: 4, high: 7, label: 'institutional-grade' };
}

function multipleRange(deal: BusinessDeal | HybridDeal): { low: number; high: number; reason: string } {
  const revenue = deal.annualRevenue;
  const sde = deal.type === 'business'
    ? calcBusinessMetrics(deal as BusinessDeal).sde
    : calcHybridMetrics(deal as HybridDeal).sde;
  const margin = sde / (revenue || 1);
  const reasons: string[] = [];
  let low = 2.0;
  let high = 3.5;

  if (margin < 0.15) {
    low = 1.5; high = 2.5;
    reasons.push('thin margins compress multiples');
  } else if (margin > 0.35) {
    low = 2.5; high = 4.0;
    reasons.push('strong margins command premium multiples');
  }

  if (revenue < 250_000) {
    low = Math.max(1.0, low - 0.5); high = Math.max(2.0, high - 0.5);
    reasons.push('micro-business trades at lower multiples');
  } else if (revenue > 2_000_000) {
    low += 0.5; high += 0.5;
    reasons.push('established revenue supports higher multiples');
  }

  if (deal.type === 'hybrid') {
    low += 0.5; high += 0.5;
    reasons.push('real property backing adds value');
  }

  return { low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10, reason: reasons.join('; ') || 'standard range' };
}

// ─── Max Supportable Price from DSCR ─────────────────

function calcMaxSupportablePrice(deal: Deal, minDSCR = 1.25): DSCRConstraint {
  const financing = deal.data.financing;
  const rate = financing.interestRate;
  const amortYears = financing.amortizationYears;
  const downPct = financing.downPayment / 100;

  let noi = 0;
  let dscr = 0;
  let annualDebtService = 0;

  if (deal.dealType === 'real-estate') {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    noi = m.noi;
    dscr = m.dscr;
    annualDebtService = m.monthlyMortgage * 12;
  } else if (deal.dealType === 'hybrid') {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    noi = m.totalNoi;
    dscr = m.dscr;
    annualDebtService = m.monthlyMortgage * 12;
  } else {
    const m = calcBusinessMetrics(deal.data as BusinessDeal);
    noi = m.sde - (deal.data as BusinessDeal).ownerSalary; // SDE minus replacement salary
    dscr = annualDebtService > 0 ? noi / (m.monthlyDebtService * 12) : Infinity;
    annualDebtService = m.monthlyDebtService * 12;
  }

  // Max annual debt service the NOI can support at the target DSCR
  const maxAnnualDebt = noi / minDSCR;
  const maxMonthlyPayment = maxAnnualDebt / 12;

  // Reverse-engineer max loan from max payment
  const monthlyRate = rate / 100 / 12;
  const n = amortYears * 12;
  let maxLoan: number;
  if (monthlyRate === 0) {
    maxLoan = maxMonthlyPayment * n;
  } else {
    maxLoan = maxMonthlyPayment * (Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, n));
  }

  // Max price = max loan / (1 - down payment %)
  const maxPrice = downPct < 1 ? maxLoan / (1 - downPct) : maxLoan;

  const explanation = noi <= 0
    ? `The property/business produces no positive cash flow, so no price is supportable at a ${minDSCR}x DSCR.`
    : `With ${fmt(noi)}/yr NOI and a ${minDSCR}x DSCR requirement, the maximum annual debt service is ${fmt(maxAnnualDebt)}. ` +
      `At ${pct(rate)} over ${amortYears} years with ${pct(financing.downPayment)} down, ` +
      `the highest price the income supports is ${fmt(Math.max(0, maxPrice))}.`;

  return {
    maxSupportablePrice: Math.max(0, maxPrice),
    dscr,
    minDSCR,
    noi,
    annualDebtService,
    explanation,
  };
}

// ─── Build Negotiation Points ────────────────────────

function buildNegotiationPoints(deal: Deal): NegotiationPoint[] {
  const points: NegotiationPoint[] = [];
  const financing = deal.data.financing;

  if (deal.dealType === 'real-estate') {
    const data = deal.data as RealEstateDeal;
    const m = calcRealEstateMetrics(data);
    const range = capRateRange(data);

    // Valuation
    if (m.capRate < range.low) {
      points.push({
        category: 'valuation',
        title: 'Cap Rate Below Market Range',
        detail: `The implied cap rate of ${pct(m.capRate)} is below the ${pct(range.low)}-${pct(range.high)} range for ${range.label} properties. Comparable properties trade at higher yields.`,
        impact: 'high',
      });
    }

    // Vacancy
    if (data.vacancyRate < 5) {
      points.push({
        category: 'risk',
        title: 'Optimistic Vacancy Assumption',
        detail: `The ${pct(data.vacancyRate)} vacancy rate used is below the industry-standard 5-8% for residential rental properties. Realistic vacancy would reduce NOI by ${fmt((data.grossRentalIncome + data.otherIncome) * (5 - data.vacancyRate) / 100)}/yr.`,
        impact: 'medium',
      });
    }

    // Expense ratio
    const expenseRatio = m.operatingExpenses / (m.effectiveGrossIncome || 1);
    if (expenseRatio > 0.55) {
      points.push({
        category: 'financial',
        title: 'High Operating Expense Ratio',
        detail: `Operating expenses consume ${pct(expenseRatio * 100)} of effective gross income — above the 40-50% benchmark. This indicates deferred maintenance, management inefficiency, or aging infrastructure.`,
        impact: 'medium',
      });
    }

    // DSCR
    if (m.dscr < 1.25 && m.dscr > 0) {
      points.push({
        category: 'financial',
        title: 'Insufficient Debt Service Coverage',
        detail: `DSCR of ${m.dscr.toFixed(2)}x is below the lender-standard 1.25x minimum. This makes financing difficult at the asking price and indicates the property is priced above what the income supports.`,
        impact: 'high',
      });
    }

    // Cash-on-cash
    if (m.cashOnCashReturn < 8) {
      points.push({
        category: 'financial',
        title: 'Below-Target Cash-on-Cash Return',
        detail: `Cash-on-cash return of ${pct(m.cashOnCashReturn)} is below the typical 8-12% target for investment properties. At this return level, alternatives like REITs or index funds offer comparable returns with less risk.`,
        impact: m.cashOnCashReturn < 5 ? 'high' : 'medium',
      });
    }

    // Rehab costs
    if (data.rehabCosts > data.purchasePrice * 0.15) {
      points.push({
        category: 'risk',
        title: 'Significant Rehabilitation Required',
        detail: `Rehab costs of ${fmt(data.rehabCosts)} represent ${pct(data.rehabCosts / data.purchasePrice * 100)} of the purchase price. This adds execution risk and carrying costs that should be reflected in a lower acquisition price.`,
        impact: 'medium',
      });
    }

  } else if (deal.dealType === 'business') {
    const data = deal.data as BusinessDeal;
    const m = calcBusinessMetrics(data);
    const range = multipleRange(data);

    // SDE multiple
    if (m.sdeMultiple > range.high) {
      points.push({
        category: 'valuation',
        title: 'Asking Multiple Above Market Range',
        detail: `The asking price implies a ${m.sdeMultiple.toFixed(1)}x SDE multiple, above the ${range.low}x-${range.high}x range for comparable businesses (${range.reason}). A rational price is ${fmt(m.sde * range.low)}-${fmt(m.sde * range.high)}.`,
        impact: 'high',
      });
    }

    // SDE margin
    const sdeMargin = m.sde / (data.annualRevenue || 1);
    if (sdeMargin < 0.15) {
      points.push({
        category: 'risk',
        title: 'Thin SDE Margin',
        detail: `SDE margin of ${pct(sdeMargin * 100)} is below 15%. A small revenue decline or cost increase could eliminate earnings entirely. This fragility warrants a discount.`,
        impact: 'high',
      });
    }

    // Owner dependency
    if (data.ownerSalary < 40_000 && data.annualRevenue > 300_000) {
      points.push({
        category: 'risk',
        title: 'Understated Owner Compensation',
        detail: `Owner salary of ${fmt(data.ownerSalary)} appears below market for a ${fmt(data.annualRevenue)}-revenue business. If a replacement manager costs $60K-$80K, true SDE is lower than stated.`,
        impact: 'medium',
      });
    }

    // Revenue concentration risk
    if (data.annualRevenue < 250_000) {
      points.push({
        category: 'risk',
        title: 'Small Revenue Base',
        detail: `Revenue of ${fmt(data.annualRevenue)} indicates a micro-business with likely high owner-dependency and customer concentration risk. These typically trade at the low end of multiple ranges.`,
        impact: 'medium',
      });
    }

    // Gross margin
    const grossMargin = (data.annualRevenue - data.costOfGoods) / (data.annualRevenue || 1);
    if (grossMargin < 0.30) {
      points.push({
        category: 'financial',
        title: 'Low Gross Margin',
        detail: `Gross margin of ${pct(grossMargin * 100)} leaves little room for operating expenses. A small cost increase in materials or COGS would significantly impact profitability.`,
        impact: 'medium',
      });
    }

  } else {
    // Hybrid
    const data = deal.data as HybridDeal;
    const m = calcHybridMetrics(data);
    const bRange = multipleRange(data);
    const pRange = capRateRange(data);

    if (m.sdeMultiple > bRange.high) {
      points.push({
        category: 'valuation',
        title: 'Business Portion Overvalued',
        detail: `The business allocation implies a ${m.sdeMultiple.toFixed(1)}x SDE multiple, above the ${bRange.low}x-${bRange.high}x range. The business portion alone is overpriced.`,
        impact: 'high',
      });
    }

    if (m.capRate < pRange.low && m.propertyNoi > 0) {
      points.push({
        category: 'valuation',
        title: 'Property Cap Rate Below Market',
        detail: `The property portion cap rate of ${pct(m.capRate)} is below the ${pct(pRange.low)}-${pct(pRange.high)} market range. The real estate allocation is priced at a premium.`,
        impact: 'high',
      });
    }

    if (m.dscr < 1.25 && m.dscr > 0) {
      points.push({
        category: 'financial',
        title: 'Thin Debt Coverage',
        detail: `Combined DSCR of ${m.dscr.toFixed(2)}x is below the 1.25x standard. The combined operation barely covers its debt service at the asking price.`,
        impact: 'high',
      });
    }
  }

  // Universal points
  if (financing.interestRate > 8) {
    points.push({
      category: 'market',
      title: 'Elevated Interest Rate Environment',
      detail: `The ${pct(financing.interestRate)} financing rate increases carrying costs significantly. Sellers should recognize that higher rates mean buyers can pay less for the same cash flow.`,
      impact: 'medium',
    });
  }

  return points;
}

// ─── Price Sensitivity Table ─────────────────────────

function buildPriceSensitivity(deal: Deal): NegotiationAnalysis['sensitivityAtPrice'] {
  const askingPrice = deal.dealType === 'business'
    ? (deal.data as BusinessDeal).askingPrice
    : (deal.data as RealEstateDeal | HybridDeal).purchasePrice;

  const steps = [-20, -15, -10, -5, 0, 5, 10];
  const results: NegotiationAnalysis['sensitivityAtPrice'] = [];

  for (const stepPct of steps) {
    const testPrice = Math.round(askingPrice * (1 + stepPct / 100));
    const loanAmount = testPrice * (1 - deal.data.financing.downPayment / 100);
    const monthlyPayment = calcMonthlyPayment(loanAmount, deal.data.financing.interestRate, deal.data.financing.amortizationYears);
    const annualDebt = monthlyPayment * 12;

    let cashFlow = 0;
    let dscr = 0;
    let returnMetric = 0;
    let returnLabel = '';

    if (deal.dealType === 'real-estate') {
      const data = deal.data as RealEstateDeal;
      const m = calcRealEstateMetrics(data);
      cashFlow = m.noi - annualDebt;
      dscr = annualDebt > 0 ? m.noi / annualDebt : Infinity;
      const totalCash = testPrice * (deal.data.financing.downPayment / 100) + data.closingCosts + data.rehabCosts;
      returnMetric = totalCash > 0 ? (cashFlow / totalCash) * 100 : 0;
      returnLabel = 'Cash-on-Cash';
    } else if (deal.dealType === 'hybrid') {
      const data = deal.data as HybridDeal;
      const m = calcHybridMetrics(data);
      cashFlow = m.totalNoi - annualDebt;
      dscr = annualDebt > 0 ? m.totalNoi / annualDebt : Infinity;
      const totalCash = testPrice * (deal.data.financing.downPayment / 100) + data.closingCosts + data.rehabCosts;
      returnMetric = totalCash > 0 ? (cashFlow / totalCash) * 100 : 0;
      returnLabel = 'Cash-on-Cash';
    } else {
      const data = deal.data as BusinessDeal;
      const m = calcBusinessMetrics(data);
      const noDebtIncome = m.sde - data.ownerSalary;
      cashFlow = noDebtIncome - annualDebt;
      dscr = annualDebt > 0 ? noDebtIncome / annualDebt : Infinity;
      const totalCash = testPrice * (deal.data.financing.downPayment / 100) + data.closingCosts;
      returnMetric = totalCash > 0 ? (cashFlow / totalCash) * 100 : 0;
      returnLabel = 'ROI';
    }

    results.push({
      price: testPrice,
      cashFlow: Math.round(cashFlow),
      dscr: Math.round(dscr * 100) / 100,
      returnMetric: Math.round(returnMetric * 100) / 100,
      returnLabel,
    });
  }

  return results;
}

// ─── Main Export ─────────────────────────────────────

export function buildNegotiationAnalysis(deal: Deal): NegotiationAnalysis {
  const askingPrice = deal.dealType === 'business'
    ? (deal.data as BusinessDeal).askingPrice
    : (deal.data as RealEstateDeal | HybridDeal).purchasePrice;

  // Valuation range
  let valuation: ValuationRange;
  if (deal.dealType === 'real-estate') {
    const data = deal.data as RealEstateDeal;
    const m = calcRealEstateMetrics(data);
    const range = capRateRange(data);
    const low = m.noi / (range.high / 100);
    const high = m.noi / (range.low / 100);
    valuation = {
      low, high,
      method: 'Cap Rate',
      details: [
        `NOI: ${fmt(m.noi)}/yr`,
        `Market cap rate range: ${pct(range.low)}-${pct(range.high)} (${range.label})`,
        `At ${pct(range.high)} cap: ${fmt(low)}`,
        `At ${pct(range.low)} cap: ${fmt(high)}`,
        `Current implied cap: ${pct(m.capRate)}`,
      ],
    };
  } else if (deal.dealType === 'business') {
    const data = deal.data as BusinessDeal;
    const m = calcBusinessMetrics(data);
    const range = multipleRange(data);
    const low = m.sde * range.low;
    const high = m.sde * range.high;
    valuation = {
      low, high,
      method: 'SDE Multiple',
      details: [
        `SDE: ${fmt(m.sde)}/yr`,
        `Market multiple range: ${range.low}x-${range.high}x (${range.reason})`,
        `At ${range.low}x: ${fmt(low)}`,
        `At ${range.high}x: ${fmt(high)}`,
        `Current implied multiple: ${m.sdeMultiple.toFixed(1)}x`,
      ],
    };
  } else {
    const data = deal.data as HybridDeal;
    const m = calcHybridMetrics(data);
    const bRange = multipleRange(data);
    const pRange = capRateRange(data);
    const bizLow = m.sde * bRange.low;
    const bizHigh = m.sde * bRange.high;
    const propLow = m.propertyNoi > 0 ? m.propertyNoi / (pRange.high / 100) : 0;
    const propHigh = m.propertyNoi > 0 ? m.propertyNoi / (pRange.low / 100) : 0;
    valuation = {
      low: bizLow + propLow,
      high: bizHigh + propHigh,
      method: 'Dual (Property + Business)',
      details: [
        `Business SDE: ${fmt(m.sde)} x ${bRange.low}-${bRange.high}x = ${fmt(bizLow)}-${fmt(bizHigh)}`,
        `Property NOI: ${fmt(m.propertyNoi)} at ${pct(pRange.low)}-${pct(pRange.high)} cap = ${fmt(propLow)}-${fmt(propHigh)}`,
        `Combined range: ${fmt(bizLow + propLow)}-${fmt(bizHigh + propHigh)}`,
      ],
    };
  }

  // DSCR constraint
  const dscrConstraint = calcMaxSupportablePrice(deal);

  // Price gap
  const fairMid = (valuation.low + valuation.high) / 2;
  const ceilingPrice = Math.min(valuation.high, dscrConstraint.maxSupportablePrice);
  const suggestedLow = valuation.low;
  const suggestedHigh = Math.round((valuation.low + fairMid) / 2); // Target lower half of range
  const overPay = askingPrice - fairMid;

  const priceGap: PriceGap = {
    askingPrice,
    fairValueMid: Math.round(fairMid),
    maxSupportable: Math.round(dscrConstraint.maxSupportablePrice),
    suggestedOfferLow: Math.round(suggestedLow),
    suggestedOfferHigh: Math.round(suggestedHigh),
    overpayAmount: Math.round(overPay),
    overpayPercent: fairMid > 0 ? Math.round((overPay / fairMid) * 1000) / 10 : 0,
  };

  // Negotiation points
  const negotiationPoints = buildNegotiationPoints(deal);

  // Stress test
  const baseScore = calcInvestmentScore(deal);
  const stressedData = applyRecessionOverrides(deal.data, deal.dealType);
  const stressedDeal: Deal = { ...deal, data: stressedData };
  const stressedScore = calcInvestmentScore(stressedDeal);

  let baseCashFlow = 0;
  let stressedCashFlow = 0;
  if (deal.dealType === 'real-estate') {
    baseCashFlow = calcRealEstateMetrics(deal.data as RealEstateDeal).annualCashFlow;
    stressedCashFlow = calcRealEstateMetrics(stressedData as RealEstateDeal).annualCashFlow;
  } else if (deal.dealType === 'hybrid') {
    baseCashFlow = calcHybridMetrics(deal.data as HybridDeal).annualCashFlow;
    stressedCashFlow = calcHybridMetrics(stressedData as HybridDeal).annualCashFlow;
  } else {
    baseCashFlow = calcBusinessMetrics(deal.data as BusinessDeal).annualCashFlow;
    stressedCashFlow = calcBusinessMetrics(stressedData as BusinessDeal).annualCashFlow;
  }

  const stressTest: StressTestResult = {
    baseScore: baseScore.total,
    baseLabel: baseScore.label,
    stressedScore: stressedScore.total,
    stressedLabel: stressedScore.label,
    baseCashFlow,
    stressedCashFlow,
  };

  // Sensitivity
  const sensitivityAtPrice = buildPriceSensitivity(deal);

  return {
    dealName: deal.name,
    dealType: deal.dealType === 'real-estate' ? 'Real Estate' : deal.dealType === 'business' ? 'Business Acquisition' : 'Hybrid (RE + Business)',
    askingPrice,
    valuation,
    dscrConstraint,
    priceGap,
    negotiationPoints,
    stressTest,
    sensitivityAtPrice,
  };
}
