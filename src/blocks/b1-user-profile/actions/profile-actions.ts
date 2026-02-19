'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { UserProfile } from '@/lib/types/shared';
import {
  profileSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
} from '../lib/profile-validation';
import { z } from 'zod';

async function getAuthUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return { supabase, userId: user.id };
}

export async function getProfile(): Promise<UserProfile> {
  const { supabase, userId } = await getAuthUserId();
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
  const { supabase, userId } = await getAuthUserId();

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

const completeOnboardingSchema = onboardingStep1Schema
  .merge(onboardingStep2Schema)
  .merge(onboardingStep3Schema)
  .merge(onboardingStep4Schema);

export async function completeOnboarding(
  formData: z.infer<typeof completeOnboardingSchema>
): Promise<UserProfile> {
  const parsed = completeOnboardingSchema.parse(formData);
  const { supabase, userId } = await getAuthUserId();

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

export async function updateOnboardingStep(step: number): Promise<void> {
  const { supabase, userId } = await getAuthUserId();

  const { error } = await supabase
    .from('user_profiles')
    .update({ onboarding_step: step })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
