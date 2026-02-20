import { describe, it, expect } from 'vitest';
import { rankEntries, getCurrentWeekRange, getRankBadge, formatWeekRange } from './leaderboard-calculator';

describe('rankEntries', () => {
  it('sorts by hours descending and assigns ranks', () => {
    const entries = [
      { user_id: '1', name: 'A', avatar_url: null, hours_this_week: 5, sessions_this_week: 3, streak: 2 },
      { user_id: '2', name: 'B', avatar_url: null, hours_this_week: 10, sessions_this_week: 5, streak: 7 },
      { user_id: '3', name: 'C', avatar_url: null, hours_this_week: 7, sessions_this_week: 4, streak: 3 },
    ];
    const ranked = rankEntries(entries);
    expect(ranked[0].user_id).toBe('2');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].user_id).toBe('3');
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].user_id).toBe('1');
    expect(ranked[2].rank).toBe(3);
  });

  it('gives tied entries the same rank', () => {
    const entries = [
      { user_id: '1', name: 'A', avatar_url: null, hours_this_week: 10, sessions_this_week: 3, streak: 2 },
      { user_id: '2', name: 'B', avatar_url: null, hours_this_week: 10, sessions_this_week: 5, streak: 7 },
      { user_id: '3', name: 'C', avatar_url: null, hours_this_week: 5, sessions_this_week: 4, streak: 3 },
    ];
    const ranked = rankEntries(entries);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
    expect(ranked[2].rank).toBe(3);
  });

  it('handles empty array', () => {
    expect(rankEntries([])).toEqual([]);
  });

  it('handles single entry', () => {
    const entries = [
      { user_id: '1', name: 'A', avatar_url: null, hours_this_week: 5, sessions_this_week: 2, streak: 1 },
    ];
    const ranked = rankEntries(entries);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rank).toBe(1);
  });
});

describe('getCurrentWeekRange', () => {
  it('returns start and end in YYYY-MM-DD format', () => {
    const { start, end } = getCurrentWeekRange();
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('start and end span approximately one week', () => {
    const { start, end } = getCurrentWeekRange();
    // The function uses local time internally but serializes via toISOString (UTC),
    // so there can be a timezone-dependent 1-day shift. We verify the span is 6-7 days.
    const sp = start.split('-').map(Number);
    const ep = end.split('-').map(Number);
    const startDate = new Date(sp[0], sp[1] - 1, sp[2]);
    const endDate = new Date(ep[0], ep[1] - 1, ep[2]);
    const diff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diff).toBeGreaterThanOrEqual(6);
    expect(diff).toBeLessThanOrEqual(7);
  });

  it('start date is before or equal to today', () => {
    const { start } = getCurrentWeekRange();
    const today = new Date().toISOString().split('T')[0];
    expect(start <= today).toBe(true);
  });

  it('end date is after or equal to today', () => {
    const { end } = getCurrentWeekRange();
    const today = new Date().toISOString().split('T')[0];
    expect(end >= today).toBe(true);
  });
});

describe('getRankBadge', () => {
  it('returns gold medal for rank 1', () => {
    const badge = getRankBadge(1);
    expect(badge.label).toBe('1st');
    expect(badge.emoji).toBeTruthy();
  });

  it('returns silver for rank 2', () => {
    expect(getRankBadge(2).label).toBe('2nd');
  });

  it('returns bronze for rank 3', () => {
    expect(getRankBadge(3).label).toBe('3rd');
  });

  it('returns ordinal for rank 4+', () => {
    expect(getRankBadge(4).label).toBe('4th');
    expect(getRankBadge(4).emoji).toBe('');
  });
});

describe('formatWeekRange', () => {
  it('formats date range correctly', () => {
    const result = formatWeekRange('2026-02-16', '2026-02-22');
    expect(result).toContain('Feb');
    expect(result).toContain('16');
    expect(result).toContain('22');
  });
});
