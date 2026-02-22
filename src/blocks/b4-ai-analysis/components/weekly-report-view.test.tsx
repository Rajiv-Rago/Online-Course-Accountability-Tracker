import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock hooks BEFORE importing the component
// ---------------------------------------------------------------------------

vi.mock('../hooks/use-weekly-report', () => ({
  useWeeklyReport: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useWeeklyReportDates: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock('./analysis-loading', () => ({
  AnalysisLoadingDetail: () => <div data-testid="loading-detail">Loading...</div>,
}));

// ---------------------------------------------------------------------------
// Import component & hooks after mocks
// ---------------------------------------------------------------------------

import { WeeklyReportView } from './weekly-report-view';
import { useWeeklyReport, useWeeklyReportDates } from '../hooks/use-weekly-report';
import type { WeeklyReport } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<WeeklyReport> = {}): WeeklyReport {
  return {
    id: 'wr-1',
    user_id: 'u-1',
    week_start: '2026-02-16',
    week_end: '2026-02-22',
    total_minutes: 420,
    total_sessions: 12,
    total_modules: 8,
    courses_summary: null,
    ai_summary: null,
    highlights: null,
    recommendations: null,
    streak_length: 5,
    compared_to_previous: null,
    created_at: '2026-02-22T03:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeeklyReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: null,
      isLoading: false,
    } as any);
    vi.mocked(useWeeklyReportDates).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('shows loading skeleton when dates are loading', () => {
    vi.mocked(useWeeklyReportDates).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByTestId('loading-detail')).toBeDefined();
  });

  it('shows loading skeleton when report is loading', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByTestId('loading-detail')).toBeDefined();
  });

  it('shows empty state when no report exists', () => {
    render(<WeeklyReportView />);
    expect(screen.getByText('No Weekly Reports Yet')).toBeDefined();
    expect(screen.getByText(/Weekly reports are generated automatically/)).toBeDefined();
  });

  it('renders stats grid with study time, sessions, modules, and streak', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({ total_minutes: 420, total_sessions: 12, total_modules: 8, streak_length: 5 }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('7h')).toBeDefined(); // 420/60 = 7
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('5d')).toBeDefined();
    expect(screen.getByText('Total study time')).toBeDefined();
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.getByText('Modules')).toBeDefined();
    expect(screen.getByText('Streak')).toBeDefined();
  });

  it('shows trend badge in streak card when trend is up', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        compared_to_previous: { minutes_diff: 60, sessions_diff: 3, trend: 'up' },
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('Up')).toBeDefined();
  });

  it('shows trend badge for down trend', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        compared_to_previous: { minutes_diff: -60, sessions_diff: -2, trend: 'down' },
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('Down')).toBeDefined();
  });

  it('shows week comparison card with positive diffs', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        compared_to_previous: { minutes_diff: 120, sessions_diff: 5, trend: 'up' },
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('vs Previous Week')).toBeDefined();
    expect(screen.getByText('+120 min')).toBeDefined();
    expect(screen.getByText('+5')).toBeDefined();
  });

  it('shows week comparison card with negative diffs', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        compared_to_previous: { minutes_diff: -45, sessions_diff: -2, trend: 'down' },
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('-45 min')).toBeDefined();
    expect(screen.getByText('-2')).toBeDefined();
  });

  it('hides comparison card when no previous comparison data', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({ compared_to_previous: null }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.queryByText('vs Previous Week')).toBeNull();
  });

  it('renders AI summary when available', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({ ai_summary: 'You had an excellent study week!' }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('AI Summary')).toBeDefined();
    expect(screen.getByText('You had an excellent study week!')).toBeDefined();
  });

  it('renders courses summary when available', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        courses_summary: [
          { course_id: 'c-1', title: 'React Course', minutes: 180, sessions: 5, modules: 3 },
          { course_id: 'c-2', title: 'Node Course', minutes: 120, sessions: 4, modules: 2 },
        ],
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('Courses Studied')).toBeDefined();
    expect(screen.getByText('React Course')).toBeDefined();
    expect(screen.getByText('Node Course')).toBeDefined();
  });

  it('renders highlights when available', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        highlights: ['Completed 3 modules', 'Maintained 5-day streak'],
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('Highlights')).toBeDefined();
    expect(screen.getByText('Completed 3 modules')).toBeDefined();
    expect(screen.getByText('Maintained 5-day streak')).toBeDefined();
  });

  it('renders recommendations when available', () => {
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport({
        recommendations: [
          { type: 'schedule', message: 'Study in the morning for best results' },
          { type: 'goal', message: 'Increase daily goal to 90 minutes' },
        ],
      }),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('Recommendations')).toBeDefined();
    expect(screen.getByText('schedule')).toBeDefined();
    expect(screen.getByText('Study in the morning for best results')).toBeDefined();
    expect(screen.getByText('goal')).toBeDefined();
    expect(screen.getByText('Increase daily goal to 90 minutes')).toBeDefined();
  });

  it('renders week navigation buttons when multiple dates exist', () => {
    vi.mocked(useWeeklyReportDates).mockReturnValue({
      data: ['2026-02-16', '2026-02-09', '2026-02-02'],
      isLoading: false,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport(),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    expect(screen.getByText('2026-02-16')).toBeDefined();
    expect(screen.getByText('2026-02-09')).toBeDefined();
    expect(screen.getByText('2026-02-02')).toBeDefined();
  });

  it('does not render navigation when only one date', () => {
    vi.mocked(useWeeklyReportDates).mockReturnValue({
      data: ['2026-02-16'],
      isLoading: false,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport(),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    // With only 1 date, the navigation buttons should not render
    expect(screen.queryByText('2026-02-16')).toBeNull();
  });

  it('clicking a week date button calls useWeeklyReport with that date', () => {
    vi.mocked(useWeeklyReportDates).mockReturnValue({
      data: ['2026-02-16', '2026-02-09'],
      isLoading: false,
    } as any);
    vi.mocked(useWeeklyReport).mockReturnValue({
      data: makeReport(),
      isLoading: false,
    } as any);
    render(<WeeklyReportView />);
    fireEvent.click(screen.getByText('2026-02-09'));
    // After clicking, the component re-renders and calls useWeeklyReport with the selected date
    // The mock will be called with the new selectedWeek value
    expect(useWeeklyReport).toHaveBeenCalledWith('2026-02-09');
  });
});
