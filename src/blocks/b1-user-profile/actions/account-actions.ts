'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { changeEmailSchema, changePasswordSchema } from '../lib/profile-validation';
import { getAuthUser } from './get-auth-user';

export async function changeEmail(formData: {
  newEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = changeEmailSchema.parse(formData);
  const { supabase } = await getAuthUser();

  const { error } = await supabase.auth.updateUser({
    email: parsed.newEmail,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function changePassword(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = changePasswordSchema.parse(formData);
  const { supabase } = await getAuthUser();

  // Supabase JS v2 updateUser does not verify the old password directly.
  // We sign in with the current password first to verify it.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { success: false, error: 'No email on account' };

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.currentPassword,
  });

  if (signInError)
    return { success: false, error: 'Current password is incorrect' };

  const { error } = await supabase.auth.updateUser({
    password: parsed.newPassword,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function exportUserData(): Promise<string> {
  const { supabase, userId } = await getAuthUser();

  const [profile, courses, sessions, stats, analyses, reports, notifications, achievements] =
    await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase.from('courses').select('*').eq('user_id', userId),
      supabase.from('study_sessions').select('*').eq('user_id', userId),
      supabase.from('daily_stats').select('*').eq('user_id', userId),
      supabase.from('ai_analyses').select('*').eq('user_id', userId),
      supabase.from('weekly_reports').select('*').eq('user_id', userId),
      supabase.from('notifications').select('*').eq('user_id', userId),
      supabase.from('achievements').select('*').eq('user_id', userId),
    ]);

  // Redact sensitive webhook credentials from export
  const profileData = profile.data;
  if (profileData) {
    profileData.slack_webhook_url = profileData.slack_webhook_url ? '[REDACTED]' : null;
    profileData.discord_webhook_url = profileData.discord_webhook_url ? '[REDACTED]' : null;
  }

  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      profile: profileData,
      courses: courses.data,
      study_sessions: sessions.data,
      daily_stats: stats.data,
      ai_analyses: analyses.data,
      weekly_reports: reports.data,
      notifications: notifications.data,
      achievements: achievements.data,
    },
    null,
    2
  );
}

export async function deleteAccount(formData: {
  confirmation: string;
}): Promise<{ success: boolean; error?: string }> {
  if (formData.confirmation !== 'DELETE') {
    return { success: false, error: 'Please type DELETE to confirm' };
  }

  const { supabase, userId } = await getAuthUser();
  const adminClient = createAdminClient();

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) return { success: false, error: error.message };

  // Sign out to invalidate the session cookie
  await supabase.auth.signOut();
  revalidatePath('/');
  return { success: true };
}
