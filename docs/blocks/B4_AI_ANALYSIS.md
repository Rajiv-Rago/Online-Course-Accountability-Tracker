# Block B4 - AI Analysis Engine

> **Status**: Spec Complete
> **Owner**: TBD
> **Last Updated**: 2026-02-19

## Overview

Block B4 is the intelligence layer of the Course Accountability Tracker. It consumes study data produced by other blocks, sends it through GPT-4 for analysis, and stores structured insights, risk scores, and weekly reports. It does NOT display charts (B8), send notifications (B6), or modify any data it reads. It is a pure analysis-and-store engine with read-only views of its own outputs.

---

## Table Ownership

| Relationship | Table | Purpose |
|---|---|---|
| **Owns** | `ai_analyses` | Per-course analysis results (risk scores, insights, interventions, patterns) |
| **Owns** | `weekly_reports` | Weekly summary reports with AI-generated commentary |
| **Reads** | `user_profiles` | Motivation style, preferences, daily goals, experience level |
| **Reads** | `courses` | Course metadata (title, platform, modules, hours, deadlines, priority) |
| **Reads** | `study_sessions` | Raw session data for the last 14 days |
| **Reads** | `daily_stats` | Aggregated daily statistics for trend analysis |

### `ai_analyses` Table Schema

```sql
CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  insights JSONB NOT NULL DEFAULT '[]',
  interventions JSONB NOT NULL DEFAULT '[]',
  patterns JSONB NOT NULL DEFAULT '{}',
  raw_response JSONB,                  -- Full GPT-4 response for debugging
  prompt_tokens INTEGER,               -- Token usage tracking
  completion_tokens INTEGER,           -- Token usage tracking
  model_version TEXT NOT NULL DEFAULT 'gpt-4',
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('daily', 'weekly', 'on_demand')) DEFAULT 'daily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_analyses_user_course ON ai_analyses(user_id, course_id, created_at DESC);
CREATE INDEX idx_ai_analyses_latest ON ai_analyses(user_id, created_at DESC);
CREATE INDEX idx_ai_analyses_risk ON ai_analyses(user_id, risk_level);

-- RLS
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own analyses"
  ON ai_analyses FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert analyses"
  ON ai_analyses FOR INSERT
  WITH CHECK (true);  -- Only service role key is used for inserts
```

### `weekly_reports` Table Schema

```sql
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,            -- Monday of the report week
  week_end DATE NOT NULL,              -- Sunday of the report week
  total_minutes INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  courses_studied UUID[] NOT NULL DEFAULT '{}',
  modules_completed INTEGER NOT NULL DEFAULT 0,
  comparison JSONB NOT NULL DEFAULT '{}',    -- Delta vs previous week
  ai_summary TEXT,                     -- GPT-4 generated narrative summary
  ai_highlights JSONB NOT NULL DEFAULT '[]', -- Key takeaways from the week
  ai_recommendations JSONB NOT NULL DEFAULT '[]', -- Suggestions for next week
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_weekly_reports_user ON weekly_reports(user_id, week_start DESC);

-- Constraints
ALTER TABLE weekly_reports ADD CONSTRAINT unique_user_week UNIQUE (user_id, week_start);

-- RLS
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own weekly reports"
  ON weekly_reports FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert weekly reports"
  ON weekly_reports FOR INSERT
  WITH CHECK (true);
```

---

## Routes

| Route | Page | Description |
|---|---|---|
| `/analysis` | Analysis Overview | Latest risk summary across all courses, recent insights |
| `/analysis/[courseId]` | Course Analysis Detail | Deep-dive into a specific course's analysis history |
| `/analysis/weekly` | Weekly Report | Full weekly report with AI narrative and recommendations |

### Route File Mapping

```
src/app/analysis/
  page.tsx              -> AnalysisOverviewPage
  layout.tsx            -> Analysis layout (shared header/nav)
  [courseId]/
    page.tsx            -> CourseAnalysisDetailPage
  weekly/
    page.tsx            -> WeeklyReportPage
```

### API Routes (Cron Endpoints)

```
src/app/api/cron/
  daily-analysis/
    route.ts            -> POST handler for daily analysis pipeline
  weekly-report/
    route.ts            -> POST handler for weekly report generation
```

---

## File Structure

```
src/blocks/b4-ai-analysis/
  components/
    analysis-overview.tsx         # Summary of all course analyses
    course-analysis-card.tsx      # Per-course risk score + insights
    risk-score-badge.tsx          # Color-coded risk badge (0-100)
    risk-level-indicator.tsx      # Visual indicator (low/med/high/critical)
    insight-list.tsx              # List of AI insights
    insight-card.tsx              # Single insight with confidence score
    intervention-card.tsx         # Suggested intervention with action button
    weekly-report-view.tsx        # Full weekly report layout
    weekly-report-card.tsx        # Summary card for dashboard embedding
    pattern-display.tsx           # Detected patterns (text-based, no charts)
    analysis-history.tsx          # Timeline of past analyses for a course
    analysis-loading.tsx          # Loading/skeleton state during analysis fetch
  hooks/
    use-analysis.ts               # Fetch latest analyses for all courses
    use-weekly-report.ts          # Fetch weekly reports
    use-risk-summary.ts           # Aggregate risk across all courses
  actions/
    analysis-actions.ts           # Server actions for fetching analyses
  lib/
    ai-pipeline.ts                # Core AI analysis pipeline logic
    prompt-builder.ts             # Build GPT-4 prompts from user data
    response-parser.ts            # Parse GPT-4 JSON responses with validation
    risk-calculator.ts            # Calculate and adjust risk scores
    analysis-validation.ts        # Zod schemas for AI responses
```

---

## Component Specifications

### `analysis-overview.tsx`

Main overview page showing risk summary and all course analyses.

**Props**: None (fetches data via hooks)

**Behavior**:
1. Fetches latest analysis per course via `useAnalysis` hook
2. Fetches aggregate risk via `useRiskSummary` hook
3. Fetches latest weekly report via `useWeeklyReport` hook
4. Renders risk banner, course cards, and weekly report preview

**Rendering**:
- Overall risk banner at top (weighted average across courses)
- Grid of `CourseAnalysisCard` components (one per in_progress course)
- `WeeklyReportCard` at bottom with link to full report
- Empty state if no analyses exist yet: "Analysis runs daily. Check back tomorrow!"

---

### `course-analysis-card.tsx`

Summary card for a single course's latest analysis.

**Props**:
- `analysis: AiAnalysis`
- `courseTitle: string`
- `coursePlatform: string`

**Rendering**:
- Course title and platform as header
- `RiskScoreBadge` prominently displayed
- `RiskLevelIndicator` next to the badge
- Top 3 insights shown (truncated), with "View All" link to `/analysis/[courseId]`
- Top intervention shown (if any) with action description
- "Last analyzed: X hours ago" timestamp

---

### `risk-score-badge.tsx`

Circular or pill-shaped badge displaying the numeric risk score.

**Props**:
- `score: number` (0-100)
- `size?: 'sm' | 'md' | 'lg'` (default: 'md')

**Rendering**:
- Numeric score displayed prominently
- Background color based on risk level:
  - 0-25 (low): green (`bg-green-100 text-green-800`)
  - 26-50 (medium): yellow (`bg-yellow-100 text-yellow-800`)
  - 51-75 (high): orange (`bg-orange-100 text-orange-800`)
  - 76-100 (critical): red (`bg-red-100 text-red-800`)
- Sizes: `sm` = 32px circle, `md` = 48px circle, `lg` = 72px circle

---

### `risk-level-indicator.tsx`

Text-based risk level with icon.

**Props**:
- `level: 'low' | 'medium' | 'high' | 'critical'`

**Rendering**:
- Text label: "Low Risk", "Medium Risk", "High Risk", "Critical Risk"
- Icon: checkmark (low), info (medium), alert-triangle (high), alert-octagon (critical)
- Color matches risk score badge scheme
- Uses shadcn `Badge` component with appropriate variant

---

### `insight-list.tsx`

Renders a list of insights from an analysis.

**Props**:
- `insights: Insight[]`
- `maxVisible?: number` (default: all)

**Rendering**:
- Each insight rendered as `InsightCard`
- If `maxVisible` set, shows that many with "Show X more" expander
- Sorted by confidence score descending

---

### `insight-card.tsx`

Single insight display.

**Props**:
- `insight: Insight`

**Rendering**:
- Icon based on type:
  - `pattern`: eye icon
  - `warning`: alert-triangle icon
  - `positive`: thumbs-up icon
  - `suggestion`: lightbulb icon
- Title in bold
- Description as body text
- Confidence displayed as subtle percentage badge (e.g., "87% confidence")
- Background tint based on type (warning = amber tint, positive = green tint, etc.)

---

### `intervention-card.tsx`

Suggested intervention with optional action.

**Props**:
- `intervention: Intervention`

**Rendering**:
- Priority indicator: colored dot (high = red, medium = yellow, low = blue)
- Type label as subtle badge (e.g., "Schedule Change", "Goal Adjustment")
- Personalized message as body text
- If type is `schedule_change` or `goal_adjustment`: "Apply Suggestion" button (links to relevant settings page)
- If type is `motivation` or `technique` or `social`: informational display only

---

### `weekly-report-view.tsx`

Full weekly report layout.

**Props**: None (fetches via `useWeeklyReport` hook)

**Rendering**:
- Week header: "Week of Feb 10 - Feb 16, 2026"
- Metrics row: total hours, total sessions, active days, modules completed
- Comparison vs previous week (up/down arrows with percentages)
- AI summary: narrative paragraph from `ai_summary`
- Highlights: bulleted list from `ai_highlights`
- Recommendations: numbered list from `ai_recommendations`
- Per-course breakdown section
- Navigation: "Previous Week" / "Next Week" arrows

---

### `weekly-report-card.tsx`

Compact weekly report preview for the analysis overview page.

**Props**:
- `report: WeeklyReport | null`

**Rendering**:
- "Weekly Report" header with date range
- First 150 characters of `ai_summary` as preview text
- Key metrics: hours, sessions, active days
- "View Full Report" link to `/analysis/weekly`
- If no report yet: "Weekly reports are generated every Monday."

---

### `pattern-display.tsx`

Displays detected study patterns as structured text.

**Props**:
- `patterns: PatternData`

**Rendering**:
- Key-value display using shadcn `Card` with description list:
  - "Best study time": patterns.optimal_study_time
  - "Average session": patterns.avg_session_minutes + " minutes"
  - "Consistency": patterns.consistency_score + "/100"
  - "Velocity trend": patterns.velocity_trend (with up/down/flat arrow icon)
  - "Predicted completion": patterns.predicted_completion_date (formatted) or "Insufficient data"
- No charts or graphs (those are B8's responsibility)

---

### `analysis-history.tsx`

Timeline of past analyses for a single course.

**Props**:
- `courseId: string`

**Behavior**:
- Fetches last 30 analyses for the course via server action
- Displays as vertical timeline

**Rendering**:
- Each entry: date, risk score badge, top insight title
- Clicking an entry expands to show full insights and interventions
- Risk score trend shown as text: "Risk has increased from X to Y over the last 7 days"

---

### `analysis-loading.tsx`

Loading/skeleton state displayed while analysis data is being fetched.

**Props**:
- `variant: 'overview' | 'detail' | 'card'`

**Rendering**:
- `overview`: Full page skeleton with 3 cards
- `detail`: Single course detail skeleton
- `card`: Single card skeleton
- Uses shadcn `Skeleton` components

---

## Hook Specifications

### `use-analysis.ts`

```typescript
interface UseAnalysisOptions {
  courseId?: string;         // Filter to specific course
  limit?: number;           // Number of analyses to fetch (default: 1 per course)
  includeHistory?: boolean; // Fetch historical analyses (default: false)
}

interface UseAnalysisReturn {
  analyses: AiAnalysis[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  lastAnalyzedAt: Date | null;
}

function useAnalysis(options?: UseAnalysisOptions): UseAnalysisReturn;
```

**Implementation**:
- React Query with query key `['analyses', options]`
- Default: fetches latest analysis per course for the user
- With `courseId`: fetches latest (or history) for that specific course
- Stale time: 5 minutes (analyses don't change frequently)
- Refetch on window focus: true

---

### `use-weekly-report.ts`

```typescript
interface UseWeeklyReportOptions {
  weekStart?: Date;  // Specific week to fetch (default: most recent)
}

interface UseWeeklyReportReturn {
  report: WeeklyReport | null;
  isLoading: boolean;
  error: Error | null;
  hasNextWeek: boolean;
  hasPreviousWeek: boolean;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
}

function useWeeklyReport(options?: UseWeeklyReportOptions): UseWeeklyReportReturn;
```

**Implementation**:
- React Query with query key `['weekly-report', weekStart]`
- Navigation functions update the weekStart parameter
- `hasNextWeek`: false if current week is this week or in the future
- `hasPreviousWeek`: false if no earlier reports exist
- Stale time: 10 minutes

---

### `use-risk-summary.ts`

```typescript
interface RiskSummary {
  overallScore: number;          // Weighted average across courses
  overallLevel: 'low' | 'medium' | 'high' | 'critical';
  courseCount: number;
  highRiskCount: number;         // Courses with risk >= 51
  criticalRiskCount: number;     // Courses with risk >= 76
  trend: 'improving' | 'stable' | 'worsening';  // Compared to 7 days ago
}

function useRiskSummary(): {
  data: RiskSummary | null;
  isLoading: boolean;
  error: Error | null;
};
```

**Implementation**:
- Fetches latest analysis per course
- Calculates weighted average (weighted by course priority: P1 = 4x, P2 = 3x, P3 = 2x, P4 = 1x)
- Trend: compares current overall score to the score from 7 days ago
- React Query with stale time: 5 minutes

---

## Server Actions

### `analysis-actions.ts`

```typescript
'use server'

// Fetch latest analysis per course for the authenticated user
async function fetchLatestAnalyses(): Promise<AiAnalysis[]>
// - Queries ai_analyses for the latest row per (user_id, course_id)
// - Joins with courses table for course metadata
// - Returns array sorted by risk_score DESC

// Fetch analysis history for a specific course
async function fetchAnalysisHistory(
  courseId: string,
  limit?: number
): Promise<AiAnalysis[]>
// - Validates course ownership
// - Returns last N analyses for the course, ordered by created_at DESC

// Fetch latest weekly report
async function fetchWeeklyReport(weekStart?: Date): Promise<WeeklyReport | null>
// - If weekStart provided: fetch specific week
// - If not: fetch most recent week
// - Returns null if no report exists for the requested week

// Fetch weekly report list (for navigation)
async function fetchWeeklyReportDates(): Promise<Date[]>
// - Returns array of week_start dates for which reports exist
// - Used by the weekly report navigation to enable/disable prev/next
```

---

## Library Functions

### `ai-pipeline.ts`

The core pipeline that orchestrates the entire analysis flow.

```typescript
interface PipelineConfig {
  maxRetries: number;          // Default: 3
  retryDelayMs: number;        // Default: 2000
  maxRequestsPerMinute: number; // Default: 50
  sessionHistoryDays: number;  // Default: 14
  fallbackHistoryDays: number; // Default: 7 (if token limit exceeded)
}

/**
 * Run daily analysis for all active users.
 * Called by POST /api/cron/daily-analysis
 */
async function runDailyAnalysis(config?: Partial<PipelineConfig>): Promise<PipelineResult>

/**
 * Run analysis for a single user across all their in_progress courses.
 */
async function analyzeUser(userId: string, config: PipelineConfig): Promise<UserAnalysisResult>

/**
 * Run analysis for a single user-course pair.
 */
async function analyzeCourse(
  userId: string,
  courseId: string,
  config: PipelineConfig
): Promise<AiAnalysis>
```

**Pipeline Flow (Detailed)**:

```
runDailyAnalysis()
  |
  +--> 1. Fetch all users WHERE onboarding_completed = true
  |
  +--> 2. Rate limiter: create token bucket (50 req/min)
  |
  +--> 3. For each user (sequential to respect rate limits):
  |      |
  |      +--> analyzeUser(userId)
  |             |
  |             +--> 3a. Fetch user_profile (motivation_style, daily_goal, etc.)
  |             +--> 3b. Fetch all courses WHERE status = 'in_progress'
  |             +--> 3c. Fetch daily_stats for last 14 days
  |             +--> 3d. Fetch study_sessions for last 14 days
  |             |
  |             +--> 3e. For each course:
  |                    |
  |                    +--> analyzeCourse(userId, courseId)
  |                           |
  |                           +--> i.   Build prompt via promptBuilder
  |                           +--> ii.  Call OpenAI GPT-4 API
  |                           +--> iii. Parse response via responseParser
  |                           +--> iv.  Adjust risk score via riskCalculator
  |                           +--> v.   Insert into ai_analyses table
  |                           +--> vi.  Return analysis result
  |
  +--> 4. Log pipeline summary (users processed, errors, token usage)
  |
  +--> 5. Return PipelineResult
```

**Rate Limiting Implementation**:

```typescript
class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per ms
  private lastRefill: number;

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.tokens = requestsPerMinute;
    this.refillRate = requestsPerMinute / 60000;
    this.lastRefill = Date.now();
  }

  async waitForToken(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = (1 - this.tokens) / this.refillRate;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + (now - this.lastRefill) * this.refillRate
    );
    this.lastRefill = now;
  }
}
```

---

### `prompt-builder.ts`

Constructs structured prompts for GPT-4 from raw user data.

```typescript
interface PromptContext {
  userProfile: UserProfile;
  course: Course;
  dailyStats: DailyStat[];    // Last 14 days
  sessions: StudySession[];   // Last 10 sessions for this course
}

/**
 * Build the system prompt (static, shared across all calls).
 */
function buildSystemPrompt(): string;

/**
 * Build the user prompt for a specific course analysis.
 */
function buildCourseAnalysisPrompt(context: PromptContext): string;

/**
 * Build the user prompt for a weekly report.
 */
function buildWeeklyReportPrompt(context: WeeklyReportContext): string;

/**
 * Estimate token count for a prompt (rough heuristic: ~4 chars per token).
 * Used to check if we need to truncate history.
 */
function estimateTokens(text: string): number;

/**
 * Truncate session history to fit within token budget.
 * Keeps the most recent sessions and drops older ones.
 */
function truncateHistory(
  sessions: StudySession[],
  dailyStats: DailyStat[],
  maxTokens: number
): { sessions: StudySession[]; dailyStats: DailyStat[] };
```

**System Prompt**:

```
You are a learning analytics AI that analyzes study patterns and predicts dropout risk
for online course learners. You respond ONLY in valid JSON format. Do not include any
text outside the JSON object. Do not use markdown code fences.

Your analysis should be:
- Evidence-based: reference specific data points
- Actionable: provide concrete, specific suggestions
- Empathetic: match the student's motivation style
- Calibrated: confidence scores should reflect actual certainty

Risk scoring guide:
- 0-25 (low): Consistent progress, on track
- 26-50 (medium): Minor concerns, slight deviations from goals
- 51-75 (high): Significant warning signs, intervention recommended
- 76-100 (critical): Severe risk of abandonment, immediate intervention needed
```

**Course Analysis User Prompt Template**:

```
Analyze the following student's learning data and provide insights.

Student Profile:
- Motivation style: {motivation_style}
- Daily goal: {daily_study_goal_minutes} minutes
- Experience: {experience_level}
- Preferred schedule: {preferred_study_days} at {preferred_study_time}

Course: {course_title}
- Platform: {platform}
- Progress: {completed_modules}/{total_modules} modules ({progress_pct}%)
- Hours: {completed_hours}/{total_hours} hours
- Target completion: {target_completion_date}
- Priority: P{priority}
- Status: {status}
- Days since last session on this course: {days_since_last}

Last 14 Days Study Data (this course only):
| Date       | Minutes | Sessions | Modules |
|------------|---------|----------|---------|
{daily_stats_rows}

Recent Sessions (this course, last 10):
{session_list}

Overall Stats (all courses):
- Current streak: {streak_days} days
- Total study hours this week: {week_hours}
- Active courses: {active_course_count}

Respond with this exact JSON structure:
{
  "risk_score": <0-100 integer>,
  "insights": [
    {
      "type": "pattern" | "warning" | "positive" | "suggestion",
      "title": "<concise title, max 60 chars>",
      "description": "<detailed insight, 1-3 sentences>",
      "confidence": <0.0-1.0 float>
    }
  ],
  "interventions": [
    {
      "type": "schedule_change" | "goal_adjustment" | "motivation" | "technique" | "social",
      "message": "<personalized message matching student's {motivation_style} motivation style, 1-3 sentences>",
      "priority": "high" | "medium" | "low"
    }
  ],
  "patterns": {
    "optimal_study_time": "<detected best time of day or 'insufficient data'>",
    "avg_session_minutes": <number>,
    "consistency_score": <0-100 integer>,
    "velocity_trend": "increasing" | "stable" | "decreasing",
    "predicted_completion_date": "<ISO date string or null if insufficient data>"
  }
}

Provide 3-6 insights and 1-3 interventions. Be specific and reference actual data points.
```

**Weekly Report User Prompt Template**:

```
Generate a weekly study report for the following student.

Student Profile:
- Name: {display_name}
- Motivation style: {motivation_style}

This Week (Mon {week_start} - Sun {week_end}):
- Total study time: {total_minutes} minutes ({total_hours} hours)
- Sessions: {session_count}
- Active days: {active_days}/7
- Modules completed: {modules_completed}
- Courses studied: {course_list}

Previous Week Comparison:
- Study time: {prev_minutes} min -> {curr_minutes} min ({delta_pct}%)
- Sessions: {prev_sessions} -> {curr_sessions}
- Active days: {prev_active} -> {curr_active}

Per-Course Breakdown:
{course_breakdown_table}

Respond with this exact JSON structure:
{
  "summary": "<2-4 sentence narrative summary of the week, written in second person ('you'), matching the student's {motivation_style} motivation style>",
  "highlights": [
    "<key positive observation>",
    "<key area of concern or neutral observation>",
    "<key trend observation>"
  ],
  "recommendations": [
    "<specific, actionable recommendation for next week>",
    "<specific, actionable recommendation for next week>"
  ]
}

Write in a {motivation_tone} tone. Be specific and reference actual numbers.
```

Where `motivation_tone` maps:
- `discipline` -> "direct and no-nonsense"
- `encouragement` -> "warm and encouraging"
- `data_driven` -> "analytical and metric-focused"
- `social` -> "friendly and community-oriented"

---

### `response-parser.ts`

Parses and validates GPT-4 JSON responses.

```typescript
/**
 * Parse the raw GPT-4 response string into a validated analysis object.
 * Handles common GPT-4 output quirks:
 * - Markdown code fences (```json ... ```)
 * - Leading/trailing whitespace
 * - Trailing commas (cleaned before parse)
 * - UTF-8 BOM
 */
function parseCourseAnalysisResponse(raw: string): CourseAnalysisResponse;

/**
 * Parse weekly report response.
 */
function parseWeeklyReportResponse(raw: string): WeeklyReportResponse;

/**
 * Clean raw GPT-4 output before JSON.parse.
 */
function cleanJsonOutput(raw: string): string;
// 1. Strip markdown code fences
// 2. Strip BOM
// 3. Trim whitespace
// 4. Remove trailing commas before } or ]
```

---

### `risk-calculator.ts`

Adjusts the GPT-4 risk score with rule-based modifiers.

```typescript
interface RiskAdjustmentContext {
  baseScore: number;           // From GPT-4 response
  daysSinceLastSession: number;
  streakBroken: boolean;       // Was streak broken in last 3 days?
  weeklyHoursTrend: number;    // Percentage change (negative = declining)
  daysUntilDeadline: number | null;
  progressPercentage: number;  // 0-100
  expectedProgressPercentage: number; // Where they should be based on deadline
}

/**
 * Calculate final risk score with adjustments.
 */
function calculateAdjustedRisk(context: RiskAdjustmentContext): {
  score: number;      // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  adjustments: RiskAdjustment[];  // Explanations of each adjustment
};
```

**Adjustment Rules**:

| Condition | Score Adjustment | Rationale |
|---|---|---|
| Days since last session: 2-3 days | +5 per day over 1 | Early warning of disengagement |
| Days since last session: 4-7 days | +10 per day over 3 | Significant gap |
| Days since last session: 7+ days | +15 (capped) | High risk threshold reached |
| Streak broken in last 3 days | +10 | Momentum loss indicator |
| Weekly hours declining > 20% | +10 | Negative trend |
| Weekly hours declining > 50% | +15 (replaces above) | Severe negative trend |
| Deadline within 14 days AND progress < 50% of expected | +20 | Time pressure risk |
| Deadline within 7 days AND progress < 70% of expected | +25 (replaces above) | Critical time pressure |
| Weekly hours increasing > 20% | -5 | Positive momentum |
| On track or ahead of schedule | -5 | Low risk indicator |

**Final score**: `Math.max(0, Math.min(100, baseScore + sum(adjustments)))`

**Risk Level Thresholds**:
- `low`: 0-25
- `medium`: 26-50
- `high`: 51-75
- `critical`: 76-100

---

### `analysis-validation.ts`

Zod schemas for validating AI responses.

```typescript
import { z } from 'zod';

export const insightSchema = z.object({
  type: z.enum(['pattern', 'warning', 'positive', 'suggestion']),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const interventionSchema = z.object({
  type: z.enum(['schedule_change', 'goal_adjustment', 'motivation', 'technique', 'social']),
  message: z.string().min(1).max(500),
  priority: z.enum(['high', 'medium', 'low']),
});

export const patternSchema = z.object({
  optimal_study_time: z.string(),
  avg_session_minutes: z.number().min(0),
  consistency_score: z.number().int().min(0).max(100),
  velocity_trend: z.enum(['increasing', 'stable', 'decreasing']),
  predicted_completion_date: z.string().nullable(),
});

export const courseAnalysisResponseSchema = z.object({
  risk_score: z.number().int().min(0).max(100),
  insights: z.array(insightSchema).min(1).max(10),
  interventions: z.array(interventionSchema).min(0).max(5),
  patterns: patternSchema,
});

export const weeklyReportResponseSchema = z.object({
  summary: z.string().min(1).max(1000),
  highlights: z.array(z.string().min(1).max(300)).min(1).max(5),
  recommendations: z.array(z.string().min(1).max(300)).min(1).max(5),
});

export type Insight = z.infer<typeof insightSchema>;
export type Intervention = z.infer<typeof interventionSchema>;
export type PatternData = z.infer<typeof patternSchema>;
export type CourseAnalysisResponse = z.infer<typeof courseAnalysisResponseSchema>;
export type WeeklyReportResponse = z.infer<typeof weeklyReportResponseSchema>;
```

---

## AI Pipeline Flow (Detailed)

### Daily Analysis (`POST /api/cron/daily-analysis`)

**Trigger**: Vercel Cron at 4:00 AM UTC daily

**Authentication**: Vercel cron secret in `CRON_SECRET` env var, validated via `Authorization: Bearer` header

```typescript
// src/app/api/cron/daily-analysis/route.ts

export async function POST(request: Request) {
  // 1. Validate cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Run pipeline with service role client (bypasses RLS)
  const result = await runDailyAnalysis({
    maxRetries: 3,
    retryDelayMs: 2000,
    maxRequestsPerMinute: 50,
    sessionHistoryDays: 14,
    fallbackHistoryDays: 7,
  });

  // 3. Return summary
  return Response.json({
    usersProcessed: result.usersProcessed,
    analysesCreated: result.analysesCreated,
    errors: result.errors.length,
    totalTokens: result.totalTokens,
    durationMs: result.durationMs,
  });
}
```

### Weekly Report (`POST /api/cron/weekly-report`)

**Trigger**: Vercel Cron at 3:00 AM UTC every Monday

```typescript
// src/app/api/cron/weekly-report/route.ts

export async function POST(request: Request) {
  // 1. Validate cron secret
  // 2. Calculate week boundaries (previous Mon-Sun)
  // 3. For each active user:
  //    a. Aggregate study_sessions for the week
  //    b. Aggregate previous week for comparison
  //    c. Build weekly report prompt
  //    d. Call GPT-4
  //    e. Parse and validate response
  //    f. Insert into weekly_reports
  //    g. Insert notification into notifications table (for B6)
  // 4. Return summary
}
```

**Notification Insert** (for B6 to pick up):

```sql
INSERT INTO notifications (user_id, type, title, message, metadata)
VALUES (
  :user_id,
  'weekly_report',
  'Your Weekly Study Report is Ready',
  'Check out your study insights for the week of {week_start}.',
  jsonb_build_object('week_start', :week_start, 'report_id', :report_id)
);
```

---

## Risk Score Calculation (Detailed)

### Workflow

```
GPT-4 Response
  |
  +--> Extract base risk_score (0-100)
  |
  +--> Calculate adjustments:
  |      +--> daysSinceLastSession adjustment
  |      +--> streakBroken adjustment
  |      +--> weeklyHoursTrend adjustment
  |      +--> deadline proximity adjustment
  |      +--> positive trend adjustment (negative modifier)
  |
  +--> Sum: finalScore = clamp(baseScore + adjustments, 0, 100)
  |
  +--> Derive risk_level from finalScore thresholds
  |
  +--> Store both in ai_analyses row
```

### Expected Progress Calculation

For deadline-based adjustments, "expected progress" is calculated as:

```typescript
function calculateExpectedProgress(
  startDate: Date,
  targetDate: Date,
  today: Date
): number {
  const totalDays = differenceInDays(targetDate, startDate);
  const elapsedDays = differenceInDays(today, startDate);
  if (totalDays <= 0) return 100;
  return Math.min(100, (elapsedDays / totalDays) * 100);
}
```

---

## UI Mockups

### Analysis Overview Page (`/analysis`)

```
+----------------------------------------------------------+
|  AI Analysis                                              |
+----------------------------------------------------------+
|                                                           |
|  Overall Risk                                             |
|  +------------------------------------------------------+ |
|  |  [============================>                    ]  | |
|  |  Score: 58/100   Level: HIGH   Trend: Worsening      | |
|  |  2 courses at high risk, 1 at critical               | |
|  +------------------------------------------------------+ |
|                                                           |
|  Course Analyses (sorted by risk, highest first)          |
|  +------------------------------------------------------+ |
|  | React - The Complete Guide              Risk: [72]    | |
|  | HIGH RISK                                             | |
|  |                                                       | |
|  | * WARNING: Study hours dropped 40% this week          | |
|  |   "You studied 3.5h this week vs 5.8h last week"     | |
|  |   Confidence: 92%                                     | |
|  |                                                       | |
|  | * PATTERN: Best study time detected: 7-9 PM           | |
|  |   "Your most productive sessions happen in..."        | |
|  |   Confidence: 78%                                     | |
|  |                                                       | |
|  | * SUGGESTION: Consider 25-min daily sessions           | |
|  |   Confidence: 85%                                     | |
|  |                                                       | |
|  | Suggested: "Try scheduling 25-minute sessions at      | |
|  | 7 PM. Small wins build momentum!" [Schedule Change]   | |
|  |                                                       | |
|  | Last analyzed: 6 hours ago    [View Details ->]       | |
|  +------------------------------------------------------+ |
|                                                           |
|  +------------------------------------------------------+ |
|  | Python ML Bootcamp                      Risk: [23]    | |
|  | LOW RISK                                              | |
|  |                                                       | |
|  | * POSITIVE: Consistent daily progress                  | |
|  |   "You've studied every day this week, averaging..."  | |
|  |   Confidence: 95%                                     | |
|  |                                                       | |
|  | * PATTERN: On track for March 15 completion            | |
|  |   "At your current pace, you'll finish 3 days early"  | |
|  |   Confidence: 82%                                     | |
|  |                                                       | |
|  | Last analyzed: 6 hours ago    [View Details ->]       | |
|  +------------------------------------------------------+ |
|                                                           |
|  Weekly Report                                            |
|  +------------------------------------------------------+ |
|  | Week of Feb 10 - Feb 16, 2026                         | |
|  | "Great week! You put in 12.5 hours across 8           | |
|  | sessions. Your consistency improved by 15%..."         | |
|  |                                                       | |
|  | 12.5h total  |  8 sessions  |  6/7 days active       | |
|  |                                [View Full Report ->]  | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### Course Analysis Detail Page (`/analysis/[courseId]`)

```
+----------------------------------------------------------+
|  React - The Complete Guide                               |
|  Analysis Detail                                          |
+----------------------------------------------------------+
|                                                           |
|  Risk Score                                               |
|  +---+                                                    |
|  |72 |  HIGH RISK                                         |
|  +---+                                                    |
|  Base: 65 (GPT-4) + 7 (adjustments)                      |
|  Adjustments: +5 (2 days inactive), +10 (streak broken), |
|               -8 (N/A - no positive adjustments applied)  |
|                                                           |
|  Study Patterns                                           |
|  +------------------------------------------------------+ |
|  | Best study time:    7:00 - 9:00 PM                    | |
|  | Avg session:        38 minutes                        | |
|  | Consistency:        42/100                             | |
|  | Velocity trend:     Decreasing                        | |
|  | Predicted finish:   April 2, 2026 (was March 20)      | |
|  +------------------------------------------------------+ |
|                                                           |
|  Insights (5)                                             |
|  +------------------------------------------------------+ |
|  | [!] Study hours dropped 40% this week         92%     | |
|  |     You studied 3.5h this week compared to 5.8h      | |
|  |     last week. This is the steepest decline in...     | |
|  +------------------------------------------------------+ |
|  | [eye] Best sessions happen on weekday evenings  78%   | |
|  |     Your 4 most productive sessions (>40 min)         | |
|  |     all occurred between 7-9 PM on weekdays.          | |
|  +------------------------------------------------------+ |
|  | ... (more insights)                                   | |
|                                                           |
|  Suggested Actions (2)                                    |
|  +------------------------------------------------------+ |
|  | [HIGH] Schedule Change                                | |
|  | "Based on your patterns, try blocking 7-8 PM on      | |
|  | weekdays for React study. Consistency matters more    | |
|  | than long sessions."                                  | |
|  +------------------------------------------------------+ |
|  | [MED] Technique                                       | |
|  | "Try the Pomodoro technique: 25 min focused study,    | |
|  | 5 min break. Your best sessions average 38 min,       | |
|  | suggesting a sweet spot around 25-40 minutes."        | |
|  +------------------------------------------------------+ |
|                                                           |
|  Analysis History (last 30 days)                          |
|  +------------------------------------------------------+ |
|  | Feb 19  Risk: 72  "Study hours declining"             | |
|  | Feb 18  Risk: 65  "Slight dip in consistency"         | |
|  | Feb 17  Risk: 58  "Moderate risk, watch closely"      | |
|  | Feb 16  Risk: 45  "On track, minor concerns"          | |
|  | ...                                                   | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

### Weekly Report Page (`/analysis/weekly`)

```
+----------------------------------------------------------+
|  Weekly Study Report                                      |
|  [< Prev Week]  Feb 10 - Feb 16, 2026  [Next Week >]     |
+----------------------------------------------------------+
|                                                           |
|  Summary                                                  |
|  "Great week! You put in 12.5 hours across 8 sessions,   |
|  studying 6 out of 7 days. Your consistency score         |
|  improved by 15% compared to last week. The main area    |
|  for improvement is your React course, where study time   |
|  dropped significantly."                                  |
|                                                           |
|  This Week              vs Previous Week                  |
|  +-------------------+  +-------------------+             |
|  | 12.5 hours        |  | 11.0 hours (+14%) |             |
|  | 8 sessions        |  | 7 sessions (+14%) |             |
|  | 6/7 active days   |  | 5/7 days   (+20%) |             |
|  | 14 modules done   |  | 11 modules (+27%) |             |
|  +-------------------+  +-------------------+             |
|                                                           |
|  Highlights                                               |
|  * You maintained a 6-day study streak - your best        |
|    since starting!                                        |
|  * Python ML sessions were highly focused, averaging      |
|    48 minutes with no breaks.                             |
|  * React study time dropped from 5.8h to 3.5h - this     |
|    needs attention.                                       |
|                                                           |
|  Recommendations for Next Week                            |
|  1. Schedule at least 3 dedicated React sessions of       |
|     30+ minutes to get back on track.                     |
|  2. Keep up the Python ML momentum - you're on pace       |
|     to finish by March 12.                                |
|  3. Try studying on Sunday to hit a 7/7 week - even       |
|     15 minutes counts!                                    |
|                                                           |
|  Course Breakdown                                         |
|  +------------------------------------------------------+ |
|  | React Course      | 3.5h | 3 sessions | 4 modules   | |
|  | Python ML         | 6.0h | 3 sessions | 7 modules   | |
|  | Data Structures   | 3.0h | 2 sessions | 3 modules   | |
|  +------------------------------------------------------+ |
|                                                           |
+----------------------------------------------------------+
```

---

## Component Tree

```
AnalysisOverviewPage (/analysis)
  +-- AnalysisLoading (shown while fetching)
  +-- RiskSummaryBanner
  |     +-- RiskScoreBadge (lg)
  |     +-- RiskLevelIndicator
  +-- CourseAnalysisList
  |     +-- CourseAnalysisCard (x N, sorted by risk DESC)
  |           +-- RiskScoreBadge (md)
  |           +-- RiskLevelIndicator
  |           +-- InsightList (maxVisible=3)
  |           |     +-- InsightCard (x 3)
  |           +-- InterventionCard (top 1)
  +-- WeeklyReportCard
  +-- PatternDisplay (aggregate)

CourseAnalysisDetailPage (/analysis/[courseId])
  +-- AnalysisLoading (shown while fetching)
  +-- RiskScoreBadge (lg)
  +-- RiskLevelIndicator
  +-- RiskAdjustmentBreakdown (shows base + adjustments)
  +-- PatternDisplay (course-specific)
  +-- InsightList (all insights)
  |     +-- InsightCard (x N)
  +-- InterventionList
  |     +-- InterventionCard (x N)
  +-- AnalysisHistory
        +-- AnalysisHistoryEntry (x N, expandable)

WeeklyReportPage (/analysis/weekly)
  +-- WeekNavigator (prev/next)
  +-- WeeklyReportView
        +-- WeekSummaryHeader (date range)
        +-- AISummarySection (narrative text)
        +-- MetricsComparison (this week vs last)
        +-- HighlightsList (bulleted)
        +-- RecommendationsList (numbered)
        +-- CourseBreakdownTable
```

---

## Error Handling

| Scenario | Handling | Retry? |
|---|---|---|
| GPT-4 returns invalid JSON | Strip markdown fences, clean trailing commas, retry parse. If still fails: retry API call with stricter prompt addendum ("IMPORTANT: respond with ONLY valid JSON, no markdown"). | Yes, up to 3 attempts |
| GPT-4 returns valid JSON but fails Zod validation | Log the validation error and raw response. Apply defaults for missing fields where possible (e.g., empty arrays for insights). If critical fields missing (risk_score): retry. | Yes, 1 retry |
| GPT-4 API returns 429 (rate limited) | Exponential backoff: wait 2s, 4s, 8s. Queue the request for retry. | Yes, up to 3 attempts |
| GPT-4 API returns 500/503 | Skip this user, log error. Will be picked up in next daily run. | No immediate retry |
| GPT-4 API timeout (>30s) | Abort request, log timeout. Retry once with truncated history (7 days instead of 14). | Yes, 1 retry with reduced data |
| Token limit exceeded (>8k tokens in prompt) | Truncate session history from 14 days to 7 days. Remove notes from sessions. Retry. | Yes, automatic truncation and retry |
| Network error (DNS, connection refused) | Log error, skip user. Alert if >10% of users fail (log for ops monitoring). | No |
| No study data for a course | Skip analysis for that course (nothing to analyze). Log as info. | N/A |
| No active users found | Return early with empty result. Not an error. | N/A |
| Cron endpoint hit without valid secret | Return 401 immediately. Log unauthorized access attempt. | N/A |

---

## OpenAI API Configuration

```typescript
const OPENAI_CONFIG = {
  model: 'gpt-4',
  temperature: 0.3,           // Low temperature for consistent, factual analysis
  max_tokens: 1500,           // Sufficient for structured JSON response
  response_format: { type: 'json_object' },  // Force JSON mode (GPT-4 Turbo+)
  timeout: 30000,             // 30 second timeout
};
```

**Token Budget Estimates**:
- System prompt: ~200 tokens
- User prompt (14-day data): ~800-1200 tokens
- User prompt (7-day fallback): ~500-700 tokens
- Response: ~500-1000 tokens
- Total per course: ~1500-2400 tokens
- Cost estimate: ~$0.06-0.10 per course analysis (GPT-4 pricing)

---

## State Management

| Concern | Solution | Details |
|---|---|---|
| Analysis data | React Query (`useQuery`) | Key: `['analyses', options]`, stale: 5 min |
| Weekly reports | React Query (`useQuery`) | Key: `['weekly-report', weekStart]`, stale: 10 min |
| Risk summary | React Query (`useQuery`) | Key: `['risk-summary']`, stale: 5 min |
| Page navigation | URL params via Next.js `useSearchParams` | Week start date in URL for weekly report |
| Loading states | React Query `isLoading` / `isFetching` | Skeleton components during fetch |
| Error states | React Query `error` + error boundary | Graceful fallback UI with retry button |

---

## Type Definitions

```typescript
interface AiAnalysis {
  id: string;
  user_id: string;
  course_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  insights: Insight[];
  interventions: Intervention[];
  patterns: PatternData;
  raw_response: Record<string, unknown> | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model_version: string;
  analysis_type: 'daily' | 'weekly' | 'on_demand';
  created_at: string;
  // Joined fields
  course_title?: string;
  course_platform?: string;
}

interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;           // YYYY-MM-DD
  week_end: string;             // YYYY-MM-DD
  total_minutes: number;
  total_sessions: number;
  active_days: number;
  courses_studied: string[];
  modules_completed: number;
  comparison: WeekComparison;
  ai_summary: string | null;
  ai_highlights: string[];
  ai_recommendations: string[];
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
}

interface WeekComparison {
  prev_total_minutes: number;
  minutes_delta_pct: number;
  prev_total_sessions: number;
  sessions_delta_pct: number;
  prev_active_days: number;
  active_days_delta_pct: number;
}

interface PipelineResult {
  usersProcessed: number;
  analysesCreated: number;
  errors: PipelineError[];
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  durationMs: number;
}

interface PipelineError {
  userId: string;
  courseId?: string;
  error: string;
  retryable: boolean;
  timestamp: string;
}

interface RiskAdjustment {
  reason: string;
  adjustment: number;
}
```

---

## Testing Plan

### Unit Tests

| Test | File | Cases |
|---|---|---|
| Prompt builder | `prompt-builder.test.ts` | Correct template filling; handles missing optional fields; handles empty session array; truncation logic; token estimation accuracy |
| Response parser | `response-parser.test.ts` | Valid JSON; JSON with markdown fences; JSON with trailing commas; JSON with BOM; completely invalid string; partial valid JSON; empty response |
| Risk calculator | `risk-calculator.test.ts` | Base score only (no adjustments); each adjustment rule individually; multiple adjustments stacking; clamping at 0 and 100; level thresholds at boundaries (25/26, 50/51, 75/76); positive adjustments reducing score |
| Zod validation | `analysis-validation.test.ts` | Valid complete response; missing required fields; out-of-range values; extra fields (should be stripped); empty arrays where min=1 |
| Rate limiter | `ai-pipeline.test.ts` | Token bucket fills correctly; waits when depleted; handles burst requests |

### Integration Tests

| Test | Scope |
|---|---|
| Full pipeline (mocked OpenAI) | Run daily analysis with mocked GPT-4 responses -> verify correct rows inserted into ai_analyses |
| Weekly report pipeline (mocked OpenAI) | Run weekly report -> verify correct aggregation, comparison, and row inserted into weekly_reports |
| Error recovery | Simulate GPT-4 failure -> verify retry logic -> verify partial results saved |
| Cron authentication | Hit cron endpoint without secret -> verify 401; with secret -> verify 200 |

### Snapshot Tests

| Test | Component |
|---|---|
| Risk badge rendering | All 4 risk levels render correct colors and text |
| Insight card types | All 4 insight types render correct icons and tint |
| Intervention priorities | All 3 priority levels render correctly |

---

## Performance Considerations

- **Cron timing**: Daily analysis at 4 AM UTC avoids peak hours; weekly at 3 AM Monday
- **Sequential user processing**: Avoids overwhelming OpenAI API; predictable rate limiting
- **Pre-computed daily_stats**: Pipeline reads aggregated data, not raw sessions (smaller payloads)
- **Token optimization**: 14-day window balances insight quality vs token cost; fallback to 7 days
- **Client-side caching**: 5-minute stale time means analyses don't refetch on every navigation
- **Database indexes**: Composite index on `(user_id, course_id, created_at DESC)` for fast latest-analysis lookups
- **Pagination for history**: Analysis history endpoint returns max 30 records per request

---

## Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API authentication | Yes |
| `OPENAI_ORG_ID` | OpenAI organization (if applicable) | No |
| `CRON_SECRET` | Vercel Cron authentication token | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS for pipeline inserts | Yes |

---

## "Do Not Touch" Boundaries

This block:
- **DOES NOT** send notifications directly (inserts into `notifications` table for B6 to process)
- **DOES NOT** render charts or data visualizations (B8 handles all charting)
- **DOES NOT** modify `courses`, `study_sessions`, or `daily_stats` tables (read-only access)
- **DOES NOT** manage user profiles or authentication (B1's responsibility)
- **DOES NOT** log study sessions or compute streaks (B3's responsibility)
- **DOES NOT** import code from any other block; communicates only through database tables

This block **ONLY** runs AI analysis pipelines, stores structured results, and provides read-only views of those results.
