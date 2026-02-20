import { describe, it, expect } from 'vitest';
import {
  STREAK_THRESHOLD_MINUTES,
  calculateStreaks,
} from './streak-calculator';

// Helper to create a daily stat entry
function stat(
  date: string,
  streakDay: boolean,
  totalMinutes: number
): { date: string; streak_day: boolean; total_minutes: number } {
  return { date, streak_day: streakDay, total_minutes: totalMinutes };
}

// Fixed "today" for all tests: 2026-02-20 at noon UTC
const TODAY = new Date('2026-02-20T12:00:00Z');

describe('STREAK_THRESHOLD_MINUTES', () => {
  it('is 15', () => {
    expect(STREAK_THRESHOLD_MINUTES).toBe(15);
  });
});

describe('calculateStreaks', () => {
  // -------------------------------------------------------------------------
  // Empty data
  // -------------------------------------------------------------------------
  it('returns all zeros for empty data', () => {
    const result = calculateStreaks([], TODAY);
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      isStudiedToday: false,
    });
  });

  // -------------------------------------------------------------------------
  // Single study day
  // -------------------------------------------------------------------------
  it('returns streak=1 for a single study day today', () => {
    const result = calculateStreaks(
      [stat('2026-02-20', true, 30)],
      TODAY
    );
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isStudiedToday).toBe(true);
    expect(result.lastStudyDate).toBe('2026-02-20');
  });

  it('returns streak=1 for a single study day yesterday (grace period)', () => {
    const result = calculateStreaks(
      [stat('2026-02-19', true, 30)],
      TODAY
    );
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isStudiedToday).toBe(false);
    expect(result.lastStudyDate).toBe('2026-02-19');
  });

  // -------------------------------------------------------------------------
  // Consecutive days
  // -------------------------------------------------------------------------
  it('returns streak=5 for 5 consecutive days ending today', () => {
    const data = [
      stat('2026-02-20', true, 30),
      stat('2026-02-19', true, 25),
      stat('2026-02-18', true, 40),
      stat('2026-02-17', true, 20),
      stat('2026-02-16', true, 35),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.isStudiedToday).toBe(true);
  });

  it('returns streak=5 for 5 consecutive days ending yesterday (grace period)', () => {
    const data = [
      stat('2026-02-19', true, 30),
      stat('2026-02-18', true, 25),
      stat('2026-02-17', true, 40),
      stat('2026-02-16', true, 20),
      stat('2026-02-15', true, 35),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.isStudiedToday).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Gap in middle breaks current streak
  // -------------------------------------------------------------------------
  it('breaks current streak at a gap and tracks longest separately', () => {
    // 4-day streak earlier, then gap, then 2-day streak ending today
    const data = [
      stat('2026-02-20', true, 30),
      stat('2026-02-19', true, 30),
      // gap on 2026-02-18
      stat('2026-02-17', true, 30),
      stat('2026-02-16', true, 30),
      stat('2026-02-15', true, 30),
      stat('2026-02-14', true, 30),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(4);
  });

  // -------------------------------------------------------------------------
  // Freeze day counts as valid streak day
  // -------------------------------------------------------------------------
  it('counts freeze days (streak_day=true, minutes=0) as valid streak days', () => {
    const data = [
      stat('2026-02-20', true, 30),
      stat('2026-02-19', true, 0), // freeze day
      stat('2026-02-18', true, 45),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  // -------------------------------------------------------------------------
  // No recent study (2+ days ago)
  // -------------------------------------------------------------------------
  it('returns currentStreak=0 when last study was 2+ days ago', () => {
    const data = [
      stat('2026-02-17', true, 30),
      stat('2026-02-16', true, 30),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2);
    expect(result.lastStudyDate).toBe('2026-02-17');
  });

  // -------------------------------------------------------------------------
  // Longest streak vs current streak
  // -------------------------------------------------------------------------
  it('longest streak exceeds current streak when historical streak was longer', () => {
    // Historical 5-day streak, then gap, then current 2-day streak
    const data = [
      stat('2026-02-20', true, 30),
      stat('2026-02-19', true, 30),
      // gap on 2026-02-18
      stat('2026-02-10', true, 30),
      stat('2026-02-09', true, 30),
      stat('2026-02-08', true, 30),
      stat('2026-02-07', true, 30),
      stat('2026-02-06', true, 30),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(5);
  });

  // -------------------------------------------------------------------------
  // isStudiedToday flag
  // -------------------------------------------------------------------------
  it('sets isStudiedToday=true when today has streak_day=true', () => {
    const data = [stat('2026-02-20', true, 30)];
    const result = calculateStreaks(data, TODAY);
    expect(result.isStudiedToday).toBe(true);
  });

  it('sets isStudiedToday=false when today has no study', () => {
    const data = [stat('2026-02-19', true, 30)];
    const result = calculateStreaks(data, TODAY);
    expect(result.isStudiedToday).toBe(false);
  });

  it('sets isStudiedToday=false when today has streak_day=false', () => {
    const data = [stat('2026-02-20', false, 5)]; // below threshold, not a streak day
    const result = calculateStreaks(data, TODAY);
    expect(result.isStudiedToday).toBe(false);
  });

  // -------------------------------------------------------------------------
  // lastStudyDate correctness
  // -------------------------------------------------------------------------
  it('returns the most recent study date as lastStudyDate', () => {
    const data = [
      stat('2026-02-15', true, 30),
      stat('2026-02-18', true, 30),
      stat('2026-02-10', true, 30),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.lastStudyDate).toBe('2026-02-18');
  });

  it('returns null lastStudyDate when no days have streak_day=true', () => {
    const data = [stat('2026-02-20', false, 5)];
    const result = calculateStreaks(data, TODAY);
    expect(result.lastStudyDate).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  it('handles data with all streak_day=false', () => {
    const data = [
      stat('2026-02-20', false, 10),
      stat('2026-02-19', false, 5),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.lastStudyDate).toBeNull();
    expect(result.isStudiedToday).toBe(false);
  });

  it('handles a long streak with freeze days interspersed', () => {
    const data = [
      stat('2026-02-20', true, 30),
      stat('2026-02-19', true, 0), // freeze
      stat('2026-02-18', true, 45),
      stat('2026-02-17', true, 0), // freeze
      stat('2026-02-16', true, 20),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it('current streak equals longest when it is the only streak', () => {
    const data = [
      stat('2026-02-20', true, 30),
      stat('2026-02-19', true, 30),
      stat('2026-02-18', true, 30),
    ];
    const result = calculateStreaks(data, TODAY);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });
});
