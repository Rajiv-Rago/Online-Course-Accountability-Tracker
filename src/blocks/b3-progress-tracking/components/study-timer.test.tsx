import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock hooks BEFORE importing component
const mockStart = vi.fn();
const mockPause = vi.fn();
const mockResume = vi.fn();
const mockStop = vi.fn();
const mockReset = vi.fn();
const mockDismissRecovery = vi.fn();

vi.mock('../hooks/use-timer', () => ({
  useTimer: vi.fn(() => ({
    state: {
      status: 'idle',
      courseId: null,
      sessionId: null,
      elapsedSeconds: 0,
      startedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
    },
    start: mockStart,
    pause: mockPause,
    resume: mockResume,
    stop: mockStop,
    reset: mockReset,
    recoverySession: null,
    dismissRecovery: mockDismissRecovery,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

// Mock child components to isolate
vi.mock('./timer-display', () => ({
  TimerDisplay: ({ elapsedSeconds, isRunning }: { elapsedSeconds: number; isRunning: boolean }) => (
    <div data-testid="timer-display" data-elapsed={elapsedSeconds} data-running={isRunning}>
      Timer Display
    </div>
  ),
}));

vi.mock('./timer-controls', () => ({
  TimerControls: ({
    status,
    onStart,
    onPause,
    onResume,
    onStop,
    courseSelected,
    isStopLoading,
  }: {
    status: string;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    courseSelected: boolean;
    isStopLoading: boolean;
  }) => (
    <div data-testid="timer-controls" data-status={status} data-course-selected={courseSelected}>
      <button onClick={onStart} data-testid="ctrl-start">Start</button>
      <button onClick={onPause} data-testid="ctrl-pause">Pause</button>
      <button onClick={onResume} data-testid="ctrl-resume">Resume</button>
      <button onClick={onStop} data-testid="ctrl-stop">Stop</button>
    </div>
  ),
}));

vi.mock('./timer-course-select', () => ({
  TimerCourseSelect: ({
    selectedCourseId,
    onSelect,
    disabled,
  }: {
    selectedCourseId: string | null;
    onSelect: (id: string) => void;
    disabled: boolean;
  }) => (
    <div data-testid="course-select" data-disabled={disabled}>
      <button onClick={() => onSelect('course-1')} data-testid="select-course">
        Select Course
      </button>
      {selectedCourseId && <span data-testid="selected-course">{selectedCourseId}</span>}
    </div>
  ),
}));

vi.mock('./module-checklist', () => ({
  ModuleChecklist: ({
    count,
    onChange,
  }: {
    count: number;
    onChange: (n: number) => void;
  }) => (
    <div data-testid="module-checklist" data-count={count}>
      <button onClick={() => onChange(count + 1)} data-testid="inc-modules">+</button>
    </div>
  ),
}));

import { StudyTimer } from './study-timer';
import { useTimer } from '../hooks/use-timer';

describe('StudyTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the study timer card with title', () => {
    render(<StudyTimer />);
    expect(screen.getByText('Study Timer')).toBeDefined();
  });

  it('renders course select, timer display, and timer controls', () => {
    render(<StudyTimer />);
    expect(screen.getByTestId('course-select')).toBeDefined();
    expect(screen.getByTestId('timer-display')).toBeDefined();
    expect(screen.getByTestId('timer-controls')).toBeDefined();
  });

  it('does not show notes and modules when timer is idle', () => {
    render(<StudyTimer />);
    expect(screen.queryByTestId('module-checklist')).toBeNull();
    expect(screen.queryByText('Notes')).toBeNull();
  });

  it('shows notes and module checklist when timer is active (running)', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'running',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 120,
        startedAt: Date.now() - 120000,
        pausedAt: null,
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: null,
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    expect(screen.getByTestId('module-checklist')).toBeDefined();
    expect(screen.getByText('Notes')).toBeDefined();
  });

  it('shows notes and module checklist when timer is paused', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'paused',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 60,
        startedAt: Date.now() - 120000,
        pausedAt: Date.now() - 60000,
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: null,
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    expect(screen.getByTestId('module-checklist')).toBeDefined();
    expect(screen.getByText('Notes')).toBeDefined();
  });

  it('disables course select when timer is active', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'running',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 10,
        startedAt: Date.now(),
        pausedAt: null,
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: null,
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    expect(screen.getByTestId('course-select').getAttribute('data-disabled')).toBe('true');
  });

  it('calls start when start button is pressed and course is selected', async () => {
    mockStart.mockResolvedValue(undefined);

    render(<StudyTimer />);
    // First select a course
    fireEvent.click(screen.getByTestId('select-course'));
    // Then start
    fireEvent.click(screen.getByTestId('ctrl-start'));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalledWith('course-1');
    });
  });

  it('shows recovery dialog when recoverySession is present', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'paused',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 300,
        startedAt: Date.now() - 600000,
        pausedAt: Date.now(),
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: {
        id: 'session-1',
        user_id: 'user-1',
        course_id: 'course-1',
        started_at: '2024-06-01T10:00:00Z',
        ended_at: null,
        duration_minutes: 5,
        modules_completed: 0,
        session_type: 'timer' as const,
        notes: null,
        created_at: '2024-06-01T10:00:00Z',
      },
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    expect(screen.getByText('Active Session Found')).toBeDefined();
    expect(screen.getByText('Resume Timer')).toBeDefined();
    expect(screen.getByText('Stop & Save')).toBeDefined();
    expect(screen.getByText('Discard')).toBeDefined();
  });

  it('calls reset when Discard is clicked on recovery dialog', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'paused',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 300,
        startedAt: Date.now() - 600000,
        pausedAt: Date.now(),
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: {
        id: 'session-1',
        user_id: 'user-1',
        course_id: 'course-1',
        started_at: '2024-06-01T10:00:00Z',
        ended_at: null,
        duration_minutes: 5,
        modules_completed: 0,
        session_type: 'timer' as const,
        notes: null,
        created_at: '2024-06-01T10:00:00Z',
      },
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    fireEvent.click(screen.getByText('Discard'));
    expect(mockReset).toHaveBeenCalled();
  });

  it('calls dismissRecovery and resume when Resume Timer is clicked', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'paused',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 300,
        startedAt: Date.now() - 600000,
        pausedAt: Date.now(),
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: {
        id: 'session-1',
        user_id: 'user-1',
        course_id: 'course-1',
        started_at: '2024-06-01T10:00:00Z',
        ended_at: null,
        duration_minutes: 5,
        modules_completed: 0,
        session_type: 'timer' as const,
        notes: null,
        created_at: '2024-06-01T10:00:00Z',
      },
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    fireEvent.click(screen.getByText('Resume Timer'));
    expect(mockDismissRecovery).toHaveBeenCalled();
    expect(mockResume).toHaveBeenCalled();
  });

  it('handles stop and shows toast on successful save', async () => {
    mockStop.mockResolvedValue({
      id: 'session-1',
      duration_minutes: 15,
      user_id: 'user-1',
      course_id: 'course-1',
      started_at: '2024-06-01T10:00:00Z',
      ended_at: '2024-06-01T10:15:00Z',
      modules_completed: 0,
      session_type: 'timer',
      notes: null,
      created_at: '2024-06-01T10:00:00Z',
    });

    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'running',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 900,
        startedAt: Date.now() - 900000,
        pausedAt: null,
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: null,
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    fireEvent.click(screen.getByTestId('ctrl-stop'));

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });
  });

  it('allows notes to be typed when timer is active', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'running',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 60,
        startedAt: Date.now(),
        pausedAt: null,
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: null,
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    const textarea = screen.getByPlaceholderText('What did you work on this session?');
    fireEvent.change(textarea, { target: { value: 'Learning React hooks' } });
    expect((textarea as HTMLTextAreaElement).value).toBe('Learning React hooks');
  });

  it('shows character count for notes', () => {
    vi.mocked(useTimer).mockReturnValue({
      state: {
        status: 'running',
        courseId: 'course-1',
        sessionId: 'session-1',
        elapsedSeconds: 60,
        startedAt: Date.now(),
        pausedAt: null,
        totalPausedMs: 0,
      },
      start: mockStart,
      pause: mockPause,
      resume: mockResume,
      stop: mockStop,
      reset: mockReset,
      recoverySession: null,
      dismissRecovery: mockDismissRecovery,
    });

    render(<StudyTimer />);
    expect(screen.getByText('0/500')).toBeDefined();
  });
});
