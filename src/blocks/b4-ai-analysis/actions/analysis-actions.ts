'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  AiAnalysis,
  WeeklyReport,
  RiskLevel,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Types for joined analysis data
// ---------------------------------------------------------------------------

export interface AnalysisWithCourse extends AiAnalysis {
  course_title: string;
  course_platform: string | null;
}

export interface RiskSummary {
  totalCourses: number;
  averageRisk: number;
  riskDistribution: Record<RiskLevel, number>;
  highestRiskCourse: {
    courseId: string;
    title: string;
    riskScore: number;
    riskLevel: RiskLevel;
  } | null;
}

// ---------------------------------------------------------------------------
// Fetch latest analysis per course (for overview page)
// ---------------------------------------------------------------------------

export async function fetchLatestAnalyses(): Promise<ActionResult<AnalysisWithCourse[]>> {
  try {
    await getAuthUserId();
    const supabase = await createClient();

    // Get latest daily analysis per course by using distinct on
    // Supabase JS doesn't support DISTINCT ON, so we fetch recent and deduplicate
    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*, courses!inner(title, platform)')
      .eq('analysis_type', 'daily')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { error: error.message };

    // Deduplicate: keep only the latest per course_id
    const seen = new Set<string>();
    const analyses: AnalysisWithCourse[] = [];

    for (const row of data ?? []) {
      const courseId = row.course_id;
      if (!courseId || seen.has(courseId)) continue;
      seen.add(courseId);

      const courseData = row.courses as unknown as { title: string; platform: string | null } | null;
      const { courses: _, ...analysisFields } = row as Record<string, unknown>;
      analyses.push({
        ...analysisFields,
        course_title: courseData?.title ?? 'Unknown Course',
        course_platform: courseData?.platform ?? null,
      } as unknown as AnalysisWithCourse);
    }

    return { data: analyses };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Fetch analysis history for a specific course
// ---------------------------------------------------------------------------

export async function fetchAnalysisHistory(
  courseId: string,
  limit: number = 30,
): Promise<ActionResult<AiAnalysis[]>> {
  try {
    await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('course_id', courseId)
      .eq('analysis_type', 'daily')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { error: error.message };
    return { data: (data ?? []) as AiAnalysis[] };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Fetch weekly report (specific or most recent)
// ---------------------------------------------------------------------------

export async function fetchWeeklyReport(
  weekStart?: string,
): Promise<ActionResult<WeeklyReport | null>> {
  try {
    await getAuthUserId();
    const supabase = await createClient();

    let query = supabase
      .from('weekly_reports')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(1);

    if (weekStart) {
      query = query.eq('week_start', weekStart);
    }

    const { data, error } = await query.maybeSingle();

    if (error) return { error: error.message };
    return { data: (data as WeeklyReport) ?? null };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Fetch available weekly report dates (for navigation)
// ---------------------------------------------------------------------------

export async function fetchWeeklyReportDates(): Promise<ActionResult<string[]>> {
  try {
    await getAuthUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('weekly_reports')
      .select('week_start')
      .order('week_start', { ascending: false })
      .limit(52); // up to a year

    if (error) return { error: error.message };
    return { data: (data ?? []).map((r) => r.week_start) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Fetch aggregated risk summary
// ---------------------------------------------------------------------------

export async function fetchRiskSummary(): Promise<ActionResult<RiskSummary>> {
  try {
    await getAuthUserId();
    const supabase = await createClient();

    // Get latest analysis per in_progress course
    const { data: analyses, error } = await supabase
      .from('ai_analyses')
      .select('course_id, risk_score, risk_level, courses!inner(title, priority, status)')
      .eq('analysis_type', 'daily')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return { error: error.message };

    // Deduplicate by course, only in_progress courses
    const seen = new Set<string>();
    const courseRisks: { courseId: string; title: string; riskScore: number; riskLevel: RiskLevel; priority: number }[] = [];

    for (const row of analyses ?? []) {
      if (!row.course_id || seen.has(row.course_id)) continue;
      const courseData = row.courses as unknown as { title: string; priority: number; status: string } | null;
      if (courseData?.status !== 'in_progress') continue;
      seen.add(row.course_id);
      courseRisks.push({
        courseId: row.course_id,
        title: courseData?.title ?? 'Unknown',
        riskScore: row.risk_score ?? 0,
        riskLevel: (row.risk_level as RiskLevel) ?? 'low',
        priority: courseData?.priority ?? 2,
      });
    }

    // Risk distribution
    const distribution: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const c of courseRisks) {
      distribution[c.riskLevel]++;
    }

    // Weighted average by priority (priority 1 = weight 4, priority 4 = weight 1)
    let weightedSum = 0;
    let totalWeight = 0;
    for (const c of courseRisks) {
      const weight = 5 - c.priority; // 1->4, 2->3, 3->2, 4->1
      weightedSum += c.riskScore * weight;
      totalWeight += weight;
    }
    const averageRisk = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Highest risk course
    const highest = courseRisks.reduce<(typeof courseRisks)[0] | null>(
      (max, c) => (!max || c.riskScore > max.riskScore ? c : max),
      null,
    );

    return {
      data: {
        totalCourses: courseRisks.length,
        averageRisk,
        riskDistribution: distribution,
        highestRiskCourse: highest
          ? {
              courseId: highest.courseId,
              title: highest.title,
              riskScore: highest.riskScore,
              riskLevel: highest.riskLevel,
            }
          : null,
      },
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
