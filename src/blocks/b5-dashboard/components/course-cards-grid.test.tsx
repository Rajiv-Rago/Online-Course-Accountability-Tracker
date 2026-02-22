import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock DashboardCourseCard to isolate CourseCardsGrid
vi.mock('./dashboard-course-card', () => ({
  DashboardCourseCard: ({ course }: { course: { id: string; title: string } }) => (
    <div data-testid={`course-card-${course.id}`}>{course.title}</div>
  ),
}));

import { CourseCardsGrid } from './course-cards-grid';
import type { DashboardCourseData } from '../lib/dashboard-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCourse(
  id: string,
  title: string,
  status: string = 'in_progress'
): DashboardCourseData {
  return {
    id,
    title,
    platform: null,
    completedModules: 0,
    totalModules: 10,
    completedHours: 0,
    totalHours: null,
    priority: 2,
    status,
    riskLevel: null,
    riskScore: null,
    lastStudiedAt: null,
    targetCompletionDate: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CourseCardsGrid', () => {
  it('renders active courses by default', () => {
    const courses = [
      makeCourse('c1', 'React 101', 'in_progress'),
      makeCourse('c2', 'Node Basics', 'not_started'),
      makeCourse('c3', 'Completed Course', 'completed'),
    ];

    render(<CourseCardsGrid courses={courses} />);

    expect(screen.getByTestId('course-card-c1')).toBeDefined();
    expect(screen.getByTestId('course-card-c2')).toBeDefined();
    expect(screen.queryByTestId('course-card-c3')).toBeNull();
  });

  it('shows "Show all" toggle with total count when there are non-active courses', () => {
    const courses = [
      makeCourse('c1', 'Active', 'in_progress'),
      makeCourse('c2', 'Done', 'completed'),
    ];

    render(<CourseCardsGrid courses={courses} />);

    expect(screen.getByText('Show all (2)')).toBeDefined();
  });

  it('does NOT show toggle when all courses are active', () => {
    const courses = [
      makeCourse('c1', 'Active 1', 'in_progress'),
      makeCourse('c2', 'Active 2', 'not_started'),
    ];

    render(<CourseCardsGrid courses={courses} />);

    expect(screen.queryByText(/Show all/)).toBeNull();
    expect(screen.queryByText(/Active only/)).toBeNull();
  });

  it('toggles between active and all courses', () => {
    const courses = [
      makeCourse('c1', 'Active', 'in_progress'),
      makeCourse('c2', 'Paused', 'paused'),
      makeCourse('c3', 'Done', 'completed'),
    ];

    render(<CourseCardsGrid courses={courses} />);

    // Initially only active courses shown
    expect(screen.getByTestId('course-card-c1')).toBeDefined();
    expect(screen.queryByTestId('course-card-c2')).toBeNull();
    expect(screen.queryByTestId('course-card-c3')).toBeNull();

    // Click "Show all"
    fireEvent.click(screen.getByText('Show all (3)'));

    // All courses visible
    expect(screen.getByTestId('course-card-c1')).toBeDefined();
    expect(screen.getByTestId('course-card-c2')).toBeDefined();
    expect(screen.getByTestId('course-card-c3')).toBeDefined();

    // Toggle text changes to "Active only"
    expect(screen.getByText('Active only')).toBeDefined();
  });

  it('toggles back to active-only view', () => {
    const courses = [
      makeCourse('c1', 'Active', 'in_progress'),
      makeCourse('c2', 'Done', 'completed'),
    ];

    render(<CourseCardsGrid courses={courses} />);

    // Show all
    fireEvent.click(screen.getByText('Show all (2)'));
    expect(screen.getByTestId('course-card-c2')).toBeDefined();

    // Back to active only
    fireEvent.click(screen.getByText('Active only'));
    expect(screen.queryByTestId('course-card-c2')).toBeNull();
  });

  it('renders "Add Course" link pointing to /courses/new', () => {
    render(<CourseCardsGrid courses={[]} />);

    const addLink = screen.getByText('Add Course');
    expect(addLink.closest('a')?.getAttribute('href')).toBe('/courses/new');
  });

  it('shows empty state when no active courses exist', () => {
    const courses = [makeCourse('c1', 'Done', 'completed')];

    render(<CourseCardsGrid courses={courses} />);

    expect(screen.getByText(/No active courses/)).toBeDefined();
    expect(screen.getByText(/Add a course to get started/)).toBeDefined();
  });

  it('shows empty state when courses array is empty', () => {
    render(<CourseCardsGrid courses={[]} />);

    expect(screen.getByText(/No active courses/)).toBeDefined();
  });

  it('renders the "Courses" heading', () => {
    render(<CourseCardsGrid courses={[makeCourse('c1', 'React', 'in_progress')]} />);

    expect(screen.getByText('Courses')).toBeDefined();
  });
});
