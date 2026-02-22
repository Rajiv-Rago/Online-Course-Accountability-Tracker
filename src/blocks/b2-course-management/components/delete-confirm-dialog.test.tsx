import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Course } from '@/lib/types';

// Mock hooks BEFORE importing
const mockDeleteMutate = vi.fn();
const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
    back: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../hooks/use-course-mutations', () => ({
  useCourseMutations: vi.fn(() => ({
    deleteCourse: { mutate: mockDeleteMutate, isPending: false },
    createCourse: { mutate: vi.fn(), isPending: false },
    updateCourse: { mutate: vi.fn(), isPending: false },
    transitionStatus: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

// Mock shadcn Dialog to avoid Radix Portal issues in jsdom
vi.mock('@/components/ui/dialog', () => {
  const Dialog = ({ children, open }: { children: React.ReactNode; open: boolean; onOpenChange?: (open: boolean) => void }) => {
    if (!open) return null;
    return <div data-testid="dialog">{children}</div>;
  };
  const DialogContent = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  );
  const DialogHeader = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  );
  const DialogFooter = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  );
  const DialogTitle = ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  );
  const DialogDescription = ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  );
  return { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
});

import { DeleteConfirmDialog } from './delete-confirm-dialog';
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

describe('DeleteConfirmDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog title', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    // "Delete Course" appears in both the title (h2) and the button
    const heading = screen.getAllByText('Delete Course').find(
      (el) => el.tagName === 'H2'
    );
    expect(heading).toBeDefined();
  });

  it('shows course title', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    expect(screen.getByText('React Complete Guide')).toBeDefined();
  });

  it('shows warning about deletion being permanent', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    expect(screen.getByText(/This action cannot be undone/)).toBeDefined();
  });

  it('shows warning about study sessions being deleted', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    expect(screen.getByText(/All study sessions associated with this course will also be deleted/)).toBeDefined();
  });

  it('calls deleteCourse.mutate when delete button is clicked', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    // There are two elements with "Delete Course" - title (h2) and button. Get the button.
    const deleteBtn = screen.getAllByText('Delete Course').find(
      (el) => el.closest('button') !== null
    );
    fireEvent.click(deleteBtn!.closest('button')!);
    expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
    expect(mockDeleteMutate.mock.calls[0][0]).toBe('course-1');
  });

  it('calls onOpenChange(false) when cancel button is clicked', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows "Deleting..." when mutation is pending', () => {
    vi.mocked(useCourseMutations).mockReturnValue({
      deleteCourse: { mutate: mockDeleteMutate, isPending: true },
      createCourse: { mutate: vi.fn(), isPending: false },
      updateCourse: { mutate: vi.fn(), isPending: false },
      transitionStatus: { mutate: vi.fn(), isPending: false },
      isLoading: false,
    } as any);

    render(
      <DeleteConfirmDialog course={baseCourse} open={true} onOpenChange={mockOnOpenChange} />
    );
    expect(screen.getByText('Deleting...')).toBeDefined();
  });

  it('does not render content when dialog is closed', () => {
    render(
      <DeleteConfirmDialog course={baseCourse} open={false} onOpenChange={mockOnOpenChange} />
    );
    // Dialog content should not be visible when closed
    expect(screen.queryByText('React Complete Guide')).toBeNull();
  });
});
