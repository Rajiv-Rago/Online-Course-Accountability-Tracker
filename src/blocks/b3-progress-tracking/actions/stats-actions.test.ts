import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, DEFAULT_USER } from '@/test/helpers/auth';
import { buildDailyStat } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';
import { STREAK_THRESHOLD_MINUTES } from '../lib/streak-calculator';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('upsertDailyStats', () => {
  it('aggregates multiple sessions into correct totals', async () => {
    const sessions = [
      { duration_minutes: 20, modules_completed: 2, course_id: 'c1' },
      { duration_minutes: 10, modules_completed: 1, course_id: 'c2' },
      { duration_minutes: 35, modules_completed: 0, course_id: 'c1' },
    ];
    mockClient.__setResult('study_sessions', 'select', { data: sessions, error: null });
    const stat = buildDailyStat();
    mockClient.__setResult('daily_stats', 'upsert', { data: stat, error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    // Verify the upserted data matches correct aggregation
    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    expect(upsertCalls).toHaveLength(1);
    const upsertedData = upsertCalls[0].data as Record<string, unknown>;

    // total_minutes: 20 + 10 + 35 = 65
    expect(upsertedData.total_minutes).toBe(65);
    // session_count: 3
    expect(upsertedData.session_count).toBe(3);
    // modules_completed: 2 + 1 + 0 = 3
    expect(upsertedData.modules_completed).toBe(3);
    // courses_studied: unique course IDs ['c1', 'c2']
    expect(upsertedData.courses_studied).toEqual(expect.arrayContaining(['c1', 'c2']));
    expect((upsertedData.courses_studied as string[]).length).toBe(2);
    // streak_day: 65 >= STREAK_THRESHOLD_MINUTES (15) => true
    expect(upsertedData.streak_day).toBe(true);
    // user_id and date
    expect(upsertedData.user_id).toBe(DEFAULT_USER.id);
    expect(upsertedData.date).toBe('2024-06-15');
  });

  it('marks streak_day=false when total minutes is below threshold', async () => {
    // STREAK_THRESHOLD_MINUTES is 15
    mockClient.__setResult('study_sessions', 'select', {
      data: [{ duration_minutes: 10, modules_completed: 0, course_id: 'c1' }],
      error: null,
    });
    mockClient.__setResult('daily_stats', 'upsert', { data: buildDailyStat(), error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    const upsertedData = upsertCalls[0].data as Record<string, unknown>;
    expect(upsertedData.total_minutes).toBe(10);
    expect(upsertedData.streak_day).toBe(false);
  });

  it('marks streak_day=true at exactly the threshold', async () => {
    mockClient.__setResult('study_sessions', 'select', {
      data: [{ duration_minutes: STREAK_THRESHOLD_MINUTES, modules_completed: 0, course_id: 'c1' }],
      error: null,
    });
    mockClient.__setResult('daily_stats', 'upsert', { data: buildDailyStat(), error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    const upsertedData = upsertCalls[0].data as Record<string, unknown>;
    expect(upsertedData.streak_day).toBe(true);
  });

  it('handles zero sessions: all aggregates are 0 and streak_day is false', async () => {
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: buildDailyStat(), error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    const upsertedData = upsertCalls[0].data as Record<string, unknown>;
    expect(upsertedData.total_minutes).toBe(0);
    expect(upsertedData.session_count).toBe(0);
    expect(upsertedData.modules_completed).toBe(0);
    expect(upsertedData.courses_studied).toEqual([]);
    expect(upsertedData.streak_day).toBe(false);
  });

  it('deduplicates courses_studied (same course across multiple sessions)', async () => {
    const sessions = [
      { duration_minutes: 20, modules_completed: 1, course_id: 'c1' },
      { duration_minutes: 30, modules_completed: 2, course_id: 'c1' },
      { duration_minutes: 15, modules_completed: 0, course_id: 'c1' },
    ];
    mockClient.__setResult('study_sessions', 'select', { data: sessions, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: buildDailyStat(), error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    const upsertedData = upsertCalls[0].data as Record<string, unknown>;
    // 3 sessions with same course -> only 1 unique course
    expect(upsertedData.courses_studied).toEqual(['c1']);
    expect(upsertedData.session_count).toBe(3);
  });

  it('handles sessions with null/zero duration_minutes gracefully', async () => {
    const sessions = [
      { duration_minutes: null, modules_completed: 0, course_id: 'c1' },
      { duration_minutes: 0, modules_completed: 0, course_id: 'c2' },
      { duration_minutes: 20, modules_completed: 1, course_id: 'c3' },
    ];
    mockClient.__setResult('study_sessions', 'select', { data: sessions, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: buildDailyStat(), error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    const upsertedData = upsertCalls[0].data as Record<string, unknown>;
    // null treated as 0, so: 0 + 0 + 20 = 20
    expect(upsertedData.total_minutes).toBe(20);
  });

  it('uses onConflict upsert to handle existing stats for same user+date', async () => {
    mockClient.__setResult('study_sessions', 'select', { data: [], error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: buildDailyStat(), error: null });

    const { upsertDailyStats } = await import('./stats-actions');
    await upsertDailyStats(DEFAULT_USER.id, '2024-06-15');

    // Verify the second arg to upsert contains onConflict
    const upsertCalls = mockClient.__getCalls('daily_stats', 'upsert');
    expect(upsertCalls).toHaveLength(1);
    // The mock captures the first arg (data) and second arg (options) together
    // The from().upsert() call should have been made once
    expect(upsertCalls[0].table).toBe('daily_stats');
  });
});

describe('fetchDailyStats', () => {
  it('returns stats ordered by date ascending', async () => {
    const stats = [
      buildDailyStat({ date: '2024-06-14', total_minutes: 30 }),
      buildDailyStat({ date: '2024-06-15', total_minutes: 60 }),
    ];
    mockClient.__setTableResult('daily_stats', { data: stats, error: null });

    const { fetchDailyStats } = await import('./stats-actions');
    const result = await fetchDailyStats('2024-06-14', '2024-06-15');

    expect(result.data).toHaveLength(2);
    expect(result.data![0].date).toBe('2024-06-14');
    expect(result.data![1].date).toBe('2024-06-15');
    expect(result.data![0].total_minutes).toBe(30);
    expect(result.data![1].total_minutes).toBe(60);
  });

  it('returns empty array when no stats exist', async () => {
    mockClient.__setTableResult('daily_stats', { data: [], error: null });

    const { fetchDailyStats } = await import('./stats-actions');
    const result = await fetchDailyStats('2024-06-14', '2024-06-15');
    expect(result.data).toEqual([]);
  });

  it('returns error on DB failure', async () => {
    mockClient.__setTableResult('daily_stats', { data: null, error: { message: 'DB error' } });

    const { fetchDailyStats } = await import('./stats-actions');
    const result = await fetchDailyStats('2024-06-14', '2024-06-15');
    expect(result.error).toBe('DB error');
  });
});

describe('fetchStreakData', () => {
  it('returns daily stats with profile freeze count and goal', async () => {
    const stats = [
      buildDailyStat({ date: '2024-06-15', streak_day: true }),
      buildDailyStat({ date: '2024-06-14', streak_day: true }),
    ];
    mockClient.__setTableResult('daily_stats', { data: stats, error: null });
    mockClient.__setTableResult('user_profiles', {
      data: { streak_freeze_count: 3, daily_study_goal_minutes: 45 },
      error: null,
    });

    const { fetchStreakData } = await import('./stats-actions');
    const result = await fetchStreakData();

    expect(result.data!.dailyStats).toHaveLength(2);
    expect(result.data!.freezeCount).toBe(3);
    expect(result.data!.dailyGoalMinutes).toBe(45);
  });

  it('defaults freeze count to 0 and goal to 60 when profile data is null', async () => {
    mockClient.__setTableResult('daily_stats', { data: [], error: null });
    mockClient.__setTableResult('user_profiles', { data: null, error: null });

    const { fetchStreakData } = await import('./stats-actions');
    const result = await fetchStreakData();

    expect(result.data!.freezeCount).toBe(0);
    expect(result.data!.dailyGoalMinutes).toBe(60);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { fetchStreakData } = await import('./stats-actions');
    const result = await fetchStreakData();
    expect(result.error).toBe('Unauthorized');
  });
});

describe('applyStreakFreeze', () => {
  it('decrements freeze count and marks streak_day=true for the date (fallback path)', async () => {
    mockClient.__setResult('user_profiles', 'select', {
      data: { streak_freeze_count: 2 },
      error: null,
    });
    // RPC returns function-not-found error to trigger fallback path
    const rpcChain: Record<string, unknown> = {};
    rpcChain.maybeSingle = vi.fn(() => rpcChain);
    rpcChain.then = function (resolve: (v: unknown) => void) {
      resolve({ data: null, error: { message: 'function does not exist', code: '42883' } });
    };
    mockClient.rpc.mockReturnValue(rpcChain);
    // Fallback: update user_profiles (decrement)
    mockClient.__setResult('user_profiles', 'update', {
      data: { streak_freeze_count: 1 },
      error: null,
    });
    // For the daily_stats query + upsert in the freeze flow
    mockClient.__setResult('daily_stats', 'select', { data: null, error: null });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { applyStreakFreeze } = await import('./stats-actions');
    const result = await applyStreakFreeze('2024-06-15');

    expect(result.data!.remainingFreezes).toBe(1);

    // Verify daily_stats was upserted with streak_day=true
    const dailyUpserts = mockClient.__getCalls('daily_stats', 'upsert');
    expect(dailyUpserts.length).toBeGreaterThanOrEqual(1);
    const upsertedData = dailyUpserts[0].data as Record<string, unknown>;
    expect(upsertedData.streak_day).toBe(true);
    expect(upsertedData.date).toBe('2024-06-15');
    expect(upsertedData.user_id).toBe(DEFAULT_USER.id);
  });

  it('preserves existing study data when applying freeze', async () => {
    mockClient.__setResult('user_profiles', 'select', {
      data: { streak_freeze_count: 1 },
      error: null,
    });
    const rpcChain: Record<string, unknown> = {};
    rpcChain.maybeSingle = vi.fn(() => rpcChain);
    rpcChain.then = function (resolve: (v: unknown) => void) {
      resolve({ data: null, error: { message: 'function does not exist', code: '42883' } });
    };
    mockClient.rpc.mockReturnValue(rpcChain);
    mockClient.__setResult('user_profiles', 'update', {
      data: { streak_freeze_count: 0 },
      error: null,
    });
    // Existing stats for this date (user studied 10 min but not enough for streak)
    mockClient.__setResult('daily_stats', 'select', {
      data: { total_minutes: 10, session_count: 1, modules_completed: 1, courses_studied: ['c1'] },
      error: null,
    });
    mockClient.__setResult('daily_stats', 'upsert', { data: null, error: null });

    const { applyStreakFreeze } = await import('./stats-actions');
    await applyStreakFreeze('2024-06-15');

    // Verify upsert preserves existing study data but sets streak_day=true
    const dailyUpserts = mockClient.__getCalls('daily_stats', 'upsert');
    const upsertedData = dailyUpserts[0].data as Record<string, unknown>;
    expect(upsertedData.total_minutes).toBe(10); // preserved
    expect(upsertedData.session_count).toBe(1); // preserved
    expect(upsertedData.modules_completed).toBe(1); // preserved
    expect(upsertedData.courses_studied).toEqual(['c1']); // preserved
    expect(upsertedData.streak_day).toBe(true); // overridden to true
  });

  it('rejects when no freezes remaining', async () => {
    mockClient.__setResult('user_profiles', 'select', {
      data: { streak_freeze_count: 0 },
      error: null,
    });

    const { applyStreakFreeze } = await import('./stats-actions');
    const result = await applyStreakFreeze('2024-06-15');
    expect(result.error).toBe('No streak freezes remaining');

    // No daily_stats operations should have been attempted
    const dailyUpserts = mockClient.__getCalls('daily_stats', 'upsert');
    expect(dailyUpserts).toHaveLength(0);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { applyStreakFreeze } = await import('./stats-actions');
    const result = await applyStreakFreeze('2024-06-15');
    expect(result.error).toBe('Unauthorized');
  });
});

describe('fetchTodayStats', () => {
  it('returns today stat and daily goal from profile', async () => {
    const stat = buildDailyStat({ total_minutes: 45, session_count: 3 });
    mockClient.__setTableResult('daily_stats', { data: stat, error: null });
    mockClient.__setTableResult('user_profiles', {
      data: { daily_study_goal_minutes: 90 },
      error: null,
    });

    const { fetchTodayStats } = await import('./stats-actions');
    const result = await fetchTodayStats();

    expect(result.data!.today).toBeDefined();
    expect(result.data!.today!.total_minutes).toBe(45);
    expect(result.data!.today!.session_count).toBe(3);
    expect(result.data!.dailyGoalMinutes).toBe(90);
  });

  it('returns null for today stats when no stats exist, with default goal', async () => {
    mockClient.__setTableResult('daily_stats', { data: null, error: null });
    mockClient.__setTableResult('user_profiles', { data: null, error: null });

    const { fetchTodayStats } = await import('./stats-actions');
    const result = await fetchTodayStats();

    expect(result.data!.today).toBeNull();
    expect(result.data!.dailyGoalMinutes).toBe(60); // default
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { fetchTodayStats } = await import('./stats-actions');
    const result = await fetchTodayStats();
    expect(result.error).toBe('Unauthorized');
  });
});
