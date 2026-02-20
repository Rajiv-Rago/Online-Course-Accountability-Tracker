'use client';

import { useTheme } from 'next-themes';
import { useMemo } from 'react';

export const chartTheme = {
  light: {
    background: '#ffffff',
    text: '#1f2937',
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltip: {
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#1f2937',
    },
  },
  dark: {
    background: '#0f172a',
    text: '#f1f5f9',
    grid: '#334155',
    axis: '#94a3b8',
    tooltip: {
      background: '#1e293b',
      border: '#334155',
      text: '#f1f5f9',
    },
  },
};

export const chartBreakpoints = {
  sm: { width: 350, height: 200 },
  md: { width: 500, height: 280 },
  lg: { width: 700, height: 350 },
  xl: { width: 900, height: 400 },
};

export const defaultChartProps = {
  margin: { top: 10, right: 30, left: 0, bottom: 0 },
  animationDuration: 300,
  animationEasing: 'ease-in-out' as const,
};

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  return useMemo(
    () => (resolvedTheme === 'dark' ? chartTheme.dark : chartTheme.light),
    [resolvedTheme],
  );
}
