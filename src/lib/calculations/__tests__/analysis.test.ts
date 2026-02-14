// ============================================
// Analysis Engine: buildBreakdownInsights Tests
// ============================================

import { describe, it, expect } from 'vitest';
import type { DealBreakdowns } from '@/types';
import { buildBreakdownInsights } from '@/lib/analysis';

describe('buildBreakdownInsights', () => {
  it('returns null section and empty flags when no breakdowns provided', () => {
    const result = buildBreakdownInsights(undefined);
    expect(result.section).toBeNull();
    expect(result.riskFlags).toEqual([]);
  });

  it('returns null section for empty breakdowns object', () => {
    const result = buildBreakdownInsights({});
    expect(result.section).toBeNull();
    expect(result.riskFlags).toEqual([]);
  });

  // ─── Payroll ──────────────────────────────────────

  it('generates payroll insight line', () => {
    const b: DealBreakdowns = {
      payroll: {
        employees: [
          {
            id: '1',
            title: 'Staff',
            count: 5,
            wageRate: 15,
            wageType: 'hourly',
            hoursPerWeek: 40,
            weeksPerYear: 52,
          },
        ],
        ficaRate: 7.65,
        futaRate: 0.6,
        suiRate: 2.7,
        wcRate: 1.5,
      },
    };
    const result = buildBreakdownInsights(b);
    expect(result.section).not.toBeNull();
    expect(result.section!.title).toBe('Detail Schedule Insights');
    expect(result.section!.content).toContain('Payroll');
    expect(result.section!.content).toContain('5 employees');
  });

  it('flags high workers comp rate', () => {
    const b: DealBreakdowns = {
      payroll: {
        employees: [
          {
            id: '1',
            title: 'Roofer',
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
        wcRate: 12.0, // Very high — roofing
      },
    };
    const result = buildBreakdownInsights(b);
    expect(result.riskFlags.some((f) => f.includes("Workers' comp"))).toBe(true);
  });

  it('does not flag normal workers comp rate', () => {
    const b: DealBreakdowns = {
      payroll: {
        employees: [
          {
            id: '1',
            title: 'Office',
            count: 1,
            wageRate: 45_000,
            wageType: 'salary',
            hoursPerWeek: 40,
            weeksPerYear: 52,
          },
        ],
        ficaRate: 7.65,
        futaRate: 0.6,
        suiRate: 2.7,
        wcRate: 1.5,
      },
    };
    const result = buildBreakdownInsights(b);
    expect(result.riskFlags.some((f) => f.includes("Workers' comp"))).toBe(false);
  });

  // ─── Assets ──────────────────────────────────────

  it('generates asset insight line with owned/leased counts', () => {
    const b: DealBreakdowns = {
      assets: [
        {
          id: '1',
          name: 'Oven',
          ownership: 'owned',
          costBasis: 50_000,
          usefulLifeYears: 10,
          depreciationMethod: 'straight-line',
          yearAcquired: 2022,
          salvageValue: 5_000,
        },
        {
          id: '2',
          name: 'Truck',
          ownership: 'leased',
          costBasis: 30_000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight-line',
          yearAcquired: 2024,
          salvageValue: 0,
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.section!.content).toContain('1 owned');
    expect(result.section!.content).toContain('1 leased');
  });

  it('flags assets past useful life', () => {
    const currentYear = new Date().getFullYear();
    const b: DealBreakdowns = {
      assets: [
        {
          id: '1',
          name: 'Old Machine',
          ownership: 'owned',
          costBasis: 20_000,
          usefulLifeYears: 5,
          depreciationMethod: 'straight-line',
          yearAcquired: currentYear - 10, // 10 years old, 5-year life
          salvageValue: 0,
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.riskFlags.some((f) => f.includes('past useful life'))).toBe(true);
  });

  // ─── Leases ──────────────────────────────────────

  it('generates lease insight line', () => {
    const b: DealBreakdowns = {
      leases: [
        {
          id: '1',
          location: 'Main St',
          landlord: 'ABC',
          monthlyRent: 5_000,
          leaseStartDate: '2020-01-01',
          leaseEndDate: '2030-01-01',
          annualEscalation: 3,
          tripleNet: false,
          camCharges: 3_600,
          notes: '',
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.section!.content).toContain('1 location');
  });

  it('flags expired leases', () => {
    const b: DealBreakdowns = {
      leases: [
        {
          id: '1',
          location: 'Old Shop',
          landlord: 'Landlord',
          monthlyRent: 2_000,
          leaseStartDate: '2018-01-01',
          leaseEndDate: '2022-12-31',
          annualEscalation: 3,
          tripleNet: false,
          camCharges: 0,
          notes: '',
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.riskFlags.some((f) => f.includes('expired'))).toBe(true);
  });

  it('reports NNN leases in content', () => {
    const b: DealBreakdowns = {
      leases: [
        {
          id: '1',
          location: 'Shop',
          landlord: 'Owner',
          monthlyRent: 3_000,
          leaseStartDate: '2023-01-01',
          leaseEndDate: '2030-01-01',
          annualEscalation: 3,
          tripleNet: true,
          camCharges: 4_800,
          notes: '',
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.section!.content).toContain('NNN');
  });

  // ─── Interest ─────────────────────────────────────

  it('generates interest insight line', () => {
    const b: DealBreakdowns = {
      interestItems: [
        {
          id: '1',
          lender: 'SBA',
          originalBalance: 500_000,
          currentBalance: 400_000,
          interestRate: 6.5,
          annualInterestPaid: 26_000,
          purpose: 'Acquisition',
        },
        {
          id: '2',
          lender: 'Wells Fargo',
          originalBalance: 100_000,
          currentBalance: 80_000,
          interestRate: 8,
          annualInterestPaid: 6_400,
          purpose: 'Equipment',
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.section!.content).toContain('2 obligation');
    expect(result.section!.content).toContain('Existing Debt');
  });

  // ─── Utilities ────────────────────────────────────

  it('generates utility insight line', () => {
    const b: DealBreakdowns = {
      utilities: [
        {
          id: '1',
          location: 'Main',
          electric: 500,
          gas: 200,
          water: 100,
          trash: 75,
          internet: 150,
          other: 0,
        },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.section!.content).toContain('Utilities');
    expect(result.section!.content).toContain('1 location');
  });

  // ─── Combined ─────────────────────────────────────

  it('combines multiple breakdown categories into one section', () => {
    const b: DealBreakdowns = {
      payroll: {
        employees: [
          { id: '1', title: 'Staff', count: 2, wageRate: 15, wageType: 'hourly', hoursPerWeek: 40, weeksPerYear: 52 },
        ],
        ficaRate: 7.65,
        futaRate: 0.6,
        suiRate: 2.7,
        wcRate: 1.5,
      },
      utilities: [
        { id: '1', location: 'Main', electric: 300, gas: 100, water: 50, trash: 40, internet: 100, other: 0 },
      ],
    };
    const result = buildBreakdownInsights(b);
    expect(result.section).not.toBeNull();
    expect(result.section!.content).toContain('Payroll');
    expect(result.section!.content).toContain('Utilities');
  });
});
