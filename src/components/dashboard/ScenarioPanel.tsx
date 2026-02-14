// ============================================
// ScenarioPanel — What-If Scenario Builder
// ============================================
// Lets users override any deal input via sliders/fields
// and instantly see how metrics change vs the base case.
// Scenarios can be named and saved to the deal.

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Save, Trash2, RotateCcw, FlaskConical } from 'lucide-react';
import FormField from '@/components/ui/FormField';
import MetricsPanel from '@/components/dashboard/MetricsPanel';
import type {
  Deal,
  Scenario,
  RealEstateDeal,
  BusinessDeal,
  HybridDeal,
  RealEstateMetrics,
  BusinessMetrics,
  HybridMetrics,
} from '@/types';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcBusinessMetrics } from '@/lib/calculations/business';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';

interface ScenarioPanelProps {
  deal: Deal;
  onSaveScenario: (scenario: Scenario) => void;
  onDeleteScenario: (scenarioId: string) => void;
}

// ─── Slider configs per deal type ────────────────────────────

interface SliderConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  /** Path to the value in the deal data object */
  getValue: (data: RealEstateDeal | BusinessDeal | HybridDeal) => number;
}

const RE_SLIDERS: SliderConfig[] = [
  { key: 'purchasePrice', label: 'Purchase Price', min: 0, max: 5_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as RealEstateDeal).purchasePrice },
  { key: 'grossRentalIncome', label: 'Gross Rental Income', min: 0, max: 500_000, step: 1_000, prefix: '$', getValue: (d) => (d as RealEstateDeal).grossRentalIncome },
  { key: 'vacancyRate', label: 'Vacancy Rate', min: 0, max: 30, step: 0.5, suffix: '%', getValue: (d) => (d as RealEstateDeal).vacancyRate },
  { key: 'propertyTax', label: 'Property Tax', min: 0, max: 50_000, step: 500, prefix: '$', getValue: (d) => (d as RealEstateDeal).propertyTax },
  { key: 'insurance', label: 'Insurance', min: 0, max: 20_000, step: 250, prefix: '$', getValue: (d) => (d as RealEstateDeal).insurance },
  { key: 'maintenance', label: 'Maintenance', min: 0, max: 30_000, step: 500, prefix: '$', getValue: (d) => (d as RealEstateDeal).maintenance },
  { key: 'propertyManagement', label: 'Management Fee', min: 0, max: 15, step: 0.5, suffix: '%', getValue: (d) => (d as RealEstateDeal).propertyManagement },
  { key: 'annualRentGrowth', label: 'Rent Growth', min: -5, max: 15, step: 0.25, suffix: '%', getValue: (d) => (d as RealEstateDeal).annualRentGrowth },
  { key: 'annualAppreciation', label: 'Appreciation', min: -5, max: 15, step: 0.25, suffix: '%', getValue: (d) => (d as RealEstateDeal).annualAppreciation },
];

const BIZ_SLIDERS: SliderConfig[] = [
  { key: 'askingPrice', label: 'Asking Price', min: 0, max: 5_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as BusinessDeal).askingPrice },
  { key: 'annualRevenue', label: 'Annual Revenue', min: 0, max: 5_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as BusinessDeal).annualRevenue },
  { key: 'costOfGoods', label: 'Cost of Goods', min: 0, max: 3_000_000, step: 5_000, prefix: '$', getValue: (d) => (d as BusinessDeal).costOfGoods },
  { key: 'operatingExpenses', label: 'Operating Expenses', min: 0, max: 2_000_000, step: 5_000, prefix: '$', getValue: (d) => (d as BusinessDeal).operatingExpenses },
  { key: 'ownerSalary', label: 'Owner Salary', min: 0, max: 300_000, step: 5_000, prefix: '$', getValue: (d) => (d as BusinessDeal).ownerSalary },
  { key: 'annualRevenueGrowth', label: 'Revenue Growth', min: -10, max: 30, step: 0.5, suffix: '%', getValue: (d) => (d as BusinessDeal).annualRevenueGrowth },
  { key: 'annualExpenseGrowth', label: 'Expense Growth', min: -5, max: 15, step: 0.5, suffix: '%', getValue: (d) => (d as BusinessDeal).annualExpenseGrowth },
];

const HYBRID_SLIDERS: SliderConfig[] = [
  { key: 'purchasePrice', label: 'Total Purchase Price', min: 0, max: 5_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as HybridDeal).purchasePrice },
  { key: 'propertyValue', label: 'Property Value', min: 0, max: 5_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as HybridDeal).propertyValue },
  { key: 'businessValue', label: 'Business Value', min: 0, max: 3_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as HybridDeal).businessValue },
  { key: 'annualRevenue', label: 'Business Revenue', min: 0, max: 5_000_000, step: 10_000, prefix: '$', getValue: (d) => (d as HybridDeal).annualRevenue },
  { key: 'grossRentalIncome', label: 'Rental Income', min: 0, max: 500_000, step: 1_000, prefix: '$', getValue: (d) => (d as HybridDeal).grossRentalIncome },
  { key: 'costOfGoods', label: 'Cost of Goods', min: 0, max: 3_000_000, step: 5_000, prefix: '$', getValue: (d) => (d as HybridDeal).costOfGoods },
  { key: 'businessOperatingExpenses', label: 'Business Op. Expenses', min: 0, max: 2_000_000, step: 5_000, prefix: '$', getValue: (d) => (d as HybridDeal).businessOperatingExpenses },
  { key: 'propertyTax', label: 'Property Tax', min: 0, max: 50_000, step: 500, prefix: '$', getValue: (d) => (d as HybridDeal).propertyTax },
  { key: 'insurance', label: 'Insurance', min: 0, max: 20_000, step: 250, prefix: '$', getValue: (d) => (d as HybridDeal).insurance },
  { key: 'annualRevenueGrowth', label: 'Revenue Growth', min: -10, max: 30, step: 0.5, suffix: '%', getValue: (d) => (d as HybridDeal).annualRevenueGrowth },
  { key: 'annualAppreciation', label: 'Appreciation', min: -5, max: 15, step: 0.25, suffix: '%', getValue: (d) => (d as HybridDeal).annualAppreciation },
];

// Financing sliders (shared)
const FINANCING_SLIDERS: SliderConfig[] = [
  { key: 'financing.downPayment', label: 'Down Payment', min: 0, max: 100, step: 0.5, suffix: '%', getValue: (d) => d.financing.downPayment },
  { key: 'financing.interestRate', label: 'Interest Rate', min: 0, max: 20, step: 0.125, suffix: '%', getValue: (d) => d.financing.interestRate },
  { key: 'financing.loanTermYears', label: 'Loan Term', min: 1, max: 40, step: 1, suffix: ' yrs', getValue: (d) => d.financing.loanTermYears },
];

// ─── Component ───────────────────────────────────────────────

export default function ScenarioPanel({
  deal,
  onSaveScenario,
  onDeleteScenario,
}: ScenarioPanelProps) {
  const isRE = deal.dealType === 'real-estate';
  const isHybrid = deal.dealType === 'hybrid';
  const sliders = [...(isRE ? RE_SLIDERS : isHybrid ? HYBRID_SLIDERS : BIZ_SLIDERS), ...FINANCING_SLIDERS];

  // Overrides state — keys map to deal data field paths
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [scenarioName, setScenarioName] = useState('');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Base metrics (no overrides)
  const baseMetrics = useMemo(() => {
    return isRE
      ? calcRealEstateMetrics(deal.data as RealEstateDeal)
      : isHybrid
      ? calcHybridMetrics(deal.data as HybridDeal)
      : calcBusinessMetrics(deal.data as BusinessDeal);
  }, [deal.data, isRE, isHybrid]);

  // Apply overrides to get the "what-if" deal data
  const scenarioData = useMemo(() => {
    const base = { ...deal.data } as Record<string, unknown>;
    const financing = { ...(deal.data.financing) };

    for (const [key, value] of Object.entries(overrides)) {
      if (key.startsWith('financing.')) {
        const fKey = key.replace('financing.', '');
        (financing as Record<string, unknown>)[fKey] = value;

        // Recalculate loan amount when down payment changes
        if (fKey === 'downPayment') {
          const price = isRE
            ? (overrides['purchasePrice'] ?? (deal.data as RealEstateDeal).purchasePrice)
            : isHybrid
            ? (overrides['purchasePrice'] ?? (deal.data as HybridDeal).purchasePrice)
            : (overrides['askingPrice'] ?? (deal.data as BusinessDeal).askingPrice);
          financing.loanAmount = price * (1 - value / 100);
        }
      } else {
        base[key] = value;

        // Recalculate loan amount when price changes
        if (key === 'purchasePrice' || key === 'askingPrice') {
          const dp = overrides['financing.downPayment'] ?? deal.data.financing.downPayment;
          financing.loanAmount = (value as number) * (1 - dp / 100);
        }
      }
    }

    base['financing'] = financing;
    return base as unknown as RealEstateDeal | BusinessDeal | HybridDeal;
  }, [deal.data, overrides, isRE, isHybrid]);

  // Check if any overrides are active
  const hasOverrides = Object.keys(overrides).length > 0;

  // Get the current value for a slider (override or base)
  const getCurrentValue = useCallback(
    (slider: SliderConfig): number => {
      if (slider.key in overrides) return overrides[slider.key];
      return slider.getValue(deal.data);
    },
    [overrides, deal.data]
  );

  // Update an override
  function handleSliderChange(key: string, value: number) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  }

  // Reset all overrides
  function handleReset() {
    setOverrides({});
    setActiveScenarioId(null);
    setScenarioName('');
  }

  // Save current overrides as a named scenario
  function handleSave() {
    if (!hasOverrides) return;

    const scenario: Scenario = {
      id: activeScenarioId ?? crypto.randomUUID(),
      name: scenarioName || `Scenario ${deal.scenarios.length + 1}`,
      overrides: overrides as Partial<RealEstateDeal> | Partial<BusinessDeal>,
      createdAt: new Date().toISOString(),
    };

    onSaveScenario(scenario);
    setActiveScenarioId(scenario.id);
  }

  // Load a saved scenario into the sliders
  function handleLoadScenario(scenario: Scenario) {
    setOverrides(scenario.overrides as Record<string, number>);
    setScenarioName(scenario.name);
    setActiveScenarioId(scenario.id);
  }

  // Format a number for display
  function fmtValue(value: number, slider: SliderConfig): string {
    if (slider.prefix === '$') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return `${value}${slider.suffix || ''}`;
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <FlaskConical className="h-5 w-5 text-primary" />
          What-If Scenario Builder
        </h2>
        <div className="flex items-center gap-2">
          {hasOverrides && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-secondary"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ─── Saved Scenarios ────────────────────── */}
      {deal.scenarios.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Saved Scenarios
          </p>
          <div className="flex flex-wrap gap-2">
            {deal.scenarios.map((s) => (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  onClick={() => handleLoadScenario(s)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    activeScenarioId === s.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  {s.name}
                </button>
                <button
                  onClick={() => onDeleteScenario(s.id)}
                  className="rounded p-1 text-muted-foreground transition hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Sliders ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sliders.map((slider) => {
          const current = getCurrentValue(slider);
          const base = slider.getValue(deal.data);
          const isOverridden = slider.key in overrides;

          return (
            <div key={slider.key}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  {slider.label}
                  {isOverridden && (
                    <span className="ml-1 text-[10px] text-primary">(modified)</span>
                  )}
                </label>
                <span className={`text-xs font-semibold ${isOverridden ? 'text-primary' : 'text-muted-foreground'}`}>
                  {fmtValue(current, slider)}
                </span>
              </div>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={current}
                onChange={(e) =>
                  handleSliderChange(slider.key, parseFloat(e.target.value))
                }
                className="w-full cursor-pointer accent-primary"
              />
              {isOverridden && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Base: {fmtValue(base, slider)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Save Scenario ──────────────────────── */}
      {hasOverrides && (
        <div className="flex items-end gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
          <FormField
            label="Scenario Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            placeholder={`Scenario ${deal.scenarios.length + 1}`}
            className="flex-1"
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      )}

      {/* ─── Live Metrics Preview ───────────────── */}
      <MetricsPanel
        dealType={deal.dealType}
        data={scenarioData}
        baseMetrics={hasOverrides ? baseMetrics : undefined}
      />
    </div>
  );
}
