'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ReminderSchedule } from '@/lib/types';
import type { ActionResult } from '@/lib/types/shared';
import {
  reminderCreateSchema,
  reminderUpdateSchema,
  type ReminderCreateInput,
  type ReminderUpdateInput,
} from '../lib/notification-validation';

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

// Reminder with joined course title
export type ReminderWithCourse = ReminderSchedule & {
  course_title: string | null;
};

// ---------------------------------------------------------------------------
// GET REMINDERS
// ---------------------------------------------------------------------------
export async function getReminders(): Promise<ActionResult<ReminderWithCourse[]>> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('reminder_schedules')
      .select(`
        id, user_id, course_id, days_of_week, time, timezone, enabled, channels,
        created_at, updated_at,
        courses(title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { error: error.message };

    // Shape returned by supabase join
    type ReminderRow = ReminderSchedule & { courses: { title: string } | null };
    const reminders: ReminderWithCourse[] = ((data ?? []) as unknown as ReminderRow[]).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      course_id: r.course_id,
      days_of_week: r.days_of_week,
      time: r.time,
      timezone: r.timezone,
      enabled: r.enabled,
      channels: r.channels,
      created_at: r.created_at,
      updated_at: r.updated_at,
      course_title: r.courses?.title ?? null,
    }));

    return { data: reminders };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// CREATE REMINDER
// ---------------------------------------------------------------------------
export async function createReminder(
  input: ReminderCreateInput
): Promise<ActionResult<ReminderSchedule>> {
  try {
    const userId = await getAuthUserId();
    const validated = reminderCreateSchema.parse(input);
    const supabase = await createClient();

    // Get user's timezone if not provided
    let timezone = validated.timezone;
    if (!timezone) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', userId)
        .single();
      timezone = profile?.timezone ?? 'UTC';
    }

    const { data, error } = await supabase
      .from('reminder_schedules')
      .insert({
        user_id: userId,
        course_id: validated.courseId,
        days_of_week: validated.daysOfWeek,
        time: validated.time,
        timezone,
        enabled: true,
        channels: validated.channels,
      })
      .select()
      .single();

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return { data: data as ReminderSchedule };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// UPDATE REMINDER
// ---------------------------------------------------------------------------
export async function updateReminder(
  id: string,
  input: ReminderUpdateInput
): Promise<ActionResult<ReminderSchedule>> {
  try {
    const userId = await getAuthUserId();
    const validated = reminderUpdateSchema.parse(input);
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (validated.courseId !== undefined) updateData.course_id = validated.courseId;
    if (validated.daysOfWeek !== undefined) updateData.days_of_week = validated.daysOfWeek;
    if (validated.time !== undefined) updateData.time = validated.time;
    if (validated.timezone !== undefined) updateData.timezone = validated.timezone;
    if (validated.channels !== undefined) updateData.channels = validated.channels;

    const { data, error } = await supabase
      .from('reminder_schedules')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return { data: data as ReminderSchedule };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// TOGGLE REMINDER
// ---------------------------------------------------------------------------
export async function toggleReminder(
  id: string,
  enabled: boolean
): Promise<ActionResult> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('reminder_schedules')
      .update({ enabled })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// DELETE REMINDER
// ---------------------------------------------------------------------------
export async function deleteReminder(id: string): Promise<ActionResult> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from('reminder_schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return { error: error.message };
    revalidatePath('/notifications');
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// GET COURSES FOR REMINDER FORM
// ---------------------------------------------------------------------------
export async function getCoursesForReminder(): Promise<
  ActionResult<{ id: string; title: string }[]>
> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('courses')
      .select('id, title')
      .eq('user_id', userId)
      .neq('status', 'abandoned')
      .order('title');

    if (error) return { error: error.message };
    return { data: data ?? [] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
