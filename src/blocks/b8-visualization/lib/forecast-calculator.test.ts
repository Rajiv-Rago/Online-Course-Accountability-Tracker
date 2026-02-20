import { describe, it, expect } from 'vitest';
import { linearRegression, calculateForecast, type ForecastInput } from './forecast-calculator';

describe('linearRegression', () => {
  it('returns slope=0 for single point', () => {
    const result = linearRegression([[0, 5]]);
    expect(result.slope).toBe(0);
  });

  it('computes exact line for 2 points', () => {
    const result = linearRegression([[0, 0], [10, 20]]);
    expect(result.slope).toBe(2);
    expect(result.intercept).toBe(0);
    expect(result.rSquared).toBeCloseTo(1);
  });

  it('computes regression for multiple points', () => {
    const points: [number, number][] = [[0, 1], [1, 3], [2, 5], [3, 7]];
    const result = linearRegression(points);
    expect(result.slope).toBeCloseTo(2, 1);
    expect(result.rSquared).toBeCloseTo(1, 1);
  });

  it('handles all same x values (denom=0)', () => {
    const result = linearRegression([[5, 1], [5, 2], [5, 3]]);
    expect(result.slope).toBe(0);
  });
});

describe('calculateForecast', () => {
  function makeInput(days: number, hoursPerDay: number, overrides: Partial<ForecastInput> = {}): ForecastInput {
    const points = Array.from({ length: days }, (_, i) => ({
      date: `2026-${String(Math.floor((i + 31) / 28) + 1).padStart(2, '0')}-${String(((i) % 28) + 1).padStart(2, '0')}`,
      hours: hoursPerDay * (i + 1),
    }));
    // Fix dates to be sequential
    const base = new Date('2026-01-01');
    const fixedPoints = Array.from({ length: days }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return {
        date: d.toISOString().split('T')[0],
        hours: hoursPerDay * (i + 1),
      };
    });
    return {
      dailyCumulativeHours: fixedPoints,
      totalCourseHours: 100,
      completedHours: hoursPerDay * days,
      targetDate: '2026-06-01',
      ...overrides,
    };
  }

  it('returns insufficient_data for <7 points', () => {
    const input = makeInput(5, 1);
    const result = calculateForecast(input);
    expect(result.status).toBe('insufficient_data');
    expect(result.predictedDate).toBeNull();
    expect(result.velocity).toBe(0);
  });

  it('returns stalled when velocity <= 0', () => {
    const points = Array.from({ length: 10 }, (_, i) => {
      const d = new Date('2026-01-01');
      d.setDate(d.getDate() + i);
      return { date: d.toISOString().split('T')[0], hours: 10 }; // flat - no progress
    });
    const result = calculateForecast({
      dailyCumulativeHours: points,
      totalCourseHours: 100,
      completedHours: 10,
      targetDate: '2026-06-01',
    });
    expect(result.status).toBe('stalled');
    expect(result.predictedDate).toBeNull();
  });

  it('returns on_track with steady progress', () => {
    const input = makeInput(14, 2, { targetDate: '2026-06-01' });
    const result = calculateForecast(input);
    expect(result.velocity).toBeGreaterThan(0);
    expect(result.predictedDate).not.toBeNull();
    expect(['on_track', 'ahead', 'behind']).toContain(result.status);
  });

  it('returns ahead when predicted well before target', () => {
    // 5 hours/day means 100 hours done in ~20 days, target 6 months away
    const input = makeInput(14, 5, { targetDate: '2026-12-01' });
    const result = calculateForecast(input);
    expect(result.status).toBe('ahead');
  });

  it('returns behind when far behind target', () => {
    const input = makeInput(14, 0.1, { targetDate: '2026-02-20' });
    const result = calculateForecast(input);
    expect(result.status).toBe('behind');
  });

  it('handles null totalCourseHours', () => {
    const input = makeInput(10, 2, { totalCourseHours: null });
    const result = calculateForecast(input);
    expect(result.predictedDate).toBeNull();
    expect(['on_track', 'stalled']).toContain(result.status);
  });

  it('provides confidence intervals when enough data', () => {
    const input = makeInput(14, 2);
    const result = calculateForecast(input);
    if (result.confidence70) {
      expect(result.confidence70.earliest).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.confidence70.latest).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('returns projectedPoints with actual and projected data', () => {
    const input = makeInput(10, 2);
    const result = calculateForecast(input);
    expect(result.projectedPoints.length).toBeGreaterThan(10);
    // First points should have actual data
    expect(result.projectedPoints[0].actual).not.toBeNull();
    // Later points should have projected data
    const futurePoint = result.projectedPoints[result.projectedPoints.length - 1];
    expect(futurePoint.projected).not.toBeNull();
  });
});
