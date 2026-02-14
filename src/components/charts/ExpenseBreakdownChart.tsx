// ============================================
// ExpenseBreakdownChart — Pie/Donut chart
// ============================================
// Shows expense categories as a donut chart.
// Supports real-estate, business, and hybrid deals.

'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { RealEstateDeal, BusinessDeal, HybridDeal, DealType } from '@/types';

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#ec4899', // pink
  '#6366f1', // indigo
  '#f97316', // orange
  '#06b6d4', // cyan
];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

function getExpenseData(
  dealType: DealType,
  data: RealEstateDeal | BusinessDeal | HybridDeal
) {
  if (dealType === 'real-estate') {
    const d = data as RealEstateDeal;
    const mgmt =
      (d.grossRentalIncome + d.otherIncome) * (d.propertyManagement / 100);
    return [
      { name: 'Property Tax', value: d.propertyTax },
      { name: 'Insurance', value: d.insurance },
      { name: 'Maintenance', value: d.maintenance },
      { name: 'Management', value: Math.round(mgmt) },
      { name: 'Utilities', value: d.utilities },
      { name: 'Other', value: d.otherExpenses },
    ].filter((e) => e.value > 0);
  }

  if (dealType === 'business') {
    const d = data as BusinessDeal;
    return [
      { name: 'Cost of Goods', value: d.costOfGoods },
      { name: 'Operating Expenses', value: d.operatingExpenses },
      { name: 'Owner Salary', value: d.ownerSalary },
      { name: 'Depreciation', value: d.depreciation },
      { name: 'Amortization', value: d.amortization },
      { name: 'Interest', value: d.interest },
      { name: 'Taxes', value: d.taxes },
    ].filter((e) => e.value > 0);
  }

  // Hybrid
  const d = data as HybridDeal;
  const mgmt =
    (d.grossRentalIncome + d.otherPropertyIncome) * (d.propertyManagement / 100);
  return [
    { name: 'Property Tax', value: d.propertyTax },
    { name: 'Insurance', value: d.insurance },
    { name: 'Maintenance', value: d.maintenance },
    { name: 'Prop. Mgmt', value: Math.round(mgmt) },
    { name: 'Utilities', value: d.utilities },
    { name: 'Other Prop.', value: d.otherPropertyExpenses },
    { name: 'Cost of Goods', value: d.costOfGoods },
    { name: 'Biz. OpEx', value: d.businessOperatingExpenses },
  ].filter((e) => e.value > 0);
}

interface Props {
  dealType: DealType;
  data: RealEstateDeal | BusinessDeal | HybridDeal;
}

export default function ExpenseBreakdownChart({ dealType, data }: Props) {
  const chartData = useMemo(() => getExpenseData(dealType, data), [dealType, data]);

  const total = useMemo(
    () => chartData.reduce((sum, e) => sum + e.value, 0),
    [chartData]
  );

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground">Expense Breakdown</h3>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No expenses entered.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Expense Breakdown</h3>
        <span className="text-xs text-muted-foreground">Total: {fmt(total)}</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => fmt(Number(value))}
            contentStyle={{
              backgroundColor: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span style={{ fontSize: '11px', color: 'var(--color-foreground)' }}>
                {value}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
