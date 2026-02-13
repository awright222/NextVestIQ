// ============================================
// Cash Flow Chart — Recharts area chart
// ============================================

'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface CashFlowChartProps {
  data: {
    year: number;
    cashFlow: number;
    noi?: number;
    revenue?: number;
    cumulativeCashFlow: number;
  }[];
}

/** Format currency for axis labels */
function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">
        Cash Flow Projection
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCashFlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => `Y${v}`}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtAxis} />
          <Tooltip
            formatter={(value) => fmtAxis(Number(value))}
            labelFormatter={(label) => `Year ${label}`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="cashFlow"
            name="Annual Cash Flow"
            stroke="#2563eb"
            fill="url(#colorCashFlow)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="cumulativeCashFlow"
            name="Cumulative Cash Flow"
            stroke="#10b981"
            fill="url(#colorCumulative)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
