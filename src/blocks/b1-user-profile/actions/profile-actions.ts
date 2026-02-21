'use server';

import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/lib/types/shared';
import {
  profileSchema,
  completeOnboardingSchema,
} from '../lib/profile-validation';
import { z } from 'zod';
import { getAuthUser } from './get-auth-user';
import { isValidModelId } from '@/lib/ai/models';

export async function getProfile(): Promise<UserProfile> {
  const { supabase, userId } = await getAuthUser();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data as UserProfile;
}

export async function updateProfile(
  formData: z.infer<typeof profileSchema>
): Promise<UserProfile> {
  const parsed = profileSchema.parse(formData);
  const { supabase, userId } = await getAuthUser();

  const { data, error } = await supabase
    .from('user_profiles')
    .update(parsed)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/settings/profile');
  return data as UserProfile;
}

export async function completeOnboarding(
  formData: z.infer<typeof completeOnboardingSchema>
): Promise<UserProfile> {
  const parsed = completeOnboardingSchema.parse(formData);
  const { supabase, userId } = await getAuthUser();

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...parsed,
      onboarding_completed: true,
      onboarding_step: 5,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return data as UserProfile;
}

export async function updatePreferredAiModel(modelId: string): Promise<void> {
  if (!isValidModelId(modelId)) {
    throw new Error('Invalid AI model');
  }
  const { supabase, userId } = await getAuthUser();

  const { error } = await supabase
    .from('user_profiles')
    .update({ preferred_ai_model: modelId })
    .eq('id', userId);

  if (error) throw new Error(error.message);
  revalidatePath('/settings/ai');
}

export async function updateOnboardingStep(step: number): Promise<void> {
  const { supabase, userId } = await getAuthUser();

  const { error } = await supabase
    .from('user_profiles')
    .update({ onboarding_step: step })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
