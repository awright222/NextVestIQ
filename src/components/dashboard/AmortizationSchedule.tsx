// ============================================
// Amortization Schedule — Full loan payment table
// ============================================
// Shows monthly or annual breakdown of principal,
// interest, and remaining balance for a deal's financing.

'use client';

import { useState, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp, DollarSign, Percent, TrendingDown } from 'lucide-react';
import type { FinancingTerms } from '@/types';
import {
  generateAmortizationSchedule,
  summarizeByYear,
  amortizationTotals,
} from '@/lib/calculations/amortization';

interface AmortizationScheduleProps {
  financing: FinancingTerms;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtCents = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

export default function AmortizationSchedule({ financing }: AmortizationScheduleProps) {
  const [view, setView] = useState<'annual' | 'monthly'>('annual');
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [showFull, setShowFull] = useState(false);

  const schedule = useMemo(() => generateAmortizationSchedule(financing), [financing]);
  const annualSummaries = useMemo(() => summarizeByYear(schedule), [schedule]);
  const totals = useMemo(() => amortizationTotals(schedule), [schedule]);

  if (schedule.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-card-foreground">Amortization Schedule</h3>
        <p className="mt-3 text-sm text-muted-foreground">No loan to amortize (loan amount is $0).</p>
      </div>
    );
  }

  const interestRatio = totals.totalPayments > 0
    ? ((totals.totalInterest / totals.totalPayments) * 100).toFixed(1)
    : '0';

  // For monthly view, limit display unless "show all" is on
  const displayedMonths = showFull ? schedule : schedule.slice(0, 60);
  const displayedYears = showFull ? annualSummaries : annualSummaries.slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-card-foreground">Amortization Schedule</h3>

      {/* ─── Summary Cards ─────────────────────── */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            Monthly Payment
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">{fmtCents(schedule[0].payment)}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            Total Interest
          </div>
          <p className="mt-1 text-lg font-bold text-red-600 dark:text-red-400">{fmt(totals.totalInterest)}</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Percent className="h-3 w-3" />
            Interest / Total
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">{interestRatio}%</p>
        </div>
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Loan Term
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">{financing.amortizationYears} yrs</p>
        </div>
      </div>

      {/* ─── View Toggle ───────────────────────── */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setView('annual')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            view === 'annual'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          Annual
        </button>
        <button
          onClick={() => setView('monthly')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            view === 'monthly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          Monthly
        </button>
      </div>

      {/* ─── Annual View ───────────────────────── */}
      {view === 'annual' && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Year</th>
                <th className="pb-2 pr-4 text-right font-medium">Payment</th>
                <th className="pb-2 pr-4 text-right font-medium">Principal</th>
                <th className="pb-2 pr-4 text-right font-medium">Interest</th>
                <th className="pb-2 pr-4 text-right font-medium">Balance</th>
                <th className="pb-2 text-right font-medium">P/I Split</th>
              </tr>
            </thead>
            <tbody>
              {displayedYears.map((row) => (
                <tr
                  key={row.year}
                  onClick={() => setExpandedYear(expandedYear === row.year ? null : row.year)}
                  className="cursor-pointer border-b border-border/50 transition hover:bg-secondary/50"
                >
                  <td className="py-2 pr-4 font-medium text-foreground">
                    <div className="flex items-center gap-1">
                      {expandedYear === row.year ? (
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      )}
                      Year {row.year}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right text-foreground">{fmt(row.totalPayment)}</td>
                  <td className="py-2 pr-4 text-right text-green-600 dark:text-green-400">{fmt(row.totalPrincipal)}</td>
                  <td className="py-2 pr-4 text-right text-red-600 dark:text-red-400">{fmt(row.totalInterest)}</td>
                  <td className="py-2 pr-4 text-right text-foreground">{fmt(row.endingBalance)}</td>
                  <td className="py-2 text-right">
                    {/* Principal/Interest bar */}
                    <div className="ml-auto flex h-3 w-20 overflow-hidden rounded-full bg-red-200 dark:bg-red-900">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${row.principalPercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{row.principalPercent.toFixed(0)}% principal</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold">
                <td className="py-2 pr-4 text-foreground">Total</td>
                <td className="py-2 pr-4 text-right text-foreground">{fmt(totals.totalPayments)}</td>
                <td className="py-2 pr-4 text-right text-green-600 dark:text-green-400">{fmt(totals.totalPrincipal)}</td>
                <td className="py-2 pr-4 text-right text-red-600 dark:text-red-400">{fmt(totals.totalInterest)}</td>
                <td className="py-2 pr-4 text-right text-foreground">$0</td>
                <td />
              </tr>
            </tfoot>
          </table>

          {/* Expanded year → monthly detail */}
          {expandedYear && (
            <div className="mt-2 rounded-lg border border-border bg-secondary/20 p-3">
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                Year {expandedYear} — Monthly Detail
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-1 pr-3 font-medium">Month</th>
                      <th className="pb-1 pr-3 text-right font-medium">Payment</th>
                      <th className="pb-1 pr-3 text-right font-medium">Principal</th>
                      <th className="pb-1 pr-3 text-right font-medium">Interest</th>
                      <th className="pb-1 text-right font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule
                      .slice((expandedYear - 1) * 12, expandedYear * 12)
                      .map((row) => (
                        <tr key={row.month} className="border-b border-border/30">
                          <td className="py-1 pr-3 text-foreground">{row.month}</td>
                          <td className="py-1 pr-3 text-right text-foreground">{fmtCents(row.payment)}</td>
                          <td className="py-1 pr-3 text-right text-green-600 dark:text-green-400">{fmtCents(row.principal)}</td>
                          <td className="py-1 pr-3 text-right text-red-600 dark:text-red-400">{fmtCents(row.interest)}</td>
                          <td className="py-1 text-right text-foreground">{fmtCents(row.balance)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Monthly View ──────────────────────── */}
      {view === 'monthly' && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 text-right font-medium">Payment</th>
                <th className="pb-2 pr-3 text-right font-medium">Principal</th>
                <th className="pb-2 pr-3 text-right font-medium">Interest</th>
                <th className="pb-2 pr-3 text-right font-medium">Balance</th>
                <th className="pb-2 text-right font-medium">Cum. Interest</th>
              </tr>
            </thead>
            <tbody>
              {displayedMonths.map((row) => (
                <tr key={row.month} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 text-xs font-medium text-foreground">{row.month}</td>
                  <td className="py-1.5 pr-3 text-right text-foreground">{fmtCents(row.payment)}</td>
                  <td className="py-1.5 pr-3 text-right text-green-600 dark:text-green-400">{fmtCents(row.principal)}</td>
                  <td className="py-1.5 pr-3 text-right text-red-600 dark:text-red-400">{fmtCents(row.interest)}</td>
                  <td className="py-1.5 pr-3 text-right text-foreground">{fmtCents(row.balance)}</td>
                  <td className="py-1.5 text-right text-muted-foreground">{fmt(row.cumulativeInterest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Show More / Less ──────────────────── */}
      {((view === 'annual' && annualSummaries.length > 10) ||
        (view === 'monthly' && schedule.length > 60)) && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="mt-3 text-xs font-medium text-primary hover:underline"
        >
          {showFull
            ? 'Show less'
            : `Show all ${view === 'annual' ? annualSummaries.length : schedule.length} ${view === 'annual' ? 'years' : 'months'}`}
        </button>
      )}

      {/* ─── Financing Details ─────────────────── */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>Loan: {fmt(financing.loanAmount)}</span>
        <span>Rate: {financing.interestRate}%</span>
        <span>Term: {financing.loanTermYears} yrs</span>
        <span>Amort: {financing.amortizationYears} yrs</span>
        <span>Down: {financing.downPayment}%</span>
      </div>
    </div>
  );
}
