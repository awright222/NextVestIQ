// ============================================
// Refinance Modeling Panel
// ============================================
// Interactive refinance calculator allowing users
// to model a refi at year X with adjustable inputs.

'use client';

import { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, DollarSign, TrendingUp, ArrowRightLeft } from 'lucide-react';
import type { Deal, RealEstateDeal, HybridDeal } from '@/types';
import { calcRefinance, DEFAULT_REFI, type RefinanceInputs } from '@/lib/calculations/refinance';

interface RefinancePanelProps {
  deal: Deal;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(2)}%`;

export default function RefinancePanel({ deal }: RefinancePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputs, setInputs] = useState<RefinanceInputs>({ ...DEFAULT_REFI });

  // Only applicable to real-estate and hybrid deals
  if (deal.dealType === 'business') return null;

  const data = deal.data as RealEstateDeal | HybridDeal;

  const result = useMemo(
    () => calcRefinance(data, inputs),
    [data, inputs],
  );

  function updateInput<K extends keyof RefinanceInputs>(key: K, value: RefinanceInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const cashOutPositive = result.cashOut > 0;
  const paymentUp = result.monthlyPaymentDelta > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-secondary/50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
            <RefreshCw className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Refinance Modeling</h3>
            <p className="text-xs text-muted-foreground">Model a refi at year {inputs.refiYear} and see updated returns</p>
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
          {/* Input Controls */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Refi Year</label>
              <input
                type="number"
                min={1}
                max={30}
                value={inputs.refiYear}
                onChange={(e) => updateInput('refiYear', Math.max(1, Number(e.target.value)))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">New Rate (%)</label>
              <input
                type="number"
                step={0.125}
                min={0}
                max={20}
                value={inputs.newRate}
                onChange={(e) => updateInput('newRate', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">New Term (yrs)</label>
              <input
                type="number"
                min={1}
                max={40}
                value={inputs.newTermYears}
                onChange={(e) => updateInput('newTermYears', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Amortization (yrs)</label>
              <input
                type="number"
                min={1}
                max={40}
                value={inputs.newAmortYears}
                onChange={(e) => updateInput('newAmortYears', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">New LTV (%)</label>
              <input
                type="number"
                step={1}
                min={0}
                max={100}
                value={inputs.newLTV}
                onChange={(e) => updateInput('newLTV', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Refi Closing ($)</label>
              <input
                type="number"
                step={500}
                min={0}
                value={inputs.refiClosingCosts}
                onChange={(e) => updateInput('refiClosingCosts', Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          {/* Results */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Cash Out */}
            <div className={`rounded-lg border p-3 ${cashOutPositive ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-border bg-secondary/30'}`}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Cash Out
              </div>
              <p className={`mt-1 text-lg font-bold ${cashOutPositive ? 'text-green-700 dark:text-green-400' : 'text-foreground'}`}>
                {fmt(result.cashOut)}
              </p>
            </div>

            {/* New Monthly Payment */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                New Monthly
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{fmt(result.newMonthlyPayment)}</p>
              <p className={`text-xs ${paymentUp ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                {paymentUp ? '+' : ''}{fmt(result.monthlyPaymentDelta)} vs original
              </p>
            </div>

            {/* New CoC */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                New Cash-on-Cash
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{pct(result.newCashOnCash)}</p>
            </div>

            {/* Annual Cash Flow */}
            <div className={`rounded-lg border p-3 ${result.newAnnualCashFlow >= 0 ? 'border-border bg-secondary/30' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                Annual Cash Flow
              </div>
              <p className={`mt-1 text-lg font-bold ${result.newAnnualCashFlow < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {fmt(result.newAnnualCashFlow)}
              </p>
            </div>
          </div>

          {/* Detail Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr className="text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">Property Value at Year {inputs.refiYear}</td>
                  <td className="py-2 text-right">{fmt(result.futurePropertyValue)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">New Loan Amount ({inputs.newLTV}% LTV)</td>
                  <td className="py-2 text-right">{fmt(result.newLoanAmount)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">Original Balance at Year {inputs.refiYear}</td>
                  <td className="py-2 text-right">{fmt(result.originalBalanceAtRefi)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">Equity After Refi</td>
                  <td className="py-2 text-right">{fmt(result.equityAfterRefi)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">Adjusted Total Cash Invested</td>
                  <td className="py-2 text-right">{fmt(result.adjustedCashInvested)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td className="py-2 pr-4 font-medium">Original Payment → New Payment</td>
                  <td className="py-2 text-right">
                    {fmt(result.originalMonthlyPayment)} → {fmt(result.newMonthlyPayment)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BRRRR hint */}
          {cashOutPositive && (
            <p className="mt-3 text-xs text-muted-foreground">
              This refinance recovers {fmt(result.cashOut)} of your initial equity — ideal for a BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategy.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
