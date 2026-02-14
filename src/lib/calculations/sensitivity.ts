// ============================================
// Sensitivity Analysis — Single-variable grid
// ============================================
// Varies one deal input across a range of values
// and shows impact on key output metrics.

import type {
  Deal,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
} from '@/types';
import { calcRealEstateMetrics } from './real-estate';
import { calcBusinessMetrics } from './business';
import { calcHybridMetrics } from './hybrid';

// ─── Types ────────────────────────────────────────────

export interface SensitivityVariable {
  key: string;             // Deal data field path (e.g. 'vacancyRate', 'financing.interestRate')
  label: string;           // Display name
  format: 'percent' | 'currency' | 'number'; // How to display values
}

export interface SensitivityRow {
  inputValue: number;
  inputLabel: string;
  metrics: Record<string, number>;
  isBase: boolean;         // Is this the current deal value?
}

export interface SensitivityResult {
  variable: SensitivityVariable;
  outputMetrics: { key: string; label: string; format: 'percent' | 'currency' | 'ratio' }[];
  rows: SensitivityRow[];
}

// ─── Available Variables by Deal Type ─────────────────

export const RE_VARIABLES: SensitivityVariable[] = [
  { key: 'vacancyRate', label: 'Vacancy Rate', format: 'percent' },
  { key: 'financing.interestRate', label: 'Interest Rate', format: 'percent' },
  { key: 'purchasePrice', label: 'Purchase Price', format: 'currency' },
  { key: 'grossRentalIncome', label: 'Gross Rent', format: 'currency' },
  { key: 'annualRentGrowth', label: 'Rent Growth', format: 'percent' },
  { key: 'annualAppreciation', label: 'Appreciation', format: 'percent' },
];

export const BIZ_VARIABLES: SensitivityVariable[] = [
  { key: 'annualRevenue', label: 'Revenue', format: 'currency' },
  { key: 'financing.interestRate', label: 'Interest Rate', format: 'percent' },
  { key: 'askingPrice', label: 'Asking Price', format: 'currency' },
  { key: 'operatingExpenses', label: 'Operating Expenses', format: 'currency' },
  { key: 'annualRevenueGrowth', label: 'Revenue Growth', format: 'percent' },
  { key: 'costOfGoods', label: 'Cost of Goods', format: 'currency' },
];

export const HYBRID_VARIABLES: SensitivityVariable[] = [
  { key: 'purchasePrice', label: 'Purchase Price', format: 'currency' },
  { key: 'financing.interestRate', label: 'Interest Rate', format: 'percent' },
  { key: 'annualRevenue', label: 'Business Revenue', format: 'currency' },
  { key: 'grossRentalIncome', label: 'Gross Rent', format: 'currency' },
  { key: 'vacancyRate', label: 'Vacancy Rate', format: 'percent' },
  { key: 'annualRevenueGrowth', label: 'Revenue Growth', format: 'percent' },
];

// ─── Generate Steps ───────────────────────────────────

/**
 * Generate an array of values centered on `base`,
 * spread by steps of `stepSize` (± `stepsEachSide`).
 */
function generateSteps(base: number, variable: SensitivityVariable, steps: number = 4): number[] {
  const values: number[] = [];

  // Determine step size based on variable type and magnitude
  let stepSize: number;
  if (variable.format === 'percent') {
    stepSize = base >= 10 ? 2 : 1;
  } else if (variable.format === 'currency') {
    // ~5-10% of base value per step
    stepSize = Math.max(1000, Math.round(base * 0.05 / 1000) * 1000);
  } else {
    stepSize = Math.max(1, Math.round(base * 0.1));
  }

  for (let i = -steps; i <= steps; i++) {
    const v = base + i * stepSize;
    // Don't go below 0 for most things
    if (v >= 0 || variable.key.includes('Growth')) {
      values.push(v);
    }
  }

  return values;
}

// ─── Deep-set a nested field ──────────────────────────

function setNestedValue<T extends object>(obj: T, path: string, value: number): T {
  const clone = JSON.parse(JSON.stringify(obj)) as T;
  const parts = path.split('.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
  return clone;
}

function getNestedValue(obj: object, path: string): number {
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = obj;
  for (const part of parts) {
    target = target[part];
  }
  return target as number;
}

// ─── Format helpers ───────────────────────────────────

function formatInputValue(value: number, format: SensitivityVariable['format']): string {
  if (format === 'percent') return `${value.toFixed(1)}%`;
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString();
}

// ─── Public API ───────────────────────────────────────

export function getVariablesForDealType(dealType: Deal['dealType']): SensitivityVariable[] {
  if (dealType === 'real-estate') return RE_VARIABLES;
  if (dealType === 'hybrid') return HYBRID_VARIABLES;
  return BIZ_VARIABLES;
}

export function runSensitivity(
  deal: Deal,
  variableKey: string,
  stepsEachSide: number = 4,
): SensitivityResult {
  const allVars = getVariablesForDealType(deal.dealType);
  const variable = allVars.find((v) => v.key === variableKey) || allVars[0];

  const baseValue = getNestedValue(deal.data as object, variable.key);
  const steps = generateSteps(baseValue, variable, stepsEachSide);

  // Determine output metrics based on deal type
  const outputMetrics = getOutputMetrics(deal.dealType);

  const rows: SensitivityRow[] = steps.map((inputValue) => {
    const modifiedData = setNestedValue(deal.data as object, variable.key, inputValue);

    const metrics: Record<string, number> = {};

    if (deal.dealType === 'real-estate') {
      const m = calcRealEstateMetrics(modifiedData as RealEstateDeal);
      metrics['capRate'] = m.capRate;
      metrics['cashOnCash'] = m.cashOnCashReturn;
      metrics['dscr'] = m.dscr;
      metrics['noi'] = m.noi;
      metrics['cashFlow'] = m.annualCashFlow;
      metrics['irr'] = m.irr;
    } else if (deal.dealType === 'hybrid') {
      const m = calcHybridMetrics(modifiedData as HybridDeal);
      metrics['capRate'] = m.capRate;
      metrics['cashOnCash'] = m.cashOnCashReturn;
      metrics['dscr'] = m.dscr;
      metrics['totalNoi'] = m.totalNoi;
      metrics['cashFlow'] = m.annualCashFlow;
      metrics['sdeMultiple'] = m.sdeMultiple;
    } else {
      const m = calcBusinessMetrics(modifiedData as BusinessDeal);
      metrics['sdeMultiple'] = m.sdeMultiple;
      metrics['roi'] = m.roi;
      metrics['cashFlow'] = m.annualCashFlow;
      metrics['sde'] = m.sde;
      metrics['breakEven'] = m.breakEvenRevenue;
      metrics['revMultiple'] = m.revenueMultiple;
    }

    return {
      inputValue,
      inputLabel: formatInputValue(inputValue, variable.format),
      metrics,
      isBase: inputValue === baseValue,
    };
  });

  return { variable, outputMetrics, rows };
}

function getOutputMetrics(dealType: Deal['dealType']): SensitivityResult['outputMetrics'] {
  if (dealType === 'real-estate') {
    return [
      { key: 'capRate', label: 'Cap Rate', format: 'percent' },
      { key: 'cashOnCash', label: 'Cash-on-Cash', format: 'percent' },
      { key: 'dscr', label: 'DSCR', format: 'ratio' },
      { key: 'noi', label: 'NOI', format: 'currency' },
      { key: 'cashFlow', label: 'Cash Flow', format: 'currency' },
      { key: 'irr', label: 'IRR', format: 'percent' },
    ];
  }
  if (dealType === 'hybrid') {
    return [
      { key: 'capRate', label: 'Cap Rate', format: 'percent' },
      { key: 'cashOnCash', label: 'Cash-on-Cash', format: 'percent' },
      { key: 'dscr', label: 'DSCR', format: 'ratio' },
      { key: 'totalNoi', label: 'Total NOI', format: 'currency' },
      { key: 'cashFlow', label: 'Cash Flow', format: 'currency' },
      { key: 'sdeMultiple', label: 'SDE Multiple', format: 'ratio' },
    ];
  }
  return [
    { key: 'sdeMultiple', label: 'SDE Multiple', format: 'ratio' },
    { key: 'roi', label: 'ROI', format: 'percent' },
    { key: 'cashFlow', label: 'Cash Flow', format: 'currency' },
    { key: 'sde', label: 'SDE', format: 'currency' },
    { key: 'breakEven', label: 'Break-Even', format: 'currency' },
    { key: 'revMultiple', label: 'Rev Multiple', format: 'ratio' },
  ];
}
