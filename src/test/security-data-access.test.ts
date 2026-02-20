/**
 * Security Tests: Data Access Authorization
 *
 * Verifies that server actions enforce ownership and authorization
 * checks before modifying data. Tests actual behavior through mocked calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, setMockAdminClient, DEFAULT_USER } from '@/test/helpers/auth';
import { buildSession, buildCourse, buildProfile } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('Session ownership enforcement', () => {
  it('updateSession rejects non-owner', async () => {
    const otherSession = buildSession({ user_id: 'other-user-id' });
    mockClient.__setResult('study_sessions', 'select', { data: otherSession, error: null });

    const { updateSession } = await import('@/blocks/b3-progress-tracking/actions/session-actions');
    const result = await updateSession(otherSession.id, { durationMinutes: 60 });
    expect(result.error).toBe('Unauthorized');
  });

  it('deleteSession rejects non-owner', async () => {
    const otherSession = buildSession({ user_id: 'other-user-id' });
    mockClient.__setResult('study_sessions', 'select', { data: otherSession, error: null });

    const { deleteSession } = await import('@/blocks/b3-progress-tracking/actions/session-actions');
    const result = await deleteSession(otherSession.id);
    expect(result.error).toBe('Unauthorized');
  });
});

describe('Buddy authorization enforcement', () => {
  const OTHER_USER_ID = '00000000-0000-0000-0000-000000000002';
  const REL_ID = '00000000-0000-0000-0000-000000000099';

  it('acceptRequest requires being the recipient', async () => {
    await setMockAdminClient();
    mockClient.__setResult('study_buddies', 'select', {
      data: { requester_id: DEFAULT_USER.id, recipient_id: OTHER_USER_ID, status: 'pending' },
      error: null,
    });

    const { acceptRequest } = await import('@/blocks/b7-social/actions/buddy-actions');
    const result = await acceptRequest(REL_ID);
    expect(result.error).toBe('Not authorized to accept this request');
  });

  it('declineRequest requires being the recipient', async () => {
    await setMockAdminClient();
    mockClient.__setResult('study_buddies', 'select', {
      data: { recipient_id: OTHER_USER_ID, status: 'pending' },
      error: null,
    });

    const { declineRequest } = await import('@/blocks/b7-social/actions/buddy-actions');
    const result = await declineRequest(REL_ID);
    expect(result.error).toBe('Not authorized to decline this request');
  });

  it('removeBuddy requires being part of the relationship', async () => {
    await setMockAdminClient();
    mockClient.__setResult('study_buddies', 'select', {
      data: { requester_id: 'someone-else', recipient_id: OTHER_USER_ID, status: 'accepted' },
      error: null,
    });

    const { removeBuddy } = await import('@/blocks/b7-social/actions/buddy-actions');
    const result = await removeBuddy(REL_ID);
    expect(result.error).toBe('Not authorized to remove this buddy');
  });

  it('getBuddyActivity requires accepted relationship', async () => {
    await setMockAdminClient();
    mockClient.__setResult('study_buddies', 'select', { data: null, error: null });

    const { getBuddyActivity } = await import('@/blocks/b7-social/actions/buddy-actions');
    const result = await getBuddyActivity(OTHER_USER_ID);
    expect(result.error).toBe('Not connected with this user');
  });

  it('sendBuddyRequest rejects self-request', async () => {
    await setMockAdminClient();

    const { sendBuddyRequest } = await import('@/blocks/b7-social/actions/buddy-actions');
    const result = await sendBuddyRequest(DEFAULT_USER.id);
    expect(result.error).toBe('Cannot send request to yourself');
  });
});

describe('Account security', () => {
  it('deleteAccount requires exact "DELETE" (case-sensitive)', async () => {
    await setMockAdminClient();

    const { deleteAccount } = await import('@/blocks/b1-user-profile/actions/account-actions');
    expect((await deleteAccount({ confirmation: 'delete' })).success).toBe(false);
    expect((await deleteAccount({ confirmation: 'Delete' })).success).toBe(false);
    expect((await deleteAccount({ confirmation: '' })).success).toBe(false);
  });

  it('exportUserData redacts webhook URLs', async () => {
    await setMockAdminClient();
    const profile = buildProfile({
      slack_webhook_url: 'https://hooks.slack.com/services/T00/B00/secret',
      discord_webhook_url: 'https://discord.com/api/webhooks/123/secret',
    });
    mockClient.__setTableResult('user_profiles', { data: profile, error: null });
    mockClient.__setTableResult('courses', { data: [], error: null });
    mockClient.__setTableResult('study_sessions', { data: [], error: null });
    mockClient.__setTableResult('daily_stats', { data: [], error: null });
    mockClient.__setTableResult('ai_analyses', { data: [], error: null });
    mockClient.__setTableResult('weekly_reports', { data: [], error: null });
    mockClient.__setTableResult('notifications', { data: [], error: null });
    mockClient.__setTableResult('achievements', { data: [], error: null });

    const { exportUserData } = await import('@/blocks/b1-user-profile/actions/account-actions');
    const json = await exportUserData();
    const parsed = JSON.parse(json);

    expect(parsed.profile.slack_webhook_url).toBe('[REDACTED]');
    expect(parsed.profile.discord_webhook_url).toBe('[REDACTED]');
    // Raw URLs should not appear in export
    expect(json).not.toContain('T00/B00/secret');
    expect(json).not.toContain('123/secret');
  });

  it('changePassword rejects incorrect current password', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: DEFAULT_USER.id, email: 'test@example.com' } },
      error: null,
    } as any);
    mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    const { changePassword } = await import('@/blocks/b1-user-profile/actions/account-actions');
    const result = await changePassword({
      currentPassword: 'wrongpass',
      newPassword: 'newpass12',
      confirmPassword: 'newpass12',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Current password is incorrect');
  });
});

describe('Unauthenticated access returns errors gracefully', () => {
  beforeEach(async () => {
    await clearMockUser();
  });

  it('getCourses relies on RLS (no explicit auth check)', async () => {
    // getCourses relies on RLS, not explicit auth check.
    // When unauthenticated, Supabase RLS returns empty results.
    // Our mock returns whatever is set — here we verify no explicit error.
    const { getCourses } = await import('@/blocks/b2-course-management/actions/course-actions');
    const result = await getCourses();
    // No explicit "Unauthorized" error — auth is via RLS
    expect(result.error !== 'Unauthorized').toBe(true);
  });

  it('getProfile throws', async () => {
    const { getProfile } = await import('@/blocks/b1-user-profile/actions/profile-actions');
    await expect(getProfile()).rejects.toThrow();
  });

  it('getNotifications returns error', async () => {
    const { getNotifications } = await import('@/blocks/b6-notifications/actions/notification-actions');
    const result = await getNotifications({});
    expect(result.error).toBeDefined();
  });

  it('getBuddies returns error', async () => {
    await setMockAdminClient();
    const { getBuddies } = await import('@/blocks/b7-social/actions/buddy-actions');
    const result = await getBuddies();
    expect(result.error).toBe('Unauthorized');
  });

  it('getAchievements returns error', async () => {
    await setMockAdminClient();
    const { getAchievements } = await import('@/blocks/b7-social/actions/achievement-actions');
    const result = await getAchievements();
    expect(result.error).toBe('Unauthorized');
  });

  it('fetchLatestAnalyses returns error', async () => {
    const { fetchLatestAnalyses } = await import('@/blocks/b4-ai-analysis/actions/analysis-actions');
    const result = await fetchLatestAnalyses();
    expect(result.error).toBeDefined();
  });
});
