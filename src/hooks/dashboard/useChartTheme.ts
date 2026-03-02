'use client';

import { useMemo } from 'react';
import { useTheme } from '@/hooks/useTheme';

export interface ChartTheme {
  grid: string;
  axis: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  labelText: string;
  subtleBg: string;
}

/**
 * Returns theme-aware colors for recharts inline styles.
 * Avoids hardcoded white/dark values that break in light mode.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();

  return useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    return {
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)',
      axis: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
      tick: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.65)',
      tooltipBg: isDark ? '#1E2337' : '#FFFFFF',
      tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)',
      tooltipText: isDark ? '#FFFFFF' : '#1a1a2e',
      labelText: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.7)',
      subtleBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    };
  }, [resolvedTheme]);
}
