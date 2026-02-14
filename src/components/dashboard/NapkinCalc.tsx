// ============================================
// NapkinCalc — Quick Deal Screener
// ============================================
// Lightweight calculator for rapidly screening deals.
// Enter 4-5 numbers, see key metrics instantly.
// Lives in a modal on the dashboard.

'use client';

import { useState, useMemo } from 'react';
import { Building2, Briefcase, Store } from 'lucide-react';
import type { DealType } from '@/types';

// ─── Types ───────────────────────────────────────────

interface REInputs {
  price: number;
  grossRent: number;
  expenses: number;
  downPct: number;
  rate: number;
}

interface BizInputs {
  askingPrice: number;
  revenue: number;
  sde: number;
  downPct: number;
  rate: number;
}

interface HybridInputs {
  price: number;
  rent: number;
  revenue: number;
  sde: number;
  expenses: number;
  downPct: number;
  rate: number;
}

// ─── Helpers ─────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${n.toFixed(1)}%`;

function monthlyPayment(principal: number, rate: number, years: number): number {
  if (principal <= 0) return 0;
  const r = rate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

// ─── Deal Type Tabs ──────────────────────────────────

const dealTypes: { key: DealType; label: string; icon: typeof Building2 }[] = [
  { key: 'real-estate', label: 'Real Estate', icon: Building2 },
  { key: 'business', label: 'Business', icon: Briefcase },
  { key: 'hybrid', label: 'Hybrid', icon: Store },
];

// ─── Input Field ─────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  prefix = '$',
  suffix,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>
        )}
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          step={step}
          className={`w-full rounded-lg border border-border bg-background py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
            prefix ? 'pl-7' : 'pl-3'
          } ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ─── Result Row ──────────────────────────────────────

function Result({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'green' | 'red' | 'amber' | 'default';
}) {
  const colorClass =
    color === 'green' ? 'text-green-600 dark:text-green-400' :
    color === 'red' ? 'text-red-600 dark:text-red-400' :
    color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
    'text-foreground';

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────

export default function NapkinCalc() {
  const [dealType, setDealType] = useState<DealType>('real-estate');

  // RE
  const [re, setRe] = useState<REInputs>({ price: 250000, grossRent: 2400, expenses: 600, downPct: 25, rate: 7.0 });

  // Business
  const [biz, setBiz] = useState<BizInputs>({ askingPrice: 300000, revenue: 500000, sde: 120000, downPct: 20, rate: 10.0 });

  // Hybrid
  const [hyb, setHyb] = useState<HybridInputs>({ price: 400000, rent: 2000, revenue: 300000, sde: 80000, expenses: 800, downPct: 25, rate: 7.5 });

  const reMetrics = useMemo(() => {
    const annualRent = re.grossRent * 12;
    const annualExp = re.expenses * 12;
    const noi = annualRent - annualExp;
    const capRate = re.price > 0 ? (noi / re.price) * 100 : 0;
    const downPayment = re.price * (re.downPct / 100);
    const loanAmt = re.price - downPayment;
    const monthly = monthlyPayment(loanAmt, re.rate, 30);
    const annualDebt = monthly * 12;
    const cashFlow = noi - annualDebt;
    const totalCash = downPayment + re.price * 0.03; // estimate 3% closing
    const coc = totalCash > 0 ? (cashFlow / totalCash) * 100 : 0;
    const dscr = annualDebt > 0 ? noi / annualDebt : Infinity;
    return { noi, capRate, cashFlow, coc, dscr, monthly, totalCash };
  }, [re]);

  const bizMetrics = useMemo(() => {
    const downPayment = biz.askingPrice * (biz.downPct / 100);
    const loanAmt = biz.askingPrice - downPayment;
    const monthly = monthlyPayment(loanAmt, biz.rate, 10);
    const annualDebt = monthly * 12;
    const cashFlow = biz.sde - annualDebt;
    const totalCash = downPayment + biz.askingPrice * 0.03;
    const sdeMultiple = biz.sde > 0 ? biz.askingPrice / biz.sde : 0;
    const roi = totalCash > 0 ? (cashFlow / totalCash) * 100 : 0;
    const dscr = annualDebt > 0 ? biz.sde / annualDebt : Infinity;
    return { sdeMultiple, cashFlow, roi, dscr, monthly, totalCash };
  }, [biz]);

  const hybMetrics = useMemo(() => {
    const annualRent = hyb.rent * 12;
    const annualExp = hyb.expenses * 12;
    const propertyNoi = annualRent - annualExp;
    const combinedNoi = propertyNoi + hyb.sde;
    const downPayment = hyb.price * (hyb.downPct / 100);
    const loanAmt = hyb.price - downPayment;
    const monthly = monthlyPayment(loanAmt, hyb.rate, 25);
    const annualDebt = monthly * 12;
    const cashFlow = combinedNoi - annualDebt;
    const totalCash = downPayment + hyb.price * 0.03;
    const coc = totalCash > 0 ? (cashFlow / totalCash) * 100 : 0;
    const dscr = annualDebt > 0 ? combinedNoi / annualDebt : Infinity;
    const capRate = hyb.price > 0 ? (propertyNoi / hyb.price) * 100 : 0;
    return { combinedNoi, capRate, cashFlow, coc, dscr, monthly, totalCash };
  }, [hyb]);

  function dscrColor(v: number): 'green' | 'red' | 'amber' {
    if (v >= 1.25) return 'green';
    if (v >= 1.0) return 'amber';
    return 'red';
  }

  function cfColor(v: number): 'green' | 'red' {
    return v >= 0 ? 'green' : 'red';
  }

  return (
    <div className="p-1">
      {/* Deal Type Selector */}
      <div className="mb-5 flex gap-1 rounded-lg bg-secondary p-1">
        {dealTypes.map((dt) => (
          <button
            key={dt.key}
            onClick={() => setDealType(dt.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition ${
              dealType === dt.key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <dt.icon className="h-3.5 w-3.5" />
            {dt.label}
          </button>
        ))}
      </div>

      {/* ─── Real Estate ───────────────────── */}
      {dealType === 'real-estate' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purchase Price" value={re.price} onChange={(v) => setRe({ ...re, price: v })} />
            <Field label="Monthly Rent" value={re.grossRent} onChange={(v) => setRe({ ...re, grossRent: v })} />
            <Field label="Monthly Expenses" value={re.expenses} onChange={(v) => setRe({ ...re, expenses: v })} />
            <Field label="Down Payment" value={re.downPct} onChange={(v) => setRe({ ...re, downPct: v })} prefix="" suffix="%" step={5} />
            <Field label="Interest Rate" value={re.rate} onChange={(v) => setRe({ ...re, rate: v })} prefix="" suffix="%" step={0.25} />
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <Result label="NOI" value={fmt(reMetrics.noi)} />
            <Result label="Cap Rate" value={pct(reMetrics.capRate)} color={reMetrics.capRate >= 6 ? 'green' : reMetrics.capRate >= 4 ? 'amber' : 'red'} />
            <Result label="Monthly Mortgage" value={fmt(reMetrics.monthly)} />
            <div className="my-1 border-t border-border" />
            <Result label="Annual Cash Flow" value={fmt(reMetrics.cashFlow)} color={cfColor(reMetrics.cashFlow)} />
            <Result label="Cash-on-Cash" value={pct(reMetrics.coc)} color={reMetrics.coc >= 8 ? 'green' : reMetrics.coc >= 5 ? 'amber' : 'red'} />
            <Result label="DSCR" value={reMetrics.dscr === Infinity ? 'No Debt' : `${reMetrics.dscr.toFixed(2)}x`} color={dscrColor(reMetrics.dscr)} />
          </div>
        </div>
      )}

      {/* ─── Business ──────────────────────── */}
      {dealType === 'business' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Asking Price" value={biz.askingPrice} onChange={(v) => setBiz({ ...biz, askingPrice: v })} />
            <Field label="Annual Revenue" value={biz.revenue} onChange={(v) => setBiz({ ...biz, revenue: v })} />
            <Field label="SDE" value={biz.sde} onChange={(v) => setBiz({ ...biz, sde: v })} />
            <Field label="Down Payment" value={biz.downPct} onChange={(v) => setBiz({ ...biz, downPct: v })} prefix="" suffix="%" step={5} />
            <Field label="Interest Rate" value={biz.rate} onChange={(v) => setBiz({ ...biz, rate: v })} prefix="" suffix="%" step={0.25} />
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <Result label="SDE Multiple" value={`${bizMetrics.sdeMultiple.toFixed(1)}x`} color={bizMetrics.sdeMultiple <= 3 ? 'green' : bizMetrics.sdeMultiple <= 4.5 ? 'amber' : 'red'} />
            <Result label="Monthly Debt Service" value={fmt(bizMetrics.monthly)} />
            <div className="my-1 border-t border-border" />
            <Result label="Annual Cash Flow" value={fmt(bizMetrics.cashFlow)} color={cfColor(bizMetrics.cashFlow)} />
            <Result label="ROI" value={pct(bizMetrics.roi)} color={bizMetrics.roi >= 15 ? 'green' : bizMetrics.roi >= 8 ? 'amber' : 'red'} />
            <Result label="DSCR" value={bizMetrics.dscr === Infinity ? 'No Debt' : `${bizMetrics.dscr.toFixed(2)}x`} color={dscrColor(bizMetrics.dscr)} />
          </div>
        </div>
      )}

      {/* ─── Hybrid ────────────────────────── */}
      {dealType === 'hybrid' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total Price" value={hyb.price} onChange={(v) => setHyb({ ...hyb, price: v })} />
            <Field label="Monthly Rent" value={hyb.rent} onChange={(v) => setHyb({ ...hyb, rent: v })} />
            <Field label="Annual Revenue" value={hyb.revenue} onChange={(v) => setHyb({ ...hyb, revenue: v })} />
            <Field label="SDE" value={hyb.sde} onChange={(v) => setHyb({ ...hyb, sde: v })} />
            <Field label="Monthly Expenses" value={hyb.expenses} onChange={(v) => setHyb({ ...hyb, expenses: v })} />
            <Field label="Down Payment" value={hyb.downPct} onChange={(v) => setHyb({ ...hyb, downPct: v })} prefix="" suffix="%" step={5} />
            <Field label="Interest Rate" value={hyb.rate} onChange={(v) => setHyb({ ...hyb, rate: v })} prefix="" suffix="%" step={0.25} />
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3">
            <Result label="Combined NOI" value={fmt(hybMetrics.combinedNoi)} />
            <Result label="Property Cap Rate" value={pct(hybMetrics.capRate)} color={hybMetrics.capRate >= 6 ? 'green' : hybMetrics.capRate >= 4 ? 'amber' : 'red'} />
            <Result label="Monthly Mortgage" value={fmt(hybMetrics.monthly)} />
            <div className="my-1 border-t border-border" />
            <Result label="Annual Cash Flow" value={fmt(hybMetrics.cashFlow)} color={cfColor(hybMetrics.cashFlow)} />
            <Result label="Cash-on-Cash" value={pct(hybMetrics.coc)} color={hybMetrics.coc >= 8 ? 'green' : hybMetrics.coc >= 5 ? 'amber' : 'red'} />
            <Result label="DSCR" value={hybMetrics.dscr === Infinity ? 'No Debt' : `${hybMetrics.dscr.toFixed(2)}x`} color={dscrColor(hybMetrics.dscr)} />
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Quick estimates only — create a full deal for detailed analysis
      </p>
    </div>
  );
}
