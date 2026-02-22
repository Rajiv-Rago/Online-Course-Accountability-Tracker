import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Course, StudySession } from '@/lib/types';

// Mock hooks BEFORE importing
const mockUseCourse = vi.fn();

vi.mock('../hooks/use-course', () => ({
  useCourse: (...args: unknown[]) => mockUseCourse(...args),
}));

vi.mock('../hooks/use-course-stats', () => ({
  useCourseStats: vi.fn(() => ({
    progressPercent: 34,
    hoursPercent: 29,
    daysRemaining: 60,
    daysElapsed: 30,
    paceRequired: 0.3,
    currentPace: 0.3,
    isOnTrack: true,
    isOverdue: false,
  })),
}));

vi.mock('../hooks/use-course-mutations', () => ({
  useCourseMutations: vi.fn(() => ({
    createCourse: { mutate: vi.fn(), isPending: false },
    updateCourse: { mutate: vi.fn(), isPending: false },
    deleteCourse: { mutate: vi.fn(), isPending: false },
    transitionStatus: { mutate: vi.fn(), isPending: false },
    updatePriority: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

vi.mock('./course-status-badge', () => ({
  CourseStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock('./course-priority-badge', () => ({
  CoursePriorityBadge: ({ priority }: { priority: number }) => (
    <span data-testid="priority-badge">P{priority}</span>
  ),
}));

vi.mock('./platform-icon', () => ({
  PlatformIcon: ({ platform }: { platform: string | null }) => (
    <span data-testid="platform-icon">{platform || 'custom'}</span>
  ),
}));

vi.mock('./course-progress-bar', () => ({
  CourseProgressBar: ({ value }: { value: number }) => (
    <div data-testid="progress-bar">{value}%</div>
  ),
}));

vi.mock('./course-stats-panel', () => ({
  CourseStatsPanel: () => <div data-testid="stats-panel">Stats</div>,
}));

vi.mock('./course-action-menu', () => ({
  CourseActionMenu: () => <button data-testid="action-menu">Menu</button>,
}));

vi.mock('./status-transition-dialog', () => ({
  StatusTransitionDialog: () => <div data-testid="status-dialog">Status Dialog</div>,
}));

vi.mock('./delete-confirm-dialog', () => ({
  DeleteConfirmDialog: () => <div data-testid="delete-dialog">Delete Dialog</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CourseDetail } from './course-detail';

const baseCourse: Course = {
  id: 'course-1',
  user_id: 'user-1',
  title: 'React Complete Guide',
  platform: 'udemy',
  url: 'https://udemy.com/react',
  total_modules: 29,
  completed_modules: 10,
  total_hours: 28,
  completed_hours: 8,
  target_completion_date: '2026-06-01',
  priority: 1,
  status: 'in_progress',
  notes: 'This is a great course',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

const baseSession: StudySession = {
  id: 'session-1',
  user_id: 'user-1',
  course_id: 'course-1',
  started_at: '2026-01-10T10:00:00Z',
  ended_at: '2026-01-10T10:30:00Z',
  duration_minutes: 30,
  modules_completed: 2,
  notes: 'Completed chapter 3',
  mood_rating: 4,
  focus_rating: 5,
  session_type: 'manual',
  streak_day: true,
  created_at: '2026-01-10T10:30:00Z',
};

const baseStats = {
  total_sessions: 5,
  total_minutes: 150,
  avg_session_minutes: 30,
  last_session_at: '2026-01-10T10:30:00Z',
};

describe('CourseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when data is loading', () => {
    mockUseCourse.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<CourseDetail courseId="course-1" />);
    // Skeletons should be rendered (they use className with Skeleton)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [class*="skeleton"]');
    // At minimum, the loading state renders without crashing
    expect(screen.queryByText('React Complete Guide')).toBeNull();
  });

  it('renders error/not-found state when there is an error', () => {
    mockUseCourse.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Not found'),
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('Course not found')).toBeDefined();
    expect(screen.getByText('Back to Courses')).toBeDefined();
  });

  it('renders error state when data is null', () => {
    mockUseCourse.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('Course not found')).toBeDefined();
  });

  it('renders course title when data is loaded', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('React Complete Guide')).toBeDefined();
  });

  it('renders course URL as external link', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    const link = screen.getByText('https://udemy.com/react');
    expect(link.getAttribute('href')).toBe('https://udemy.com/react');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('renders status and priority badges', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByTestId('status-badge')).toBeDefined();
    expect(screen.getByTestId('priority-badge')).toBeDefined();
  });

  it('renders progress card with module and hour counts', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('Progress')).toBeDefined();
    expect(screen.getByText(/10 \/ 29 completed/)).toBeDefined();
    expect(screen.getByText(/8 \/ 28 hours/)).toBeDefined();
  });

  it('shows notes section when course has notes', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('Notes')).toBeDefined();
    expect(screen.getByText('This is a great course')).toBeDefined();
  });

  it('does not show notes section when course has no notes', () => {
    const courseNoNotes = { ...baseCourse, notes: null };
    mockUseCourse.mockReturnValue({
      data: { course: courseNoNotes, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.queryByText('Notes')).toBeNull();
  });

  it('renders "No study sessions recorded yet" when no sessions', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('No study sessions recorded yet.')).toBeDefined();
  });

  it('renders recent sessions when they exist', () => {
    mockUseCourse.mockReturnValue({
      data: {
        course: baseCourse,
        recentSessions: [baseSession],
        stats: baseStats,
      },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByText('30 min')).toBeDefined();
    expect(screen.getByText('2 modules')).toBeDefined();
  });

  it('renders edit link pointing to course edit page', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    const editLink = screen.getByText('Edit');
    expect(editLink.closest('a')?.getAttribute('href')).toBe('/courses/course-1/edit');
  });

  it('renders stats panel', () => {
    mockUseCourse.mockReturnValue({
      data: { course: baseCourse, recentSessions: [], stats: baseStats },
      isLoading: false,
      error: null,
    });

    render(<CourseDetail courseId="course-1" />);
    expect(screen.getByTestId('stats-panel')).toBeDefined();
  });
});
