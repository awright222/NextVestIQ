// ============================================
// Investment Score Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { Deal, RealEstateDeal, BusinessDeal, HybridDeal, FinancingTerms } from '@/types';
import { calcInvestmentScore, calcScoreFromMetrics } from '@/lib/calculations/score';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';

// ─── Fixtures ────────────────────────────────────────

const financing: FinancingTerms = {
  loanType: 'conventional',
  loanAmount: 160_000,
  downPayment: 20,
  interestRate: 7,
  loanTermYears: 30,
  amortizationYears: 30,
};

const reDeal: RealEstateDeal = {
  type: 'real-estate',
  purchasePrice: 200_000,
  closingCosts: 5_000,
  rehabCosts: 10_000,
  grossRentalIncome: 24_000,
  otherIncome: 1_200,
  vacancyRate: 5,
  propertyTax: 2_400,
  insurance: 1_200,
  maintenance: 1_500,
  propertyManagement: 8,
  utilities: 600,
  otherExpenses: 300,
  financing,
  annualRentGrowth: 3,
  annualExpenseGrowth: 2,
  annualAppreciation: 3,
};

const bizDeal: BusinessDeal = {
  type: 'business',
  askingPrice: 500_000,
  closingCosts: 10_000,
  annualRevenue: 800_000,
  costOfGoods: 320_000,
  operatingExpenses: 200_000,
  ownerSalary: 80_000,
  depreciation: 15_000,
  amortization: 5_000,
  interest: 20_000,
  taxes: 30_000,
  otherAddBacks: 10_000,
  financing: {
    loanType: 'sba-7a',
    loanAmount: 400_000,
    downPayment: 20,
    interestRate: 6.5,
    loanTermYears: 10,
    amortizationYears: 10,
  },
  annualRevenueGrowth: 3,
  annualExpenseGrowth: 2,
};

const hybridDeal: HybridDeal = {
  type: 'hybrid',
  purchasePrice: 800_000,
  propertyValue: 500_000,
  businessValue: 300_000,
  closingCosts: 15_000,
  rehabCosts: 20_000,
  grossRentalIncome: 30_000,
  otherPropertyIncome: 2_000,
  vacancyRate: 5,
  propertyTax: 6_000,
  insurance: 3_000,
  maintenance: 4_000,
  propertyManagement: 8,
  utilities: 2_000,
  otherPropertyExpenses: 1_000,
  annualRevenue: 500_000,
  costOfGoods: 200_000,
  businessOperatingExpenses: 150_000,
  ownerSalary: 60_000,
  depreciation: 10_000,
  amortization: 5_000,
  interest: 15_000,
  taxes: 20_000,
  otherAddBacks: 5_000,
  financing: {
    loanType: 'sba-7a',
    loanAmount: 640_000,
    downPayment: 20,
    interestRate: 6.5,
    loanTermYears: 25,
    amortizationYears: 25,
  },
  annualRevenueGrowth: 3,
  annualRentGrowth: 2,
  annualExpenseGrowth: 2,
  annualAppreciation: 3,
};

function makeDeal(dealType: 'real-estate' | 'business' | 'hybrid', data: RealEstateDeal | BusinessDeal | HybridDeal): Deal {
  return {
    id: 'test',
    userId: 'u1',
    name: 'Test Deal',
    dealType,
    data,
    scenarios: [],
    notes: '',
    tags: [],
    isFavorite: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Score Range Tests ────────────────────────────────

describe('calcInvestmentScore', () => {
  it('returns a score between 0 and 100 for real estate', () => {
    const score = calcInvestmentScore(makeDeal('real-estate', reDeal));
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('returns a score between 0 and 100 for business', () => {
    const score = calcInvestmentScore(makeDeal('business', bizDeal));
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('returns a score between 0 and 100 for hybrid', () => {
    const score = calcInvestmentScore(makeDeal('hybrid', hybridDeal));
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('has a label and summary', () => {
    const score = calcInvestmentScore(makeDeal('real-estate', reDeal));
    expect(score.label).toBeTruthy();
    expect(score.summary).toBeTruthy();
    expect(score.color).toMatch(/^text-/);
  });

  it('has breakdown components that sum to near total', () => {
    const score = calcInvestmentScore(makeDeal('real-estate', reDeal));
    const componentSum = score.breakdown.reduce((s, c) => s + c.weighted, 0);
    // Total = componentSum minus risk penalty, so total <= componentSum
    expect(score.total).toBeLessThanOrEqual(Math.round(componentSum) + 1);
    expect(score.total).toBeGreaterThanOrEqual(0);
  });

  it('scores a good deal higher than a bad deal (RE)', () => {
    const goodDeal = { ...reDeal, grossRentalIncome: 36_000 }; // higher rent = better
    const badDeal = { ...reDeal, grossRentalIncome: 12_000 };  // lower rent = worse

    const goodScore = calcInvestmentScore(makeDeal('real-estate', goodDeal));
    const badScore = calcInvestmentScore(makeDeal('real-estate', badDeal));

    expect(goodScore.total).toBeGreaterThan(badScore.total);
  });

  it('scores a good deal higher than a bad deal (business)', () => {
    const goodDeal = { ...bizDeal, askingPrice: 300_000 };  // lower price = better multiple
    const badDeal = { ...bizDeal, askingPrice: 1_200_000 }; // higher price = worse multiple

    const goodScore = calcInvestmentScore(makeDeal('business', goodDeal));
    const badScore = calcInvestmentScore(makeDeal('business', badDeal));

    expect(goodScore.total).toBeGreaterThan(badScore.total);
  });

  it('assigns "Strong Buy" label for high scores', () => {
    // Very attractive deal: high rent, low price
    const greatDeal: RealEstateDeal = {
      ...reDeal,
      grossRentalIncome: 48_000,
      purchasePrice: 150_000,
      financing: { ...financing, loanAmount: 120_000 },
    };
    const score = calcInvestmentScore(makeDeal('real-estate', greatDeal));
    expect(score.total).toBeGreaterThanOrEqual(75);
    expect(['Strong Buy', 'Good Deal']).toContain(score.label);
  });

  it('assigns weak label for terrible deals', () => {
    const terribleDeal: RealEstateDeal = {
      ...reDeal,
      grossRentalIncome: 6_000,
      purchasePrice: 500_000,
      financing: { ...financing, loanAmount: 400_000 },
    };
    const score = calcInvestmentScore(makeDeal('real-estate', terribleDeal));
    expect(score.total).toBeLessThanOrEqual(40);
  });
});

// ─── calcScoreFromMetrics ─────────────────────────────

describe('calcScoreFromMetrics', () => {
  it('returns same score as calcInvestmentScore', () => {
    const deal = makeDeal('real-estate', reDeal);
    const metrics = calcRealEstateMetrics(reDeal);
    const fromDeal = calcInvestmentScore(deal);
    const fromMetrics = calcScoreFromMetrics('real-estate', reDeal, metrics);

    expect(fromMetrics.total).toBe(fromDeal.total);
    expect(fromMetrics.label).toBe(fromDeal.label);
  });

  it('works for business deals', () => {
    const metrics = calcBusinessMetrics(bizDeal);
    const score = calcScoreFromMetrics('business', bizDeal, metrics);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('works for hybrid deals', () => {
    const metrics = calcHybridMetrics(hybridDeal);
    const score = calcScoreFromMetrics('hybrid', hybridDeal, metrics);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });
});

// ─── Score Component Weights ──────────────────────────

describe('score breakdown', () => {
  it('RE has 6 components that sum to weight ~1.0', () => {
    const score = calcInvestmentScore(makeDeal('real-estate', reDeal));
    const totalWeight = score.breakdown.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
    expect(score.breakdown.length).toBe(6);
  });

  it('business has 5 components that sum to weight ~1.0', () => {
    const score = calcInvestmentScore(makeDeal('business', bizDeal));
    const totalWeight = score.breakdown.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
    expect(score.breakdown.length).toBe(5);
  });

  it('hybrid has 7 components that sum to weight ~1.0', () => {
    const score = calcInvestmentScore(makeDeal('hybrid', hybridDeal));
    const totalWeight = score.breakdown.reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 2);
    expect(score.breakdown.length).toBe(7);
  });

  it('each component score is between 0 and 100', () => {
    const score = calcInvestmentScore(makeDeal('real-estate', reDeal));
    for (const c of score.breakdown) {
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
    }
  });
});
