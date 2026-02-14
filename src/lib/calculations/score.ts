// ============================================
// Investment Score — Composite 0–100 deal rating
// ============================================
// Weighted score across key deal metrics.
// Gives users a fast, intuitive decision anchor.

import type {
  Deal,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
  RealEstateMetrics,
  BusinessMetrics,
  HybridMetrics,
} from '@/types';
import { calcRealEstateMetrics } from './real-estate';
import { calcBusinessMetrics } from './business';
import { calcHybridMetrics } from './hybrid';

// ─── Score Result ─────────────────────────────────────

export interface InvestmentScore {
  total: number;           // 0–100
  label: string;           // "Strong", "Good", etc.
  color: string;           // Tailwind color class
  breakdown: ScoreComponent[];
  summary: string;         // One-line description
}

export interface ScoreComponent {
  name: string;
  score: number;           // 0–100 (before weighting)
  weight: number;          // 0–1
  weighted: number;        // score × weight
}

// ─── Scoring Helpers ──────────────────────────────────

/** Clamp a value between 0 and 100 */
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Linear interpolation score: returns 0 at `low`, 100 at `high`.
 * Values outside the range are clamped.
 */
function linearScore(value: number, low: number, high: number): number {
  if (high === low) return value >= high ? 100 : 0;
  return clamp(((value - low) / (high - low)) * 100);
}

/**
 * Inverse linear: returns 100 at `low`, 0 at `high`.
 * Good for metrics where lower is better (e.g., expense ratio, SDE multiple).
 */
function inverseLinearScore(value: number, low: number, high: number): number {
  return 100 - linearScore(value, low, high);
}

/** Risk flag penalty: each flag deducts points */
function riskPenalty(flagCount: number, maxPenalty: number = 25): number {
  // Each flag deducts ~5 points, up to maxPenalty
  return Math.min(flagCount * 5, maxPenalty);
}

// ─── Real Estate Scoring ──────────────────────────────

function scoreRealEstate(data: RealEstateDeal, m: RealEstateMetrics): InvestmentScore {
  const components: ScoreComponent[] = [];

  // 1. Cap Rate (25% weight) — 3% = bad, 10%+ = great
  const capScore = linearScore(m.capRate, 3, 10);
  components.push({ name: 'Cap Rate', score: capScore, weight: 0.25, weighted: capScore * 0.25 });

  // 2. Cash-on-Cash (20% weight) — 0% = bad, 15%+ = great
  const cocScore = linearScore(m.cashOnCashReturn, 0, 15);
  components.push({ name: 'Cash-on-Cash', score: cocScore, weight: 0.20, weighted: cocScore * 0.20 });

  // 3. DSCR (20% weight) — 0.8 = terrible, 1.75+ = safe
  const dscrScore = linearScore(m.dscr, 0.8, 1.75);
  components.push({ name: 'DSCR', score: dscrScore, weight: 0.20, weighted: dscrScore * 0.20 });

  // 4. IRR (15% weight) — 0% = bad, 20%+ = great
  const irrScore = linearScore(m.irr, 0, 20);
  components.push({ name: 'IRR', score: irrScore, weight: 0.15, weighted: irrScore * 0.15 });

  // 5. Cash Flow Positivity (10% weight) — negative = 0, $50K+ = 100
  const cfScore = linearScore(m.annualCashFlow, 0, 50_000);
  components.push({ name: 'Cash Flow', score: cfScore, weight: 0.10, weighted: cfScore * 0.10 });

  // 6. Expense Ratio (10% weight) — lower is better: 30% = great, 65% = bad
  const egi = m.effectiveGrossIncome || 1;
  const expenseRatio = (m.operatingExpenses / egi) * 100;
  const expScore = inverseLinearScore(expenseRatio, 30, 65);
  components.push({ name: 'Expense Ratio', score: expScore, weight: 0.10, weighted: expScore * 0.10 });

  // Sum and apply risk penalty
  let raw = components.reduce((s, c) => s + c.weighted, 0);

  // Risk deductions
  const flags: number = countRiskFlags(m, 'real-estate', data);
  raw = Math.max(0, raw - riskPenalty(flags));

  const total = Math.round(raw);
  return { total, ...labelFromScore(total), breakdown: components, summary: buildSummary(total, components) };
}

// ─── Business Scoring ─────────────────────────────────

function scoreBusiness(data: BusinessDeal, m: BusinessMetrics): InvestmentScore {
  const components: ScoreComponent[] = [];

  // 1. SDE Multiple (25% weight) — lower is better: 1.5x = great, 5x = bad
  const sdeMultScore = inverseLinearScore(m.sdeMultiple, 1.5, 5);
  components.push({ name: 'SDE Multiple', score: sdeMultScore, weight: 0.25, weighted: sdeMultScore * 0.25 });

  // 2. ROI (20% weight) — 0% = bad, 40%+ = great
  const roiScore = linearScore(m.roi, 0, 40);
  components.push({ name: 'ROI', score: roiScore, weight: 0.20, weighted: roiScore * 0.20 });

  // 3. SDE Margin (20% weight) — 10% = thin, 40%+ = strong
  const sdeMargin = data.annualRevenue > 0 ? (m.sde / data.annualRevenue) * 100 : 0;
  const marginScore = linearScore(sdeMargin, 10, 40);
  components.push({ name: 'SDE Margin', score: marginScore, weight: 0.20, weighted: marginScore * 0.20 });

  // 4. Cash Flow (20% weight) — negative = 0, $100K+ = 100
  const cfScore = linearScore(m.annualCashFlow, 0, 100_000);
  components.push({ name: 'Cash Flow', score: cfScore, weight: 0.20, weighted: cfScore * 0.20 });

  // 5. Revenue Multiple (15% weight) — lower is better: 0.3x = great, 2x = bad
  const revMultScore = inverseLinearScore(m.revenueMultiple, 0.3, 2);
  components.push({ name: 'Revenue Multiple', score: revMultScore, weight: 0.15, weighted: revMultScore * 0.15 });

  let raw = components.reduce((s, c) => s + c.weighted, 0);
  const flags = countRiskFlags(m, 'business', data);
  raw = Math.max(0, raw - riskPenalty(flags));

  const total = Math.round(raw);
  return { total, ...labelFromScore(total), breakdown: components, summary: buildSummary(total, components) };
}

// ─── Hybrid Scoring ───────────────────────────────────

function scoreHybrid(data: HybridDeal, m: HybridMetrics): InvestmentScore {
  const components: ScoreComponent[] = [];

  // 1. Cap Rate (15% weight)
  const capScore = linearScore(m.capRate, 3, 10);
  components.push({ name: 'Cap Rate', score: capScore, weight: 0.15, weighted: capScore * 0.15 });

  // 2. Cash-on-Cash (15% weight)
  const cocScore = linearScore(m.cashOnCashReturn, 0, 15);
  components.push({ name: 'Cash-on-Cash', score: cocScore, weight: 0.15, weighted: cocScore * 0.15 });

  // 3. DSCR (20% weight)
  const dscrScore = linearScore(m.dscr, 0.8, 1.75);
  components.push({ name: 'DSCR', score: dscrScore, weight: 0.20, weighted: dscrScore * 0.20 });

  // 4. SDE Multiple (15% weight)
  const sdeMultScore = inverseLinearScore(m.sdeMultiple, 1.5, 5);
  components.push({ name: 'SDE Multiple', score: sdeMultScore, weight: 0.15, weighted: sdeMultScore * 0.15 });

  // 5. Combined Cash Flow (15% weight)
  const cfScore = linearScore(m.annualCashFlow, 0, 75_000);
  components.push({ name: 'Cash Flow', score: cfScore, weight: 0.15, weighted: cfScore * 0.15 });

  // 6. ROI (10% weight)
  const roiScore = linearScore(m.roi, 0, 30);
  components.push({ name: 'ROI', score: roiScore, weight: 0.10, weighted: roiScore * 0.10 });

  // 7. Price vs Allocation (10% weight) — does property + business ≈ purchase price?
  const allocationGap = Math.abs(data.propertyValue + data.businessValue - data.purchasePrice);
  const allocScore = allocationGap < 1000 ? 100 : inverseLinearScore(allocationGap, 0, data.purchasePrice * 0.1);
  components.push({ name: 'Allocation', score: allocScore, weight: 0.10, weighted: allocScore * 0.10 });

  let raw = components.reduce((s, c) => s + c.weighted, 0);
  const flags = countRiskFlags(m, 'hybrid', data);
  raw = Math.max(0, raw - riskPenalty(flags));

  const total = Math.round(raw);
  return { total, ...labelFromScore(total), breakdown: components, summary: buildSummary(total, components) };
}

// ─── Risk Flag Counter ────────────────────────────────

function countRiskFlags(
  m: RealEstateMetrics | BusinessMetrics | HybridMetrics,
  type: string,
  data: RealEstateDeal | BusinessDeal | HybridDeal
): number {
  let flags = 0;

  // Universal
  if ('dscr' in m && m.dscr < 1.0) flags++;
  if ('dscr' in m && m.dscr >= 1.0 && m.dscr < 1.25) flags++;
  if ('annualCashFlow' in m && m.annualCashFlow < 0) flags++;

  if (type === 'real-estate') {
    const re = data as RealEstateDeal;
    if (re.vacancyRate < 3) flags++;
    if ('capRate' in m && (m as RealEstateMetrics).capRate < 4) flags++;
    if ('cashOnCashReturn' in m && (m as RealEstateMetrics).cashOnCashReturn < 5) flags++;
    if (re.rehabCosts > re.purchasePrice * 0.25) flags++;
  }

  if (type === 'business') {
    const biz = data as BusinessDeal;
    const sdeMargin = biz.annualRevenue > 0 ? ((m as BusinessMetrics).sde / biz.annualRevenue) * 100 : 0;
    if (sdeMargin < 15) flags++;
    if ((m as BusinessMetrics).sdeMultiple > 4) flags++;
    if (biz.annualRevenue < 200_000) flags++;
  }

  if (type === 'hybrid') {
    const h = data as HybridDeal;
    if ('sdeMultiple' in m && (m as HybridMetrics).sdeMultiple > 4) flags++;
    if (h.propertyValue + h.businessValue > h.purchasePrice * 1.1) flags++;
  }

  return flags;
}

// ─── Labels ───────────────────────────────────────────

function labelFromScore(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Strong Buy', color: 'text-green-600' };
  if (score >= 65) return { label: 'Good Deal', color: 'text-emerald-600' };
  if (score >= 50) return { label: 'Fair', color: 'text-yellow-600' };
  if (score >= 35) return { label: 'Below Average', color: 'text-orange-600' };
  return { label: 'Weak', color: 'text-red-600' };
}

function buildSummary(total: number, components: ScoreComponent[]): string {
  // Identify the strongest and weakest components
  const sorted = [...components].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  if (total >= 80) return `Strong yield and safe coverage. ${best.name} is excellent.`;
  if (total >= 65) return `Solid fundamentals, ${worst.name} could be stronger.`;
  if (total >= 50) return `Acceptable deal but ${worst.name} is a concern. Negotiate terms.`;
  if (total >= 35) return `Multiple weaknesses — ${worst.name} and ${sorted[sorted.length - 2]?.name || best.name} need improvement.`;
  return `Significant risk. ${worst.name} is critically weak. Consider walking away.`;
}

// ─── Public API ───────────────────────────────────────

export function calcInvestmentScore(deal: Deal): InvestmentScore {
  if (deal.dealType === 'real-estate') {
    const m = calcRealEstateMetrics(deal.data as RealEstateDeal);
    return scoreRealEstate(deal.data as RealEstateDeal, m);
  }
  if (deal.dealType === 'hybrid') {
    const m = calcHybridMetrics(deal.data as HybridDeal);
    return scoreHybrid(deal.data as HybridDeal, m);
  }
  const m = calcBusinessMetrics(deal.data as BusinessDeal);
  return scoreBusiness(deal.data as BusinessDeal, m);
}

/**
 * Calculate score from pre-computed metrics (avoids double calculation).
 */
export function calcScoreFromMetrics(
  dealType: Deal['dealType'],
  data: Deal['data'],
  metrics: RealEstateMetrics | BusinessMetrics | HybridMetrics
): InvestmentScore {
  if (dealType === 'real-estate') {
    return scoreRealEstate(data as RealEstateDeal, metrics as RealEstateMetrics);
  }
  if (dealType === 'hybrid') {
    return scoreHybrid(data as HybridDeal, metrics as HybridMetrics);
  }
  return scoreBusiness(data as BusinessDeal, metrics as BusinessMetrics);
}
