import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing
const mockBulkStatusMutate = vi.fn();
const mockBulkPriorityMutate = vi.fn();
const mockBulkDeleteMutate = vi.fn();

vi.mock('../hooks/use-course-mutations', () => ({
  useCourseMutations: vi.fn(() => ({
    bulkUpdateStatus: { mutate: mockBulkStatusMutate, isPending: false },
    bulkUpdatePriority: { mutate: mockBulkPriorityMutate, isPending: false },
    bulkDelete: { mutate: mockBulkDeleteMutate, isPending: false },
    createCourse: { mutate: vi.fn(), isPending: false },
    updateCourse: { mutate: vi.fn(), isPending: false },
    deleteCourse: { mutate: vi.fn(), isPending: false },
    transitionStatus: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

import { BulkActionsBar } from './bulk-actions-bar';

describe('BulkActionsBar', () => {
  const mockClearSelection = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no items are selected', () => {
    const { container } = render(
      <BulkActionsBar selectedIds={new Set()} onClearSelection={mockClearSelection} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows selection count for single item', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    expect(screen.getByText('1 course selected')).toBeDefined();
  });

  it('shows plural selection count for multiple items', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1', 'id2', 'id3'])} onClearSelection={mockClearSelection} />
    );
    expect(screen.getByText('3 courses selected')).toBeDefined();
  });

  it('renders "Change Status" dropdown', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    expect(screen.getByText('Change Status')).toBeDefined();
  });

  it('renders "Change Priority" dropdown', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    expect(screen.getByText('Change Priority')).toBeDefined();
  });

  it('renders Delete button', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('renders Clear button', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('calls onClearSelection when Clear button is clicked', () => {
    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);
    expect(mockClearSelection).toHaveBeenCalledTimes(1);
  });

  it('calls bulkDelete with confirm on Delete click', () => {
    // Mock window.confirm to return true
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <BulkActionsBar selectedIds={new Set(['id1', 'id2'])} onClearSelection={mockClearSelection} />
    );
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(mockBulkDeleteMutate).toHaveBeenCalledTimes(1);
    expect(mockBulkDeleteMutate.mock.calls[0][0]).toEqual(['id1', 'id2']);

    confirmSpy.mockRestore();
  });

  it('does not call bulkDelete when confirm is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <BulkActionsBar selectedIds={new Set(['id1'])} onClearSelection={mockClearSelection} />
    );
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(mockBulkDeleteMutate).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });
});
