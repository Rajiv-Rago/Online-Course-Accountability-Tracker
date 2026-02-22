import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Course } from '@/lib/types';

// Mock hooks and child components BEFORE importing
const mockTransitionMutate = vi.fn();
const mockPriorityMutate = vi.fn();

vi.mock('../hooks/use-course-mutations', () => ({
  useCourseMutations: vi.fn(() => ({
    transitionStatus: { mutate: mockTransitionMutate, isPending: false },
    updatePriority: { mutate: mockPriorityMutate, isPending: false },
    createCourse: { mutate: vi.fn(), isPending: false },
    updateCourse: { mutate: vi.fn(), isPending: false },
    deleteCourse: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

vi.mock('./status-transition-dialog', () => ({
  StatusTransitionDialog: ({ open, newStatus }: { open: boolean; newStatus: string }) =>
    open ? <div data-testid="status-dialog">Status: {newStatus}</div> : null,
}));

vi.mock('./delete-confirm-dialog', () => ({
  DeleteConfirmDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="delete-dialog">Delete Dialog</div> : null,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock shadcn DropdownMenu to avoid Radix Portal/pointer-event issues in jsdom
vi.mock('@/components/ui/dropdown-menu', () => {
  const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DropdownMenuTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    if (asChild) return <>{children}</>;
    return <button>{children}</button>;
  };
  const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => <div data-testid="dropdown-content">{children}</div>;
  const DropdownMenuItem = ({ children, onClick, className, asChild }: { children: React.ReactNode; onClick?: () => void; className?: string; asChild?: boolean }) => {
    if (asChild) return <div onClick={onClick} className={className}>{children}</div>;
    return <div role="menuitem" onClick={onClick} className={className}>{children}</div>;
  };
  const DropdownMenuSeparator = () => <hr />;
  const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DropdownMenuSubTrigger = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  const DropdownMenuSubContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
  };
});

import { CourseActionMenu } from './course-action-menu';

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
  target_completion_date: null,
  priority: 2,
  status: 'in_progress',
  notes: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

describe('CourseActionMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button with sr-only "Actions" text', () => {
    render(<CourseActionMenu course={baseCourse} />);
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('renders trigger button accessible via role', () => {
    render(<CourseActionMenu course={baseCourse} />);
    // The trigger button should be there
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Edit Course" link in dropdown content', () => {
    render(<CourseActionMenu course={baseCourse} />);
    // With mocked dropdown, content is always rendered
    expect(screen.getByText('Edit Course')).toBeDefined();
  });

  it('shows "Delete Course" option in dropdown', () => {
    render(<CourseActionMenu course={baseCourse} />);
    expect(screen.getByText('Delete Course')).toBeDefined();
  });

  it('shows available status transitions for in_progress course', () => {
    render(<CourseActionMenu course={baseCourse} />);
    // in_progress can transition to: paused, completed, abandoned
    expect(screen.getByText('Pause')).toBeDefined();
    expect(screen.getByText('Mark Complete')).toBeDefined();
    expect(screen.getByText('Abandon')).toBeDefined();
  });

  it('shows "Change Priority" submenu trigger', () => {
    render(<CourseActionMenu course={baseCourse} />);
    expect(screen.getByText('Change Priority')).toBeDefined();
  });

  it('edit link points to correct URL', () => {
    render(<CourseActionMenu course={baseCourse} />);
    const editLink = screen.getByText('Edit Course');
    expect(editLink.closest('a')?.getAttribute('href')).toBe('/courses/course-1/edit');
  });

  it('shows "Start Course" for not_started status', () => {
    const notStarted = { ...baseCourse, status: 'not_started' as const };
    render(<CourseActionMenu course={notStarted} />);
    expect(screen.getByText('Start Course')).toBeDefined();
  });

  it('shows no transition items for completed course', () => {
    const completed = { ...baseCourse, status: 'completed' as const };
    render(<CourseActionMenu course={completed} />);
    // completed has no transitions
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Mark Complete')).toBeNull();
    expect(screen.queryByText('Abandon')).toBeNull();
    expect(screen.queryByText('Start Course')).toBeNull();
  });

  it('shows priority options in submenu', () => {
    render(<CourseActionMenu course={baseCourse} />);
    expect(screen.getByText('P1 - Critical')).toBeDefined();
    expect(screen.getByText('P2 - High')).toBeDefined();
    expect(screen.getByText('P3 - Medium')).toBeDefined();
    expect(screen.getByText('P4 - Low')).toBeDefined();
  });
});
