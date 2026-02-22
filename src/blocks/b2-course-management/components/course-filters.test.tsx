import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing
const mockSetFilter = vi.fn();
const mockClearFilters = vi.fn();

vi.mock('../hooks/use-course-filters', () => ({
  useCourseFilters: vi.fn(() => ({
    filters: {
      status: 'all',
      priority: 'all',
      platform: 'all',
      search: '',
    },
    setFilter: mockSetFilter,
    clearFilters: mockClearFilters,
    hasActiveFilters: false,
  })),
}));

import { CourseFilters } from './course-filters';
import { useCourseFilters } from '../hooks/use-course-filters';

describe('CourseFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<CourseFilters />);
    expect(screen.getByPlaceholderText('Search courses...')).toBeDefined();
  });

  it('renders status filter select', () => {
    render(<CourseFilters />);
    expect(screen.getByText('All Statuses')).toBeDefined();
  });

  it('renders priority filter select', () => {
    render(<CourseFilters />);
    expect(screen.getByText('All Priorities')).toBeDefined();
  });

  it('renders platform filter select', () => {
    render(<CourseFilters />);
    expect(screen.getByText('All Platforms')).toBeDefined();
  });

  it('does not show clear button when no active filters', () => {
    render(<CourseFilters />);
    expect(screen.queryByText('Clear')).toBeNull();
  });

  it('shows clear button when there are active filters', () => {
    vi.mocked(useCourseFilters).mockReturnValue({
      filters: {
        status: 'in_progress',
        priority: 'all',
        platform: 'all',
        search: '',
      },
      setFilter: mockSetFilter,
      clearFilters: mockClearFilters,
      hasActiveFilters: true,
    } as any);

    render(<CourseFilters />);
    expect(screen.getByText('Clear')).toBeDefined();
  });

  it('calls clearFilters when clear button is clicked', () => {
    vi.mocked(useCourseFilters).mockReturnValue({
      filters: {
        status: 'in_progress',
        priority: 'all',
        platform: 'all',
        search: '',
      },
      setFilter: mockSetFilter,
      clearFilters: mockClearFilters,
      hasActiveFilters: true,
    } as any);

    render(<CourseFilters />);
    const clearBtn = screen.getByText('Clear');
    fireEvent.click(clearBtn);
    expect(mockClearFilters).toHaveBeenCalledTimes(1);
  });

  it('calls setFilter when search input changes', () => {
    render(<CourseFilters />);
    const searchInput = screen.getByPlaceholderText('Search courses...');
    fireEvent.change(searchInput, { target: { value: 'react' } });
    expect(mockSetFilter).toHaveBeenCalledWith('search', 'react');
  });

  it('displays current search value from filters', () => {
    vi.mocked(useCourseFilters).mockReturnValue({
      filters: {
        status: 'all',
        priority: 'all',
        platform: 'all',
        search: 'typescript',
      },
      setFilter: mockSetFilter,
      clearFilters: mockClearFilters,
      hasActiveFilters: true,
    } as any);

    render(<CourseFilters />);
    const searchInput = screen.getByPlaceholderText('Search courses...') as HTMLInputElement;
    expect(searchInput.value).toBe('typescript');
  });
});
