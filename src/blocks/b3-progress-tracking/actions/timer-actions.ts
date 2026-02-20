'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { StudySession } from '@/lib/types';
import { upsertDailyStats } from './stats-actions';
import { checkAchievements } from '@/blocks/b7-social/actions/achievement-actions';

interface ActionResult<T = void> {
  data?: T;
  error?: string;
}

async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

// ---------------------------------------------------------------------------
// START TIMER SESSION
// ---------------------------------------------------------------------------
export async function startTimerSession(
  courseId: string
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        course_id: courseId,
        started_at: new Date().toISOString(),
        ended_at: null,
        duration_minutes: 0,
        modules_completed: 0,
        session_type: 'timer',
        notes: null,
      })
      .select('id')
      .single();

    if (error) return { error: error.message };
    return { data: { sessionId: data.id } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// AUTO-SAVE TIMER PROGRESS
// ---------------------------------------------------------------------------
export async function autoSaveTimerProgress(
  sessionId: string,
  durationMinutes: number
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('study_sessions')
      .update({ duration_minutes: durationMinutes })
      .eq('id', sessionId)
      .is('ended_at', null);

    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// FINALIZE TIMER SESSION
// ---------------------------------------------------------------------------
export async function finalizeTimerSession(
  sessionId: string,
  durationMinutes: number,
  notes?: string,
  modulesCompleted?: number
): Promise<ActionResult<StudySession>> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('study_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_minutes: Math.max(1, durationMinutes),
        notes: notes || null,
        modules_completed: modulesCompleted ?? 0,
      })
      .eq('id', sessionId)
      .is('ended_at', null)
      .select()
      .single();

    if (error) return { error: error.message };

    // Update course progress
    const session = data as StudySession;
    if (session.modules_completed > 0 || session.duration_minutes > 0) {
      const { data: course } = await supabase
        .from('courses')
        .select('completed_modules, completed_hours, status')
        .eq('id', session.course_id)
        .single();

      if (course) {
        const updates: Record<string, unknown> = {};
        if (session.modules_completed > 0) {
          updates.completed_modules =
            (course.completed_modules ?? 0) + session.modules_completed;
        }
        if (session.duration_minutes > 0) {
          const currentHours = Number(course.completed_hours) || 0;
          updates.completed_hours =
            Math.round((currentHours + session.duration_minutes / 60) * 100) /
            100;
        }
        if (course.status === 'not_started') {
          updates.status = 'in_progress';
        }
        await supabase.from('courses').update(updates).eq('id', session.course_id);
      }
    }

    // Recalculate daily stats
    const sessionDate = new Date(session.started_at)
      .toISOString()
      .split('T')[0];
    await upsertDailyStats(userId, sessionDate);

    // Check for session-based achievements
    await checkAchievements('session_logged').catch(() => {});

    revalidatePath('/progress');
    revalidatePath('/courses');
    return { data: session };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// RECOVER ORPHANED TIMER SESSION
// ---------------------------------------------------------------------------
export async function recoverTimerSession(
  sessionId: string
): Promise<ActionResult<StudySession | null>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .is('ended_at', null)
      .single();

    if (error) {
      // Session not found or already finalized
      return { data: null };
    }

    return { data: data as StudySession };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
