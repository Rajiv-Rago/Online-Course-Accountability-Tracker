import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setMockUser, clearMockUser } from '@/test/helpers/auth';
import { buildProfile } from '@/test/factories';
import type { MockSupabaseClient } from '@/test/mocks/supabase';

let mockClient: MockSupabaseClient;

beforeEach(async () => {
  vi.clearAllMocks();
  mockClient = await setMockUser();
});

describe('getProfile', () => {
  it('returns user profile when authenticated', async () => {
    const profile = buildProfile();
    mockClient.__setTableResult('user_profiles', { data: profile, error: null });

    const { getProfile } = await import('./profile-actions');
    const result = await getProfile();
    expect(result.display_name).toBe('Test User');
  });

  it('throws when profile query fails', async () => {
    mockClient.__setTableResult('user_profiles', { data: null, error: { message: 'DB error' } });

    const { getProfile } = await import('./profile-actions');
    await expect(getProfile()).rejects.toThrow('DB error');
  });

  it('throws when unauthenticated', async () => {
    await clearMockUser();

    const { getProfile } = await import('./profile-actions');
    await expect(getProfile()).rejects.toThrow();
  });
});

describe('updateProfile', () => {
  it('updates profile and revalidates path', async () => {
    const updated = buildProfile({ display_name: 'New Name' });
    mockClient.__setTableResult('user_profiles', { data: updated, error: null });

    const { updateProfile } = await import('./profile-actions');
    const { revalidatePath } = await import('next/cache');

    const result = await updateProfile({
      display_name: 'New Name',
      timezone: 'UTC',
      theme: 'dark',
      motivation_style: 'balanced',
      experience_level: 'intermediate',
      daily_study_goal_mins: 60,
      weekly_study_goal_mins: 300,
    });

    expect(result.display_name).toBe('New Name');
    expect(revalidatePath).toHaveBeenCalledWith('/settings/profile');
  });

  it('rejects invalid data', async () => {
    const { updateProfile } = await import('./profile-actions');
    await expect(updateProfile({
      display_name: 'a', // too short
      timezone: 'UTC',
      theme: 'dark',
      motivation_style: 'balanced',
      experience_level: 'intermediate',
      daily_study_goal_mins: 60,
      weekly_study_goal_mins: 300,
    })).rejects.toThrow();
  });
});

describe('completeOnboarding', () => {
  it('sets onboarding flags', async () => {
    const completed = buildProfile({ onboarding_completed: true, onboarding_step: 5 });
    mockClient.__setTableResult('user_profiles', { data: completed, error: null });

    const { completeOnboarding } = await import('./profile-actions');
    const result = await completeOnboarding({
      display_name: 'Test User',
      experience_level: 'intermediate',
      learning_goals: ['Learn React'],
      preferred_days: ['mon', 'wed', 'fri'],
      preferred_time_start: '09:00',
      preferred_time_end: '17:00',
      daily_study_goal_mins: 60,
      weekly_study_goal_mins: 300,
      timezone: 'UTC',
      motivation_style: 'balanced',
    });

    expect(result.onboarding_completed).toBe(true);
  });

  it('rejects incomplete data', async () => {
    const { completeOnboarding } = await import('./profile-actions');
    await expect(completeOnboarding({
      display_name: 'Test',
      experience_level: 'intermediate',
      // Missing fields
    } as any)).rejects.toThrow();
  });
});

describe('updateOnboardingStep', () => {
  it('updates step number', async () => {
    mockClient.__setTableResult('user_profiles', { data: null, error: null });

    const { updateOnboardingStep } = await import('./profile-actions');
    await expect(updateOnboardingStep(3)).resolves.toBeUndefined();
  });
});
