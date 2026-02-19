'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { StudySession } from '@/lib/types';
import {
  createSessionSchema,
  updateSessionSchema,
  type CreateSessionInput,
  type UpdateSessionInput,
} from '../lib/session-validation';
import { upsertDailyStats } from './stats-actions';

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
// CREATE SESSION (manual)
// ---------------------------------------------------------------------------
export async function createSession(
  input: CreateSessionInput
): Promise<ActionResult<StudySession>> {
  try {
    const userId = await getAuthUserId();
    const parsed = createSessionSchema.parse(input);

    const supabase = await createClient();
    const startedAt = new Date(parsed.date + 'T12:00:00Z').toISOString();

    const { data, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        course_id: parsed.courseId,
        started_at: startedAt,
        ended_at: new Date(
          new Date(startedAt).getTime() + parsed.durationMinutes * 60000
        ).toISOString(),
        duration_minutes: parsed.durationMinutes,
        modules_completed: parsed.modulesCompleted,
        session_type: 'manual',
        notes: parsed.notes ?? null,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    // Update course progress
    await updateCourseProgress(supabase, parsed.courseId, parsed.modulesCompleted, parsed.durationMinutes);

    // Recalculate daily stats (trigger handles basic insert, but we need streak_day)
    await upsertDailyStats(userId, parsed.date);

    revalidatePath('/progress');
    revalidatePath('/courses');
    return { data: data as StudySession };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// UPDATE SESSION
// ---------------------------------------------------------------------------
export async function updateSession(
  sessionId: string,
  input: UpdateSessionInput
): Promise<ActionResult<StudySession>> {
  try {
    const userId = await getAuthUserId();
    const parsed = updateSessionSchema.parse(input);

    const supabase = await createClient();

    // Fetch existing session to get date and old values
    const { data: existing, error: fetchError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !existing) return { error: 'Session not found' };
    if (existing.user_id !== userId) return { error: 'Unauthorized' };

    const updates: Record<string, unknown> = {};
    if (parsed.durationMinutes !== undefined) updates.duration_minutes = parsed.durationMinutes;
    if (parsed.modulesCompleted !== undefined) updates.modules_completed = parsed.modulesCompleted;
    if (parsed.notes !== undefined) updates.notes = parsed.notes;

    // Update ended_at if duration changed
    if (parsed.durationMinutes !== undefined) {
      const startedAt = new Date(existing.started_at);
      updates.ended_at = new Date(
        startedAt.getTime() + parsed.durationMinutes * 60000
      ).toISOString();
    }

    const { data, error } = await supabase
      .from('study_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) return { error: error.message };

    // Recalculate daily stats for the session date
    const sessionDate = new Date(existing.started_at)
      .toISOString()
      .split('T')[0];
    await upsertDailyStats(userId, sessionDate);

    // Update course progress if modules changed
    if (parsed.modulesCompleted !== undefined) {
      const modulesDiff = parsed.modulesCompleted - existing.modules_completed;
      const durationDiff = (parsed.durationMinutes ?? existing.duration_minutes) - existing.duration_minutes;
      await updateCourseProgress(supabase, existing.course_id, modulesDiff, durationDiff);
    }

    revalidatePath('/progress');
    revalidatePath('/courses');
    return { data: data as StudySession };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// DELETE SESSION
// ---------------------------------------------------------------------------
export async function deleteSession(
  sessionId: string
): Promise<ActionResult> {
  try {
    const userId = await getAuthUserId();
    const supabase = await createClient();

    // Fetch session to get date for stats recalculation
    const { data: existing, error: fetchError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !existing) return { error: 'Session not found' };
    if (existing.user_id !== userId) return { error: 'Unauthorized' };

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) return { error: error.message };

    // Recalculate daily stats for the affected date
    const sessionDate = new Date(existing.started_at)
      .toISOString()
      .split('T')[0];
    await upsertDailyStats(userId, sessionDate);

    // Subtract from course progress
    await updateCourseProgress(
      supabase,
      existing.course_id,
      -existing.modules_completed,
      -existing.duration_minutes
    );

    revalidatePath('/progress');
    revalidatePath('/courses');
    return {};
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// FETCH SESSIONS (paginated)
// ---------------------------------------------------------------------------
export async function fetchSessions(options?: {
  courseId?: string;
  limit?: number;
  cursor?: string;
}): Promise<
  ActionResult<{ sessions: (StudySession & { course_title: string; course_platform: string | null })[]; hasNextPage: boolean }>
> {
  try {
    const supabase = await createClient();
    const limit = options?.limit ?? 10;

    let query = supabase
      .from('study_sessions')
      .select('*, courses!inner(title, platform)')
      .order('started_at', { ascending: false })
      .limit(limit + 1);

    if (options?.courseId) {
      query = query.eq('course_id', options.courseId);
    }

    if (options?.cursor) {
      // Cursor-based: fetch sessions older than the cursor session
      const { data: cursorSession } = await supabase
        .from('study_sessions')
        .select('started_at')
        .eq('id', options.cursor)
        .single();

      if (cursorSession) {
        query = query.lt('started_at', cursorSession.started_at);
      }
    }

    const { data, error } = await query;

    if (error) return { error: error.message };

    const hasNextPage = (data?.length ?? 0) > limit;
    const sessions = (data ?? []).slice(0, limit).map((row) => {
      const { courses: courseData, ...sessionFields } = row as Record<string, unknown> & { courses?: { title: string; platform: string | null } };
      return {
        ...sessionFields,
        course_title: courseData?.title ?? 'Unknown Course',
        course_platform: courseData?.platform ?? null,
      } as unknown as StudySession & { course_title: string; course_platform: string | null };
    });

    return { data: { sessions, hasNextPage } };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Helper: Update course progress (modules + hours)
// ---------------------------------------------------------------------------
async function updateCourseProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  modulesDelta: number,
  minutesDelta: number
) {
  if (modulesDelta === 0 && minutesDelta === 0) return;

  const { data: course } = await supabase
    .from('courses')
    .select('completed_modules, completed_hours, status')
    .eq('id', courseId)
    .single();

  if (!course) return;

  const updates: Record<string, unknown> = {};
  if (modulesDelta !== 0) {
    updates.completed_modules = Math.max(
      0,
      (course.completed_modules ?? 0) + modulesDelta
    );
  }
  if (minutesDelta !== 0) {
    const currentHours = Number(course.completed_hours) || 0;
    updates.completed_hours = Math.max(
      0,
      Math.round((currentHours + minutesDelta / 60) * 100) / 100
    );
  }

  // Auto-transition to in_progress if currently not_started
  if (course.status === 'not_started' && (modulesDelta > 0 || minutesDelta > 0)) {
    updates.status = 'in_progress';
  }

  await supabase.from('courses').update(updates).eq('id', courseId);
}
