// ============================================
// useChartColors — CSS-variable-aware chart colors
// ============================================
// Returns resolved color values so Recharts can
// use the correct grid/axis/tooltip colors in
// both light and dark mode.

'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';

export function useChartColors() {
  const { resolved } = useTheme();

  return useMemo(() => {
    const dark = resolved === 'dark';
    return {
      grid: dark ? '#334155' : '#e2e8f0',
      tick: dark ? '#94a3b8' : '#64748b',
      tooltipBg: dark ? '#1e293b' : '#ffffff',
      tooltipBorder: dark ? '#334155' : '#e2e8f0',
    };
  }, [resolved]);
}
