// ============================================
// Rule-Based Deal Analysis Engine
// ============================================
// Produces disciplined, narrative investment analysis
// without requiring an external AI service.
// Works for all three deal types: real-estate, business, hybrid.

import type {
  Deal,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
  RealEstateMetrics,
  BusinessMetrics,
  HybridMetrics,
  DealBreakdowns,
} from '@/types';
import { calcRealEstateMetrics } from './calculations/real-estate';
import { calcBusinessMetrics } from './calculations/business';
import { calcHybridMetrics } from './calculations/hybrid';

// ─── Output Types ────────────────────────────────────────

export interface AnalysisSection {
  title: string;
  emoji: string;
  content: string;
}

export interface DealAnalysis {
  verdict: 'strong-buy' | 'reasonable' | 'caution' | 'overpriced' | 'walk-away';
  verdictLabel: string;
  verdictSummary: string;
  sections: AnalysisSection[];
  generatedAt: string;
  mode: 'rule-engine' | 'ai';
}

// ─── Helpers ─────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

function multipleRange(deal: BusinessDeal | HybridDeal): { low: number; high: number; reason: string } {
  // Determine appropriate SDE multiple range based on deal characteristics
  const isHybrid = deal.type === 'hybrid';
  const revenue = deal.annualRevenue;
  const sde = deal.type === 'business'
    ? calcBusinessMetrics(deal).sde
    : calcHybridMetrics(deal as HybridDeal).sde;

  const margin = sde / (revenue || 1);
  const reasons: string[] = [];

  let low = 2.0;
  let high = 3.5;

  // Adjust based on margin
  if (margin < 0.15) {
    low = 1.5;
    high = 2.5;
    reasons.push('thin margins compress multiples');
  } else if (margin > 0.35) {
    low = 2.5;
    high = 4.0;
    reasons.push('strong margins command premium multiples');
  }

  // Revenue size adjustments
  if (revenue < 250_000) {
    low = Math.max(1.0, low - 0.5);
    high = Math.max(2.0, high - 0.5);
    reasons.push('micro-business (sub-$250K revenue) trades at lower multiples');
  } else if (revenue > 2_000_000) {
    low += 0.5;
    high += 0.5;
    reasons.push('established revenue base supports higher multiples');
  }

  // Hybrid bonus — real property backing adds value
  if (isHybrid) {
    low += 0.5;
    high += 0.5;
    reasons.push('real property backing provides downside protection');
  }

  return {
    low: Math.round(low * 10) / 10,
    high: Math.round(high * 10) / 10,
    reason: reasons.join('; ') || 'standard small business range',
  };
}

function capRateRange(deal: RealEstateDeal | HybridDeal): { low: number; high: number; label: string } {
  const price = deal.type === 'real-estate'
    ? (deal as RealEstateDeal).purchasePrice
    : (deal as HybridDeal).propertyValue;

  if (price < 500_000) return { low: 6, high: 10, label: 'small residential/commercial' };
  if (price < 2_000_000) return { low: 5, high: 8, label: 'mid-market commercial' };
  return { low: 4, high: 7, label: 'institutional-grade' };
}

// ─── Breakdown Insights ──────────────────────────────────

function buildBreakdownInsights(b?: DealBreakdowns): { section: AnalysisSection | null; riskFlags: string[] } {
  if (!b) return { section: null, riskFlags: [] };

  const lines: string[] = [];
  const flags: string[] = [];

  // Payroll insights
  if (b.payroll && b.payroll.employees.length > 0) {
    const totalHeadcount = b.payroll.employees.reduce((s, e) => s + e.count, 0);
    const totalWages = b.payroll.employees.reduce((s, e) => {
      return s + (e.wageType === 'hourly'
        ? e.wageRate * e.hoursPerWeek * e.weeksPerYear * e.count
        : e.wageRate * e.count);
    }, 0);
    const taxRate = (b.payroll.ficaRate + b.payroll.futaRate + b.payroll.suiRate + b.payroll.wcRate) / 100;
    const totalLabor = Math.round(totalWages * (1 + taxRate));

    lines.push(`📋 **Payroll**: ${totalHeadcount} employees, ${fmt(totalWages)} base wages + ${pct(taxRate * 100)} employer taxes = ${fmt(totalLabor)}/yr total labor`);

    // Flag high WC rates
    if (b.payroll.wcRate > 5) flags.push(`Workers' comp rate of ${pct(b.payroll.wcRate)} is high — verify classification codes`);
  }

  // Asset insights
  if (b.assets && b.assets.length > 0) {
    const owned = b.assets.filter((a) => a.ownership === 'owned');
    const leased = b.assets.filter((a) => a.ownership === 'leased');
    const totalBasis = owned.reduce((s, a) => s + a.costBasis, 0);
    const totalDep = owned.reduce((s, a) => {
      const dep = a.costBasis - a.salvageValue;
      if (dep <= 0) return s;
      const life = a.depreciationMethod === 'straight-line' ? a.usefulLifeYears
        : a.depreciationMethod === 'macrs-5' ? 5 : a.depreciationMethod === 'macrs-7' ? 7
        : a.depreciationMethod === 'macrs-15' ? 15 : 39;
      return s + Math.round(dep / life);
    }, 0);

    lines.push(`🏭 **Assets**: ${owned.length} owned (${fmt(totalBasis)} basis, ${fmt(totalDep)}/yr depreciation)${leased.length > 0 ? `, ${leased.length} leased` : ''}`);

    // Flag old assets that may need replacement
    const currentYear = new Date().getFullYear();
    const oldAssets = owned.filter((a) => currentYear - a.yearAcquired > (a.usefulLifeYears || 7));
    if (oldAssets.length > 0) flags.push(`${oldAssets.length} asset${oldAssets.length > 1 ? 's' : ''} past useful life — potential replacement capex needed`);
  }

  // Lease insights
  if (b.leases && b.leases.length > 0) {
    const totalRent = b.leases.reduce((s, l) => s + l.monthlyRent * 12 + l.camCharges, 0);
    lines.push(`🏢 **Leases**: ${b.leases.length} location${b.leases.length > 1 ? 's' : ''}, ${fmt(totalRent)}/yr total occupancy cost`);

    const now = new Date();
    const expiring = b.leases.filter((l) => {
      if (!l.leaseEndDate) return false;
      const end = new Date(l.leaseEndDate);
      const months = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return months <= 18 && months > 0;
    });
    const expired = b.leases.filter((l) => l.leaseEndDate && new Date(l.leaseEndDate) < now);

    if (expired.length > 0) flags.push(`${expired.length} lease${expired.length > 1 ? 's' : ''} already expired — immediate renegotiation risk`);
    if (expiring.length > 0) flags.push(`${expiring.length} lease${expiring.length > 1 ? 's' : ''} expiring within 18 months — renewal terms could change costs`);

    const nnnLeases = b.leases.filter((l) => l.tripleNet);
    if (nnnLeases.length > 0) lines.push(`  └ ${nnnLeases.length} NNN lease${nnnLeases.length > 1 ? 's' : ''}: buyer responsible for taxes, insurance, and maintenance on top of rent`);
  }

  // Interest insights
  if (b.interestItems && b.interestItems.length > 0) {
    const totalInterest = b.interestItems.reduce((s, i) => s + i.annualInterestPaid, 0);
    const totalDebt = b.interestItems.reduce((s, i) => s + i.currentBalance, 0);
    lines.push(`💳 **Existing Debt**: ${b.interestItems.length} obligation${b.interestItems.length > 1 ? 's' : ''}, ${fmt(totalDebt)} outstanding, ${fmt(totalInterest)}/yr interest`);
  }

  // Utility insights
  if (b.utilities && b.utilities.length > 0) {
    const totalUtilities = b.utilities.reduce((s, u) =>
      s + (u.electric + u.gas + u.water + u.trash + u.internet + u.other) * 12, 0);
    lines.push(`⚡ **Utilities**: ${fmt(totalUtilities)}/yr across ${b.utilities.length} location${b.utilities.length > 1 ? 's' : ''}`);
  }

  if (lines.length === 0) return { section: null, riskFlags: flags };

  return {
    section: {
      title: 'Detail Schedule Insights',
      emoji: '📑',
      content: lines.join('\n'),
    },
    riskFlags: flags,
  };
}

// ─── Real Estate Analysis ────────────────────────────────

function analyzeRealEstate(deal: Deal): DealAnalysis {
  const data = deal.data as RealEstateDeal;
  const m = calcRealEstateMetrics(data);
  const sections: AnalysisSection[] = [];
  const riskFlags: string[] = [];

  // 1. Income Assessment
  const egi = m.effectiveGrossIncome;
  const expenseRatio = m.operatingExpenses / (egi || 1);
  sections.push({
    title: 'What Does the Property Actually Produce?',
    emoji: '📊',
    content:
      `Gross rental income: ${fmt(data.grossRentalIncome)}/yr` +
      (data.otherIncome > 0 ? ` + ${fmt(data.otherIncome)} other income` : '') +
      `. After ${pct(data.vacancyRate)} vacancy, effective gross income is ${fmt(egi)}.` +
      `\n\nOperating expenses total ${fmt(m.operatingExpenses)} (${pct(expenseRatio * 100)} of EGI). ` +
      `Net Operating Income: ${fmt(m.noi)}/yr.` +
      (expenseRatio > 0.55
        ? `\n\n⚠️ Expense ratio above 55% is high — verify maintenance and management costs.`
        : expenseRatio < 0.30
        ? `\n\n✅ Expense ratio below 30% is lean — confirm no deferred maintenance.`
        : `\n\n✅ Expense ratio in normal range.`),
  });

  // 2. Valuation
  const range = capRateRange(data);
  const valueLow = m.noi / (range.high / 100);
  const valueHigh = m.noi / (range.low / 100);
  sections.push({
    title: 'What Do Rational Buyers Pay?',
    emoji: '🧮',
    content:
      `For this ${range.label} property, comparable cap rates run ${pct(range.low)}–${pct(range.high)}.` +
      `\n\nBased on the ${fmt(m.noi)} NOI:` +
      `\n• At ${pct(range.high)} cap: ${fmt(valueLow)}` +
      `\n• At ${pct(range.low)} cap: ${fmt(valueHigh)}` +
      `\n\nAsking price is ${fmt(data.purchasePrice)} (${pct(m.capRate)} cap rate).` +
      (m.capRate < range.low
        ? `\n\n⚠️ The cap rate is below the typical range — you'd be paying a premium.`
        : m.capRate > range.high
        ? `\n\n✅ Cap rate above range — this is priced aggressively in the buyer's favor.`
        : `\n\n✅ Cap rate is within the rational range.`),
  });

  // 3. Cash Flow / Debt Test
  const annualDebt = m.monthlyMortgage * 12;
  const cashAfterDebt = m.noi - annualDebt;
  sections.push({
    title: 'Debt Test (Sleep-at-Night Rule)',
    emoji: '🏦',
    content:
      `Down payment: ${pct(data.financing.downPayment)} → ${fmt(data.purchasePrice * data.financing.downPayment / 100)}` +
      `\nLoan: ${fmt(data.financing.loanAmount)} @ ${pct(data.financing.interestRate)} for ${data.financing.loanTermYears} years` +
      `\nAnnual debt service: ${fmt(annualDebt)}` +
      `\n\nNOI (${fmt(m.noi)}) − Debt (${fmt(annualDebt)}) = ${fmt(cashAfterDebt)}/yr cash flow` +
      `\nDSCR: ${m.dscr.toFixed(2)}x` +
      (m.dscr < 1.0
        ? `\n\n🚫 DSCR below 1.0 — the property doesn't cover its debt. This is a cash drain.`
        : m.dscr < 1.25
        ? `\n\n⚠️ DSCR below 1.25 — very thin margin for error. One bad month hurts.`
        : `\n\n✅ DSCR at ${m.dscr.toFixed(2)}x gives comfortable debt coverage.`),
  });

  // 4. Breakdown insights (if available)
  const bi = buildBreakdownInsights(deal.breakdowns);
  if (bi.section) sections.push(bi.section);
  riskFlags.push(...bi.riskFlags);

  // 5. Risk Flags
  if (data.vacancyRate < 3) riskFlags.push('Vacancy assumption below 3% is unrealistically optimistic');
  if (expenseRatio > 0.55) riskFlags.push('High expense ratio (above 55%) compresses returns');
  if (m.dscr < 1.25 && m.dscr >= 1.0) riskFlags.push('DSCR is thin — limited margin for unexpected costs');
  if (m.dscr < 1.0) riskFlags.push('Negative cash flow after debt service');
  if (m.capRate < range.low) riskFlags.push(`Cap rate (${pct(m.capRate)}) below market range — paying a premium`);
  if (m.cashOnCashReturn < 5) riskFlags.push(`Cash-on-cash return of ${pct(m.cashOnCashReturn)} is below typical targets (8-12%)`);
  if (data.rehabCosts > data.purchasePrice * 0.25) riskFlags.push('Rehab costs exceed 25% of purchase price — significant renovation risk');

  if (riskFlags.length > 0) {
    sections.push({
      title: 'Risk Flags',
      emoji: '🚩',
      content: riskFlags.map((f) => `• ${f}`).join('\n'),
    });
  }

  // 6. Verdict
  let verdict: DealAnalysis['verdict'];
  let verdictLabel: string;
  let verdictSummary: string;

  if (m.dscr < 1.0) {
    verdict = 'walk-away';
    verdictLabel = 'Walk Away';
    verdictSummary = `This property doesn't cover its debt at ${fmt(data.purchasePrice)}. Unless you can negotiate substantially lower or bring more cash down, the numbers don't work.`;
  } else if (m.capRate < range.low && m.cashOnCashReturn < 6) {
    verdict = 'overpriced';
    verdictLabel = 'Overpriced';
    verdictSummary = `At ${fmt(data.purchasePrice)}, this is above what the income supports. A rational buyer would target ${fmt(valueLow)}–${fmt(valueHigh)}. You're paying for upside that isn't guaranteed.`;
  } else if (m.capRate >= range.low && m.dscr >= 1.25 && m.cashOnCashReturn >= 8) {
    verdict = 'strong-buy';
    verdictLabel = 'Strong Buy';
    verdictSummary = `Solid deal. ${pct(m.capRate)} cap rate, ${m.dscr.toFixed(2)}x DSCR, and ${pct(m.cashOnCashReturn)} cash-on-cash. The price (${fmt(data.purchasePrice)}) is within the ${fmt(valueLow)}–${fmt(valueHigh)} rational range and cash flows from day one.`;
  } else if (riskFlags.length <= 1 && m.dscr >= 1.15) {
    verdict = 'reasonable';
    verdictLabel = 'Reasonable';
    verdictSummary = `The numbers work at ${fmt(data.purchasePrice)} but leave limited margin. A disciplined offer around ${fmt(valueLow)}–${fmt(Math.min(valueHigh, data.purchasePrice))} gives you room for the unexpected. Cash flow of ${fmt(cashAfterDebt)}/yr is acceptable but not exciting.`;
  } else {
    verdict = 'caution';
    verdictLabel = 'Proceed with Caution';
    verdictSummary = `There are ${riskFlags.length} risk flag${riskFlags.length !== 1 ? 's' : ''} on this deal. The returns are marginal and several assumptions need to hold for this to work. Negotiate hard or find better inventory.`;
  }

  sections.push({
    title: 'My Straight Answer',
    emoji: '🎯',
    content: verdictSummary,
  });

  return { verdict, verdictLabel, verdictSummary, sections, generatedAt: new Date().toISOString(), mode: 'rule-engine' };
}

// ─── Business Analysis ───────────────────────────────────

function analyzeBusiness(deal: Deal): DealAnalysis {
  const data = deal.data as BusinessDeal;
  const m = calcBusinessMetrics(data);
  const sections: AnalysisSection[] = [];
  const riskFlags: string[] = [];

  // 1. SDE Assessment
  const grossMargin = ((data.annualRevenue - data.costOfGoods) / (data.annualRevenue || 1)) * 100;
  const sdeMargin = (m.sde / (data.annualRevenue || 1)) * 100;
  sections.push({
    title: 'What Does the Business Actually Produce?',
    emoji: '📊',
    content:
      `Annual revenue: ${fmt(data.annualRevenue)}` +
      `\nCOGS: ${fmt(data.costOfGoods)} — Gross margin: ${pct(grossMargin)}` +
      `\nEBITDA: ${fmt(m.ebitda)}` +
      `\nSDE (Seller's Discretionary Earnings): ${fmt(m.sde)}` +
      `\n\nSDE is what matters for small business valuation. It's ${pct(sdeMargin)} of revenue.` +
      (sdeMargin < 15
        ? `\n\n⚠️ SDE margin below 15% is thin. Any revenue hiccup wipes out earnings fast.`
        : sdeMargin > 35
        ? `\n\n✅ SDE margin above 35% is strong — this business has real pricing power or low overhead.`
        : `\n\n✅ SDE margin is in a healthy range.`),
  });

  // 2. Valuation Range
  const range = multipleRange(data);
  const valueLow = m.sde * range.low;
  const valueHigh = m.sde * range.high;
  sections.push({
    title: 'What Do Rational Buyers Pay?',
    emoji: '🧮',
    content:
      `For this business profile, typical SDE multiples run ${range.low}x–${range.high}x (${range.reason}).` +
      `\n\n• At ${range.low}x SDE: ${fmt(valueLow)}` +
      `\n• At ${range.high}x SDE: ${fmt(valueHigh)}` +
      `\n\nAsking price: ${fmt(data.askingPrice)} (${m.sdeMultiple.toFixed(1)}x SDE multiple)` +
      (m.sdeMultiple > range.high
        ? `\n\n⚠️ The asking price implies a ${m.sdeMultiple.toFixed(1)}x multiple — above the rational range. You'd be overpaying.`
        : m.sdeMultiple < range.low
        ? `\n\n✅ The asking price is below the bottom of the range — potentially a bargain if the SDE holds up.`
        : `\n\n✅ The asking price is within the rational multiple range.`),
  });

  // 3. Reasonable Price Range
  sections.push({
    title: 'The Reasonable Price Range',
    emoji: '💰',
    content:
      `Based on a conservative SDE of ${fmt(m.sde)}:` +
      `\n\n• Your disciplined range: ${fmt(valueLow)} – ${fmt(valueHigh)}` +
      `\n\nAnything above ${fmt(valueHigh)} means you're paying for projected growth or "potential" — that's the seller's upside, not yours.` +
      (data.askingPrice > valueHigh
        ? `\n\n⚠️ The listing at ${fmt(data.askingPrice)} is ${fmt(data.askingPrice - valueHigh)} above the top of your range.`
        : `\n\n✅ The listing is within your disciplined buying range.`),
  });

  // 4. Debt Test
  const annualDebt = m.monthlyDebtService * 12;
  const replacementSalary = data.ownerSalary;
  const cashAfterDebt = m.sde - replacementSalary - annualDebt;
  const debtCoverageRatio = annualDebt > 0 ? (m.sde - replacementSalary) / annualDebt : Infinity;
  sections.push({
    title: 'Debt Test (Sleep-at-Night Rule)',
    emoji: '🏦',
    content:
      `Down payment: ${pct(data.financing.downPayment)} → ${fmt(data.askingPrice * data.financing.downPayment / 100)}` +
      `\nLoan: ${fmt(data.financing.loanAmount)} @ ${pct(data.financing.interestRate)} for ${data.financing.loanTermYears} years` +
      `\nAnnual debt service: ${fmt(annualDebt)}` +
      `\n\nSDE (${fmt(m.sde)}) − Your salary (${fmt(replacementSalary)}) − Debt (${fmt(annualDebt)}) = ${fmt(cashAfterDebt)}/yr` +
      `\nDebt coverage: ${debtCoverageRatio === Infinity ? '∞' : debtCoverageRatio.toFixed(2)}x` +
      (cashAfterDebt < 0
        ? `\n\n🚫 Negative cash flow — the business can't pay you AND the loan. Either price must drop or you need more down payment.`
        : cashAfterDebt < 20_000
        ? `\n\n⚠️ Only ${fmt(cashAfterDebt)}/yr left — dangerously thin. One bad quarter and you're in trouble.`
        : `\n\n✅ ${fmt(cashAfterDebt)}/yr after salary and debt — you can sleep at night.`),
  });

  // 5. Breakdown insights (if available)
  const bi = buildBreakdownInsights(deal.breakdowns);
  if (bi.section) sections.push(bi.section);
  riskFlags.push(...bi.riskFlags);

  // 6. Risk Flags
  if (sdeMargin < 15) riskFlags.push('SDE margin below 15% — thin and fragile');
  if (m.sdeMultiple > range.high) riskFlags.push(`Asking multiple (${m.sdeMultiple.toFixed(1)}x) exceeds rational range (${range.low}x–${range.high}x)`);
  if (cashAfterDebt < 0) riskFlags.push('Negative cash flow after salary and debt');
  if (cashAfterDebt > 0 && cashAfterDebt < 20_000) riskFlags.push('Cash cushion under $20K/yr — very thin');
  if (grossMargin < 30) riskFlags.push(`Gross margin of ${pct(grossMargin)} is low — COGS vulnerability`);
  if (data.annualRevenue < 200_000) riskFlags.push('Revenue under $200K — very small business, high owner-dependency risk');
  if (data.ownerSalary < 40_000 && data.annualRevenue > 300_000) riskFlags.push('Owner salary looks understated — verify SDE add-backs');

  if (riskFlags.length > 0) {
    sections.push({
      title: 'Risk Flags',
      emoji: '🚩',
      content: riskFlags.map((f) => `• ${f}`).join('\n'),
    });
  }

  // 7. Verdict
  let verdict: DealAnalysis['verdict'];
  let verdictLabel: string;
  let verdictSummary: string;

  if (cashAfterDebt < 0) {
    verdict = 'walk-away';
    verdictLabel = 'Walk Away';
    verdictSummary = `At ${fmt(data.askingPrice)}, this business cannot pay you a salary and cover its debt. The math doesn't work. Counter at ${fmt(valueLow)}–${fmt(Math.min(valueLow + (valueHigh - valueLow) * 0.3, valueHigh))} or walk.`;
  } else if (m.sdeMultiple > range.high + 0.5) {
    verdict = 'overpriced';
    verdictLabel = 'Overpriced';
    verdictSummary = `The seller wants ${fmt(data.askingPrice)} but the business produces ${fmt(m.sde)} SDE. That's a ${m.sdeMultiple.toFixed(1)}x multiple — above what disciplined buyers pay. A rational range is ${fmt(valueLow)}–${fmt(valueHigh)}. Don't pay for the seller's dreamscape.`;
  } else if (m.sdeMultiple <= range.low && cashAfterDebt >= 30_000 && riskFlags.length <= 1) {
    verdict = 'strong-buy';
    verdictLabel = 'Strong Buy';
    verdictSummary = `At ${fmt(data.askingPrice)} (${m.sdeMultiple.toFixed(1)}x SDE), this is priced at or below the conservative end. SDE of ${fmt(m.sde)}, ${fmt(cashAfterDebt)}/yr free cash after salary and debt. If the financials verify, this is a solid acquisition.`;
  } else if (m.sdeMultiple <= range.high && cashAfterDebt >= 15_000) {
    verdict = 'reasonable';
    verdictLabel = 'Reasonable';
    verdictSummary = `The asking price of ${fmt(data.askingPrice)} is within the ${fmt(valueLow)}–${fmt(valueHigh)} range. You'll clear ${fmt(cashAfterDebt)}/yr after salary and debt. Verify the SDE add-backs carefully, but the bones are sound. Target ${fmt(valueLow + (valueHigh - valueLow) * 0.3)} as your offer.`;
  } else {
    verdict = 'caution';
    verdictLabel = 'Proceed with Caution';
    verdictSummary = `There are ${riskFlags.length} risk flag${riskFlags.length !== 1 ? 's' : ''} on this deal. The return is marginal for the risk. If you proceed, anchor your offer at ${fmt(valueLow)} and don't go above ${fmt(valueHigh)}. Make the seller prove every add-back.`;
  }

  sections.push({
    title: 'My Straight Answer',
    emoji: '🎯',
    content: verdictSummary,
  });

  return { verdict, verdictLabel, verdictSummary, sections, generatedAt: new Date().toISOString(), mode: 'rule-engine' };
}

// ─── Hybrid Analysis ─────────────────────────────────────

function analyzeHybrid(deal: Deal): DealAnalysis {
  const data = deal.data as HybridDeal;
  const m = calcHybridMetrics(data);
  const sections: AnalysisSection[] = [];
  const riskFlags: string[] = [];

  // 1. Combined Earnings
  const sdeMargin = (m.sde / (data.annualRevenue || 1)) * 100;
  sections.push({
    title: 'What Does the Combined Operation Produce?',
    emoji: '📊',
    content:
      `This is a hybrid deal — you're buying both the real property and the business inside it.` +
      `\n\nProperty NOI: ${fmt(m.propertyNoi)}` +
      `\nBusiness SDE: ${fmt(m.sde)} (${pct(sdeMargin)} of revenue)` +
      `\nCombined NOI: ${fmt(m.totalNoi)}` +
      `\n\nProperty allocation: ${fmt(data.propertyValue)} · Business/goodwill: ${fmt(data.businessValue)}` +
      `\nTotal purchase: ${fmt(data.purchasePrice)}`,
  });

  // 2. Dual Valuation
  const bRange = multipleRange(data);
  const pRange = capRateRange(data);
  const businessValLow = m.sde * bRange.low;
  const businessValHigh = m.sde * bRange.high;
  const propertyValLow = m.propertyNoi > 0 ? m.propertyNoi / (pRange.high / 100) : 0;
  const propertyValHigh = m.propertyNoi > 0 ? m.propertyNoi / (pRange.low / 100) : 0;
  const totalValLow = businessValLow + propertyValLow;
  const totalValHigh = businessValHigh + propertyValHigh;

  sections.push({
    title: 'Dual Valuation (Property + Business)',
    emoji: '🧮',
    content:
      `Business portion (${bRange.low}x–${bRange.high}x SDE): ${fmt(businessValLow)}–${fmt(businessValHigh)}` +
      (m.propertyNoi > 0
        ? `\nProperty portion (${pct(pRange.low)}–${pct(pRange.high)} cap): ${fmt(propertyValLow)}–${fmt(propertyValHigh)}`
        : `\nProperty portion: Valued at allocation of ${fmt(data.propertyValue)} (no separate rental income)`) +
      `\n\nCombined rational range: ${fmt(totalValLow)}–${fmt(totalValHigh)}` +
      `\nAsking: ${fmt(data.purchasePrice)}` +
      (data.purchasePrice > totalValHigh
        ? `\n\n⚠️ Asking price exceeds the combined rational range by ${fmt(data.purchasePrice - totalValHigh)}.`
        : `\n\n✅ Asking price is within the combined valuation range.`),
  });

  // 3. Debt Test
  const annualDebt = m.monthlyMortgage * 12;
  const cashAfterDebt = m.totalNoi - annualDebt;
  sections.push({
    title: 'Debt Test (Sleep-at-Night Rule)',
    emoji: '🏦',
    content:
      `Total cash in: ${fmt(m.totalCashInvested)} (down payment + closing + rehab)` +
      `\nLoan: ${fmt(data.financing.loanAmount)} @ ${pct(data.financing.interestRate)} for ${data.financing.loanTermYears} years` +
      `\nAnnual debt service: ${fmt(annualDebt)}` +
      `\n\nCombined NOI (${fmt(m.totalNoi)}) − Debt (${fmt(annualDebt)}) = ${fmt(cashAfterDebt)}/yr` +
      `\nDSCR: ${m.dscr.toFixed(2)}x` +
      (m.dscr < 1.0
        ? `\n\n🚫 DSCR below 1.0 — combined income doesn't cover debt. Deal is underwater.`
        : m.dscr < 1.25
        ? `\n\n⚠️ DSCR of ${m.dscr.toFixed(2)}x is thin — limited cushion for surprises.`
        : `\n\n✅ DSCR of ${m.dscr.toFixed(2)}x — healthy debt coverage.`),
  });

  // 4. Breakdown insights (if available)
  const bi = buildBreakdownInsights(deal.breakdowns);
  if (bi.section) sections.push(bi.section);
  riskFlags.push(...bi.riskFlags);

  // 5. Risk Flags
  if (m.dscr < 1.0) riskFlags.push('Negative cash flow after debt service');
  if (m.dscr >= 1.0 && m.dscr < 1.25) riskFlags.push('Thin DSCR — limited margin');
  if (sdeMargin < 15) riskFlags.push('Business SDE margin below 15% — fragile');
  if (data.purchasePrice > totalValHigh) riskFlags.push('Purchase price exceeds combined valuation range');
  if (data.propertyValue + data.businessValue !== data.purchasePrice && Math.abs(data.propertyValue + data.businessValue - data.purchasePrice) > 1000) {
    riskFlags.push('Property + business allocation doesn\'t sum to purchase price — review allocation');
  }
  if (m.cashOnCashReturn < 5) riskFlags.push(`Cash-on-cash return of ${pct(m.cashOnCashReturn)} is below typical targets`);
  if (data.rehabCosts > data.purchasePrice * 0.2) riskFlags.push('Rehab costs exceed 20% of purchase — significant capital exposure');

  if (riskFlags.length > 0) {
    sections.push({
      title: 'Risk Flags',
      emoji: '🚩',
      content: riskFlags.map((f) => `• ${f}`).join('\n'),
    });
  }

  // 6. Verdict
  let verdict: DealAnalysis['verdict'];
  let verdictLabel: string;
  let verdictSummary: string;

  if (m.dscr < 1.0) {
    verdict = 'walk-away';
    verdictLabel = 'Walk Away';
    verdictSummary = `Combined income of ${fmt(m.totalNoi)} can't service ${fmt(annualDebt)} in debt. At ${fmt(data.purchasePrice)}, this deal is cash-negative. Counter at ${fmt(totalValLow)} or find a different property.`;
  } else if (data.purchasePrice > totalValHigh * 1.1) {
    verdict = 'overpriced';
    verdictLabel = 'Overpriced';
    verdictSummary = `The combined property + business valuation tops out at ${fmt(totalValHigh)}. The asking price of ${fmt(data.purchasePrice)} is above that. You'd need stellar growth just to justify what you paid, which is the seller's problem, not yours.`;
  } else if (m.dscr >= 1.25 && m.cashOnCashReturn >= 8 && data.purchasePrice <= totalValHigh) {
    verdict = 'strong-buy';
    verdictLabel = 'Strong Buy';
    verdictSummary = `This hybrid deal works. DSCR of ${m.dscr.toFixed(2)}x, ${pct(m.cashOnCashReturn)} cash-on-cash, and ${fmt(data.purchasePrice)} is within the ${fmt(totalValLow)}–${fmt(totalValHigh)} rational range. The underlying real estate provides downside protection. Solid acquisition.`;
  } else if (riskFlags.length <= 2 && m.dscr >= 1.15) {
    verdict = 'reasonable';
    verdictLabel = 'Reasonable';
    verdictSummary = `At ${fmt(data.purchasePrice)}, the deal is workable. Cash flow of ${fmt(cashAfterDebt)}/yr and ${m.dscr.toFixed(2)}x debt coverage. Target ${fmt(totalValLow + (totalValHigh - totalValLow) * 0.4)} as your offer and verify the business financials independently.`;
  } else {
    verdict = 'caution';
    verdictLabel = 'Proceed with Caution';
    verdictSummary = `Multiple concerns here: ${riskFlags.length} risk flag${riskFlags.length !== 1 ? 's' : ''}. The combined operation produces ${fmt(m.totalNoi)} but the margin for error is slim. If you proceed, make the offer contingent on verified financials and target the low end of ${fmt(totalValLow)}–${fmt(totalValHigh)}.`;
  }

  sections.push({
    title: 'My Straight Answer',
    emoji: '🎯',
    content: verdictSummary,
  });

  return { verdict, verdictLabel, verdictSummary, sections, generatedAt: new Date().toISOString(), mode: 'rule-engine' };
}

// ─── Public API ──────────────────────────────────────────

export function analyzeDeal(deal: Deal): DealAnalysis {
  switch (deal.dealType) {
    case 'real-estate':
      return analyzeRealEstate(deal);
    case 'business':
      return analyzeBusiness(deal);
    case 'hybrid':
      return analyzeHybrid(deal);
    default:
      throw new Error(`Unknown deal type: ${deal.dealType}`);
  }
}
