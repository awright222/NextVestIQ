// ============================================
// Portfolio Aggregation Engine
// ============================================
// Aggregates metrics across all deals for a
// portfolio-level summary view.

import type {
  Deal,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
} from '@/types';
import { calcRealEstateMetrics } from './real-estate';
import { calcBusinessMetrics } from './business';
import { calcHybridMetrics } from './hybrid';
import { calcInvestmentScore, type InvestmentScore } from './score';

// ─── Types ───────────────────────────────────────────

export interface DealSummary {
  id: string;
  name: string;
  dealType: Deal['dealType'];
  price: number;
  cashInvested: number;
  annualCashFlow: number;
  cashOnCash: number;
  roi: number;
  score: InvestmentScore;
}

export interface PortfolioMetrics {
  /** Number of deals in portfolio */
  dealCount: number;

  /** Breakdown by deal type */
  typeCounts: { 'real-estate': number; business: number; hybrid: number };

  /** Total of all purchase/asking prices */
  totalPortfolioValue: number;

  /** Total cash invested across all deals */
  totalCashInvested: number;

  /** Total debt (sum of all loan amounts) */
  totalDebt: number;

  /** Sum of all annual cash flows */
  totalAnnualCashFlow: number;

  /** Weighted average cash-on-cash return (weighted by cash invested) */
  weightedCashOnCash: number;

  /** Weighted average ROI (weighted by cash invested) */
  weightedROI: number;

  /** Average investment score across all deals */
  averageScore: number;

  /** Total annual debt service */
  totalAnnualDebtService: number;

  /** Portfolio-level equity = total value - total debt */
  totalEquity: number;

  /** Loan-to-value ratio across the portfolio */
  portfolioLTV: number;

  /** Per-deal summaries sorted by score descending */
  deals: DealSummary[];
}

// ─── Helpers ─────────────────────────────────────────

function getPrice(deal: Deal): number {
  if (deal.dealType === 'real-estate') return (deal.data as RealEstateDeal).purchasePrice;
  if (deal.dealType === 'hybrid') return (deal.data as HybridDeal).purchasePrice;
  return (deal.data as BusinessDeal).askingPrice;
}

function getLoanAmount(deal: Deal): number {
  if (deal.dealType === 'real-estate') return (deal.data as RealEstateDeal).financing.loanAmount;
  if (deal.dealType === 'hybrid') return (deal.data as HybridDeal).financing.loanAmount;
  return (deal.data as BusinessDeal).financing.loanAmount;
}

// ─── Main Aggregation ────────────────────────────────

export function calcPortfolioMetrics(deals: Deal[]): PortfolioMetrics {
  if (deals.length === 0) {
    return {
      dealCount: 0,
      typeCounts: { 'real-estate': 0, business: 0, hybrid: 0 },
      totalPortfolioValue: 0,
      totalCashInvested: 0,
      totalDebt: 0,
      totalAnnualCashFlow: 0,
      weightedCashOnCash: 0,
      weightedROI: 0,
      averageScore: 0,
      totalAnnualDebtService: 0,
      totalEquity: 0,
      portfolioLTV: 0,
      deals: [],
    };
  }

  const typeCounts = { 'real-estate': 0, business: 0, hybrid: 0 };

  let totalPortfolioValue = 0;
  let totalCashInvested = 0;
  let totalDebt = 0;
  let totalAnnualCashFlow = 0;
  let totalAnnualDebtService = 0;

  // For weighted averages
  let cocWeightedSum = 0;
  let roiWeightedSum = 0;
  let scoreSum = 0;

  const dealSummaries: DealSummary[] = [];

  for (const deal of deals) {
    typeCounts[deal.dealType]++;

    const price = getPrice(deal);
    const loanAmount = getLoanAmount(deal);
    totalPortfolioValue += price;
    totalDebt += loanAmount;

    let cashInvested = 0;
    let annualCashFlow = 0;
    let cashOnCash = 0;
    let roi = 0;
    let annualDebtService = 0;

    if (deal.dealType === 'real-estate') {
      const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
      cashInvested = m.totalCashInvested;
      annualCashFlow = m.annualCashFlow;
      cashOnCash = m.cashOnCashReturn;
      roi = m.roi;
      annualDebtService = m.monthlyMortgage * 12;
    } else if (deal.dealType === 'business') {
      const m = calcBusinessMetrics(deal.data as BusinessDeal);
      cashInvested = m.totalCashInvested;
      annualCashFlow = m.annualCashFlow;
      cashOnCash = cashInvested > 0 ? (annualCashFlow / cashInvested) * 100 : 0;
      roi = m.roi;
      annualDebtService = m.monthlyDebtService * 12;
    } else {
      const m = calcHybridMetrics(deal.data as HybridDeal);
      cashInvested = m.totalCashInvested;
      annualCashFlow = m.annualCashFlow;
      cashOnCash = m.cashOnCashReturn;
      roi = m.roi;
      annualDebtService = m.monthlyMortgage * 12;
    }

    totalCashInvested += cashInvested;
    totalAnnualCashFlow += annualCashFlow;
    totalAnnualDebtService += annualDebtService;

    cocWeightedSum += cashOnCash * cashInvested;
    roiWeightedSum += roi * cashInvested;

    const score = calcInvestmentScore(deal);
    scoreSum += score.total;

    dealSummaries.push({
      id: deal.id,
      name: deal.name,
      dealType: deal.dealType,
      price,
      cashInvested,
      annualCashFlow,
      cashOnCash,
      roi,
      score,
    });
  }

  const weightedCashOnCash = totalCashInvested > 0 ? cocWeightedSum / totalCashInvested : 0;
  const weightedROI = totalCashInvested > 0 ? roiWeightedSum / totalCashInvested : 0;
  const averageScore = deals.length > 0 ? scoreSum / deals.length : 0;
  const totalEquity = totalPortfolioValue - totalDebt;
  const portfolioLTV = totalPortfolioValue > 0 ? (totalDebt / totalPortfolioValue) * 100 : 0;

  // Sort deals by score descending
  dealSummaries.sort((a, b) => b.score.total - a.score.total);

  return {
    dealCount: deals.length,
    typeCounts,
    totalPortfolioValue,
    totalCashInvested,
    totalDebt,
    totalAnnualCashFlow,
    weightedCashOnCash,
    weightedROI,
    averageScore,
    totalAnnualDebtService,
    totalEquity,
    portfolioLTV,
    deals: dealSummaries,
  };
}
