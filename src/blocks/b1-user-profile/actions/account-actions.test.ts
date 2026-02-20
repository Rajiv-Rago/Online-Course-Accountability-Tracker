import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser, setMockAdminClient, DEFAULT_USER } from '@/test/helpers/auth';
import { buildProfile } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser({ id: DEFAULT_USER.id, email: 'test@example.com' });
});

describe('changeEmail', () => {
  it('updates email successfully', async () => {
    const { changeEmail } = await import('./account-actions');
    const result = await changeEmail({ newEmail: 'new@example.com' });
    expect(result.success).toBe(true);
    expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
  });

  it('returns error on auth failure', async () => {
    mockClient.auth.updateUser.mockResolvedValueOnce({ data: null, error: { message: 'Email in use' } });

    const { changeEmail } = await import('./account-actions');
    const result = await changeEmail({ newEmail: 'existing@example.com' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Email in use');
  });

  it('rejects invalid email', async () => {
    const { changeEmail } = await import('./account-actions');
    await expect(changeEmail({ newEmail: 'not-an-email' })).rejects.toThrow();
  });
});

describe('changePassword', () => {
  it('changes password after verifying current', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: DEFAULT_USER.id, email: 'test@example.com' } },
      error: null,
    } as any);
    mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({ data: {}, error: null });

    const { changePassword } = await import('./account-actions');
    const result = await changePassword({
      currentPassword: 'oldpass12',
      newPassword: 'newpass12',
      confirmPassword: 'newpass12',
    });

    expect(result.success).toBe(true);
  });

  it('rejects when passwords dont match', async () => {
    const { changePassword } = await import('./account-actions');
    await expect(changePassword({
      currentPassword: 'oldpass12',
      newPassword: 'newpass12',
      confirmPassword: 'different',
    })).rejects.toThrow();
  });

  it('rejects incorrect current password', async () => {
    mockClient.auth.getUser.mockResolvedValue({
      data: { user: { id: DEFAULT_USER.id, email: 'test@example.com' } },
      error: null,
    } as any);
    mockClient.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });

    const { changePassword } = await import('./account-actions');
    const result = await changePassword({
      currentPassword: 'wrongpass',
      newPassword: 'newpass12',
      confirmPassword: 'newpass12',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Current password is incorrect');
  });
});

describe('exportUserData', () => {
  it('returns JSON with all tables', async () => {
    const profile = buildProfile({ slack_webhook_url: 'https://hooks.slack.com/test', discord_webhook_url: null });
    mockClient.__setTableResult('user_profiles', { data: profile, error: null });
    mockClient.__setTableResult('courses', { data: [], error: null });
    mockClient.__setTableResult('study_sessions', { data: [], error: null });
    mockClient.__setTableResult('daily_stats', { data: [], error: null });
    mockClient.__setTableResult('ai_analyses', { data: [], error: null });
    mockClient.__setTableResult('weekly_reports', { data: [], error: null });
    mockClient.__setTableResult('notifications', { data: [], error: null });
    mockClient.__setTableResult('achievements', { data: [], error: null });

    const { exportUserData } = await import('./account-actions');
    const json = await exportUserData();
    const parsed = JSON.parse(json);

    expect(parsed.exported_at).toBeDefined();
    expect(parsed.profile).toBeDefined();
    expect(parsed.courses).toEqual([]);
  });

  it('redacts webhook URLs', async () => {
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

    const { exportUserData } = await import('./account-actions');
    const json = await exportUserData();
    const parsed = JSON.parse(json);

    expect(parsed.profile.slack_webhook_url).toBe('[REDACTED]');
    expect(parsed.profile.discord_webhook_url).toBe('[REDACTED]');
  });
});

describe('deleteAccount', () => {
  it('requires exact "DELETE" confirmation (case-sensitive)', async () => {
    const { deleteAccount } = await import('./account-actions');

    expect((await deleteAccount({ confirmation: 'delete' })).success).toBe(false);
    expect((await deleteAccount({ confirmation: 'Delete' })).success).toBe(false);
    expect((await deleteAccount({ confirmation: '' })).success).toBe(false);
  });

  it('deletes account with correct confirmation', async () => {
    const mockAdmin = await setMockAdminClient();

    const { deleteAccount } = await import('./account-actions');
    const result = await deleteAccount({ confirmation: 'DELETE' });

    expect(result.success).toBe(true);
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith(DEFAULT_USER.id);
    expect(mockClient.auth.signOut).toHaveBeenCalled();
  });

  it('returns error when admin delete fails', async () => {
    const mockAdmin = await setMockAdminClient();
    mockAdmin.auth.admin.deleteUser.mockResolvedValueOnce({ error: { message: 'Admin error' } });

    const { deleteAccount } = await import('./account-actions');
    const result = await deleteAccount({ confirmation: 'DELETE' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin error');
  });
});
