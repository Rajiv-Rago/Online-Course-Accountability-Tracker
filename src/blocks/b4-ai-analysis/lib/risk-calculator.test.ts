import { describe, it, expect } from 'vitest';
import {
  riskLevelFromScore,
  calculateAdjustedRisk,
  calculateExpectedProgress,
  type RiskContext,
} from './risk-calculator';

function baseCtx(overrides: Partial<RiskContext> = {}): RiskContext {
  return {
    daysInactive: 0,
    streakBroken: false,
    hoursLastWeek: 10,
    hoursPrevWeek: 10,
    progressPercent: 50,
    expectedProgressPercent: 50,
    daysUntilDeadline: 30,
    priority: 2,
    ...overrides,
  };
}

describe('riskLevelFromScore', () => {
  it.each([
    [0, 'low'],
    [24, 'low'],
    [25, 'medium'],
    [49, 'medium'],
    [50, 'high'],
    [74, 'high'],
    [75, 'critical'],
    [100, 'critical'],
  ] as const)('score %d -> %s', (score, expected) => {
    expect(riskLevelFromScore(score)).toBe(expected);
  });
});

describe('calculateAdjustedRisk', () => {
  it('returns base score when no adjustments apply', () => {
    const result = calculateAdjustedRisk(baseCtx(), 30);
    expect(result.score).toBe(30);
    expect(result.adjustments).toHaveLength(0);
  });

  it('adds +5 per day inactive after 2 days', () => {
    const result = calculateAdjustedRisk(baseCtx({ daysInactive: 5 }), 20);
    expect(result.adjustments).toContainEqual({ factor: 'Days inactive', delta: 15 });
    expect(result.score).toBe(35);
  });

  it('does not adjust for 2 or fewer inactive days', () => {
    const result = calculateAdjustedRisk(baseCtx({ daysInactive: 2 }), 20);
    expect(result.adjustments.find(a => a.factor === 'Days inactive')).toBeUndefined();
  });

  it('adds +10 when streak is broken', () => {
    const result = calculateAdjustedRisk(baseCtx({ streakBroken: true }), 20);
    expect(result.adjustments).toContainEqual({ factor: 'Streak broken', delta: 10 });
    expect(result.score).toBe(30);
  });

  it('adds +15 when study hours declined >50%', () => {
    const result = calculateAdjustedRisk(baseCtx({ hoursLastWeek: 2, hoursPrevWeek: 10 }), 20);
    expect(result.adjustments).toContainEqual({ factor: 'Study hours declining', delta: 15 });
    expect(result.score).toBe(35);
  });

  it('does not adjust hours decline when prevWeek is 0', () => {
    const result = calculateAdjustedRisk(baseCtx({ hoursLastWeek: 0, hoursPrevWeek: 0 }), 20);
    expect(result.adjustments.find(a => a.factor === 'Study hours declining')).toBeUndefined();
  });

  it('adds +10 when behind expected progress by >20%', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ progressPercent: 30, expectedProgressPercent: 60 }),
      20
    );
    expect(result.adjustments).toContainEqual({ factor: 'Behind expected progress', delta: 10 });
  });

  it('does not adjust when progress gap <= 20%', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ progressPercent: 40, expectedProgressPercent: 60 }),
      20
    );
    expect(result.adjustments.find(a => a.factor === 'Behind expected progress')).toBeUndefined();
  });

  it('adds +20 when deadline <7 days and progress <80%', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ daysUntilDeadline: 5, progressPercent: 50 }),
      20
    );
    expect(result.adjustments).toContainEqual({ factor: 'Deadline approaching', delta: 20 });
  });

  it('does not adjust deadline when progress >= 80%', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ daysUntilDeadline: 3, progressPercent: 85 }),
      20
    );
    expect(result.adjustments.find(a => a.factor === 'Deadline approaching')).toBeUndefined();
  });

  it('does not adjust deadline when null', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ daysUntilDeadline: null }),
      20
    );
    expect(result.adjustments.find(a => a.factor === 'Deadline approaching')).toBeUndefined();
  });

  it('adds priority amplification for priority 1', () => {
    const result = calculateAdjustedRisk(baseCtx({ priority: 1 }), 50);
    expect(result.adjustments).toContainEqual({ factor: 'Highest priority', delta: 5 });
    expect(result.score).toBe(55);
  });

  it('does not amplify for priority > 1', () => {
    const result = calculateAdjustedRisk(baseCtx({ priority: 2 }), 50);
    expect(result.adjustments.find(a => a.factor === 'Highest priority')).toBeUndefined();
  });

  it('clamps score to 100 max', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ daysInactive: 20, streakBroken: true, daysUntilDeadline: 2, progressPercent: 10, expectedProgressPercent: 80, hoursLastWeek: 0, hoursPrevWeek: 10, priority: 1 }),
      80
    );
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('clamps score to 0 min', () => {
    const result = calculateAdjustedRisk(baseCtx(), 0);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('returns correct risk level based on final score', () => {
    const result = calculateAdjustedRisk(baseCtx(), 60);
    expect(result.level).toBe('high');
  });

  it('combines multiple adjustments', () => {
    const result = calculateAdjustedRisk(
      baseCtx({ daysInactive: 5, streakBroken: true }),
      20
    );
    // +15 (inactive) + 10 (streak) = 45
    expect(result.score).toBe(45);
    expect(result.adjustments).toHaveLength(2);
  });
});

describe('calculateExpectedProgress', () => {
  it('returns 100 when target <= start', () => {
    expect(calculateExpectedProgress('2026-01-01', '2026-01-01', '2026-01-15')).toBe(100);
  });

  it('calculates correct progress at midpoint', () => {
    const result = calculateExpectedProgress('2026-01-01', '2026-03-01', '2026-01-30');
    expect(result).toBeGreaterThan(40);
    expect(result).toBeLessThan(60);
  });

  it('returns 0 when today equals start', () => {
    expect(calculateExpectedProgress('2026-01-01', '2026-12-31', '2026-01-01')).toBe(0);
  });

  it('caps at 100 when past target', () => {
    expect(calculateExpectedProgress('2026-01-01', '2026-02-01', '2026-06-01')).toBe(100);
  });
});
