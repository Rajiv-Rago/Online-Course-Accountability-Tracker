import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock child components and hooks BEFORE importing
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
    <div data-testid="progress-bar" data-value={value}>{value}%</div>
  ),
}));

vi.mock('./days-remaining-badge', () => ({
  DaysRemainingBadge: ({ targetDate }: { targetDate: string | null }) => (
    <span data-testid="days-badge">{targetDate || 'no date'}</span>
  ),
}));

vi.mock('./course-action-menu', () => ({
  CourseActionMenu: ({ course }: { course: { id: string } }) => (
    <button data-testid="action-menu">Menu {course.id}</button>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { CourseCard } from './course-card';
import type { Course } from '@/lib/types';

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
  notes: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

describe('CourseCard', () => {
  const mockOnSelectChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders course title as a link', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    const link = screen.getByText('React Complete Guide');
    expect(link.closest('a')?.getAttribute('href')).toBe('/courses/course-1');
  });

  it('renders platform icon and label', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByTestId('platform-icon')).toBeDefined();
    expect(screen.getByText('Udemy')).toBeDefined();
  });

  it('renders priority badge', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByTestId('priority-badge')).toBeDefined();
    expect(screen.getByText('P1')).toBeDefined();
  });

  it('renders status badge', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByTestId('status-badge')).toBeDefined();
    expect(screen.getByText('in_progress')).toBeDefined();
  });

  it('renders progress bar with calculated progress', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    const progressBar = screen.getByTestId('progress-bar');
    // 10/29 = ~34%
    expect(progressBar.getAttribute('data-value')).toBe('34');
  });

  it('renders modules count', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByText('10/29 modules')).toBeDefined();
  });

  it('renders hours display when total_hours is set', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByText('8/28 hrs')).toBeDefined();
  });

  it('does not render hours when total_hours is null', () => {
    const courseNoHours = { ...baseCourse, total_hours: null };
    render(<CourseCard course={courseNoHours} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.queryByText(/hrs/)).toBeNull();
  });

  it('shows "?" for modules when total_modules is null', () => {
    const courseNoModules = { ...baseCourse, total_modules: null, completed_modules: 5 };
    render(<CourseCard course={courseNoModules} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByText('5/? modules')).toBeDefined();
  });

  it('renders action menu', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByTestId('action-menu')).toBeDefined();
  });

  it('renders days remaining badge', () => {
    render(<CourseCard course={baseCourse} selected={false} onSelectChange={mockOnSelectChange} />);
    expect(screen.getByTestId('days-badge')).toBeDefined();
  });
});
