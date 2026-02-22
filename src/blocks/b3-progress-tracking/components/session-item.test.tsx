import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SessionItem } from './session-item';

const makeSession = (overrides = {}) => ({
  id: 'session-1',
  user_id: 'user-1',
  course_id: 'course-1',
  started_at: '2024-06-15T10:00:00Z',
  ended_at: '2024-06-15T10:30:00Z',
  duration_minutes: 30,
  modules_completed: 2,
  session_type: 'manual' as const,
  notes: 'Studied React hooks',
  created_at: '2024-06-15T10:00:00Z',
  course_title: 'React Masterclass',
  course_platform: 'udemy' as string | null,
  ...overrides,
});

describe('SessionItem', () => {
  const defaultProps = {
    session: makeSession(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the course title', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('React Masterclass')).toBeDefined();
  });

  it('renders the session type badge', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('manual')).toBeDefined();
  });

  it('renders duration formatted as "30m" for 30 minutes', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('30m')).toBeDefined();
  });

  it('renders duration formatted as "1h 30m" for 90 minutes', () => {
    const session = makeSession({ duration_minutes: 90 });
    render(<SessionItem {...defaultProps} session={session} />);
    expect(screen.getByText('1h 30m')).toBeDefined();
  });

  it('renders duration formatted as "2h" for 120 minutes', () => {
    const session = makeSession({ duration_minutes: 120 });
    render(<SessionItem {...defaultProps} session={session} />);
    expect(screen.getByText('2h')).toBeDefined();
  });

  it('renders modules completed count when > 0', () => {
    render(<SessionItem {...defaultProps} />);
    expect(screen.getByText('2')).toBeDefined();
  });

  it('does not render modules section when modules_completed is 0', () => {
    const session = makeSession({ modules_completed: 0 });
    const { container } = render(<SessionItem {...defaultProps} session={session} />);
    // BookOpen icon is only rendered when modules_completed > 0
    // Check there is no "0" displayed as module count (only the badge remains)
    const modulesSection = container.querySelectorAll('.gap-1');
    // The modules section is conditionally rendered
    expect(screen.queryByText('0')).toBeNull();
  });

  it('truncates long notes to 60 characters', () => {
    const longNotes = 'A'.repeat(100);
    const session = makeSession({ notes: longNotes });
    render(<SessionItem {...defaultProps} session={session} />);
    expect(screen.getByText('A'.repeat(60) + '...')).toBeDefined();
  });

  it('renders short notes without truncation', () => {
    const session = makeSession({ notes: 'Short note' });
    render(<SessionItem {...defaultProps} session={session} />);
    expect(screen.getByText('Short note')).toBeDefined();
  });

  it('does not render notes section when notes is null', () => {
    const session = makeSession({ notes: null });
    render(<SessionItem {...defaultProps} session={session} />);
    expect(screen.queryByText('Studied React hooks')).toBeNull();
  });

  it('renders the dropdown menu trigger button', () => {
    render(<SessionItem {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders timer session type badge correctly', () => {
    const session = makeSession({ session_type: 'timer' as const });
    render(<SessionItem {...defaultProps} session={session} />);
    expect(screen.getByText('timer')).toBeDefined();
  });
});
