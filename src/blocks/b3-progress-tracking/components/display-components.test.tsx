import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock the daily stats hook
vi.mock('../hooks/use-daily-stats', () => ({
  useDailyStats: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
}));

import { DailyStatsSummary } from './daily-stats-summary';
import { WeeklyStatsSummary } from './weekly-stats-summary';
import { useDailyStats } from '../hooks/use-daily-stats';

// ---------- DailyStatsSummary ----------

describe('DailyStatsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons when isLoading is true', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(<DailyStatsSummary />);
    const skeletons = container.querySelectorAll('.h-24');
    expect(skeletons.length).toBe(3);
  });

  it('renders today minutes, sessions, and modules', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: {
          id: 'stat-1',
          user_id: 'user-1',
          date: '2024-06-15',
          total_minutes: 45,
          session_count: 3,
          modules_completed: 5,
          courses_studied: [],
          streak_day: true,
          created_at: '2024-06-15T00:00:00Z',
          updated_at: '2024-06-15T23:00:00Z',
        },
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        lastWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        comparison: { minutesDelta: 0, sessionsDelta: 0, activeDaysDelta: 0 },
        dailyGoalMinutes: 60,
        goalProgress: 0.75,
      },
      isLoading: false,
    } as any);

    render(<DailyStatsSummary />);
    expect(screen.getByText('45m')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Today')).toBeDefined();
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.getByText('Modules')).toBeDefined();
  });

  it('renders daily goal progress bar', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: {
          id: 'stat-1',
          user_id: 'user-1',
          date: '2024-06-15',
          total_minutes: 30,
          session_count: 1,
          modules_completed: 0,
          courses_studied: [],
          streak_day: false,
          created_at: '2024-06-15T00:00:00Z',
          updated_at: '2024-06-15T23:00:00Z',
        },
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        lastWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        comparison: { minutesDelta: 0, sessionsDelta: 0, activeDaysDelta: 0 },
        dailyGoalMinutes: 60,
        goalProgress: 0.5,
      },
      isLoading: false,
    } as any);

    render(<DailyStatsSummary />);
    expect(screen.getByText('Daily Goal')).toBeDefined();
    expect(screen.getByText(/50%/)).toBeDefined();
  });

  it('shows 0m when no today stats exist', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: null,
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        lastWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        comparison: { minutesDelta: 0, sessionsDelta: 0, activeDaysDelta: 0 },
        dailyGoalMinutes: 60,
        goalProgress: 0,
      },
      isLoading: false,
    } as any);

    render(<DailyStatsSummary />);
    expect(screen.getByText('0m')).toBeDefined();
    expect(screen.getByText(/0%/)).toBeDefined();
  });

  it('formats hours correctly for 90 minutes', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: {
          id: 'stat-1',
          user_id: 'user-1',
          date: '2024-06-15',
          total_minutes: 90,
          session_count: 2,
          modules_completed: 1,
          courses_studied: [],
          streak_day: true,
          created_at: '2024-06-15T00:00:00Z',
          updated_at: '2024-06-15T23:00:00Z',
        },
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        lastWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        comparison: { minutesDelta: 0, sessionsDelta: 0, activeDaysDelta: 0 },
        dailyGoalMinutes: 60,
        goalProgress: 1.5,
      },
      isLoading: false,
    } as any);

    render(<DailyStatsSummary />);
    expect(screen.getByText('1h 30m')).toBeDefined();
  });
});

// ---------- WeeklyStatsSummary ----------

describe('WeeklyStatsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = render(<WeeklyStatsSummary />);
    const skeletons = container.querySelectorAll('[class*="h-"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders "This Week" title', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: null,
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 120,
          totalSessions: 5,
          activeDays: 3,
          avgSessionMinutes: 24,
          coursesStudied: [],
          modulesCompleted: 4,
        },
        lastWeekAggregate: {
          totalMinutes: 100,
          totalSessions: 4,
          activeDays: 2,
          avgSessionMinutes: 25,
          coursesStudied: [],
          modulesCompleted: 3,
        },
        comparison: { minutesDelta: 20, sessionsDelta: 25, activeDaysDelta: 50 },
        dailyGoalMinutes: 60,
        goalProgress: 0,
      },
      isLoading: false,
    } as any);

    render(<WeeklyStatsSummary />);
    expect(screen.getByText('This Week')).toBeDefined();
  });

  it('renders total study time, sessions, active days, and avg session', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: null,
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 120,
          totalSessions: 5,
          activeDays: 3,
          avgSessionMinutes: 24,
          coursesStudied: [],
          modulesCompleted: 4,
        },
        lastWeekAggregate: {
          totalMinutes: 100,
          totalSessions: 4,
          activeDays: 2,
          avgSessionMinutes: 25,
          coursesStudied: [],
          modulesCompleted: 3,
        },
        comparison: { minutesDelta: 20, sessionsDelta: 25, activeDaysDelta: 50 },
        dailyGoalMinutes: 60,
        goalProgress: 0,
      },
      isLoading: false,
    } as any);

    render(<WeeklyStatsSummary />);
    expect(screen.getByText('2h')).toBeDefined(); // 120 min = 2h
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Total study time')).toBeDefined();
    expect(screen.getByText('Sessions')).toBeDefined();
    expect(screen.getByText('Active days')).toBeDefined();
    expect(screen.getByText('Avg session')).toBeDefined();
  });

  it('renders comparison text with positive delta', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: null,
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 120,
          totalSessions: 5,
          activeDays: 3,
          avgSessionMinutes: 24,
          coursesStudied: [],
          modulesCompleted: 4,
        },
        lastWeekAggregate: {
          totalMinutes: 100,
          totalSessions: 4,
          activeDays: 2,
          avgSessionMinutes: 25,
          coursesStudied: [],
          modulesCompleted: 3,
        },
        comparison: { minutesDelta: 20, sessionsDelta: 25, activeDaysDelta: 50 },
        dailyGoalMinutes: 60,
        goalProgress: 0,
      },
      isLoading: false,
    } as any);

    render(<WeeklyStatsSummary />);
    expect(screen.getByText('+20%')).toBeDefined();
    expect(screen.getByText('vs last week')).toBeDefined();
  });

  it('renders comparison text with negative delta', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: null,
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 80,
          totalSessions: 3,
          activeDays: 2,
          avgSessionMinutes: 27,
          coursesStudied: [],
          modulesCompleted: 2,
        },
        lastWeekAggregate: {
          totalMinutes: 120,
          totalSessions: 5,
          activeDays: 4,
          avgSessionMinutes: 24,
          coursesStudied: [],
          modulesCompleted: 4,
        },
        comparison: { minutesDelta: -33, sessionsDelta: -40, activeDaysDelta: -50 },
        dailyGoalMinutes: 60,
        goalProgress: 0,
      },
      isLoading: false,
    } as any);

    render(<WeeklyStatsSummary />);
    expect(screen.getByText('-33%')).toBeDefined();
    expect(screen.getByText('vs last week')).toBeDefined();
  });

  it('renders daily bar chart with day labels', () => {
    vi.mocked(useDailyStats).mockReturnValue({
      data: {
        today: null,
        thisWeek: [],
        lastWeek: [],
        thisWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        lastWeekAggregate: {
          totalMinutes: 0,
          totalSessions: 0,
          activeDays: 0,
          avgSessionMinutes: 0,
          coursesStudied: [],
          modulesCompleted: 0,
        },
        comparison: { minutesDelta: 0, sessionsDelta: 0, activeDaysDelta: 0 },
        dailyGoalMinutes: 60,
        goalProgress: 0,
      },
      isLoading: false,
    } as any);

    render(<WeeklyStatsSummary />);
    // Day labels show single character: M, T, W, T, F, S, S
    expect(screen.getByText('M')).toBeDefined();
    expect(screen.getByText('W')).toBeDefined();
    expect(screen.getByText('F')).toBeDefined();
  });
});
