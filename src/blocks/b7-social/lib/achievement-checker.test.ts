import { describe, it, expect } from 'vitest';
import {
  checkFirstSession,
  checkStreak,
  checkNightOwl,
  checkEarlyBird,
  checkMarathon,
  checkConsistencyKing,
  checkSpeedLearner,
  checkComebackKid,
  checkPerfectionist,
  checkExplorer,
  checkDedication,
  checkSocialButterfly,
  calculateProgress,
  calculateConsecutiveStreak,
  countNightSessions,
  countEarlySessions,
} from './achievement-checker';

describe('checkFirstSession', () => {
  it('returns false for 0 sessions', () => expect(checkFirstSession(0)).toBe(false));
  it('returns true for 1 session', () => expect(checkFirstSession(1)).toBe(true));
  it('returns true for many sessions', () => expect(checkFirstSession(50)).toBe(true));
});

describe('checkStreak', () => {
  it('returns false below required', () => expect(checkStreak(6, 7)).toBe(false));
  it('returns true at required', () => expect(checkStreak(7, 7)).toBe(true));
  it('returns true above required', () => expect(checkStreak(10, 7)).toBe(true));
});

describe('checkNightOwl', () => {
  it('returns false for 4 night sessions', () => expect(checkNightOwl(4)).toBe(false));
  it('returns true for 5 night sessions', () => expect(checkNightOwl(5)).toBe(true));
});

describe('checkEarlyBird', () => {
  it('returns false for 4 early sessions', () => expect(checkEarlyBird(4)).toBe(false));
  it('returns true for 5 early sessions', () => expect(checkEarlyBird(5)).toBe(true));
});

describe('checkMarathon', () => {
  it('returns false when no session >= 180 min', () => {
    expect(checkMarathon([{ duration_minutes: 120 }, { duration_minutes: 90 }])).toBe(false);
  });
  it('returns true when a session is exactly 180 min', () => {
    expect(checkMarathon([{ duration_minutes: 180 }])).toBe(true);
  });
  it('returns true when a session is over 180 min', () => {
    expect(checkMarathon([{ duration_minutes: 60 }, { duration_minutes: 200 }])).toBe(true);
  });
  it('returns false for empty sessions', () => {
    expect(checkMarathon([])).toBe(false);
  });
});

describe('checkConsistencyKing', () => {
  it('returns false with fewer than 14 entries', () => {
    const stats = Array.from({ length: 13 }, () => ({ total_minutes: 60 }));
    expect(checkConsistencyKing(stats)).toBe(false);
  });

  it('returns false when mean is 0', () => {
    const stats = Array.from({ length: 14 }, () => ({ total_minutes: 0 }));
    expect(checkConsistencyKing(stats)).toBe(false);
  });

  it('returns true with very consistent study times (low variance)', () => {
    const stats = Array.from({ length: 14 }, () => ({ total_minutes: 60 }));
    expect(checkConsistencyKing(stats)).toBe(true);
  });

  it('returns false with high variance in study times', () => {
    const stats = [
      ...Array.from({ length: 7 }, () => ({ total_minutes: 120 })),
      ...Array.from({ length: 7 }, () => ({ total_minutes: 10 })),
    ];
    expect(checkConsistencyKing(stats)).toBe(false);
  });
});

describe('checkSpeedLearner', () => {
  it('returns true when completed before target date', () => {
    expect(checkSpeedLearner({
      status: 'completed',
      target_completion_date: '2026-06-01',
      updated_at: '2026-05-15T10:00:00Z',
    })).toBe(true);
  });

  it('returns false when completed after target date', () => {
    expect(checkSpeedLearner({
      status: 'completed',
      target_completion_date: '2026-03-01',
      updated_at: '2026-04-01T10:00:00Z',
    })).toBe(false);
  });

  it('returns false when not completed', () => {
    expect(checkSpeedLearner({
      status: 'in_progress',
      target_completion_date: '2026-06-01',
      updated_at: '2026-02-01T10:00:00Z',
    })).toBe(false);
  });

  it('returns false when no target date', () => {
    expect(checkSpeedLearner({
      status: 'completed',
      target_completion_date: null,
      updated_at: '2026-02-01T10:00:00Z',
    })).toBe(false);
  });
});

describe('checkComebackKid', () => {
  it('returns true when completed and was paused', () => {
    expect(checkComebackKid({ status: 'completed' }, true)).toBe(true);
  });
  it('returns false when completed but was not paused', () => {
    expect(checkComebackKid({ status: 'completed' }, false)).toBe(false);
  });
  it('returns false when not completed', () => {
    expect(checkComebackKid({ status: 'in_progress' }, true)).toBe(false);
  });
});

describe('checkPerfectionist', () => {
  it('returns true when all modules completed', () => {
    expect(checkPerfectionist({ completed_modules: 20, total_modules: 20 })).toBe(true);
  });
  it('returns false when not all modules completed', () => {
    expect(checkPerfectionist({ completed_modules: 19, total_modules: 20 })).toBe(false);
  });
  it('returns false when total_modules is null', () => {
    expect(checkPerfectionist({ completed_modules: 5, total_modules: null })).toBe(false);
  });
  it('returns false when total_modules is 0', () => {
    expect(checkPerfectionist({ completed_modules: 0, total_modules: 0 })).toBe(false);
  });
});

describe('checkExplorer', () => {
  it('returns false for 2 platforms', () => expect(checkExplorer(2)).toBe(false));
  it('returns true for 3 platforms', () => expect(checkExplorer(3)).toBe(true));
});

describe('checkDedication', () => {
  it('returns false for 5999 minutes', () => expect(checkDedication(5999)).toBe(false));
  it('returns true for 6000 minutes', () => expect(checkDedication(6000)).toBe(true));
});

describe('checkSocialButterfly', () => {
  it('returns false for 4 buddies', () => expect(checkSocialButterfly(4)).toBe(false));
  it('returns true for 5 buddies', () => expect(checkSocialButterfly(5)).toBe(true));
});

describe('calculateProgress', () => {
  it('first_session: caps at target', () => {
    expect(calculateProgress('first_session', { sessionCount: 5 })).toEqual({ current: 1, target: 1 });
  });

  it('streak_7: returns current streak', () => {
    expect(calculateProgress('streak_7', { consecutiveStreak: 3 })).toEqual({ current: 3, target: 7 });
  });

  it('dedication: caps at 6000', () => {
    expect(calculateProgress('dedication', { totalMinutes: 7000 })).toEqual({ current: 6000, target: 6000 });
  });

  it('explorer: returns platform count', () => {
    expect(calculateProgress('explorer', { distinctPlatforms: 2 })).toEqual({ current: 2, target: 3 });
  });

  it('unknown type returns 0/1', () => {
    expect(calculateProgress('marathon' as any, {})).toEqual({ current: 0, target: 1 });
  });

  it('handles missing data gracefully', () => {
    expect(calculateProgress('streak_30', {})).toEqual({ current: 0, target: 30 });
  });
});

describe('calculateConsecutiveStreak', () => {
  it('returns 0 for empty array', () => {
    expect(calculateConsecutiveStreak([])).toBe(0);
  });

  it('counts consecutive true values from start', () => {
    expect(calculateConsecutiveStreak([
      { date: '2026-02-20', streak_day: true },
      { date: '2026-02-19', streak_day: true },
      { date: '2026-02-18', streak_day: true },
    ])).toBe(3);
  });

  it('stops at first false', () => {
    expect(calculateConsecutiveStreak([
      { date: '2026-02-20', streak_day: true },
      { date: '2026-02-19', streak_day: false },
      { date: '2026-02-18', streak_day: true },
    ])).toBe(1);
  });

  it('returns 0 when first entry is false', () => {
    expect(calculateConsecutiveStreak([
      { date: '2026-02-20', streak_day: false },
      { date: '2026-02-19', streak_day: true },
    ])).toBe(0);
  });
});

describe('countNightSessions', () => {
  it('counts sessions at 22:00+', () => {
    const sessions = [
      { started_at: '2026-02-20T22:00:00Z' },
      { started_at: '2026-02-20T23:30:00Z' },
      { started_at: '2026-02-20T21:59:00Z' },
    ];
    expect(countNightSessions(sessions, 'UTC')).toBe(2);
  });

  it('returns 0 for no night sessions', () => {
    const sessions = [{ started_at: '2026-02-20T14:00:00Z' }];
    expect(countNightSessions(sessions, 'UTC')).toBe(0);
  });
});

describe('countEarlySessions', () => {
  it('counts sessions before 7:00', () => {
    const sessions = [
      { started_at: '2026-02-20T05:00:00Z' },
      { started_at: '2026-02-20T06:59:00Z' },
      { started_at: '2026-02-20T07:00:00Z' },
    ];
    expect(countEarlySessions(sessions, 'UTC')).toBe(2);
  });

  it('returns 0 for no early sessions', () => {
    const sessions = [{ started_at: '2026-02-20T10:00:00Z' }];
    expect(countEarlySessions(sessions, 'UTC')).toBe(0);
  });
});
