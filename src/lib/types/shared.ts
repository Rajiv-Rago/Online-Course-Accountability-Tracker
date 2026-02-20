// =============================================================================
// shared.ts
// Shared TypeScript interfaces for the Course Accountability Tracker.
// All database row interfaces match the 10 tables defined in DATABASE.md.
// Computed/view types support dashboard, visualization, and social features.
// =============================================================================

import type {
  AchievementType,
  AnalysisType,
  BuddyStatus,
  CoursePlatform,
  CoursePriority,
  CourseStatus,
  DayOfWeek,
  ExperienceLevel,
  MotivationStyle,
  NotificationChannel,
  NotificationType,
  RiskLevel,
  SessionType,
  Theme,
} from './enums';

// =============================================================================
// Database Row Interfaces (10 tables)
// =============================================================================

// -----------------------------------------------------------------------------
// 1. user_profiles
// -----------------------------------------------------------------------------
export interface UserProfile {
  id: string;                                   // UUID, PK, FK to auth.users
  email: string;
  display_name: string;                         // NOT NULL, default ''
  avatar_url: string | null;
  timezone: string;                             // default 'UTC'
  theme: Theme;                                 // 'light' | 'dark' | 'system'
  motivation_style: MotivationStyle;            // 'gentle' | 'balanced' | 'drill_sergeant'
  experience_level: ExperienceLevel;            // 'beginner' | 'intermediate' | 'advanced'
  learning_goals: string[];                     // text[], default '{}'
  preferred_days: DayOfWeek[];                  // text[], e.g. ['mon','tue','wed']
  preferred_time_start: string | null;          // time, default '09:00'
  preferred_time_end: string | null;            // time, default '17:00'
  daily_study_goal_mins: number;                // default 60
  weekly_study_goal_mins: number;               // default 300
  notify_email: boolean;                        // default true
  notify_push: boolean;                         // default true
  notify_slack: boolean;                        // default false
  notify_discord: boolean;                      // default false
  notify_daily_reminder: boolean;               // default true
  notify_streak_warning: boolean;               // default true
  notify_weekly_report: boolean;                // default true
  notify_achievement: boolean;                  // default true
  notify_risk_alert: boolean;                   // default true
  slack_webhook_url: string | null;
  discord_webhook_url: string | null;
  onboarding_completed: boolean;                // default false
  onboarding_step: number;                      // default 0
  created_at: string;                           // ISO 8601 timestamptz
  updated_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 2. courses
// -----------------------------------------------------------------------------
export interface Course {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  title: string;
  platform: CoursePlatform | null;              // nullable
  url: string | null;
  total_modules: number | null;
  completed_modules: number;                    // default 0
  total_hours: number | null;                   // NUMERIC(6,2)
  completed_hours: number;                      // NUMERIC(6,2), default 0
  target_completion_date: string | null;        // DATE as "YYYY-MM-DD"
  priority: CoursePriority;                     // 1-4, default 2
  status: CourseStatus;                         // default 'not_started'
  notes: string | null;
  sort_order: number;                           // default 0
  created_at: string;                           // ISO 8601 timestamptz
  updated_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 3. study_sessions
// -----------------------------------------------------------------------------
export interface StudySession {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  course_id: string;                            // UUID, FK to courses
  started_at: string;                           // ISO 8601 timestamptz
  ended_at: string | null;                      // ISO 8601 timestamptz
  duration_minutes: number;
  modules_completed: number;                    // default 0
  session_type: SessionType;                    // 'manual' | 'timer' | 'module'
  notes: string | null;
  created_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 4. daily_stats
// -----------------------------------------------------------------------------
export interface DailyStat {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  date: string;                                 // DATE as "YYYY-MM-DD"
  total_minutes: number;                        // default 0
  session_count: number;                        // default 0
  modules_completed: number;                    // default 0
  courses_studied: string[];                    // JSONB array of course UUID strings
  streak_day: boolean;                          // default false, true when daily goal met
  created_at: string;                           // ISO 8601 timestamptz
  updated_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 5. ai_analyses
// -----------------------------------------------------------------------------
export interface AiAnalysis {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  course_id: string | null;                     // UUID, FK to courses (nullable, ON DELETE SET NULL)
  analysis_type: AnalysisType;                  // 'daily' | 'weekly' | 'risk_alert'
  risk_score: number | null;                    // 0-100
  risk_level: RiskLevel | null;                 // 'low' | 'medium' | 'high' | 'critical'
  insights: AiInsight[];                        // JSONB array
  interventions: AiIntervention[];              // JSONB array
  patterns: AiPatterns | null;                  // JSONB object (nullable)
  raw_prompt: string | null;
  raw_response: string | null;
  tokens_used: number | null;
  model: string;                                // default 'gpt-4'
  created_at: string;                           // ISO 8601 timestamptz
}

/** Shape of each element in ai_analyses.insights JSONB array */
export interface AiInsight {
  type: 'positive' | 'warning' | 'suggestion' | 'neutral';
  title: string;
  description: string;
  confidence: number;                           // 0-1
}

/** Shape of each element in ai_analyses.interventions JSONB array */
export interface AiIntervention {
  type: 'encouragement' | 'action' | 'reminder' | 'escalation';
  message: string;
  priority: 'low' | 'medium' | 'high';
  action_url: string | null;
}

/** Shape of ai_analyses.patterns JSONB object */
export interface AiPatterns {
  optimal_time: string | null;                  // e.g. "18:00-19:00"
  avg_session_length: number;
  consistency_score: number;                    // 0-1
  preferred_day: string | null;
  [key: string]: unknown;                       // allow additional detected patterns
}

// -----------------------------------------------------------------------------
// 6. weekly_reports
// -----------------------------------------------------------------------------
export interface WeeklyReport {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  week_start: string;                           // DATE as "YYYY-MM-DD"
  week_end: string;                             // DATE as "YYYY-MM-DD"
  total_minutes: number;                        // default 0
  total_sessions: number;                       // default 0
  total_modules: number;                        // default 0
  courses_summary: WeeklyCourseSummary[] | null; // JSONB array
  ai_summary: string | null;
  highlights: string[] | null;                  // JSONB array of strings
  recommendations: WeeklyRecommendation[] | null; // JSONB array
  streak_length: number;                        // default 0
  compared_to_previous: WeekComparison | null;  // JSONB object
  created_at: string;                           // ISO 8601 timestamptz
}

/** Shape of each element in weekly_reports.courses_summary JSONB array */
export interface WeeklyCourseSummary {
  course_id: string;
  title: string;
  minutes: number;
  sessions: number;
  modules: number;
}

/** Shape of each element in weekly_reports.recommendations JSONB array */
export interface WeeklyRecommendation {
  type: 'schedule' | 'goal' | 'technique' | 'social';
  message: string;
}

/** Shape of weekly_reports.compared_to_previous JSONB object */
export interface WeekComparison {
  minutes_diff: number;
  sessions_diff: number;
  trend: 'up' | 'down' | 'stable';
}

// -----------------------------------------------------------------------------
// 7. notifications
// -----------------------------------------------------------------------------
export interface Notification {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  type: NotificationType;
  title: string;
  message: string;
  action_url: string | null;
  read: boolean;                                // default false
  channels_sent: NotificationChannel[];         // JSONB array
  metadata: Record<string, unknown> | null;     // JSONB, flexible shape
  created_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 8. reminder_schedules
// -----------------------------------------------------------------------------
export interface ReminderSchedule {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  course_id: string | null;                     // UUID, FK to courses (nullable)
  days_of_week: DayOfWeek[];                    // JSONB array, e.g. ["mon","wed","fri"]
  time: string;                                 // TIME as "HH:MM:SS" or "HH:MM"
  timezone: string;
  enabled: boolean;                             // default true
  channels: NotificationChannel[];              // JSONB array, default ["in_app"]
  created_at: string;                           // ISO 8601 timestamptz
  updated_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 9. study_buddies
// -----------------------------------------------------------------------------
export interface StudyBuddy {
  id: string;                                   // UUID, PK, auto-generated
  requester_id: string;                         // UUID, FK to user_profiles
  recipient_id: string;                         // UUID, FK to user_profiles
  status: BuddyStatus;                         // default 'pending'
  created_at: string;                           // ISO 8601 timestamptz
  updated_at: string;                           // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// 10. achievements
// -----------------------------------------------------------------------------
export interface Achievement {
  id: string;                                   // UUID, PK, auto-generated
  user_id: string;                              // UUID, FK to user_profiles
  achievement_type: AchievementType;
  course_id: string | null;                     // UUID, FK to courses (nullable, ON DELETE SET NULL)
  metadata: Record<string, unknown> | null;     // JSONB, flexible shape
  earned_at: string;                            // ISO 8601 timestamptz, default now()
}

// =============================================================================
// Computed / View Types
// =============================================================================

// -----------------------------------------------------------------------------
// CourseWithStats -- Course row enriched with computed risk and session data
// -----------------------------------------------------------------------------
export interface CourseWithStats extends Course {
  streak: number;
  risk_score: number;                           // 0-100
  risk_level: RiskLevel;
  daily_avg_minutes: number;
  recent_sessions_count: number;
}

// -----------------------------------------------------------------------------
// StreakInfo -- Aggregated streak data for a user
// -----------------------------------------------------------------------------
export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  streak_freeze_remaining: number;
  last_study_date: string | null;               // "YYYY-MM-DD"
  is_at_risk: boolean;
}

// -----------------------------------------------------------------------------
// DashboardData -- All data needed to render the main dashboard
// -----------------------------------------------------------------------------
export interface DashboardData {
  profile: UserProfile;
  courses: CourseWithStats[];
  todayStats: DailyStat | null;
  streakInfo: StreakInfo;
  latestAnalyses: AiAnalysis[];
  weeklyReport: WeeklyReport | null;
  recentNotifications: Notification[];
  recentAchievements: Achievement[];
}

// -----------------------------------------------------------------------------
// TodaysPlan -- AI-recommended study plan for the current day
// -----------------------------------------------------------------------------
export interface TodaysPlan {
  recommended_courses: TodaysPlanCourse[];
  ai_message: string | null;
}

export interface TodaysPlanCourse {
  course_id: string;
  title: string;
  suggested_minutes: number;
  reason: string;
}

// -----------------------------------------------------------------------------
// BuddyActivity -- Activity summary for a study buddy
// -----------------------------------------------------------------------------
export interface BuddyActivity {
  profile: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>;
  streak: number;
  hours_this_week: number;
  active_courses_count: number;
  last_active: string | null;                   // ISO 8601 timestamptz
}

// -----------------------------------------------------------------------------
// LeaderboardEntry -- Row in the buddy leaderboard
// -----------------------------------------------------------------------------
export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  hours_this_week: number;
  sessions_this_week: number;
  streak: number;
  rank: number;
}

// -----------------------------------------------------------------------------
// Visualization Types
// -----------------------------------------------------------------------------

/** Single day in the study heatmap */
export interface HeatmapDay {
  date: string;                                 // "YYYY-MM-DD"
  total_minutes: number;
  session_count: number;
}

/** Point on a course progress timeline */
export interface TimelinePoint {
  date: string;                                 // "YYYY-MM-DD"
  progress_percent: number;                     // 0-100
}

/** Generic chart data point for bar/line charts */
export interface ChartDataPoint {
  label: string;
  value: number;
  [key: string]: number | string;               // additional series data
}

/** Completion forecast data for a course */
export interface ForecastData {
  current_velocity: number;                     // hours per week
  predicted_date: string | null;                // "YYYY-MM-DD"
  confidence_70: string | null;                 // "YYYY-MM-DD" at 70% confidence
  confidence_90: string | null;                 // "YYYY-MM-DD" at 90% confidence
  is_on_track: boolean;
}

/** Single point on a risk trend chart */
export interface RiskTrendPoint {
  date: string;                                 // "YYYY-MM-DD"
  risk_score: number;                           // 0-100
  risk_level: RiskLevel;
}

/** Bucket for session length or time-of-day distribution histograms */
export interface DistributionBucket {
  range: string;                                // e.g. "0-15", "15-30", "morning"
  count: number;
}

// =============================================================================
// Server Action Utilities
// =============================================================================

/** Standard result wrapper for server actions across all blocks */
export interface ActionResult<T = void> {
  data?: T;
  error?: string;
}
