// ============================================
// Scenario Comparison Chart — Bar chart
// ============================================

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ScenarioComparisonChartProps {
  data: {
    name: string;
    cashFlow: number;
    roi: number;
    capRateOrSde: number;
  }[];
  /** Labels for the third metric based on deal type */
  thirdMetricLabel?: string;
}

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default function ScenarioComparisonChart({
  data,
  thirdMetricLabel = 'Cap Rate / SDE',
}: ScenarioComparisonChartProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-card-foreground">
        Scenario Comparison
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={fmtAxis} />
          <Tooltip formatter={(value) => fmtAxis(Number(value))} />
          <Legend />
          <Bar dataKey="cashFlow" name="Cash Flow" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="roi" name="ROI %" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar
            dataKey="capRateOrSde"
            name={thirdMetricLabel}
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
