'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult, HeatmapDay, Course, StudySession } from '@/lib/types';

// ----- Types specific to visualization actions -----

export interface ProgressTimelineRow {
  course_id: string;
  started_at: string;
  duration_minutes: number;
  modules_completed: number;
}

export interface RiskTrendRow {
  course_id: string | null;
  risk_score: number | null;
  created_at: string;
}

export interface DaySessionRow {
  id: string;
  course_id: string;
  course_title: string;
  started_at: string;
  duration_minutes: number;
}

export interface CourseOption {
  id: string;
  title: string;
  status: string;
}

export interface ForecastRawData {
  sessions: { started_at: string; duration_minutes: number }[];
  course: Pick<Course, 'total_hours' | 'completed_hours' | 'target_completion_date' | 'title'>;
}

export interface StudyHoursRawData {
  sessions: StudySession[];
  dailyGoalMins: number;
}

// ----- Actions -----

export async function getHeatmapData(input: {
  year: number;
}): Promise<ActionResult<HeatmapDay[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const startDate = `${input.year}-01-01`;
    const endDate = `${input.year}-12-31`;

    const { data, error } = await supabase
      .from('daily_stats')
      .select('date, total_minutes, session_count')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) return { error: error.message };

    return {
      data: (data ?? []).map((d) => ({
        date: d.date,
        total_minutes: d.total_minutes,
        session_count: d.session_count,
      })),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getProgressTimeline(input: {
  courseIds: string[];
  startDate: string;
  endDate: string;
}): Promise<ActionResult<{ sessions: ProgressTimelineRow[]; courses: Pick<Course, 'id' | 'title' | 'total_hours' | 'completed_hours' | 'total_modules' | 'completed_modules' | 'target_completion_date'>[] }>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    let sessionsQuery = supabase
      .from('study_sessions')
      .select('course_id, started_at, duration_minutes, modules_completed')
      .gte('started_at', input.startDate)
      .lte('started_at', input.endDate)
      .order('started_at', { ascending: true });

    if (input.courseIds.length > 0) {
      sessionsQuery = sessionsQuery.in('course_id', input.courseIds);
    }

    let coursesQuery = supabase
      .from('courses')
      .select('id, title, total_hours, completed_hours, total_modules, completed_modules, target_completion_date')
      .neq('status', 'abandoned')
      .order('sort_order', { ascending: true });

    if (input.courseIds.length > 0) {
      coursesQuery = coursesQuery.in('id', input.courseIds);
    }

    const [sessionsResult, coursesResult] = await Promise.all([
      sessionsQuery,
      coursesQuery,
    ]);

    if (sessionsResult.error) return { error: sessionsResult.error.message };
    if (coursesResult.error) return { error: coursesResult.error.message };

    return {
      data: {
        sessions: sessionsResult.data as ProgressTimelineRow[],
        courses: coursesResult.data as Pick<Course, 'id' | 'title' | 'total_hours' | 'completed_hours' | 'total_modules' | 'completed_modules' | 'target_completion_date'>[],
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getStudyHoursData(input: {
  courseIds: string[];
  startDate: string;
  endDate: string;
}): Promise<ActionResult<StudyHoursRawData>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    let sessionsQuery = supabase
      .from('study_sessions')
      .select('id, course_id, started_at, duration_minutes, modules_completed, session_type, notes, created_at')
      .gte('started_at', input.startDate)
      .lte('started_at', input.endDate)
      .order('started_at', { ascending: true });

    if (input.courseIds.length > 0) {
      sessionsQuery = sessionsQuery.in('course_id', input.courseIds);
    }

    const [sessionsResult, profileResult] = await Promise.all([
      sessionsQuery,
      supabase
        .from('user_profiles')
        .select('daily_study_goal_mins')
        .eq('id', user.id)
        .single(),
    ]);

    if (sessionsResult.error) return { error: sessionsResult.error.message };

    return {
      data: {
        sessions: (sessionsResult.data ?? []) as StudySession[],
        dailyGoalMins: profileResult.data?.daily_study_goal_mins ?? 60,
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getForecastData(input: {
  courseId: string;
}): Promise<ActionResult<ForecastRawData>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [sessionsResult, courseResult] = await Promise.all([
      supabase
        .from('study_sessions')
        .select('started_at, duration_minutes')
        .eq('course_id', input.courseId)
        .gte('started_at', thirtyDaysAgo)
        .order('started_at', { ascending: true }),
      supabase
        .from('courses')
        .select('total_hours, completed_hours, target_completion_date, title')
        .eq('id', input.courseId)
        .single(),
    ]);

    if (sessionsResult.error) return { error: sessionsResult.error.message };
    if (courseResult.error) return { error: courseResult.error.message };

    return {
      data: {
        sessions: sessionsResult.data ?? [],
        course: courseResult.data as Pick<Course, 'total_hours' | 'completed_hours' | 'target_completion_date' | 'title'>,
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getRiskTrendData(input: {
  courseIds: string[];
  startDate: string;
  endDate: string;
}): Promise<ActionResult<RiskTrendRow[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    let query = supabase
      .from('ai_analyses')
      .select('course_id, risk_score, created_at')
      .eq('analysis_type', 'daily')
      .not('risk_score', 'is', null)
      .gte('created_at', input.startDate)
      .lte('created_at', input.endDate)
      .order('created_at', { ascending: true });

    if (input.courseIds.length > 0) {
      query = query.in('course_id', input.courseIds);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };

    return { data: (data ?? []) as RiskTrendRow[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getSessionDistribution(input: {
  courseIds: string[];
  startDate: string;
  endDate: string;
}): Promise<ActionResult<number[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    let query = supabase
      .from('study_sessions')
      .select('duration_minutes')
      .gte('started_at', input.startDate)
      .lte('started_at', input.endDate);

    if (input.courseIds.length > 0) {
      query = query.in('course_id', input.courseIds);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };

    return { data: (data ?? []).map((d) => d.duration_minutes) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getSessionsForDay(input: {
  date: string;
  tzOffsetMinutes?: number;
}): Promise<ActionResult<DaySessionRow[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const offset = input.tzOffsetMinutes ?? 0;
    const baseStart = new Date(`${input.date}T00:00:00Z`);
    const startOfDay = new Date(baseStart.getTime() + offset * 60 * 1000).toISOString();
    const baseEnd = new Date(`${input.date}T23:59:59.999Z`);
    const endOfDay = new Date(baseEnd.getTime() + offset * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('study_sessions')
      .select('id, course_id, started_at, duration_minutes, courses(title)')
      .gte('started_at', startOfDay)
      .lte('started_at', endOfDay)
      .order('started_at', { ascending: true });

    if (error) return { error: error.message };

    return {
      data: (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        course_id: row.course_id as string,
        course_title: (row.courses as { title: string } | null)?.title ?? 'Unknown',
        started_at: row.started_at as string,
        duration_minutes: row.duration_minutes as number,
      })),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getPatternSessionData(input: {
  courseIds: string[];
  startDate: string;
  endDate: string;
}): Promise<ActionResult<StudySession[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    let query = supabase
      .from('study_sessions')
      .select('id, course_id, started_at, duration_minutes, modules_completed, session_type, notes, created_at')
      .gte('started_at', input.startDate)
      .lte('started_at', input.endDate)
      .order('started_at', { ascending: true });

    if (input.courseIds.length > 0) {
      query = query.in('course_id', input.courseIds);
    }

    const { data, error } = await query;
    if (error) return { error: error.message };

    return { data: (data ?? []) as StudySession[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function getUserCourses(): Promise<ActionResult<CourseOption[]>> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('courses')
      .select('id, title, status')
      .neq('status', 'abandoned')
      .order('sort_order', { ascending: true });

    if (error) return { error: error.message };

    return { data: (data ?? []) as CourseOption[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
