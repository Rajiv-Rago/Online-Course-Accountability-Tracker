import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing
const mockSetFilter = vi.fn();

vi.mock('../hooks/use-course-filters', () => ({
  useCourseFilters: vi.fn(() => ({
    filters: {
      sortBy: 'priority',
      sortDir: 'asc',
    },
    setFilter: mockSetFilter,
  })),
}));

// Mock shadcn Select to avoid Radix Portal issues in jsdom
vi.mock('@/components/ui/select', () => {
  const Select = ({ children, value, onValueChange }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select-root" data-value={value}>{children}</div>
  );
  const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <button data-testid="select-trigger" className={className}>{children}</button>
  );
  const SelectValue = ({ placeholder }: { placeholder?: string }) => {
    // In the real component, SelectValue renders the selected item's label.
    // We return null and let the parent test check the data-value on the select-root.
    return <span data-testid="select-value">{placeholder || ''}</span>;
  };
  const SelectContent = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  );
  const SelectItem = ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  );
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

import { CourseSort } from './course-sort';
import { useCourseFilters } from '../hooks/use-course-filters';

describe('CourseSort', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCourseFilters).mockReturnValue({
      filters: { sortBy: 'priority', sortDir: 'asc' },
      setFilter: mockSetFilter,
    } as any);
  });

  it('renders "Sort by:" label', () => {
    render(<CourseSort />);
    expect(screen.getByText('Sort by:')).toBeDefined();
  });

  it('renders sort direction toggle button', () => {
    render(<CourseSort />);
    const toggleBtn = screen.getByTitle('Ascending');
    expect(toggleBtn).toBeDefined();
  });

  it('shows "Descending" title when sortDir is desc', () => {
    vi.mocked(useCourseFilters).mockReturnValue({
      filters: { sortBy: 'priority', sortDir: 'desc' },
      setFilter: mockSetFilter,
    } as any);

    render(<CourseSort />);
    expect(screen.getByTitle('Descending')).toBeDefined();
  });

  it('toggles sort direction from asc to desc on click', () => {
    render(<CourseSort />);
    const toggleBtn = screen.getByTitle('Ascending');
    fireEvent.click(toggleBtn);
    expect(mockSetFilter).toHaveBeenCalledWith('sortDir', 'desc');
  });

  it('toggles sort direction from desc to asc on click', () => {
    vi.mocked(useCourseFilters).mockReturnValue({
      filters: { sortBy: 'priority', sortDir: 'desc' },
      setFilter: mockSetFilter,
    } as any);

    render(<CourseSort />);
    const toggleBtn = screen.getByTitle('Descending');
    fireEvent.click(toggleBtn);
    expect(mockSetFilter).toHaveBeenCalledWith('sortDir', 'asc');
  });

  it('renders sort options in select content', () => {
    render(<CourseSort />);
    expect(screen.getByText('Priority')).toBeDefined();
    expect(screen.getByText('Progress')).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Target Date')).toBeDefined();
    expect(screen.getByText('Date Added')).toBeDefined();
    expect(screen.getByText('Last Updated')).toBeDefined();
  });

  it('passes current sortBy value to Select', () => {
    render(<CourseSort />);
    const selectRoot = screen.getByTestId('select-root');
    expect(selectRoot.getAttribute('data-value')).toBe('priority');
  });
});
