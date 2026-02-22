import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: mockBack,
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/progress/log'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  redirect: vi.fn(),
}));

const mockMutate = vi.fn();
vi.mock('../hooks/use-sessions', () => ({
  useSessionMutations: vi.fn(() => ({
    createSession: {
      mutate: mockMutate,
      isPending: false,
    },
    updateSession: { mutate: vi.fn(), isPending: false },
    deleteSession: { mutate: vi.fn(), isPending: false },
    isLoading: false,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: [
      { id: 'course-1', title: 'React Masterclass', status: 'in_progress' },
      { id: 'course-2', title: 'Node.js Basics', status: 'not_started' },
    ],
    isLoading: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  useInfiniteQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/blocks/b2-course-management/actions/course-actions', () => ({
  getCourses: vi.fn(),
}));

import { SessionLogForm } from './session-log-form';
import { useSessionMutations } from '../hooks/use-sessions';

describe('SessionLogForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all fields', () => {
    render(<SessionLogForm />);
    expect(screen.getByText('Course')).toBeDefined();
    expect(screen.getByText('Date')).toBeDefined();
    expect(screen.getByText('Duration')).toBeDefined();
    expect(screen.getByText('Modules Completed')).toBeDefined();
    expect(screen.getByText('Notes (optional)')).toBeDefined();
  });

  it('renders submit and cancel buttons', () => {
    render(<SessionLogForm />);
    expect(screen.getByText('Log Session')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('calls router.back when Cancel is clicked', () => {
    render(<SessionLogForm />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('shows "minutes" label next to duration input', () => {
    render(<SessionLogForm />);
    expect(screen.getByText('minutes')).toBeDefined();
  });

  it('allows typing notes', () => {
    render(<SessionLogForm />);
    const notesInput = screen.getByPlaceholderText('What did you work on?');
    fireEvent.change(notesInput, { target: { value: 'Studied chapter 5' } });
    expect((notesInput as HTMLTextAreaElement).value).toBe('Studied chapter 5');
  });

  it('shows character count for notes', () => {
    render(<SessionLogForm />);
    expect(screen.getByText('0/500 characters')).toBeDefined();
  });

  it('updates character count when notes change', () => {
    render(<SessionLogForm />);
    const notesInput = screen.getByPlaceholderText('What did you work on?');
    fireEvent.change(notesInput, { target: { value: 'Hello' } });
    expect(screen.getByText('5/500 characters')).toBeDefined();
  });

  it('shows "Logging..." when mutation is loading', () => {
    vi.mocked(useSessionMutations).mockReturnValue({
      createSession: {
        mutate: mockMutate,
        isPending: true,
      } as any,
      updateSession: { mutate: vi.fn(), isPending: false } as any,
      deleteSession: { mutate: vi.fn(), isPending: false } as any,
      isLoading: true,
    });

    render(<SessionLogForm />);
    expect(screen.getByText('Logging...')).toBeDefined();
  });

  it('disables submit button when loading', () => {
    vi.mocked(useSessionMutations).mockReturnValue({
      createSession: {
        mutate: mockMutate,
        isPending: true,
      } as any,
      updateSession: { mutate: vi.fn(), isPending: false } as any,
      deleteSession: { mutate: vi.fn(), isPending: false } as any,
      isLoading: true,
    });

    render(<SessionLogForm />);
    const submitBtn = screen.getByText('Logging...').closest('button');
    expect(submitBtn?.disabled).toBe(true);
  });

  it('has a duration input defaulting to 30', () => {
    render(<SessionLogForm />);
    const durationInput = screen.getByDisplayValue('30');
    expect(durationInput).toBeDefined();
  });

  it('has a modules completed input defaulting to 0', () => {
    render(<SessionLogForm />);
    const modulesInput = screen.getByDisplayValue('0');
    expect(modulesInput).toBeDefined();
  });
});
