// ============================================
// Breakdown Calculation Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type {
  PayrollBreakdown,
  Asset,
  InterestItem,
  LeaseItem,
  UtilityItem,
} from '@/types';
import { calcPayrollTotal } from '@/components/breakdowns/PayrollBreakdown';
import {
  calcAssetDepreciation,
  calcTotalDepreciation,
} from '@/components/breakdowns/AssetSchedule';
import { calcTotalInterest } from '@/components/breakdowns/InterestBreakdown';
import { calcTotalLeaseCost } from '@/components/breakdowns/LeaseBreakdown';
import { calcTotalUtilities } from '@/components/breakdowns/UtilityBreakdown';

// ─── Payroll ──────────────────────────────────────────

describe('calcPayrollTotal', () => {
  const basePayroll: PayrollBreakdown = {
    employees: [
      {
        id: '1',
        title: 'Barista',
        count: 3,
        wageRate: 18,
        wageType: 'hourly',
        hoursPerWeek: 40,
        weeksPerYear: 52,
      },
    ],
    ficaRate: 7.65,
    futaRate: 0.6,
    suiRate: 2.7,
    wcRate: 1.5,
  };

  it('calculates hourly employee total with employer taxes', () => {
    // 3 × $18 × 40 × 52 = $112,320 base wages
    // Tax rate = (7.65 + 0.6 + 2.7 + 1.5) / 100 = 0.1245
    // Total = $112,320 × 1.1245 = $126,275 (rounded)
    const result = calcPayrollTotal(basePayroll);
    expect(result).toBe(Math.round(112_320 * 1.1245));
  });

  it('calculates salary employee total', () => {
    const payroll: PayrollBreakdown = {
      employees: [
        {
          id: '1',
          title: 'Manager',
          count: 1,
          wageRate: 65_000,
          wageType: 'salary',
          hoursPerWeek: 40,
          weeksPerYear: 52,
        },
      ],
      ficaRate: 7.65,
      futaRate: 0.6,
      suiRate: 2.7,
      wcRate: 1.5,
    };
    const result = calcPayrollTotal(payroll);
    expect(result).toBe(Math.round(65_000 * 1.1245));
  });

  it('handles multiple employees with mixed wage types', () => {
    const payroll: PayrollBreakdown = {
      employees: [
        {
          id: '1',
          title: 'Barista',
          count: 2,
          wageRate: 16,
          wageType: 'hourly',
          hoursPerWeek: 30,
          weeksPerYear: 52,
        },
        {
          id: '2',
          title: 'Manager',
          count: 1,
          wageRate: 50_000,
          wageType: 'salary',
          hoursPerWeek: 40,
          weeksPerYear: 52,
        },
      ],
      ficaRate: 7.65,
      futaRate: 0.6,
      suiRate: 2.7,
      wcRate: 1.5,
    };
    // Baristas: 2 × $16 × 30 × 52 = $49,920
    // Manager: 1 × $50,000 = $50,000
    // Total base: $99,920
    // With taxes: $99,920 × 1.1245 = $112,360 (rounded)
    const result = calcPayrollTotal(payroll);
    expect(result).toBe(Math.round(99_920 * 1.1245));
  });

  it('returns 0 for empty employee list', () => {
    const payroll: PayrollBreakdown = {
      employees: [],
      ficaRate: 7.65,
      futaRate: 0.6,
      suiRate: 2.7,
      wcRate: 1.5,
    };
    expect(calcPayrollTotal(payroll)).toBe(0);
  });

  it('applies custom tax rates correctly', () => {
    const payroll: PayrollBreakdown = {
      employees: [
        {
          id: '1',
          title: 'Cook',
          count: 1,
          wageRate: 40_000,
          wageType: 'salary',
          hoursPerWeek: 40,
          weeksPerYear: 52,
        },
      ],
      ficaRate: 7.65,
      futaRate: 0.6,
      suiRate: 5.0,
      wcRate: 8.0,
    };
    // Tax = (7.65 + 0.6 + 5.0 + 8.0) / 100 = 0.2125
    const result = calcPayrollTotal(payroll);
    expect(result).toBe(Math.round(40_000 * 1.2125));
  });
});

// ─── Assets / Depreciation ────────────────────────────

describe('calcAssetDepreciation', () => {
  const baseAsset: Asset = {
    id: '1',
    name: 'Espresso Machine',
    ownership: 'owned',
    costBasis: 25_000,
    usefulLifeYears: 7,
    depreciationMethod: 'straight-line',
    yearAcquired: 2023,
    salvageValue: 1_000,
  };

  it('calculates straight-line depreciation', () => {
    // ($25,000 - $1,000) / 7 = $3,429 (rounded)
    expect(calcAssetDepreciation(baseAsset)).toBe(Math.round(24_000 / 7));
  });

  it('returns 0 for leased assets', () => {
    expect(calcAssetDepreciation({ ...baseAsset, ownership: 'leased' })).toBe(0);
  });

  it('returns 0 when salvage >= cost', () => {
    expect(calcAssetDepreciation({ ...baseAsset, salvageValue: 25_000 })).toBe(0);
    expect(calcAssetDepreciation({ ...baseAsset, salvageValue: 30_000 })).toBe(0);
  });

  it('returns 0 when useful life is 0 (straight-line)', () => {
    expect(calcAssetDepreciation({ ...baseAsset, usefulLifeYears: 0 })).toBe(0);
  });

  it('calculates MACRS-5 depreciation', () => {
    const asset = { ...baseAsset, depreciationMethod: 'macrs-5' as const };
    expect(calcAssetDepreciation(asset)).toBe(Math.round(24_000 / 5));
  });

  it('calculates MACRS-7 depreciation', () => {
    const asset = { ...baseAsset, depreciationMethod: 'macrs-7' as const };
    expect(calcAssetDepreciation(asset)).toBe(Math.round(24_000 / 7));
  });

  it('calculates MACRS-15 depreciation', () => {
    const asset = { ...baseAsset, depreciationMethod: 'macrs-15' as const };
    expect(calcAssetDepreciation(asset)).toBe(Math.round(24_000 / 15));
  });

  it('calculates MACRS-39 depreciation', () => {
    const asset = { ...baseAsset, depreciationMethod: 'macrs-39' as const };
    expect(calcAssetDepreciation(asset)).toBe(Math.round(24_000 / 39));
  });
});

describe('calcTotalDepreciation', () => {
  it('sums depreciation across multiple owned assets', () => {
    const assets: Asset[] = [
      {
        id: '1',
        name: 'Machine A',
        ownership: 'owned',
        costBasis: 10_000,
        usefulLifeYears: 5,
        depreciationMethod: 'straight-line',
        yearAcquired: 2022,
        salvageValue: 0,
      },
      {
        id: '2',
        name: 'Machine B',
        ownership: 'owned',
        costBasis: 20_000,
        usefulLifeYears: 10,
        depreciationMethod: 'straight-line',
        yearAcquired: 2023,
        salvageValue: 0,
      },
    ];
    // $10,000/5 + $20,000/10 = $2,000 + $2,000 = $4,000
    expect(calcTotalDepreciation(assets)).toBe(4_000);
  });

  it('excludes leased assets from depreciation', () => {
    const assets: Asset[] = [
      {
        id: '1',
        name: 'Owned',
        ownership: 'owned',
        costBasis: 10_000,
        usefulLifeYears: 5,
        depreciationMethod: 'straight-line',
        yearAcquired: 2022,
        salvageValue: 0,
      },
      {
        id: '2',
        name: 'Leased',
        ownership: 'leased',
        costBasis: 50_000,
        usefulLifeYears: 10,
        depreciationMethod: 'straight-line',
        yearAcquired: 2023,
        salvageValue: 0,
      },
    ];
    expect(calcTotalDepreciation(assets)).toBe(2_000);
  });

  it('returns 0 for empty array', () => {
    expect(calcTotalDepreciation([])).toBe(0);
  });
});

// ─── Interest ─────────────────────────────────────────

describe('calcTotalInterest', () => {
  it('sums annual interest across multiple loans', () => {
    const items: InterestItem[] = [
      {
        id: '1',
        lender: 'SBA',
        originalBalance: 500_000,
        currentBalance: 450_000,
        interestRate: 6.5,
        annualInterestPaid: 29_250,
        purpose: 'Acquisition',
      },
      {
        id: '2',
        lender: 'Equipment Co',
        originalBalance: 100_000,
        currentBalance: 75_000,
        interestRate: 8,
        annualInterestPaid: 6_000,
        purpose: 'Equipment',
      },
    ];
    expect(calcTotalInterest(items)).toBe(35_250);
  });

  it('returns 0 for empty array', () => {
    expect(calcTotalInterest([])).toBe(0);
  });

  it('handles a single loan', () => {
    const items: InterestItem[] = [
      {
        id: '1',
        lender: 'Local Bank',
        originalBalance: 200_000,
        currentBalance: 180_000,
        interestRate: 5,
        annualInterestPaid: 9_000,
        purpose: 'Real estate',
      },
    ];
    expect(calcTotalInterest(items)).toBe(9_000);
  });
});

// ─── Leases ───────────────────────────────────────────

describe('calcTotalLeaseCost', () => {
  it('calculates annual rent + CAM across locations', () => {
    const items: LeaseItem[] = [
      {
        id: '1',
        location: 'Main St',
        landlord: 'ABC Properties',
        monthlyRent: 3_500,
        leaseStartDate: '2023-01-01',
        leaseEndDate: '2028-01-01',
        annualEscalation: 3,
        tripleNet: false,
        camCharges: 2_400,
        notes: '',
      },
      {
        id: '2',
        location: 'Airport Kiosk',
        landlord: 'Airport Authority',
        monthlyRent: 2_000,
        leaseStartDate: '2024-06-01',
        leaseEndDate: '2027-06-01',
        annualEscalation: 2,
        tripleNet: true,
        camCharges: 6_000,
        notes: '',
      },
    ];
    // Main: $3,500×12 + $2,400 = $44,400
    // Airport: $2,000×12 + $6,000 = $30,000
    // Total: $74,400
    expect(calcTotalLeaseCost(items)).toBe(74_400);
  });

  it('returns 0 for empty array', () => {
    expect(calcTotalLeaseCost([])).toBe(0);
  });

  it('handles no CAM charges', () => {
    const items: LeaseItem[] = [
      {
        id: '1',
        location: 'Office',
        landlord: 'Owner',
        monthlyRent: 1_500,
        leaseStartDate: '2023-01-01',
        leaseEndDate: '2026-01-01',
        annualEscalation: 0,
        tripleNet: false,
        camCharges: 0,
        notes: '',
      },
    ];
    expect(calcTotalLeaseCost(items)).toBe(18_000);
  });
});

// ─── Utilities ────────────────────────────────────────

describe('calcTotalUtilities', () => {
  it('calculates annual total across locations', () => {
    const items: UtilityItem[] = [
      {
        id: '1',
        location: 'Main',
        electric: 400,
        gas: 150,
        water: 80,
        trash: 60,
        internet: 200,
        other: 0,
      },
      {
        id: '2',
        location: 'Branch',
        electric: 250,
        gas: 100,
        water: 50,
        trash: 40,
        internet: 150,
        other: 25,
      },
    ];
    // Main: (400+150+80+60+200+0) × 12 = $890 × 12 = $10,680
    // Branch: (250+100+50+40+150+25) × 12 = $615 × 12 = $7,380
    // Total: $18,060
    expect(calcTotalUtilities(items)).toBe(18_060);
  });

  it('returns 0 for empty array', () => {
    expect(calcTotalUtilities([])).toBe(0);
  });

  it('handles a single location with zeroes', () => {
    const items: UtilityItem[] = [
      {
        id: '1',
        location: 'Vacant',
        electric: 0,
        gas: 0,
        water: 0,
        trash: 0,
        internet: 0,
        other: 0,
      },
    ];
    expect(calcTotalUtilities(items)).toBe(0);
  });
});
