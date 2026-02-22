import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock StatCard to isolate SummaryStats
vi.mock('./stat-card', () => ({
  StatCard: ({
    label,
    value,
    trend,
    trendLabel,
  }: {
    label: string;
    value: string | number;
    trend?: string;
    trendLabel?: string;
    icon: unknown;
    className?: string;
  }) => (
    <div data-testid={`stat-${label}`}>
      <span data-testid={`stat-value-${label}`}>{value}</span>
      {trend && <span data-testid={`stat-trend-${label}`}>{trend}</span>}
      {trendLabel && <span data-testid={`stat-trendlabel-${label}`}>{trendLabel}</span>}
    </div>
  ),
}));

import { SummaryStats } from './summary-stats';
import type { SummaryStatsData } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeStats(overrides: Partial<SummaryStatsData> = {}): SummaryStatsData {
  return {
    streak: 7,
    hoursThisWeek: 12.5,
    hoursThisWeekTrend: 'up',
    activeCourseCount: 3,
    overallProgress: 65,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SummaryStats', () => {
  it('renders all 4 stat cards', () => {
    render(<SummaryStats stats={makeStats()} />);

    expect(screen.getByTestId('stat-Day Streak')).toBeDefined();
    expect(screen.getByTestId('stat-Hours This Week')).toBeDefined();
    expect(screen.getByTestId('stat-Active Courses')).toBeDefined();
    expect(screen.getByTestId('stat-Overall Progress')).toBeDefined();
  });

  it('passes streak value to Day Streak card', () => {
    render(<SummaryStats stats={makeStats({ streak: 14 })} />);

    expect(screen.getByTestId('stat-value-Day Streak').textContent).toBe('14');
  });

  it('passes hours this week value', () => {
    render(<SummaryStats stats={makeStats({ hoursThisWeek: 8.3 })} />);

    expect(screen.getByTestId('stat-value-Hours This Week').textContent).toBe('8.3');
  });

  it('passes active course count', () => {
    render(<SummaryStats stats={makeStats({ activeCourseCount: 5 })} />);

    expect(screen.getByTestId('stat-value-Active Courses').textContent).toBe('5');
  });

  it('passes overall progress with percent sign', () => {
    render(<SummaryStats stats={makeStats({ overallProgress: 42 })} />);

    expect(screen.getByTestId('stat-value-Overall Progress').textContent).toBe('42%');
  });

  it('passes trend to Hours This Week card when up', () => {
    render(<SummaryStats stats={makeStats({ hoursThisWeekTrend: 'up' })} />);

    expect(screen.getByTestId('stat-trend-Hours This Week').textContent).toBe('up');
    expect(screen.getByTestId('stat-trendlabel-Hours This Week').textContent).toBe('vs last week');
  });

  it('passes trend to Hours This Week card when down', () => {
    render(<SummaryStats stats={makeStats({ hoursThisWeekTrend: 'down' })} />);

    expect(screen.getByTestId('stat-trend-Hours This Week').textContent).toBe('down');
    expect(screen.getByTestId('stat-trendlabel-Hours This Week').textContent).toBe('vs last week');
  });

  it('does NOT pass trendLabel when trend is stable', () => {
    render(<SummaryStats stats={makeStats({ hoursThisWeekTrend: 'stable' })} />);

    expect(screen.getByTestId('stat-trend-Hours This Week').textContent).toBe('stable');
    expect(screen.queryByTestId('stat-trendlabel-Hours This Week')).toBeNull();
  });

  it('does NOT pass trend to Day Streak or Active Courses cards', () => {
    render(<SummaryStats stats={makeStats()} />);

    expect(screen.queryByTestId('stat-trend-Day Streak')).toBeNull();
    expect(screen.queryByTestId('stat-trend-Active Courses')).toBeNull();
    expect(screen.queryByTestId('stat-trend-Overall Progress')).toBeNull();
  });

  it('renders zero values correctly', () => {
    render(
      <SummaryStats
        stats={makeStats({
          streak: 0,
          hoursThisWeek: 0,
          activeCourseCount: 0,
          overallProgress: 0,
        })}
      />
    );

    expect(screen.getByTestId('stat-value-Day Streak').textContent).toBe('0');
    expect(screen.getByTestId('stat-value-Hours This Week').textContent).toBe('0');
    expect(screen.getByTestId('stat-value-Active Courses').textContent).toBe('0');
    expect(screen.getByTestId('stat-value-Overall Progress').textContent).toBe('0%');
  });
});
