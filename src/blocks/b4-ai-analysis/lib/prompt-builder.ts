import type { MotivationStyle } from '@/lib/types';

// ---------------------------------------------------------------------------
// Context types for prompt building
// ---------------------------------------------------------------------------

export interface CourseContext {
  courseTitle: string;
  platform: string | null;
  totalModules: number | null;
  completedModules: number;
  totalHours: number | null;
  completedHours: number;
  targetDate: string | null;
  priority: number;
  status: string;
  notes: string | null;
}

export interface SessionSummary {
  date: string;
  durationMinutes: number;
  modulesCompleted: number;
}

export interface CourseAnalysisPromptContext {
  course: CourseContext;
  recentSessions: SessionSummary[];
  daysInactive: number;
  currentStreak: number;
  motivationStyle: MotivationStyle;
  dailyGoalMins: number;
}

export interface WeeklyReportPromptContext {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  totalSessions: number;
  totalModules: number;
  coursesSummary: { title: string; minutes: number; sessions: number; modules: number }[];
  streakLength: number;
  previousWeekMinutes: number | null;
  motivationStyle: MotivationStyle;
}

// ---------------------------------------------------------------------------
// Motivation tone mapping
// ---------------------------------------------------------------------------

const TONE_MAP: Record<MotivationStyle, string> = {
  gentle: 'warm and encouraging — focus on positives, be supportive about setbacks',
  balanced: 'balanced mix of praise and accountability — celebrate wins, honestly note areas for improvement',
  drill_sergeant: 'direct, blunt, and no-nonsense — cut the fluff, call out slacking, demand results',
};

// ---------------------------------------------------------------------------
// Token estimation (rough: ~4 chars per token for English)
// ---------------------------------------------------------------------------

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateHistory(
  sessions: SessionSummary[],
  maxTokens: number
): SessionSummary[] {
  const result: SessionSummary[] = [];
  let tokens = 0;
  for (const s of sessions) {
    const entry = JSON.stringify(s);
    const entryTokens = estimateTokens(entry);
    if (tokens + entryTokens > maxTokens) break;
    result.push(s);
    tokens += entryTokens;
  }
  return result;
}

// ---------------------------------------------------------------------------
// System prompt (static, reused across all calls)
// ---------------------------------------------------------------------------

export function buildSystemPrompt(): string {
  return `You are an AI learning coach that analyzes online course study patterns and provides actionable insights.

You MUST respond with valid JSON only — no markdown, no extra text.

Your role:
- Identify study patterns (optimal times, session lengths, consistency)
- Assess risk of course abandonment or falling behind
- Provide specific, actionable interventions
- Adapt your tone to the user's preferred motivation style`;
}

// ---------------------------------------------------------------------------
// Per-course daily analysis prompt
// ---------------------------------------------------------------------------

export function buildCourseAnalysisPrompt(ctx: CourseAnalysisPromptContext): string {
  const progress = ctx.course.totalModules
    ? `${ctx.course.completedModules}/${ctx.course.totalModules} modules`
    : ctx.course.totalHours
      ? `${ctx.course.completedHours}/${ctx.course.totalHours} hours`
      : `${ctx.course.completedModules} modules completed`;

  const deadline = ctx.course.targetDate
    ? `Target completion: ${ctx.course.targetDate}`
    : 'No deadline set';

  const sessionsText = ctx.recentSessions.length > 0
    ? ctx.recentSessions
        .map((s) => `  - ${s.date}: ${s.durationMinutes}min, ${s.modulesCompleted} modules`)
        .join('\n')
    : '  (no recent sessions)';

  return `Analyze this course and respond with JSON matching this exact schema:
{
  "risk_score": <number 0-100>,
  "insights": [{"type": "positive"|"warning"|"suggestion"|"neutral", "title": "<string>", "description": "<string>", "confidence": <0-1>}],
  "interventions": [{"type": "encouragement"|"action"|"reminder"|"escalation", "message": "<string>", "priority": "low"|"medium"|"high", "action_url": null}],
  "patterns": {"optimal_time": "<string|null>", "avg_session_length": <number>, "consistency_score": <0-1>, "preferred_day": "<string|null>"}
}

Course: "${ctx.course.courseTitle}"
Platform: ${ctx.course.platform ?? 'unknown'}
Progress: ${progress}
${deadline}
Priority: ${ctx.course.priority}/4 (1=highest)
Status: ${ctx.course.status}
Days inactive: ${ctx.daysInactive}
Current streak: ${ctx.currentStreak} days
Daily study goal: ${ctx.dailyGoalMins} minutes
${ctx.course.notes ? `Notes: ${ctx.course.notes}` : ''}

Recent sessions (last 30 days):
${sessionsText}

Motivation style: ${TONE_MAP[ctx.motivationStyle]}

Provide 2-5 insights and 1-3 interventions. Be specific to this course's data.`;
}

// ---------------------------------------------------------------------------
// Weekly report prompt
// ---------------------------------------------------------------------------

export function buildWeeklyReportPrompt(ctx: WeeklyReportPromptContext): string {
  const coursesText = ctx.coursesSummary.length > 0
    ? ctx.coursesSummary
        .map((c) => `  - "${c.title}": ${c.minutes}min across ${c.sessions} sessions, ${c.modules} modules`)
        .join('\n')
    : '  (no courses studied this week)';

  const comparison = ctx.previousWeekMinutes !== null
    ? `Previous week: ${ctx.previousWeekMinutes} minutes (${ctx.totalMinutes > ctx.previousWeekMinutes ? 'up' : ctx.totalMinutes < ctx.previousWeekMinutes ? 'down' : 'same'})`
    : 'No previous week data';

  return `Generate a weekly study report and respond with JSON matching this exact schema:
{
  "ai_summary": "<2-4 sentence summary of the week>",
  "highlights": ["<highlight string>", ...],
  "recommendations": [{"type": "schedule"|"goal"|"technique"|"social", "message": "<string>"}, ...]
}

Week: ${ctx.weekStart} to ${ctx.weekEnd}
Total study time: ${ctx.totalMinutes} minutes across ${ctx.totalSessions} sessions
Modules completed: ${ctx.totalModules}
Current streak: ${ctx.streakLength} days
${comparison}

Courses studied:
${coursesText}

Motivation style: ${TONE_MAP[ctx.motivationStyle]}

Provide 1-5 highlights and 2-4 recommendations.`;
}
