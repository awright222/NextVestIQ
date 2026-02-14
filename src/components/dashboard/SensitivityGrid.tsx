// ============================================
// SensitivityGrid — Variable sensitivity table
// ============================================
// Varies one deal input across a range and displays
// a grid of output metrics at each step. Highlights
// the base case row for easy reference.

'use client';

import { useState, useMemo } from 'react';
import { Grid3X3 } from 'lucide-react';
import type { Deal } from '@/types';
import {
  runSensitivity,
  getVariablesForDealType,
  type SensitivityResult,
} from '@/lib/calculations/sensitivity';

interface Props {
  deal: Deal;
}

function formatCellValue(value: number, format: 'percent' | 'currency' | 'ratio'): string {
  if (!isFinite(value)) return '—';
  if (format === 'percent') return `${value.toFixed(2)}%`;
  if (format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toFixed(2) + 'x';
}

export default function SensitivityGrid({ deal }: Props) {
  const variables = useMemo(() => getVariablesForDealType(deal.dealType), [deal.dealType]);
  const [selectedVar, setSelectedVar] = useState(variables[0]?.key ?? '');

  const result: SensitivityResult = useMemo(
    () => runSensitivity(deal, selectedVar),
    [deal, selectedVar]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
          <Grid3X3 className="h-4 w-4 text-primary" />
          Sensitivity Analysis
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Variable:</label>
          <select
            value={selectedVar}
            onChange={(e) => setSelectedVar(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {variables.map((v) => (
              <option key={v.key} value={v.key}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                {result.variable.label}
              </th>
              {result.outputMetrics.map((m) => (
                <th
                  key={m.key}
                  className="px-3 py-2 text-right font-semibold text-muted-foreground"
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-border/50 transition ${
                  row.isBase
                    ? 'bg-primary/10 font-semibold'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <td className="whitespace-nowrap px-3 py-2 text-left text-foreground">
                  {row.inputLabel}
                  {row.isBase && (
                    <span className="ml-1.5 rounded bg-primary/20 px-1 py-0.5 text-[10px] font-bold text-primary">
                      BASE
                    </span>
                  )}
                </td>
                {result.outputMetrics.map((m) => {
                  const baseRow = result.rows.find((r) => r.isBase);
                  const baseVal = baseRow?.metrics[m.key] ?? 0;
                  const val = row.metrics[m.key] ?? 0;
                  const diff = val - baseVal;
                  const isPositive = diff > 0.01;
                  const isNegative = diff < -0.01;

                  return (
                    <td
                      key={m.key}
                      className={`whitespace-nowrap px-3 py-2 text-right ${
                        row.isBase
                          ? 'text-foreground'
                          : isPositive
                          ? 'text-green-600 dark:text-green-400'
                          : isNegative
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-foreground'
                      }`}
                    >
                      {formatCellValue(val, m.format)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">
        Highlighted row is the current deal value. Green = improvement, red = deterioration vs. base case.
      </p>
    </div>
  );
}
