import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidTransition,
  getAvailableTransitions,
  formatStatus,
  requiresConfirmation,
  calcProgress,
  calcDaysRemaining,
  riskLevel,
  getTransitionLabel,
} from './course-utils';
import type { CourseStatus } from '@/lib/types';

// ---------------------------------------------------------------------------
// isValidTransition
// ---------------------------------------------------------------------------
describe('isValidTransition', () => {
  // All 7 valid transitions
  it.each<[CourseStatus, CourseStatus]>([
    ['not_started', 'in_progress'],
    ['in_progress', 'paused'],
    ['in_progress', 'completed'],
    ['in_progress', 'abandoned'],
    ['paused', 'in_progress'],
    ['paused', 'abandoned'],
    ['abandoned', 'in_progress'],
  ])('returns true for valid transition %s -> %s', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });

  // Key invalid transitions
  it.each<[CourseStatus, CourseStatus]>([
    ['not_started', 'completed'],
    ['not_started', 'paused'],
    ['completed', 'in_progress'],
    ['completed', 'abandoned'],
    ['abandoned', 'completed'],
    ['paused', 'completed'],
  ])('returns false for invalid transition %s -> %s', (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });

  // Same-status transition
  it('returns false when from and to are the same status', () => {
    expect(isValidTransition('in_progress', 'in_progress')).toBe(false);
    expect(isValidTransition('paused', 'paused')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAvailableTransitions
// ---------------------------------------------------------------------------
describe('getAvailableTransitions', () => {
  it('returns ["in_progress"] for not_started', () => {
    expect(getAvailableTransitions('not_started')).toEqual(['in_progress']);
  });

  it('returns ["paused","completed","abandoned"] for in_progress', () => {
    expect(getAvailableTransitions('in_progress')).toEqual([
      'paused',
      'completed',
      'abandoned',
    ]);
  });

  it('returns ["in_progress","abandoned"] for paused', () => {
    expect(getAvailableTransitions('paused')).toEqual([
      'in_progress',
      'abandoned',
    ]);
  });

  it('returns [] for completed', () => {
    expect(getAvailableTransitions('completed')).toEqual([]);
  });

  it('returns ["in_progress"] for abandoned', () => {
    expect(getAvailableTransitions('abandoned')).toEqual(['in_progress']);
  });
});

// ---------------------------------------------------------------------------
// formatStatus
// ---------------------------------------------------------------------------
describe('formatStatus', () => {
  it.each<[CourseStatus, string]>([
    ['not_started', 'Not Started'],
    ['in_progress', 'In Progress'],
    ['paused', 'Paused'],
    ['completed', 'Completed'],
    ['abandoned', 'Abandoned'],
  ])('formats %s as "%s"', (status, expected) => {
    expect(formatStatus(status)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// requiresConfirmation
// ---------------------------------------------------------------------------
describe('requiresConfirmation', () => {
  it('returns true when transitioning to completed', () => {
    expect(requiresConfirmation('in_progress', 'completed')).toBe(true);
  });

  it('returns true when transitioning to abandoned from in_progress', () => {
    expect(requiresConfirmation('in_progress', 'abandoned')).toBe(true);
  });

  it('returns true when transitioning to abandoned from paused', () => {
    expect(requiresConfirmation('paused', 'abandoned')).toBe(true);
  });

  it('returns true when restarting (abandoned -> in_progress)', () => {
    expect(requiresConfirmation('abandoned', 'in_progress')).toBe(true);
  });

  it('returns false for not_started -> in_progress', () => {
    expect(requiresConfirmation('not_started', 'in_progress')).toBe(false);
  });

  it('returns false for in_progress -> paused', () => {
    expect(requiresConfirmation('in_progress', 'paused')).toBe(false);
  });

  it('returns false for paused -> in_progress (resume)', () => {
    expect(requiresConfirmation('paused', 'in_progress')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calcProgress
// ---------------------------------------------------------------------------
describe('calcProgress', () => {
  it('calculates normal percentage', () => {
    expect(calcProgress(3, 10)).toBe(30);
  });

  it('returns 0 when total is null', () => {
    expect(calcProgress(5, null)).toBe(0);
  });

  it('returns 0 when total is 0', () => {
    expect(calcProgress(5, 0)).toBe(0);
  });

  it('caps at 100 when completed exceeds total', () => {
    expect(calcProgress(15, 10)).toBe(100);
  });

  it('returns 0 when completed is 0', () => {
    expect(calcProgress(0, 10)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 1/3 = 33.333... -> 33
    expect(calcProgress(1, 3)).toBe(33);
  });
});

// ---------------------------------------------------------------------------
// calcDaysRemaining
// ---------------------------------------------------------------------------
describe('calcDaysRemaining', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns positive number for future date', () => {
    const result = calcDaysRemaining('2026-02-25');
    expect(result).toBe(5);
  });

  it('returns negative number for past date', () => {
    const result = calcDaysRemaining('2026-02-15');
    expect(result).toBe(-5);
  });

  it('returns null when targetDate is null', () => {
    expect(calcDaysRemaining(null)).toBeNull();
  });

  it('returns 0 for today', () => {
    const result = calcDaysRemaining('2026-02-20');
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// riskLevel
// ---------------------------------------------------------------------------
describe('riskLevel', () => {
  // Boundary: <= 25 is low
  it.each([
    [0, 'low'],
    [24, 'low'],
    [25, 'low'],
  ] as const)('returns "%s" -> %s (low boundary)', (score, expected) => {
    expect(riskLevel(score)).toBe(expected);
  });

  // Boundary: 26-50 is medium
  it.each([
    [26, 'medium'],
    [49, 'medium'],
    [50, 'medium'],
  ] as const)('returns "%s" -> %s (medium boundary)', (score, expected) => {
    expect(riskLevel(score)).toBe(expected);
  });

  // Boundary: 51-75 is high
  it.each([
    [51, 'high'],
    [74, 'high'],
    [75, 'high'],
  ] as const)('returns "%s" -> %s (high boundary)', (score, expected) => {
    expect(riskLevel(score)).toBe(expected);
  });

  // Boundary: > 75 is critical
  it.each([
    [76, 'critical'],
    [100, 'critical'],
  ] as const)('returns "%s" -> %s (critical boundary)', (score, expected) => {
    expect(riskLevel(score)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// getTransitionLabel
// ---------------------------------------------------------------------------
describe('getTransitionLabel', () => {
  it('returns "Start Course" for not_started -> in_progress', () => {
    expect(getTransitionLabel('not_started', 'in_progress')).toBe(
      'Start Course'
    );
  });

  it('returns "Pause" for in_progress -> paused', () => {
    expect(getTransitionLabel('in_progress', 'paused')).toBe('Pause');
  });

  it('returns "Mark Complete" for in_progress -> completed', () => {
    expect(getTransitionLabel('in_progress', 'completed')).toBe(
      'Mark Complete'
    );
  });

  it('returns "Abandon" for in_progress -> abandoned', () => {
    expect(getTransitionLabel('in_progress', 'abandoned')).toBe('Abandon');
  });

  it('returns "Resume" for paused -> in_progress', () => {
    expect(getTransitionLabel('paused', 'in_progress')).toBe('Resume');
  });

  it('returns "Abandon" for paused -> abandoned', () => {
    expect(getTransitionLabel('paused', 'abandoned')).toBe('Abandon');
  });

  it('returns "Restart" for abandoned -> in_progress', () => {
    expect(getTransitionLabel('abandoned', 'in_progress')).toBe('Restart');
  });

  it('returns fallback label for unmapped transitions', () => {
    // This is an invalid transition but tests the fallback branch
    expect(
      getTransitionLabel('completed', 'in_progress')
    ).toBe('Change to In Progress');
  });
});
