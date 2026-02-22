import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Course } from '@/lib/types';

// Mock hooks BEFORE importing
const mockUseCourses = vi.fn();
const mockUseCourseFilters = vi.fn();

vi.mock('../hooks/use-courses', () => ({
  useCourses: (...args: unknown[]) => mockUseCourses(...args),
}));

vi.mock('../hooks/use-course-filters', () => ({
  useCourseFilters: () => mockUseCourseFilters(),
}));

vi.mock('./course-card', () => ({
  CourseCard: ({ course }: { course: Course }) => (
    <div data-testid={`course-card-${course.id}`}>{course.title}</div>
  ),
}));

vi.mock('./course-filters', () => ({
  CourseFilters: () => <div data-testid="course-filters">Filters</div>,
}));

vi.mock('./course-sort', () => ({
  CourseSort: () => <div data-testid="course-sort">Sort</div>,
}));

vi.mock('./bulk-actions-bar', () => ({
  BulkActionsBar: ({ selectedIds }: { selectedIds: Set<string> }) => (
    <div data-testid="bulk-actions">{selectedIds.size} selected</div>
  ),
}));

vi.mock('./course-empty-state', () => ({
  CourseEmptyState: () => <div data-testid="empty-state">No courses yet</div>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CourseList } from './course-list';

const makeCourse = (id: string, title: string): Course => ({
  id,
  user_id: 'user-1',
  title,
  platform: 'udemy',
  url: null,
  total_modules: 10,
  completed_modules: 3,
  total_hours: 20,
  completed_hours: 5,
  target_completion_date: null,
  priority: 2,
  status: 'in_progress',
  notes: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
});

describe('CourseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseFilters.mockReturnValue({
      filters: { status: 'all', priority: 'all', platform: 'all' },
      setFilter: vi.fn(),
      clearFilters: vi.fn(),
      hasActiveFilters: false,
    });
  });

  it('renders page heading "My Courses"', () => {
    mockUseCourses.mockReturnValue({
      data: [makeCourse('1', 'Course A'), makeCourse('2', 'Course B')],
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    expect(screen.getByText('My Courses')).toBeDefined();
  });

  it('shows course count when courses are loaded', () => {
    mockUseCourses.mockReturnValue({
      data: [makeCourse('1', 'Course A'), makeCourse('2', 'Course B')],
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    expect(screen.getByText('2 courses')).toBeDefined();
  });

  it('shows singular "course" when there is exactly one', () => {
    mockUseCourses.mockReturnValue({
      data: [makeCourse('1', 'Course A')],
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    expect(screen.getByText('1 course')).toBeDefined();
  });

  it('renders "Add Course" link', () => {
    mockUseCourses.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    const link = screen.getByText('Add Course');
    expect(link.closest('a')?.getAttribute('href')).toBe('/courses/new');
  });

  it('renders loading skeletons when loading', () => {
    mockUseCourses.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<CourseList />);
    // Skeletons are rendered (6 of them from Suspense fallback + 6 from CourseListContent)
    // The heading should still show
    expect(screen.getByText('My Courses')).toBeDefined();
  });

  it('renders error message when query fails', () => {
    mockUseCourses.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });

    render(<CourseList />);
    expect(screen.getByText('Failed to load courses')).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
  });

  it('renders empty state when courses array is empty', () => {
    mockUseCourses.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    expect(screen.getByTestId('empty-state')).toBeDefined();
  });

  it('renders course cards when courses exist', () => {
    const courses = [makeCourse('1', 'Course A'), makeCourse('2', 'Course B')];
    mockUseCourses.mockReturnValue({
      data: courses,
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    expect(screen.getByTestId('course-card-1')).toBeDefined();
    expect(screen.getByTestId('course-card-2')).toBeDefined();
  });

  it('renders filter and sort components', () => {
    mockUseCourses.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<CourseList />);
    expect(screen.getByTestId('course-filters')).toBeDefined();
    expect(screen.getByTestId('course-sort')).toBeDefined();
  });
});
