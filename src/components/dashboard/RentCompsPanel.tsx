// ============================================
// Rent Comps Panel — Manual Entry + Fragility
// ============================================
// 1-6 comparable rents with star weights,
// simple vs weighted average toggle, and a
// "Underwrite at Comp Average" fragility test
// that recalculates metrics with the comp rent.

'use client';

import { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Plus, Trash2, Home,
  TrendingUp, TrendingDown, Minus, Star, Zap,
  ArrowRight,
} from 'lucide-react';
import type { Deal, RealEstateDeal, HybridDeal, RentComp } from '@/types';
import { useAppDispatch } from '@/hooks';
import { updateDeal } from '@/store/dealsSlice';
import { calcRealEstateMetrics } from '@/lib/calculations/real-estate';
import { calcHybridMetrics } from '@/lib/calculations/hybrid';

interface RentCompsPanelProps {
  deal: Deal;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(2)}%`;

function emptyComp(): RentComp {
  return {
    id: crypto.randomUUID(),
    address: '',
    beds: 3,
    baths: 2,
    sqft: 1200,
    monthlyRent: 0,
    weight: 2,
    source: '',
    notes: '',
  };
}

// ─── Star Rating Component ──────────────────────────

function StarWeight({ value, onChange }: { value: 1 | 2 | 3; onChange: (v: 1 | 2 | 3) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {([1, 2, 3] as const).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="transition hover:scale-110"
          title={`Weight: ${star}`}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function RentCompsPanel({ deal }: RentCompsPanelProps) {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useWeighted, setUseWeighted] = useState(false);
  const [showFragility, setShowFragility] = useState(false);

  // Only for real-estate and hybrid
  if (deal.dealType === 'business') return null;

  const data = deal.data as RealEstateDeal | HybridDeal;
  const subjectRent = data.grossRentalIncome / 12; // monthly

  const comps: RentComp[] = deal.breakdowns?.rentComps ?? [];

  function saveComps(updated: RentComp[]) {
    const updatedDeal: Deal = {
      ...deal,
      breakdowns: {
        ...deal.breakdowns,
        rentComps: updated,
      },
      updatedAt: new Date().toISOString(),
    };
    dispatch(updateDeal(updatedDeal));
  }

  function addComp() {
    const newComp = emptyComp();
    saveComps([...comps, newComp]);
    setEditingId(newComp.id);
  }

  function removeComp(id: string) {
    saveComps(comps.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function updateComp(id: string, field: keyof RentComp, value: string | number) {
    saveComps(comps.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  // ─── Stats ──────────────────────────────────────────

  const filledComps = comps.filter((c) => c.monthlyRent > 0);

  const simpleAvg = filledComps.length > 0
    ? filledComps.reduce((s, c) => s + c.monthlyRent, 0) / filledComps.length
    : 0;

  const weightedAvg = useMemo(() => {
    if (filledComps.length === 0) return 0;
    const totalWeight = filledComps.reduce((s, c) => s + (c.weight || 2), 0);
    if (totalWeight === 0) return simpleAvg;
    return filledComps.reduce((s, c) => s + c.monthlyRent * (c.weight || 2), 0) / totalWeight;
  }, [filledComps, simpleAvg]);

  const activeAvg = useWeighted ? weightedAvg : simpleAvg;

  const minRent = filledComps.length > 0 ? Math.min(...filledComps.map((c) => c.monthlyRent)) : 0;
  const maxRent = filledComps.length > 0 ? Math.max(...filledComps.map((c) => c.monthlyRent)) : 0;
  const avgPsf = useMemo(() => {
    const withSqft = filledComps.filter((c) => c.sqft > 0);
    return withSqft.length > 0
      ? withSqft.reduce((s, c) => s + c.monthlyRent / c.sqft, 0) / withSqft.length
      : 0;
  }, [filledComps]);

  const delta = subjectRent > 0 && activeAvg > 0 ? ((subjectRent - activeAvg) / activeAvg) * 100 : 0;
  const deltaAbs = Math.abs(delta);

  // ─── Fragility Test ─────────────────────────────────

  const fragility = useMemo(() => {
    if (filledComps.length === 0 || activeAvg <= 0) return null;

    const compAnnualRent = activeAvg * 12;

    // Calculate base metrics
    let baseCap = 0, baseCoc = 0, baseDscr = 0, baseCf = 0;
    let compCap = 0, compCoc = 0, compDscr = 0, compCf = 0;

    if (deal.dealType === 'real-estate') {
      const base = calcRealEstateMetrics(data as RealEstateDeal);
      baseCap = base.capRate;
      baseCoc = base.cashOnCashReturn;
      baseDscr = base.dscr;
      baseCf = base.annualCashFlow;

      const compData: RealEstateDeal = {
        ...(data as RealEstateDeal),
        grossRentalIncome: compAnnualRent,
      };
      const comp = calcRealEstateMetrics(compData);
      compCap = comp.capRate;
      compCoc = comp.cashOnCashReturn;
      compDscr = comp.dscr;
      compCf = comp.annualCashFlow;
    } else {
      const base = calcHybridMetrics(data as HybridDeal);
      baseCap = base.capRate;
      baseCoc = base.cashOnCashReturn;
      baseDscr = base.dscr;
      baseCf = base.annualCashFlow;

      const compData: HybridDeal = {
        ...(data as HybridDeal),
        grossRentalIncome: compAnnualRent,
      };
      const comp = calcHybridMetrics(compData);
      compCap = comp.capRate;
      compCoc = comp.cashOnCashReturn;
      compDscr = comp.dscr;
      compCf = comp.annualCashFlow;
    }

    return {
      capRate:   { base: baseCap,  comp: compCap,  delta: compCap  - baseCap  },
      coc:       { base: baseCoc,  comp: compCoc,  delta: compCoc  - baseCoc  },
      dscr:      { base: baseDscr, comp: compDscr, delta: compDscr - baseDscr },
      cashFlow:  { base: baseCf,   comp: compCf,   delta: compCf   - baseCf   },
    };
  }, [deal, data, filledComps, activeAvg]);

  const hasWeightVariance = useMemo(() => {
    if (filledComps.length < 2) return false;
    return Math.abs(simpleAvg - weightedAvg) > 1;
  }, [filledComps, simpleAvg, weightedAvg]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-secondary/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Home className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Rent Comps</h3>
            <p className="text-xs text-muted-foreground">
              {filledComps.length > 0
                ? `${filledComps.length} comp${filledComps.length !== 1 ? 's' : ''} — ${useWeighted ? 'wtd ' : ''}avg ${fmt(activeAvg)}/mo`
                : 'Add comparable rents to benchmark your deal'}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border px-5 py-4">
          {/* Weighted toggle */}
          {filledComps.length >= 2 && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUseWeighted(false)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    !useWeighted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Simple Avg
                </button>
                <button
                  onClick={() => setUseWeighted(true)}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition ${
                    useWeighted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Star className="h-3 w-3" />
                  Weighted Avg
                </button>
              </div>
              {hasWeightVariance && (
                <span className="text-xs text-muted-foreground">
                  Simple {fmt(simpleAvg)} / Weighted {fmt(weightedAvg)}
                </span>
              )}
            </div>
          )}

          {/* Summary Cards */}
          {filledComps.length > 0 && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Subject Rent</p>
                <p className="mt-1 text-lg font-bold text-foreground">{fmt(subjectRent)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">{useWeighted ? 'Wtd Average' : 'Comp Average'}</p>
                <p className="mt-1 text-lg font-bold text-foreground">{fmt(activeAvg)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Range</p>
                <p className="mt-1 text-sm font-bold text-foreground">{fmt(minRent)} – {fmt(maxRent)}</p>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Avg $/SF</p>
                <p className="mt-1 text-lg font-bold text-foreground">${avgPsf.toFixed(2)}</p>
              </div>
              <div className={`rounded-lg border p-3 ${
                delta > 5 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' :
                delta < -5 ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' :
                'border-border bg-secondary/30'
              }`}>
                <p className="text-xs font-medium text-muted-foreground">vs Comps</p>
                <div className="mt-1 flex items-center gap-1">
                  {delta > 2 ? <TrendingUp className="h-4 w-4 text-red-500" /> :
                   delta < -2 ? <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" /> :
                   <Minus className="h-4 w-4 text-muted-foreground" />}
                  <span className={`text-lg font-bold ${
                    delta > 5 ? 'text-red-600 dark:text-red-400' :
                    delta < -5 ? 'text-green-600 dark:text-green-400' :
                    'text-foreground'
                  }`}>
                    {delta > 0 ? '+' : ''}{deltaAbs.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {delta > 5 ? 'Above market' : delta < -5 ? 'Below market' : 'At market'}
                </p>
              </div>
            </div>
          )}

          {/* ─── Rent Fragility Test ────────────────── */}
          {fragility && filledComps.length >= 2 && (
            <div className="mb-5">
              <button
                onClick={() => setShowFragility(!showFragility)}
                className={`flex w-full items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                  showFragility
                    ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'border-dashed border-border text-muted-foreground hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400'
                }`}
              >
                <Zap className="h-4 w-4" />
                Underwrite at Comp Average
                <span className="ml-auto text-xs opacity-70">
                  {showFragility ? 'Hide' : 'Stress-test your rent assumption'}
                </span>
              </button>

              {showFragility && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="mb-3 text-xs text-muted-foreground">
                    What if your actual rent matches the comp {useWeighted ? 'weighted ' : ''}average of <strong className="text-foreground">{fmt(activeAvg)}/mo</strong> instead of <strong className="text-foreground">{fmt(subjectRent)}/mo</strong>?
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {/* Cap Rate */}
                    <div className="rounded-md border border-border bg-background p-2.5">
                      <p className="text-xs text-muted-foreground">Cap Rate</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{pct(fragility.capRate.base)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-sm font-bold ${fragility.capRate.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {pct(fragility.capRate.comp)}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs font-medium ${fragility.capRate.delta < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {fragility.capRate.delta >= 0 ? '+' : ''}{fragility.capRate.delta.toFixed(2)}pp
                      </p>
                    </div>

                    {/* Cash-on-Cash */}
                    <div className="rounded-md border border-border bg-background p-2.5">
                      <p className="text-xs text-muted-foreground">Cash-on-Cash</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{pct(fragility.coc.base)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-sm font-bold ${fragility.coc.delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {pct(fragility.coc.comp)}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs font-medium ${fragility.coc.delta < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {fragility.coc.delta >= 0 ? '+' : ''}{fragility.coc.delta.toFixed(2)}pp
                      </p>
                    </div>

                    {/* DSCR */}
                    <div className="rounded-md border border-border bg-background p-2.5">
                      <p className="text-xs text-muted-foreground">DSCR</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">
                          {fragility.dscr.base === Infinity ? '--' : fragility.dscr.base.toFixed(2)}x
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-sm font-bold ${
                          fragility.dscr.comp < 1.0 ? 'text-red-600 dark:text-red-400' :
                          fragility.dscr.comp < 1.25 ? 'text-amber-600 dark:text-amber-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {fragility.dscr.comp === Infinity ? '--' : fragility.dscr.comp.toFixed(2)}x
                        </span>
                      </div>
                      {fragility.dscr.comp < 1.25 && fragility.dscr.comp !== Infinity && (
                        <p className="mt-0.5 text-xs font-medium text-red-500">
                          Below 1.25x threshold
                        </p>
                      )}
                    </div>

                    {/* Cash Flow */}
                    <div className={`rounded-md border p-2.5 ${
                      fragility.cashFlow.comp < 0
                        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                        : 'border-border bg-background'
                    }`}>
                      <p className="text-xs text-muted-foreground">Annual Cash Flow</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-sm text-muted-foreground">{fmt(fragility.cashFlow.base)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-sm font-bold ${fragility.cashFlow.comp < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                          {fmt(fragility.cashFlow.comp)}
                        </span>
                      </div>
                      <p className={`mt-0.5 text-xs font-medium ${fragility.cashFlow.delta < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                        {fragility.cashFlow.delta >= 0 ? '+' : ''}{fmt(fragility.cashFlow.delta)}
                      </p>
                    </div>
                  </div>

                  {fragility.cashFlow.comp < 0 && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <Zap className="h-3.5 w-3.5" />
                      Deal goes negative at comp rents — your rent assumption may be fragile.
                    </p>
                  )}
                  {fragility.cashFlow.comp >= 0 && delta > 5 && (
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                      Subject rent is {deltaAbs.toFixed(0)}% above comps. Deal still cash-flows at market rents, but the margin is thinner.
                    </p>
                  )}
                  {fragility.cashFlow.comp >= 0 && delta <= 5 && (
                    <p className="mt-3 text-xs text-green-700 dark:text-green-400">
                      Deal holds up at comp rents. Rent assumption appears well-supported.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Comp List */}
          <div className="space-y-3">
            {comps.map((comp, i) => (
              <div key={comp.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Comp #{i + 1}</span>
                    <StarWeight
                      value={(comp.weight || 2) as 1 | 2 | 3}
                      onChange={(v) => updateComp(comp.id, 'weight', v)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(editingId === comp.id ? null : comp.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      {editingId === comp.id ? 'Done' : 'Edit'}
                    </button>
                    <button
                      onClick={() => removeComp(comp.id)}
                      className="text-red-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === comp.id ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="col-span-2">
                      <label className="mb-0.5 block text-xs text-muted-foreground">Address</label>
                      <input
                        type="text"
                        value={comp.address}
                        onChange={(e) => updateComp(comp.id, 'address', e.target.value)}
                        placeholder="123 Main St"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-muted-foreground">Monthly Rent</label>
                      <input
                        type="number"
                        value={comp.monthlyRent || ''}
                        onChange={(e) => updateComp(comp.id, 'monthlyRent', Number(e.target.value))}
                        placeholder="1800"
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-muted-foreground">Sq Ft</label>
                      <input
                        type="number"
                        value={comp.sqft || ''}
                        onChange={(e) => updateComp(comp.id, 'sqft', Number(e.target.value))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-muted-foreground">Beds</label>
                      <input
                        type="number"
                        min={0}
                        value={comp.beds}
                        onChange={(e) => updateComp(comp.id, 'beds', Number(e.target.value))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-muted-foreground">Baths</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={comp.baths}
                        onChange={(e) => updateComp(comp.id, 'baths', Number(e.target.value))}
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-xs text-muted-foreground">Source</label>
                      <input
                        type="text"
                        value={comp.source}
                        onChange={(e) => updateComp(comp.id, 'source', e.target.value)}
                        placeholder="Zillow, MLS, etc."
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className="mb-0.5 block text-xs text-muted-foreground">Notes</label>
                      <input
                        type="text"
                        value={comp.notes}
                        onChange={(e) => updateComp(comp.id, 'notes', e.target.value)}
                        placeholder="Updated kitchen, corner lot, etc."
                        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-medium text-foreground">
                      {comp.address || 'No address'}
                    </span>
                    <span className="text-foreground font-semibold">
                      {comp.monthlyRent > 0 ? `${fmt(comp.monthlyRent)}/mo` : '—'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {comp.beds}bd / {comp.baths}ba • {comp.sqft.toLocaleString()} sf
                    </span>
                    {comp.sqft > 0 && comp.monthlyRent > 0 && (
                      <span className="text-muted-foreground text-xs">
                        ${(comp.monthlyRent / comp.sqft).toFixed(2)}/sf
                      </span>
                    )}
                    {comp.source && (
                      <span className="text-xs text-muted-foreground">via {comp.source}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Button */}
          {comps.length < 6 && (
            <button
              onClick={addComp}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Add Comparable
            </button>
          )}

          {comps.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Add 3-5 comparable rentals in the area to benchmark your subject property rent of {fmt(subjectRent)}/mo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
