import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const mockApplyFreezeMutate = vi.fn();

vi.mock('../hooks/use-streak', () => ({
  useStreak: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    applyFreeze: {
      mutate: mockApplyFreezeMutate,
      isPending: false,
    },
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../actions/stats-actions', () => ({
  fetchDailyStats: vi.fn(),
  fetchStreakData: vi.fn(),
  applyStreakFreeze: vi.fn(),
  fetchTodayStats: vi.fn(),
}));

vi.mock('./streak-calendar', () => ({
  StreakCalendar: ({ dailyStats, today }: { dailyStats: any[]; today: Date }) => (
    <div data-testid="streak-calendar" data-count={dailyStats.length}>
      Streak Calendar
    </div>
  ),
}));

vi.mock('./streak-freeze-button', () => ({
  StreakFreezeButton: ({
    freezeCount,
    onFreeze,
    isLoading,
  }: {
    freezeCount: number;
    onFreeze: () => void;
    isLoading: boolean;
  }) => (
    <div data-testid="streak-freeze-button" data-count={freezeCount}>
      <button onClick={onFreeze} data-testid="freeze-btn">
        Use Freeze ({freezeCount})
      </button>
    </div>
  ),
}));

import { StreakDisplay } from './streak-display';
import { useStreak } from '../hooks/use-streak';
import { useQuery } from '@tanstack/react-query';

describe('StreakDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when isLoading is true', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    const { container } = render(<StreakDisplay />);
    // The skeleton renders h-6 and h-40 elements
    const skeletons = container.querySelectorAll('[class*="h-"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders streak title when loaded', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 5,
        longestStreak: 10,
        freezeCount: 2,
        lastStudyDate: '2024-06-01',
        isStudiedToday: true,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    expect(screen.getByText('Streak')).toBeDefined();
  });

  it('displays current streak count', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 7,
        longestStreak: 14,
        freezeCount: 3,
        lastStudyDate: '2024-06-01',
        isStudiedToday: true,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('Current')).toBeDefined();
  });

  it('displays longest streak count', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 7,
        longestStreak: 14,
        freezeCount: 3,
        lastStudyDate: '2024-06-01',
        isStudiedToday: true,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    expect(screen.getByText('14')).toBeDefined();
    expect(screen.getByText('Longest')).toBeDefined();
  });

  it('displays freeze count', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 7,
        longestStreak: 14,
        freezeCount: 3,
        lastStudyDate: '2024-06-01',
        isStudiedToday: true,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('Freezes')).toBeDefined();
  });

  it('shows 0 for all stats when data has zeroes', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 0,
        longestStreak: 0,
        freezeCount: 0,
        lastStudyDate: null,
        isStudiedToday: false,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBe(3);
  });

  it('shows freeze button when user has not studied today', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 5,
        longestStreak: 10,
        freezeCount: 2,
        lastStudyDate: '2024-06-01',
        isStudiedToday: false,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    expect(screen.getByTestId('streak-freeze-button')).toBeDefined();
  });

  it('hides freeze button when user has studied today', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 5,
        longestStreak: 10,
        freezeCount: 2,
        lastStudyDate: '2024-06-01',
        isStudiedToday: true,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    expect(screen.queryByTestId('streak-freeze-button')).toBeNull();
  });

  it('renders streak calendar when calendarStats are available', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: {
        currentStreak: 5,
        longestStreak: 10,
        freezeCount: 2,
        lastStudyDate: '2024-06-01',
        isStudiedToday: true,
        dailyGoalMinutes: 60,
      },
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    // Make useQuery return calendar data
    vi.mocked(useQuery).mockReturnValue({
      data: [{ date: '2024-06-01', total_minutes: 30, streak_day: true }],
      isLoading: false,
    });

    render(<StreakDisplay />);
    expect(screen.getByTestId('streak-calendar')).toBeDefined();
  });

  it('defaults to 0 when streak data fields are null', () => {
    vi.mocked(useStreak).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      applyFreeze: { mutate: mockApplyFreezeMutate, isPending: false } as any,
    });

    render(<StreakDisplay />);
    // When data is null, ?? 0 fallback ensures 0s are displayed
    const zeroes = screen.getAllByText('0');
    expect(zeroes.length).toBe(3);
  });
});
