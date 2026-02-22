import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock hooks BEFORE importing the component
// ---------------------------------------------------------------------------
const mockUseDashboardData = vi.fn();
vi.mock('../hooks/use-dashboard-data', () => ({
  useDashboardData: (...args: unknown[]) => mockUseDashboardData(...args),
}));

vi.mock('../hooks/use-summary-stats', () => ({
  useSummaryStats: vi.fn(() => ({
    streak: 5,
    hoursThisWeek: 12,
    hoursThisWeekTrend: 'up' as const,
    activeCourseCount: 3,
    overallProgress: 45,
  })),
}));

vi.mock('../hooks/use-todays-plan', () => ({
  useTodaysPlan: vi.fn(() => ({
    planItems: [],
    aiMessage: null,
    isAiGenerated: false,
    isStudyDay: true,
  })),
}));

vi.mock('../hooks/use-recent-activity', () => ({
  useRecentActivity: vi.fn(() => []),
}));

vi.mock('../lib/dashboard-utils', () => ({
  getGreeting: vi.fn(() => 'Good morning'),
  mapCourseToDashboardData: vi.fn((c: { id: string; title: string }) => ({
    id: c.id,
    title: c.title,
    platform: null,
    completedModules: 0,
    totalModules: 10,
    completedHours: 0,
    totalHours: null,
    priority: 2,
    status: 'in_progress',
    riskLevel: null,
    riskScore: null,
    lastStudiedAt: null,
    targetCompletionDate: null,
  })),
  ACHIEVEMENT_NAMES: {
    first_session: 'First Session',
    streak_7: '7-Day Streak',
  },
}));

// Mock child components to isolate DashboardPage
vi.mock('./summary-stats', () => ({
  SummaryStats: () => <div data-testid="summary-stats">SummaryStats</div>,
}));
vi.mock('./todays-plan', () => ({
  TodaysPlan: () => <div data-testid="todays-plan">TodaysPlan</div>,
}));
vi.mock('./course-cards-grid', () => ({
  CourseCardsGrid: () => <div data-testid="course-cards-grid">CourseCardsGrid</div>,
}));
vi.mock('./weekly-report-banner', () => ({
  WeeklyReportBanner: () => <div data-testid="weekly-report-banner">WeeklyReportBanner</div>,
}));
vi.mock('./quick-actions', () => ({
  QuickActions: () => <div data-testid="quick-actions">QuickActions</div>,
}));
vi.mock('./recent-activity-feed', () => ({
  RecentActivityFeed: () => <div data-testid="recent-activity-feed">RecentActivityFeed</div>,
}));
vi.mock('./notification-preview', () => ({
  NotificationPreview: () => <div data-testid="notification-preview">NotificationPreview</div>,
}));
vi.mock('./buddy-activity-sidebar', () => ({
  BuddyActivitySidebar: () => <div data-testid="buddy-activity-sidebar">BuddyActivitySidebar</div>,
}));
vi.mock('./empty-state', () => ({
  EmptyState: ({ displayName }: { displayName: string }) => (
    <div data-testid="empty-state">Empty: {displayName}</div>
  ),
}));

import { DashboardPage } from './dashboard-page';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildMockData(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    profile: {
      display_name: 'Alice',
      avatar_url: null,
      timezone: 'America/New_York',
      daily_study_goal_mins: 60,
      preferred_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    },
    courses: [
      {
        id: 'c1',
        user_id: 'user-1',
        title: 'React 101',
        platform: 'udemy',
        url: null,
        total_modules: 10,
        completed_modules: 3,
        total_hours: null,
        completed_hours: 0,
        target_completion_date: null,
        priority: 1,
        status: 'in_progress',
        notes: null,
        sort_order: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ],
    sessions: [],
    dailyStats: [],
    analyses: [],
    weeklyReport: null,
    notifications: [],
    achievements: [],
    buddyActivity: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton while loading', () => {
    mockUseDashboardData.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<DashboardPage />);

    // The skeleton renders multiple Skeleton elements; none of the real sections appear
    expect(screen.queryByTestId('summary-stats')).toBeNull();
    expect(screen.queryByTestId('todays-plan')).toBeNull();
  });

  it('shows error message when query fails', () => {
    mockUseDashboardData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });

    render(<DashboardPage />);

    expect(screen.getByText('Failed to load dashboard')).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
  });

  it('shows EmptyState when there are no courses', () => {
    mockUseDashboardData.mockReturnValue({
      data: buildMockData({ courses: [] }),
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId('empty-state')).toBeDefined();
    expect(screen.getByText('Empty: Alice')).toBeDefined();
  });

  it('renders all sections when data is available with courses', () => {
    mockUseDashboardData.mockReturnValue({
      data: buildMockData(),
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId('summary-stats')).toBeDefined();
    expect(screen.getByTestId('todays-plan')).toBeDefined();
    expect(screen.getByTestId('course-cards-grid')).toBeDefined();
    expect(screen.getByTestId('weekly-report-banner')).toBeDefined();
    expect(screen.getByTestId('recent-activity-feed')).toBeDefined();
    expect(screen.getByTestId('notification-preview')).toBeDefined();
    expect(screen.getByTestId('buddy-activity-sidebar')).toBeDefined();
    expect(screen.getByTestId('quick-actions')).toBeDefined();
  });

  it('displays greeting and display name in header', () => {
    mockUseDashboardData.mockReturnValue({
      data: buildMockData(),
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    expect(screen.getByText(/Good morning/)).toBeDefined();
    expect(screen.getByText(/, Alice/)).toBeDefined();
  });

  it('does NOT fire achievement toast on initial load', () => {
    const achievements = [
      {
        id: 'a1',
        user_id: 'user-1',
        achievement_type: 'first_session',
        course_id: null,
        metadata: null,
        earned_at: '2025-01-01T00:00:00Z',
        shared: false,
      },
    ];

    mockUseDashboardData.mockReturnValue({
      data: buildMockData({ achievements }),
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('returns null when data is undefined and not loading', () => {
    mockUseDashboardData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { container } = render(<DashboardPage />);
    expect(container.innerHTML).toBe('');
  });

  it('renders formatted date in header', () => {
    mockUseDashboardData.mockReturnValue({
      data: buildMockData(),
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    // The date is formatted as "EEEE, MMMM d, yyyy" — check we have some date text
    // We cannot predict exact date, but it should contain current year
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeDefined();
  });
});
