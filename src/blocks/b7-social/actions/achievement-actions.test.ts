import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, setMockAdminClient, DEFAULT_USER } from '@/test/helpers/auth';
import { buildAchievement } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
  await setMockAdminClient();
});

describe('getAchievements', () => {
  it('separates earned and locked achievements', async () => {
    const earned = [buildAchievement({ achievement_type: 'first_session' })];
    mockClient.__setResult('achievements', 'select', { data: earned, error: null });
    mockClient.__setResult('study_sessions', 'select', { data: [
      { id: 's1', started_at: '2024-06-15T14:00:00Z', duration_minutes: 30 },
    ], error: null });
    mockClient.__setResult('daily_stats', 'select', { data: [
      { date: '2024-06-15', total_minutes: 30, streak_day: true },
    ], error: null });
    mockClient.__setResult('courses', 'select', { data: [
      { id: 'c1', platform: 'udemy', status: 'in_progress', completed_modules: 5, total_modules: 10 },
    ], error: null });
    mockClient.__setResult('study_buddies', 'select', { data: [], error: null });
    mockClient.__setResult('user_profiles', 'select', { data: { timezone: 'UTC' }, error: null });

    const { getAchievements } = await import('./achievement-actions');
    const result = await getAchievements();

    expect(result.data!.earned).toHaveLength(1);
    expect(result.data!.earned[0].achievement_type).toBe('first_session');

    // Locked should contain all achievement types NOT already earned
    expect(result.data!.locked.length).toBeGreaterThan(0);
    // first_session should NOT appear in locked (it's earned)
    const lockedTypes = result.data!.locked.map((l) => l.achievement_type);
    expect(lockedTypes).not.toContain('first_session');
  });

  it('calculates progress for locked achievements', async () => {
    // No achievements earned yet
    mockClient.__setResult('achievements', 'select', { data: [], error: null });
    // 1 session (first_session threshold = 1)
    mockClient.__setResult('study_sessions', 'select', { data: [
      { id: 's1', started_at: '2024-06-15T14:00:00Z', duration_minutes: 30 },
    ], error: null });
    // Streak days
    mockClient.__setResult('daily_stats', 'select', { data: [
      { date: '2024-06-15', total_minutes: 30, streak_day: true },
      { date: '2024-06-14', total_minutes: 45, streak_day: true },
      { date: '2024-06-13', total_minutes: 20, streak_day: true },
    ], error: null });
    mockClient.__setResult('courses', 'select', { data: [], error: null });
    mockClient.__setResult('study_buddies', 'select', { data: [], error: null });
    mockClient.__setResult('user_profiles', 'select', { data: { timezone: 'UTC' }, error: null });

    const { getAchievements } = await import('./achievement-actions');
    const result = await getAchievements();

    // streak_7 requires 7 consecutive days, we have 3 -> progress should be 3/7
    const streak7 = result.data!.locked.find((l) => l.achievement_type === 'streak_7');
    expect(streak7).toBeDefined();
    expect(streak7!.current).toBe(3);
    expect(streak7!.target).toBe(7);
    expect(streak7!.progress).toBe(Math.round((3 / 7) * 100));
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { getAchievements } = await import('./achievement-actions');
    const result = await getAchievements();
    expect(result.error).toBe('Unauthorized');
  });
});

describe('checkAchievements', () => {
  it('skips achievements that are already earned', async () => {
    // first_session is already earned
    mockClient.__setResult('achievements', 'select', {
      data: [{ achievement_type: 'first_session', course_id: null }],
      error: null,
    });
    mockClient.__setResult('user_profiles', 'select', { data: { timezone: 'UTC' }, error: null });
    // 1 session exists (would qualify for first_session if not already earned)
    mockClient.__setResult('study_sessions', 'select', { data: [
      { id: 's1', started_at: '2024-06-15T14:00:00Z', duration_minutes: 30 },
    ], error: null });
    mockClient.__setResult('daily_stats', 'select', { data: [], error: null });
    mockClient.__setResult('courses', 'select', { data: [], error: null });
    mockClient.__setResult('study_buddies', 'select', { data: [], error: null });

    const { checkAchievements } = await import('./achievement-actions');
    const result = await checkAchievements('session_logged');

    // first_session is already earned, so should NOT appear in newly earned
    expect(result.data).toBeDefined();
    const earnedTypes = result.data!.map((a) => a.achievement_type);
    expect(earnedTypes).not.toContain('first_session');
  });

  it('awards first_session when conditions are met and not previously earned', async () => {
    // No achievements earned yet
    mockClient.__setResult('achievements', 'select', { data: [], error: null });
    mockClient.__setResult('user_profiles', 'select', { data: { timezone: 'UTC' }, error: null });
    // 1 session exists
    mockClient.__setResult('study_sessions', 'select', { data: [
      { id: 's1', started_at: '2024-06-15T14:00:00Z', duration_minutes: 30 },
    ], error: null });
    mockClient.__setResult('daily_stats', 'select', { data: [
      { date: '2024-06-15', total_minutes: 30, streak_day: true, session_count: 1 },
    ], error: null });
    mockClient.__setResult('courses', 'select', { data: [], error: null });
    mockClient.__setResult('study_buddies', 'select', { data: [], error: null });

    // Mock the insert for newly earned achievement
    const newAchievement = buildAchievement({ achievement_type: 'first_session' });
    mockClient.__setResult('achievements', 'insert', { data: newAchievement, error: null });
    // Mock the notification insert
    mockClient.__setResult('notifications', 'insert', { data: null, error: null });

    const { checkAchievements } = await import('./achievement-actions');
    const result = await checkAchievements('session_logged');

    expect(result.data!.length).toBeGreaterThanOrEqual(1);
    const firstSession = result.data!.find((a) => a.achievement_type === 'first_session');
    expect(firstSession).toBeDefined();

    // Verify achievement was inserted with trigger metadata
    const achievementInserts = mockClient.__getCalls('achievements', 'insert');
    expect(achievementInserts.length).toBeGreaterThanOrEqual(1);
    const insertedData = achievementInserts[0].data as Record<string, unknown>;
    expect(insertedData.user_id).toBe(DEFAULT_USER.id);
    expect(insertedData.achievement_type).toBe('first_session');
    expect(insertedData.metadata).toEqual({ trigger: 'session_logged' });

    // Verify a notification was created for the achievement
    const notifInserts = mockClient.__getCalls('notifications', 'insert');
    expect(notifInserts.length).toBeGreaterThanOrEqual(1);
    const notifData = notifInserts[0].data as Record<string, unknown>;
    expect(notifData.type).toBe('achievement');
    expect(notifData.title).toBe('Achievement Unlocked!');
    expect((notifData.message as string)).toContain('First Steps');
  });

  it('returns empty array for trigger with no eligible candidates', async () => {
    mockClient.__setResult('achievements', 'select', { data: [], error: null });

    const { checkAchievements } = await import('./achievement-actions');
    const result = await checkAchievements('buddy_count_changed');

    // buddy_count_changed only has social_butterfly as candidate,
    // but with 0 buddies it shouldn't qualify
    expect(result.data).toBeDefined();
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { checkAchievements } = await import('./achievement-actions');
    const result = await checkAchievements('session_logged');
    expect(result.error).toBe('Unauthorized');
  });
});

describe('shareAchievement', () => {
  it('updates shared flag to true', async () => {
    mockClient.__setResult('achievements', 'update', { data: null, error: null });

    const { shareAchievement } = await import('./achievement-actions');
    const result = await shareAchievement('00000000-0000-0000-0000-000000000050', true);
    expect(result.error).toBeUndefined();

    const updateCalls = mockClient.__getCalls('achievements', 'update');
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].data).toEqual({ shared: true });
  });

  it('updates shared flag to false (unshare)', async () => {
    mockClient.__setResult('achievements', 'update', { data: null, error: null });

    const { shareAchievement } = await import('./achievement-actions');
    const result = await shareAchievement('00000000-0000-0000-0000-000000000050', false);
    expect(result.error).toBeUndefined();

    const updateCalls = mockClient.__getCalls('achievements', 'update');
    expect(updateCalls[0].data).toEqual({ shared: false });
  });

  it('rejects invalid (non-UUID) achievement ID', async () => {
    const { shareAchievement } = await import('./achievement-actions');
    const result = await shareAchievement('not-a-uuid', true);
    expect(result.error).toBeDefined();

    // No DB calls should have been made
    const updateCalls = mockClient.__getCalls('achievements', 'update');
    expect(updateCalls).toHaveLength(0);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { shareAchievement } = await import('./achievement-actions');
    const result = await shareAchievement('00000000-0000-0000-0000-000000000050', true);
    expect(result.error).toBe('Unauthorized');
  });
});
