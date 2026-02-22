import { generateObject } from 'ai';
import { createAdminClient } from '@/lib/supabase/admin';
import { getModel, callWithFallback, DEFAULT_MODEL } from '@/lib/ai/provider-registry';
import { courseAnalysisResponseSchema, weeklyReportResponseSchema } from './analysis-validation';
import {
  buildSystemPrompt,
  buildCourseAnalysisPrompt,
  buildWeeklyReportPrompt,
  truncateHistory,
  estimateTokens,
  type CourseAnalysisPromptContext,
  type SessionSummary,
  type WeeklyReportPromptContext,
} from './prompt-builder';
import {
  calculateAdjustedRisk,
  calculateExpectedProgress,
  type RiskContext,
} from './risk-calculator';
import type { MotivationStyle } from '@/lib/types';
import { sendToChannels } from '@/blocks/b6-notifications/lib/notification-sender';

// ---------------------------------------------------------------------------
// Rate limiter (token bucket)
// ---------------------------------------------------------------------------

class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number = 50,
    private refillRate: number = 50, // tokens per minute
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / this.refillRate) * 60_000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 60_000; // minutes
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface PipelineConfig {
  maxCoursesPerRun?: number;
  dryRun?: boolean;
  model?: string;
}

const MAX_SESSION_HISTORY_TOKENS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get today's date string in the user's timezone (defaults to UTC). */
function getTodayInTimezone(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // "YYYY-MM-DD"
  } catch {
    return new Date().toISOString().split('T')[0]; // fallback to UTC
  }
}

/** Truncate text and only append "..." if actually truncated. */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// ---------------------------------------------------------------------------
// Intervention → Notification bridge
// ---------------------------------------------------------------------------

/**
 * Send a notification for the top actionable AI intervention.
 * Filters out low-priority and encouragement-only interventions to avoid noise.
 * When a risk_alert was already sent for this course, only sends action/reminder
 * interventions to avoid double-alerting on escalation type.
 */
async function sendInterventionNotification(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  courseId: string,
  courseTitle: string,
  interventions: Array<{ type: string; message: string; priority: string; action_url: string | null }>,
  riskAlertSent: boolean,
): Promise<void> {
  if (!interventions.length) return;

  // Filter to interventions worth notifying about:
  // - High priority: all types
  // - Medium priority: only action/escalation (these require user action)
  const notifiable = interventions.filter((i) => {
    if (i.priority === 'high') return true;
    if (i.priority === 'medium' && (i.type === 'action' || i.type === 'escalation')) return true;
    return false;
  });

  if (!notifiable.length) return;

  // If risk_alert was already sent, only send action/reminder interventions
  // (skip escalation to avoid double-alerting)
  const candidates = riskAlertSent
    ? notifiable.filter((i) => i.type === 'action' || i.type === 'reminder')
    : notifiable;

  if (!candidates.length) return;

  const top = candidates[0];
  const title =
    top.type === 'escalation'
      ? `Attention needed: ${courseTitle}`
      : top.type === 'encouragement'
        ? `Keep it up: ${courseTitle}`
        : `Suggestion: ${courseTitle}`;

  const { data: notif } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'reminder',
      title,
      message: top.message,
      action_url: `/analysis/${courseId}`,
      channels_sent: ['in_app'],
      metadata: {
        course_id: courseId,
        intervention_type: top.type,
        intervention_priority: top.priority,
        source: 'ai_intervention',
      },
    })
    .select()
    .single();

  if (notif) {
    await sendToChannels(notif).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Daily Analysis Pipeline
// NOTE: Processes users sequentially. For large user bases (200+), consider
// splitting into per-user queue jobs to avoid Vercel function timeouts.
// ---------------------------------------------------------------------------

export async function runDailyAnalysis(config?: PipelineConfig): Promise<{
  processed: number;
  errors: number;
  skipped: number;
}> {
  const maxCourses = config?.maxCoursesPerRun ?? 100;
  const supabase = createAdminClient();
  const rateLimiter = new RateLimiter();
  const systemPrompt = buildSystemPrompt();

  let processed = 0;
  let errors = 0;
  let skipped = 0;

  // Get all onboarded users (include timezone + preferred model)
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, motivation_style, daily_study_goal_mins, timezone, preferred_ai_model')
    .eq('onboarding_completed', true);

  if (usersError || !users) {
    throw new Error(`Failed to fetch users: ${usersError?.message}`);
  }

  for (const user of users) {
    const today = getTodayInTimezone(user.timezone ?? 'UTC');
    const userModel = config?.model ?? user.preferred_ai_model ?? DEFAULT_MODEL;

    // Get in_progress courses for this user
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .order('priority', { ascending: true })
      .limit(maxCourses);

    if (coursesError || !courses) {
      errors++;
      continue;
    }

    // H3 fix: Hoist streak query outside per-course loop (streak is per-user, not per-course)
    const { data: streakData } = await supabase
      .from('daily_stats')
      .select('streak_day, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30);

    let currentStreak = 0;
    if (streakData) {
      for (const day of streakData) {
        if (day.streak_day) currentStreak++;
        else break;
      }
    }

    for (const course of courses) {
      try {
        await rateLimiter.acquire();

        // Fetch recent sessions (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('started_at, duration_minutes, modules_completed')
          .eq('course_id', course.id)
          .gte('started_at', thirtyDaysAgo)
          .order('started_at', { ascending: false });

        const recentSessions: SessionSummary[] = (sessions ?? []).map((s) => ({
          date: new Date(s.started_at).toISOString().split('T')[0],
          durationMinutes: s.duration_minutes,
          modulesCompleted: s.modules_completed,
        }));

        // Calculate days inactive
        const lastSessionDate = recentSessions[0]?.date ?? null;
        const daysInactive = lastSessionDate
          ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / 86400000)
          : 30;

        // Build prompt context
        const promptContext: CourseAnalysisPromptContext = {
          course: {
            courseTitle: course.title,
            platform: course.platform,
            totalModules: course.total_modules,
            completedModules: course.completed_modules,
            totalHours: course.total_hours ? Number(course.total_hours) : null,
            completedHours: Number(course.completed_hours) || 0,
            targetDate: course.target_completion_date,
            priority: course.priority,
            status: course.status,
            notes: course.notes,
          },
          recentSessions: truncateHistory(recentSessions, MAX_SESSION_HISTORY_TOKENS),
          daysInactive,
          currentStreak,
          motivationStyle: (user.motivation_style as MotivationStyle) ?? 'balanced',
          dailyGoalMins: user.daily_study_goal_mins ?? 60,
        };

        const userPrompt = buildCourseAnalysisPrompt(promptContext);

        if (config?.dryRun) {
          skipped++;
          continue;
        }

        // Call AI with fallback
        const { result: aiResult, modelUsed } = await callWithFallback(
          userModel,
          async (modelId) => {
            const { object, usage } = await generateObject({
              model: getModel(modelId),
              schema: courseAnalysisResponseSchema,
              system: systemPrompt,
              prompt: userPrompt,
              temperature: 0.7,
              maxOutputTokens: 2000,
            });
            return {
              analysis: object,
              tokensUsed: usage.totalTokens ?? estimateTokens(systemPrompt + userPrompt),
            };
          },
        );

        const analysisResult = aiResult.analysis;
        const tokensUsed = aiResult.tokensUsed;

        // Calculate adjusted risk
        const progressPercent = course.total_modules
          ? (course.completed_modules / course.total_modules) * 100
          : course.total_hours
            ? (Number(course.completed_hours) / Number(course.total_hours)) * 100
            : 0;

        const expectedProgress = course.target_completion_date && course.created_at
          ? calculateExpectedProgress(course.created_at.split('T')[0], course.target_completion_date, today)
          : 0;

        const weekMinutes = recentSessions
          .filter((s) => {
            const d = new Date(s.date).getTime();
            return d >= Date.now() - 7 * 86400000;
          })
          .reduce((sum, s) => sum + s.durationMinutes, 0);

        const prevWeekMinutes = recentSessions
          .filter((s) => {
            const d = new Date(s.date).getTime();
            return d >= Date.now() - 14 * 86400000 && d < Date.now() - 7 * 86400000;
          })
          .reduce((sum, s) => sum + s.durationMinutes, 0);

        // M3 fix: Only flag streakBroken if course has had at least one session
        const hasAnySessions = recentSessions.length > 0;
        const riskCtx: RiskContext = {
          daysInactive,
          streakBroken: hasAnySessions && currentStreak === 0 && daysInactive > 1,
          hoursLastWeek: weekMinutes / 60,
          hoursPrevWeek: prevWeekMinutes / 60,
          progressPercent,
          expectedProgressPercent: expectedProgress,
          daysUntilDeadline: course.target_completion_date
            ? Math.ceil((new Date(course.target_completion_date).getTime() - Date.now()) / 86400000)
            : null,
          priority: course.priority,
        };

        const risk = calculateAdjustedRisk(riskCtx, analysisResult.risk_score);

        // Insert into ai_analyses
        const { error: insertError } = await supabase
          .from('ai_analyses')
          .insert({
            user_id: user.id,
            course_id: course.id,
            analysis_type: 'daily',
            risk_score: risk.score,
            risk_level: risk.level,
            insights: analysisResult.insights,
            interventions: analysisResult.interventions,
            patterns: analysisResult.patterns,
            raw_prompt: userPrompt,
            raw_response: JSON.stringify(analysisResult),
            tokens_used: tokensUsed,
            model: modelUsed,
          });

        if (insertError) {
          errors++;
        } else {
          processed++;

          // Create risk_alert notification for high or critical risk courses
          const riskAlertSent = risk.level === 'high' || risk.level === 'critical';
          if (riskAlertSent) {
            const topInsight = analysisResult.insights?.[0]?.description ?? 'Your course needs attention.';
            const { data: riskNotif } = await supabase.from('notifications').insert({
              user_id: user.id,
              type: 'risk_alert',
              title: `${risk.level === 'critical' ? 'Critical' : 'High'} Risk: ${course.title}`,
              message: topInsight,
              action_url: `/courses/${course.id}`,
              channels_sent: ['in_app'],
              metadata: {
                course_id: course.id,
                risk_score: risk.score,
                risk_level: risk.level,
              },
            }).select().single();

            // Deliver via configured channels (email, push, etc.)
            if (riskNotif) {
              await sendToChannels(riskNotif).catch(() => {});
            }
          }

          // Send notification for top actionable AI intervention
          await sendInterventionNotification(
            supabase,
            user.id,
            course.id,
            course.title,
            analysisResult.interventions,
            riskAlertSent,
          ).catch(() => {});
        }
      } catch {
        errors++;
      }
    }
  }

  return { processed, errors, skipped };
}

// ---------------------------------------------------------------------------
// Weekly Report Pipeline
// ---------------------------------------------------------------------------

export async function generateWeeklyReports(config?: PipelineConfig): Promise<{
  processed: number;
  errors: number;
}> {
  const supabase = createAdminClient();
  const rateLimiter = new RateLimiter();
  const systemPrompt = buildSystemPrompt();

  // Calculate week boundaries (Mon-Sun)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon
  const daysBack = dayOfWeek === 0 ? 7 : dayOfWeek; // days back to last Monday
  const weekEnd = new Date(now.getTime() - daysBack * 86400000); // last Sunday
  const weekStart = new Date(weekEnd.getTime() - 6 * 86400000); // previous Monday

  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  // Next day after week end for exclusive upper bound
  const dayAfterWeekEnd = new Date(weekEnd.getTime() + 86400000);
  const dayAfterWeekEndStr = dayAfterWeekEnd.toISOString().split('T')[0];

  // Previous week for comparison
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
  const prevWeekStartStr = prevWeekStart.toISOString().split('T')[0];

  let processed = 0;
  let errors = 0;

  // Get all onboarded users (include preferred model)
  const { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('id, motivation_style, notify_weekly_report, preferred_ai_model')
    .eq('onboarding_completed', true);

  if (usersError || !users) {
    throw new Error(`Failed to fetch users: ${usersError?.message}`);
  }

  for (const user of users) {
    try {
      await rateLimiter.acquire();

      const userModel = config?.model ?? user.preferred_ai_model ?? DEFAULT_MODEL;

      // Check for existing report for this week
      const { data: existingReport } = await supabase
        .from('weekly_reports')
        .select('id')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (existingReport) {
        continue; // Already generated
      }

      // M5 fix: Use .lt() with next day instead of .lte() with T23:59:59Z
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('course_id, duration_minutes, modules_completed, started_at, courses!inner(title)')
        .eq('user_id', user.id)
        .gte('started_at', weekStartStr + 'T00:00:00Z')
        .lt('started_at', dayAfterWeekEndStr + 'T00:00:00Z');

      const sessionList = sessions ?? [];

      // Aggregate by course
      const courseMap = new Map<string, { title: string; minutes: number; sessions: number; modules: number }>();
      for (const s of sessionList) {
        const courseId = s.course_id;
        const courseData = s.courses as unknown as { title: string } | null;
        const existing = courseMap.get(courseId) ?? {
          title: courseData?.title ?? 'Unknown',
          minutes: 0,
          sessions: 0,
          modules: 0,
        };
        existing.minutes += s.duration_minutes;
        existing.sessions += 1;
        existing.modules += s.modules_completed;
        courseMap.set(courseId, existing);
      }

      const totalMinutes = sessionList.reduce((sum, s) => sum + s.duration_minutes, 0);
      const totalSessions = sessionList.length;
      const totalModules = sessionList.reduce((sum, s) => sum + s.modules_completed, 0);

      // Get streak length
      const { data: streakData } = await supabase
        .from('daily_stats')
        .select('streak_day')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      let streakLength = 0;
      if (streakData) {
        for (const day of streakData) {
          if (day.streak_day) streakLength++;
          else break;
        }
      }

      // M5 fix: Previous week also uses .lt() with exclusive upper bound
      const { data: prevSessions } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('started_at', prevWeekStartStr + 'T00:00:00Z')
        .lt('started_at', weekStartStr + 'T00:00:00Z');

      const prevWeekMinutes = prevSessions
        ? prevSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
        : null;

      // Build courses summary for DB and prompt
      const coursesSummary = Array.from(courseMap.entries()).map(([courseId, data]) => ({
        course_id: courseId,
        title: data.title,
        minutes: data.minutes,
        sessions: data.sessions,
        modules: data.modules,
      }));

      // Build prompt
      const promptContext: WeeklyReportPromptContext = {
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        totalMinutes,
        totalSessions,
        totalModules,
        coursesSummary: coursesSummary.map(({ title, minutes, sessions, modules }) => ({ title, minutes, sessions, modules })),
        streakLength,
        previousWeekMinutes: prevWeekMinutes,
        motivationStyle: (user.motivation_style as MotivationStyle) ?? 'balanced',
      };

      const userPrompt = buildWeeklyReportPrompt(promptContext);

      if (config?.dryRun) {
        continue;
      }

      // Call AI with fallback
      const { result: aiResult, modelUsed } = await callWithFallback(
        userModel,
        async (modelId) => {
          const { object, usage } = await generateObject({
            model: getModel(modelId),
            schema: weeklyReportResponseSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.7,
            maxOutputTokens: 2000,
          });
          return {
            report: object,
            tokensUsed: usage.totalTokens ?? estimateTokens(systemPrompt + userPrompt),
          };
        },
      );

      const reportResult = aiResult.report;
      const tokensUsed = aiResult.tokensUsed;

      // Calculate week comparison
      const comparedToPrevious = prevWeekMinutes !== null
        ? {
            minutes_diff: totalMinutes - prevWeekMinutes,
            sessions_diff: totalSessions - (prevSessions?.length ?? 0),
            trend: totalMinutes > prevWeekMinutes
              ? ('up' as const)
              : totalMinutes < prevWeekMinutes
                ? ('down' as const)
                : ('stable' as const),
          }
        : null;

      // Insert weekly report
      const { error: insertError } = await supabase
        .from('weekly_reports')
        .insert({
          user_id: user.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          total_minutes: totalMinutes,
          total_sessions: totalSessions,
          total_modules: totalModules,
          courses_summary: coursesSummary,
          ai_summary: reportResult.ai_summary,
          highlights: reportResult.highlights,
          recommendations: reportResult.recommendations,
          streak_length: streakLength,
          compared_to_previous: comparedToPrevious,
        });

      if (insertError) {
        errors++;
        continue;
      }

      // Create notification for users who have weekly report notifications enabled
      if (user.notify_weekly_report) {
        // L4 fix: Only append "..." when summary is actually truncated
        const summaryPreview = truncateText(reportResult.ai_summary, 100);
        const { data: reportNotif } = await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'weekly_report',
          title: 'Weekly Report Ready',
          message: `Your weekly study report for ${weekStartStr} is ready. ${summaryPreview}`,
          action_url: '/analysis/weekly',
          channels_sent: ['in_app'],
          metadata: { week_start: weekStartStr, tokens_used: tokensUsed, model: modelUsed },
        }).select().single();

        // Deliver via configured channels (email, push, etc.)
        if (reportNotif) {
          await sendToChannels(reportNotif).catch(() => {});
        }
      }

      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}
