import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock dashboard-utils pure functions
vi.mock('../lib/dashboard-utils', () => ({
  calcProgress: vi.fn(
    (completedModules: number, totalModules?: number) =>
      totalModules && totalModules > 0
        ? Math.round((completedModules / totalModules) * 100)
        : 0
  ),
  calcDaysRemaining: vi.fn((targetDate: string | null) => {
    if (!targetDate) return null;
    return 10; // stub return
  }),
  getRiskBadgeVariant: vi.fn((level: string | null) => {
    if (level === 'high' || level === 'critical') return 'destructive';
    if (level === 'medium') return 'secondary';
    return 'outline';
  }),
  formatRelativeTime: vi.fn((ts: string) => `relative(${ts})`),
}));

import { DashboardCourseCard } from './dashboard-course-card';
import type { DashboardCourseData } from '../lib/dashboard-utils';
import { calcDaysRemaining } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCourse(overrides: Partial<DashboardCourseData> = {}): DashboardCourseData {
  return {
    id: 'c1',
    title: 'React Fundamentals',
    platform: 'udemy',
    completedModules: 5,
    totalModules: 20,
    completedHours: 3,
    totalHours: 10,
    priority: 1,
    status: 'in_progress',
    riskLevel: null,
    riskScore: null,
    lastStudiedAt: null,
    targetCompletionDate: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DashboardCourseCard', () => {
  it('renders course title', () => {
    render(<DashboardCourseCard course={makeCourse()} />);

    expect(screen.getByText('React Fundamentals')).toBeDefined();
  });

  it('renders platform name when present', () => {
    render(<DashboardCourseCard course={makeCourse({ platform: 'coursera' })} />);

    expect(screen.getByText('coursera')).toBeDefined();
  });

  it('does NOT render platform when null', () => {
    render(<DashboardCourseCard course={makeCourse({ platform: null })} />);

    expect(screen.queryByText('udemy')).toBeNull();
    expect(screen.queryByText('coursera')).toBeNull();
  });

  it('renders progress percentage', () => {
    render(
      <DashboardCourseCard
        course={makeCourse({ completedModules: 5, totalModules: 20 })}
      />
    );

    // calcProgress(5, 20) = 25
    expect(screen.getByText('25%')).toBeDefined();
  });

  it('renders module count when totalModules is set', () => {
    render(
      <DashboardCourseCard
        course={makeCourse({ completedModules: 5, totalModules: 20 })}
      />
    );

    expect(screen.getByText('5/20 modules')).toBeDefined();
  });

  it('does NOT render module count when totalModules is null', () => {
    render(
      <DashboardCourseCard
        course={makeCourse({ totalModules: null })}
      />
    );

    expect(screen.queryByText(/modules/)).toBeNull();
  });

  it('renders risk level badge when riskLevel is set', () => {
    render(
      <DashboardCourseCard
        course={makeCourse({ riskLevel: 'high' })}
      />
    );

    expect(screen.getByText('high')).toBeDefined();
  });

  it('does NOT render risk badge when riskLevel is null', () => {
    render(<DashboardCourseCard course={makeCourse({ riskLevel: null })} />);

    expect(screen.queryByText('high')).toBeNull();
    expect(screen.queryByText('low')).toBeNull();
  });

  it('renders days remaining when target date is set', () => {
    vi.mocked(calcDaysRemaining).mockReturnValue(10);

    render(
      <DashboardCourseCard
        course={makeCourse({ targetCompletionDate: '2025-07-01' })}
      />
    );

    expect(screen.getByText('10d left')).toBeDefined();
  });

  it('renders "Due today" when days remaining is 0', () => {
    vi.mocked(calcDaysRemaining).mockReturnValue(0);

    render(
      <DashboardCourseCard
        course={makeCourse({ targetCompletionDate: '2025-06-01' })}
      />
    );

    expect(screen.getByText('Due today')).toBeDefined();
  });

  it('does NOT render days remaining when no target date', () => {
    vi.mocked(calcDaysRemaining).mockReturnValue(null);

    render(<DashboardCourseCard course={makeCourse({ targetCompletionDate: null })} />);

    expect(screen.queryByText(/left/)).toBeNull();
    expect(screen.queryByText(/Due today/)).toBeNull();
  });

  it('renders last studied relative time when available', () => {
    render(
      <DashboardCourseCard
        course={makeCourse({ lastStudiedAt: '2025-06-01T10:00:00Z' })}
      />
    );

    expect(screen.getByText('relative(2025-06-01T10:00:00Z)')).toBeDefined();
  });

  it('links card to course detail page', () => {
    render(<DashboardCourseCard course={makeCourse({ id: 'abc-123' })} />);

    const link = screen.getByText('React Fundamentals').closest('a');
    expect(link?.getAttribute('href')).toBe('/courses/abc-123');
  });

  it('has play button linking to timer with course param', () => {
    render(<DashboardCourseCard course={makeCourse({ id: 'abc-123' })} />);

    const playLink = screen.getByRole('link', { name: /Start studying React Fundamentals/i });
    expect(playLink.getAttribute('href')).toBe('/progress/timer?course=abc-123');
  });
});
