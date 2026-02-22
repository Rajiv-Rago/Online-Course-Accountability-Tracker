import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock Radix UI Tooltip primitives so content renders inline (no portal / hover required)
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { StreakCalendar } from './streak-calendar';
import type { DailyStat } from '@/lib/types';

const makeStat = (
  date: string,
  totalMinutes: number,
  streakDay: boolean
): DailyStat => ({
  id: `stat-${date}`,
  user_id: 'user-1',
  date,
  total_minutes: totalMinutes,
  session_count: totalMinutes > 0 ? 1 : 0,
  modules_completed: 0,
  courses_studied: [],
  streak_day: streakDay,
  created_at: `${date}T00:00:00Z`,
  updated_at: `${date}T00:00:00Z`,
});

describe('StreakCalendar', () => {
  const today = new Date('2024-06-15');

  it('renders the legend labels', () => {
    render(<StreakCalendar dailyStats={[]} today={today} />);
    expect(screen.getByText('Less')).toBeDefined();
    expect(screen.getByText('More')).toBeDefined();
    expect(screen.getByText('Freeze')).toBeDefined();
  });

  it('renders day labels (Mon, Wed, Fri are visible)', () => {
    render(<StreakCalendar dailyStats={[]} today={today} />);
    // Only odd-index labels are invisible, even-index are visible
    // Labels: Mon(0), Tue(1), Wed(2), Thu(3), Fri(4), Sat(5), Sun(6)
    expect(screen.getByText('Mon')).toBeDefined();
    expect(screen.getByText('Wed')).toBeDefined();
    expect(screen.getByText('Fri')).toBeDefined();
    expect(screen.getByText('Sun')).toBeDefined();
  });

  it('renders grid cells for the 90-day range', () => {
    const { container } = render(<StreakCalendar dailyStats={[]} today={today} />);
    // Each day gets a 3x3 div cell
    const cells = container.querySelectorAll('.h-3.w-3');
    // At least 90 cells should be rendered (plus padding days for week alignment)
    expect(cells.length).toBeGreaterThanOrEqual(90);
  });

  it('renders green intensity for days with study time', () => {
    const stats = [
      makeStat('2024-06-14', 5, false),   // low intensity (< 15min)
      makeStat('2024-06-13', 30, false),  // medium intensity (< 60min)
      makeStat('2024-06-12', 90, false),  // high intensity (>= 60min)
    ];

    const { container } = render(<StreakCalendar dailyStats={stats} today={today} />);
    // Check that green classes are present
    const lowCells = container.querySelectorAll('.bg-emerald-200');
    const medCells = container.querySelectorAll('.bg-emerald-400');
    const highCells = container.querySelectorAll('.bg-emerald-600');
    expect(lowCells.length).toBeGreaterThanOrEqual(1);
    expect(medCells.length).toBeGreaterThanOrEqual(1);
    expect(highCells.length).toBeGreaterThanOrEqual(1);
  });

  it('renders blue for freeze days (streak_day=true, minutes=0)', () => {
    const stats = [makeStat('2024-06-14', 0, true)];
    const { container } = render(<StreakCalendar dailyStats={stats} today={today} />);
    const freezeCells = container.querySelectorAll('.bg-blue-200');
    expect(freezeCells.length).toBeGreaterThanOrEqual(1);
  });

  it('renders muted color for days with no study and no freeze', () => {
    const { container } = render(<StreakCalendar dailyStats={[]} today={today} />);
    const mutedCells = container.querySelectorAll('.bg-muted');
    expect(mutedCells.length).toBeGreaterThan(0);
  });

  it('applies ring to today cell', () => {
    const stats = [makeStat('2024-06-15', 30, false)];
    const { container } = render(<StreakCalendar dailyStats={stats} today={today} />);
    const todayCell = container.querySelector('.ring-1.ring-foreground');
    expect(todayCell).not.toBeNull();
  });

  it('renders tooltip content for days with minutes', () => {
    const stats = [makeStat('2024-06-14', 45, false)];
    render(<StreakCalendar dailyStats={stats} today={today} />);
    // Tooltip content is rendered but hidden; check it is in DOM
    expect(screen.getByText('45 min')).toBeDefined();
    expect(screen.getByText('Jun 14, 2024')).toBeDefined();
  });

  it('shows "Freeze day" in tooltip for freeze days', () => {
    const stats = [makeStat('2024-06-14', 0, true)];
    render(<StreakCalendar dailyStats={stats} today={today} />);
    expect(screen.getByText('Freeze day')).toBeDefined();
  });

  it('shows "No study" in tooltip for days with no data', () => {
    // A day in range with no stat entry
    render(<StreakCalendar dailyStats={[]} today={today} />);
    // Multiple "No study" tooltips exist for empty days
    const noStudyTexts = screen.getAllByText('No study');
    expect(noStudyTexts.length).toBeGreaterThan(0);
  });
});
