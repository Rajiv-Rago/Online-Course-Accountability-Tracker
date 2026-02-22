import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockFetchNextPage = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUpdateMutate = vi.fn();

vi.mock('../hooks/use-sessions', () => ({
  useSessions: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    isFetchingNextPage: false,
  })),
  useSessionMutations: vi.fn(() => ({
    createSession: { mutate: vi.fn(), isPending: false },
    updateSession: { mutate: mockUpdateMutate, isPending: false },
    deleteSession: { mutate: mockDeleteMutate, isPending: false },
    isLoading: false,
  })),
}));

vi.mock('./session-item', () => ({
  SessionItem: ({
    session,
    onEdit,
    onDelete,
  }: {
    session: any;
    onEdit: (s: any) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid={`session-item-${session.id}`}>
      <span>{session.course_title}</span>
      <button onClick={() => onEdit(session)} data-testid={`edit-${session.id}`}>Edit</button>
      <button onClick={() => onDelete(session.id)} data-testid={`delete-${session.id}`}>Delete</button>
    </div>
  ),
}));

vi.mock('./session-edit-dialog', () => ({
  SessionEditDialog: ({
    session,
    open,
    onClose,
    onSave,
  }: {
    session: any;
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
  }) =>
    open ? (
      <div data-testid="edit-dialog">
        <span>Editing: {session.course_title}</span>
        <button onClick={() => onSave({ durationMinutes: 45 })} data-testid="save-edit">Save</button>
        <button onClick={onClose} data-testid="close-edit">Close</button>
      </div>
    ) : null,
}));

import { SessionList } from './session-list';
import { useSessions, useSessionMutations } from '../hooks/use-sessions';

const makeSessions = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `session-${i}`,
    user_id: 'user-1',
    course_id: `course-${i}`,
    started_at: '2024-06-01T10:00:00Z',
    ended_at: '2024-06-01T10:30:00Z',
    duration_minutes: 30,
    modules_completed: 2,
    session_type: 'manual' as const,
    notes: `Notes for session ${i}`,
    created_at: '2024-06-01T10:00:00Z',
    course_title: `Course ${i}`,
    course_platform: 'udemy',
  }));

describe('SessionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeletons when isLoading is true', () => {
    vi.mocked(useSessions).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    const { container } = render(<SessionList />);
    // 3 skeleton elements are rendered
    const skeletons = container.querySelectorAll('.h-16');
    expect(skeletons.length).toBe(3);
  });

  it('shows error message when error occurs', () => {
    vi.mocked(useSessions).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    expect(screen.getByText(/Failed to load sessions/)).toBeDefined();
    expect(screen.getByText(/Network error/)).toBeDefined();
  });

  it('shows empty state when no sessions exist', () => {
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions: [], hasNextPage: false }] },
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    expect(screen.getByText('No sessions recorded yet. Start tracking!')).toBeDefined();
  });

  it('renders session items for each session', () => {
    const sessions = makeSessions(3);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: false }] },
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    expect(screen.getByTestId('session-item-session-0')).toBeDefined();
    expect(screen.getByTestId('session-item-session-1')).toBeDefined();
    expect(screen.getByTestId('session-item-session-2')).toBeDefined();
  });

  it('shows Load More button when hasNextPage is true', () => {
    const sessions = makeSessions(2);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: true }] },
      isLoading: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    expect(screen.getByText('Load More')).toBeDefined();
  });

  it('does not show Load More when hasNextPage is false', () => {
    const sessions = makeSessions(2);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: false }] },
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    expect(screen.queryByText('Load More')).toBeNull();
  });

  it('calls fetchNextPage when Load More is clicked', () => {
    const sessions = makeSessions(2);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: true }] },
      isLoading: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    fireEvent.click(screen.getByText('Load More'));
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows Loading... text when fetching next page', () => {
    const sessions = makeSessions(2);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: true }] },
      isLoading: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: true,
    } as any);

    render(<SessionList />);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('opens edit dialog when edit is clicked on a session item', () => {
    const sessions = makeSessions(1);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: false }] },
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    fireEvent.click(screen.getByTestId('edit-session-0'));
    expect(screen.getByTestId('edit-dialog')).toBeDefined();
    expect(screen.getByText('Editing: Course 0')).toBeDefined();
  });

  it('shows delete confirmation dialog when delete is clicked', () => {
    const sessions = makeSessions(1);
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions, hasNextPage: false }] },
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList />);
    fireEvent.click(screen.getByTestId('delete-session-0'));
    expect(screen.getByText('Delete Session')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete this session/)).toBeDefined();
  });

  it('passes courseFilter to useSessions hook', () => {
    vi.mocked(useSessions).mockReturnValue({
      data: { pages: [{ sessions: [], hasNextPage: false }] },
      isLoading: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isFetchingNextPage: false,
    } as any);

    render(<SessionList courseFilter="course-abc" limit={5} />);
    expect(useSessions).toHaveBeenCalledWith({ courseId: 'course-abc', limit: 5 });
  });
});
