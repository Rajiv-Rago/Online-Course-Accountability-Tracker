import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, setMockAdminClient, DEFAULT_USER } from '@/test/helpers/auth';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

const OTHER_USER_ID = '00000000-0000-0000-0000-000000000002';
const THIRD_USER_ID = '00000000-0000-0000-0000-000000000003';
let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
  await setMockAdminClient();
});

describe('getWeeklyLeaderboard', () => {
  it('ranks participants by weekly hours descending', async () => {
    mockClient.__setResult('study_buddies', 'select', {
      data: [
        { requester_id: DEFAULT_USER.id, recipient_id: OTHER_USER_ID },
        { requester_id: THIRD_USER_ID, recipient_id: DEFAULT_USER.id },
      ],
      error: null,
    });

    const mockAdmin = await setMockAdminClient();
    mockAdmin.__setResult('user_profiles', 'select', {
      data: [
        { id: DEFAULT_USER.id, display_name: 'Alice', avatar_url: null },
        { id: OTHER_USER_ID, display_name: 'Bob', avatar_url: null },
        { id: THIRD_USER_ID, display_name: 'Charlie', avatar_url: null },
      ],
      error: null,
    });
    mockAdmin.__setResult('study_sessions', 'select', {
      data: [
        { user_id: DEFAULT_USER.id, duration_minutes: 120 },
        { user_id: DEFAULT_USER.id, duration_minutes: 60 },
        { user_id: OTHER_USER_ID, duration_minutes: 90 },
        { user_id: THIRD_USER_ID, duration_minutes: 240 },
      ],
      error: null,
    });
    mockAdmin.__setResult('daily_stats', 'select', {
      data: [
        { user_id: DEFAULT_USER.id, date: '2024-06-15', streak_day: true },
        { user_id: DEFAULT_USER.id, date: '2024-06-14', streak_day: true },
        { user_id: OTHER_USER_ID, date: '2024-06-15', streak_day: true },
        { user_id: THIRD_USER_ID, date: '2024-06-15', streak_day: true },
      ],
      error: null,
    });

    const { getWeeklyLeaderboard } = await import('./leaderboard-actions');
    const result = await getWeeklyLeaderboard();

    expect(result.data).toHaveLength(3);

    // Charlie: 240min = 4.0 hours (rank 1)
    // Alice: 180min = 3.0 hours (rank 2)
    // Bob: 90min = 1.5 hours (rank 3)
    expect(result.data![0].name).toBe('Charlie');
    expect(result.data![0].hours_this_week).toBe(4);
    expect(result.data![0].rank).toBe(1);

    expect(result.data![1].name).toBe('Alice');
    expect(result.data![1].hours_this_week).toBe(3);
    expect(result.data![1].sessions_this_week).toBe(2);
    expect(result.data![1].rank).toBe(2);

    expect(result.data![2].name).toBe('Bob');
    expect(result.data![2].hours_this_week).toBe(1.5);
    expect(result.data![2].sessions_this_week).toBe(1);
    expect(result.data![2].rank).toBe(3);
  });

  it('includes self with zero stats when no buddies', async () => {
    mockClient.__setResult('study_buddies', 'select', { data: [], error: null });

    const mockAdmin = await setMockAdminClient();
    mockAdmin.__setResult('user_profiles', 'select', {
      data: [{ id: DEFAULT_USER.id, display_name: 'Solo User', avatar_url: null }],
      error: null,
    });
    mockAdmin.__setResult('study_sessions', 'select', { data: [], error: null });
    mockAdmin.__setResult('daily_stats', 'select', { data: [], error: null });

    const { getWeeklyLeaderboard } = await import('./leaderboard-actions');
    const result = await getWeeklyLeaderboard();

    expect(result.data).toHaveLength(1);
    expect(result.data![0].user_id).toBe(DEFAULT_USER.id);
    expect(result.data![0].name).toBe('Solo User');
    expect(result.data![0].hours_this_week).toBe(0);
    expect(result.data![0].sessions_this_week).toBe(0);
    expect(result.data![0].rank).toBe(1);
  });

  it('correctly resolves buddy direction (requester vs recipient)', async () => {
    // User is recipient in this buddy relationship
    mockClient.__setResult('study_buddies', 'select', {
      data: [{ requester_id: OTHER_USER_ID, recipient_id: DEFAULT_USER.id }],
      error: null,
    });

    const mockAdmin = await setMockAdminClient();
    mockAdmin.__setResult('user_profiles', 'select', {
      data: [
        { id: DEFAULT_USER.id, display_name: 'Me', avatar_url: null },
        { id: OTHER_USER_ID, display_name: 'Buddy', avatar_url: null },
      ],
      error: null,
    });
    mockAdmin.__setResult('study_sessions', 'select', { data: [], error: null });
    mockAdmin.__setResult('daily_stats', 'select', { data: [], error: null });

    const { getWeeklyLeaderboard } = await import('./leaderboard-actions');
    const result = await getWeeklyLeaderboard();

    // Should include both users regardless of buddy direction
    expect(result.data).toHaveLength(2);
    const userIds = result.data!.map((e) => e.user_id);
    expect(userIds).toContain(DEFAULT_USER.id);
    expect(userIds).toContain(OTHER_USER_ID);
  });

  it('returns error when unauthenticated', async () => {
    await clearMockUser();

    const { getWeeklyLeaderboard } = await import('./leaderboard-actions');
    const result = await getWeeklyLeaderboard();
    expect(result.error).toBe('Unauthorized');
  });
});
