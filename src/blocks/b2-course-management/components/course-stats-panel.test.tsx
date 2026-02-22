import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Course } from '@/lib/types';
import { format } from 'date-fns';

// Mock hooks BEFORE importing
vi.mock('../hooks/use-course-stats', () => ({
  useCourseStats: vi.fn(() => ({
    progressPercent: 34,
    hoursPercent: 29,
    daysRemaining: 60,
    daysElapsed: 30,
    paceRequired: 0.7,
    currentPace: 0.3,
    isOnTrack: false,
    isOverdue: false,
  })),
}));

import { CourseStatsPanel } from './course-stats-panel';
import { useCourseStats } from '../hooks/use-course-stats';

const baseCourse: Course = {
  id: 'course-1',
  user_id: 'user-1',
  title: 'React Complete Guide',
  platform: 'udemy',
  url: null,
  total_modules: 29,
  completed_modules: 10,
  total_hours: 28,
  completed_hours: 8,
  target_completion_date: '2026-06-01',
  priority: 2,
  status: 'in_progress',
  notes: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

const baseSessionStats = {
  total_sessions: 5,
  total_minutes: 150,
  avg_session_minutes: 30,
  last_session_at: '2026-01-10T10:30:00Z',
};

// Compute expected formatted dates using same logic as the component
// to avoid timezone-related flakiness
const expectedStartDate = format(new Date(baseCourse.created_at), 'MMM d, yyyy');
const expectedTargetDate = format(new Date(baseCourse.target_completion_date!), 'MMM d, yyyy');

describe('CourseStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCourseStats).mockReturnValue({
      progressPercent: 34,
      hoursPercent: 29,
      daysRemaining: 60,
      daysElapsed: 30,
      paceRequired: 0.7,
      currentPace: 0.3,
      isOnTrack: false,
      isOverdue: false,
    } as any);
  });

  it('renders "Stats" heading', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Stats')).toBeDefined();
  });

  it('shows total sessions when sessionStats is provided', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Total Sessions')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('shows total time in hours', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Total Time')).toBeDefined();
    // 150 min / 60 = 2.5 hrs
    expect(screen.getByText('2.5 hrs')).toBeDefined();
  });

  it('shows average session minutes', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Avg Session')).toBeDefined();
    expect(screen.getByText('30 min')).toBeDefined();
  });

  it('does not show session stats when sessionStats is undefined', () => {
    render(<CourseStatsPanel course={baseCourse} />);
    expect(screen.queryByText('Total Sessions')).toBeNull();
    expect(screen.queryByText('Total Time')).toBeNull();
  });

  it('shows "Started" date from course.created_at', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Started')).toBeDefined();
    expect(screen.getByText(expectedStartDate)).toBeDefined();
  });

  it('shows target date when set', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Target')).toBeDefined();
    expect(screen.getByText(expectedTargetDate)).toBeDefined();
  });

  it('does not show target date when not set', () => {
    const courseNoTarget = { ...baseCourse, target_completion_date: null };
    vi.mocked(useCourseStats).mockReturnValue({
      progressPercent: 34,
      hoursPercent: 29,
      daysRemaining: null,
      daysElapsed: 30,
      paceRequired: null,
      currentPace: 0.3,
      isOnTrack: null,
      isOverdue: false,
    } as any);

    render(<CourseStatsPanel course={courseNoTarget} />);
    expect(screen.queryByText('Target')).toBeNull();
  });

  it('shows days remaining', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Days Left')).toBeDefined();
    expect(screen.getByText('60')).toBeDefined();
  });

  it('shows days elapsed', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Days Elapsed')).toBeDefined();
  });

  it('shows pace required and "Behind Schedule" when not on track', () => {
    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('Pace Needed')).toBeDefined();
    expect(screen.getByText('0.7 hrs/day')).toBeDefined();
    expect(screen.getByText('Behind Schedule')).toBeDefined();
  });

  it('shows "On Track" when isOnTrack is true', () => {
    vi.mocked(useCourseStats).mockReturnValue({
      progressPercent: 50,
      hoursPercent: 50,
      daysRemaining: 60,
      daysElapsed: 30,
      paceRequired: 0.3,
      currentPace: 0.5,
      isOnTrack: true,
      isOverdue: false,
    } as any);

    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('On Track')).toBeDefined();
  });

  it('shows overdue indicator when days remaining is negative', () => {
    vi.mocked(useCourseStats).mockReturnValue({
      progressPercent: 34,
      hoursPercent: 29,
      daysRemaining: -5,
      daysElapsed: 90,
      paceRequired: null,
      currentPace: 0.1,
      isOnTrack: null,
      isOverdue: true,
    } as any);

    render(<CourseStatsPanel course={baseCourse} sessionStats={baseSessionStats} />);
    expect(screen.getByText('5 overdue')).toBeDefined();
  });
});
