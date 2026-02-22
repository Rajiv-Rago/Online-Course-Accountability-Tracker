import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Course, CourseStatus } from '@/lib/types';

// Mock hooks BEFORE importing
const mockTransitionMutate = vi.fn();

vi.mock('../hooks/use-course-mutations', () => ({
  useCourseMutations: vi.fn(() => ({
    transitionStatus: { mutate: mockTransitionMutate, isPending: false },
    createCourse: { mutate: vi.fn(), isPending: false },
    updateCourse: { mutate: vi.fn(), isPending: false },
    deleteCourse: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

import { StatusTransitionDialog } from './status-transition-dialog';
import { useCourseMutations } from '../hooks/use-course-mutations';

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

describe('StatusTransitionDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="completed"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText('Change Course Status')).toBeDefined();
  });

  it('shows course title in status info', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="completed"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText('React Complete Guide')).toBeDefined();
  });

  it('shows current and new status', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="completed"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText('In Progress')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();
  });

  it('shows override checkbox when completing with less than 100% progress', () => {
    // course has 10/29 modules = 34% progress < 100%
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="completed"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText(/Mark as complete even though progress is below 100%/)).toBeDefined();
  });

  it('disables confirm button when override is not checked and progress < 100%', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="completed"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    const confirmBtn = screen.getByText(/Confirm/);
    expect(confirmBtn.closest('button')?.disabled).toBe(true);
  });

  it('shows reason textarea when abandoning', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="abandoned"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByLabelText(/Reason/)).toBeDefined();
    expect(screen.getByPlaceholderText(/Why are you abandoning/)).toBeDefined();
  });

  it('does not show override checkbox when abandoning', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="abandoned"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.queryByText(/Mark as complete even though/)).toBeNull();
  });

  it('calls transitionStatus.mutate when confirm is clicked (abandon)', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="abandoned"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    const confirmBtn = screen.getByText(/Confirm Abandon/);
    fireEvent.click(confirmBtn);
    expect(mockTransitionMutate).toHaveBeenCalledTimes(1);
    expect(mockTransitionMutate.mock.calls[0][0]).toMatchObject({
      courseId: 'course-1',
      newStatus: 'abandoned',
    });
  });

  it('shows cancel button that calls onOpenChange(false)', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="abandoned"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows "Updating..." when mutation is pending', () => {
    vi.mocked(useCourseMutations).mockReturnValue({
      transitionStatus: { mutate: mockTransitionMutate, isPending: true },
      createCourse: { mutate: vi.fn(), isPending: false },
      updateCourse: { mutate: vi.fn(), isPending: false },
      deleteCourse: { mutate: vi.fn(), isPending: false },
      isLoading: false,
    } as any);

    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="abandoned"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText('Updating...')).toBeDefined();
  });

  it('shows progress info for completed transition', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="completed"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText(/Current progress \(34%\) will be recorded/)).toBeDefined();
  });

  it('shows progress preserved info for abandoned transition', () => {
    render(
      <StatusTransitionDialog
        course={baseCourse}
        newStatus="abandoned"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );
    expect(screen.getByText(/Current progress \(34%\) will be preserved/)).toBeDefined();
  });
});
