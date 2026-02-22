import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing component
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockRouterPush = vi.fn();
const mockRouterBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockRouterPush,
    back: mockRouterBack,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('../hooks/use-course-mutations', () => ({
  useCourseMutations: vi.fn(() => ({
    createCourse: { mutate: mockCreateMutate, isPending: false },
    updateCourse: { mutate: mockUpdateMutate, isPending: false },
    deleteCourse: { mutate: vi.fn(), isPending: false },
    transitionStatus: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

vi.mock('./platform-select', () => ({
  PlatformSelect: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <select
      data-testid="platform-select"
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">None</option>
      <option value="udemy">Udemy</option>
    </select>
  ),
}));

vi.mock('./priority-selector', () => ({
  PrioritySelector: ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div data-testid="priority-selector">
      <button onClick={() => onChange(1)}>P1</button>
      <button onClick={() => onChange(2)}>P2</button>
      <span>Current: {value}</span>
    </div>
  ),
}));

import { CourseForm } from './course-form';
import { useCourseMutations } from '../hooks/use-course-mutations';
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
  notes: 'Great course',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
};

describe('CourseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Create Mode ---

  it('renders empty form in create mode', () => {
    render(<CourseForm mode="create" />);
    expect(screen.getByLabelText(/Course Title/)).toBeDefined();
    const titleInput = screen.getByPlaceholderText(/React - The Complete Guide/);
    expect((titleInput as HTMLInputElement).value).toBe('');
  });

  it('shows required asterisk on title label', () => {
    render(<CourseForm mode="create" />);
    expect(screen.getByText('*')).toBeDefined();
  });

  it('shows "Create Course" submit button in create mode', () => {
    render(<CourseForm mode="create" />);
    expect(screen.getByText('Create Course')).toBeDefined();
  });

  it('shows validation error when title is empty on submit', async () => {
    render(<CourseForm mode="create" />);
    const submitBtn = screen.getByText('Create Course');
    fireEvent.click(submitBtn);
    // react-hook-form validation triggers asynchronously
    await screen.findByText('Title is required');
  });

  it('calls createCourse mutation on valid submit in create mode', async () => {
    render(<CourseForm mode="create" />);
    const titleInput = screen.getByPlaceholderText(/React - The Complete Guide/);
    fireEvent.change(titleInput, { target: { value: 'My New Course' } });
    const submitBtn = screen.getByText('Create Course');
    fireEvent.click(submitBtn);

    // Wait for form submission (react-hook-form is async)
    await vi.waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateMutate.mock.calls[0][0]).toMatchObject({ title: 'My New Course' });
  });

  it('does not show completed modules/hours in create mode', () => {
    render(<CourseForm mode="create" />);
    expect(screen.queryByLabelText('Completed Modules')).toBeNull();
    expect(screen.queryByLabelText('Completed Hours')).toBeNull();
  });

  // --- Edit Mode ---

  it('pre-populates form fields in edit mode', () => {
    render(<CourseForm mode="edit" course={baseCourse} />);
    const titleInput = screen.getByPlaceholderText(/React - The Complete Guide/) as HTMLInputElement;
    expect(titleInput.value).toBe('React Complete Guide');
  });

  it('shows completed fields in edit mode', () => {
    render(<CourseForm mode="edit" course={baseCourse} />);
    expect(screen.getByLabelText('Completed Modules')).toBeDefined();
    expect(screen.getByLabelText('Completed Hours')).toBeDefined();
  });

  it('shows "Save Changes" submit button in edit mode', () => {
    render(<CourseForm mode="edit" course={baseCourse} />);
    expect(screen.getByText('Save Changes')).toBeDefined();
  });

  it('calls updateCourse mutation on submit in edit mode', async () => {
    render(<CourseForm mode="edit" course={baseCourse} />);
    const submitBtn = screen.getByText('Save Changes');
    fireEvent.click(submitBtn);

    await vi.waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
    });
    expect(mockUpdateMutate.mock.calls[0][0].id).toBe('course-1');
  });

  // --- Cancel ---

  it('calls router.back() when Cancel is clicked', () => {
    render(<CourseForm mode="create" />);
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  // --- Loading state ---

  it('shows "Creating..." when isLoading is true in create mode', () => {
    vi.mocked(useCourseMutations).mockReturnValue({
      createCourse: { mutate: mockCreateMutate, isPending: true },
      updateCourse: { mutate: mockUpdateMutate, isPending: false },
      deleteCourse: { mutate: vi.fn(), isPending: false },
      transitionStatus: { mutate: vi.fn(), isPending: false },
      isLoading: true,
    } as any);

    render(<CourseForm mode="create" />);
    expect(screen.getByText('Creating...')).toBeDefined();
  });
});
