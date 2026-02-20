import type {
  UserProfile,
  Course,
  StudySession,
  DailyStat,
  AiAnalysis,
  WeeklyReport,
  Notification,
  ReminderSchedule,
  StudyBuddy,
  Achievement,
} from '@/lib/types';

let counter = 0;
function uuid() {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`;
}

const now = '2026-02-20T12:00:00.000Z';
const today = '2026-02-20';

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------
export function buildProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: uuid(),
    email: 'test@example.com',
    display_name: 'Test User',
    avatar_url: null,
    timezone: 'UTC',
    theme: 'system',
    motivation_style: 'balanced',
    experience_level: 'intermediate',
    learning_goals: ['Learn React', 'Master TypeScript'],
    preferred_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    preferred_time_start: '09:00',
    preferred_time_end: '17:00',
    daily_study_goal_mins: 60,
    weekly_study_goal_mins: 300,
    notify_email: true,
    notify_push: true,
    notify_slack: false,
    notify_discord: false,
    notify_daily_reminder: true,
    notify_streak_warning: true,
    notify_weekly_report: true,
    notify_achievement: true,
    notify_risk_alert: true,
    slack_webhook_url: null,
    discord_webhook_url: null,
    onboarding_completed: true,
    onboarding_step: 5,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------
export function buildCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Test Course',
    platform: 'udemy',
    url: 'https://udemy.com/test-course',
    total_modules: 20,
    completed_modules: 5,
    total_hours: 40,
    completed_hours: 10,
    target_completion_date: '2026-06-01',
    priority: 2,
    status: 'in_progress',
    notes: null,
    sort_order: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Study Session
// ---------------------------------------------------------------------------
export function buildSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '00000000-0000-0000-0000-000000000100',
    started_at: now,
    ended_at: '2026-02-20T13:00:00.000Z',
    duration_minutes: 60,
    modules_completed: 1,
    session_type: 'manual',
    notes: null,
    created_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Daily Stat
// ---------------------------------------------------------------------------
export function buildDailyStat(overrides: Partial<DailyStat> = {}): DailyStat {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    date: today,
    total_minutes: 60,
    session_count: 2,
    modules_completed: 1,
    courses_studied: ['00000000-0000-0000-0000-000000000100'],
    streak_day: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AI Analysis
// ---------------------------------------------------------------------------
export function buildAnalysis(overrides: Partial<AiAnalysis> = {}): AiAnalysis {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: '00000000-0000-0000-0000-000000000100',
    analysis_type: 'daily',
    risk_score: 35,
    risk_level: 'medium',
    insights: [
      {
        type: 'suggestion',
        title: 'Increase study frequency',
        description: 'Try studying more often.',
        confidence: 0.85,
      },
    ],
    interventions: [
      {
        type: 'encouragement',
        message: 'Keep it up!',
        priority: 'low',
        action_url: null,
      },
    ],
    patterns: {
      optimal_time: '18:00-19:00',
      avg_session_length: 45,
      consistency_score: 0.7,
      preferred_day: 'monday',
    },
    raw_prompt: null,
    raw_response: null,
    tokens_used: 700,
    model: 'gpt-4',
    created_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Weekly Report
// ---------------------------------------------------------------------------
export function buildWeeklyReport(overrides: Partial<WeeklyReport> = {}): WeeklyReport {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    week_start: '2026-02-16',
    week_end: '2026-02-22',
    total_minutes: 300,
    total_sessions: 6,
    total_modules: 5,
    courses_summary: [
      { course_id: uuid(), title: 'Test Course', minutes: 300, sessions: 6, modules: 5 },
    ],
    ai_summary: 'Solid progress this week.',
    highlights: ['Completed 5 modules'],
    recommendations: [{ type: 'schedule', message: 'Study earlier.' }],
    streak_length: 7,
    compared_to_previous: { minutes_diff: 60, sessions_diff: 1, trend: 'up' },
    created_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------
export function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    type: 'reminder',
    title: 'Study Reminder',
    message: 'Time to study!',
    action_url: '/courses',
    read: false,
    channels_sent: ['in_app'],
    metadata: null,
    created_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reminder Schedule
// ---------------------------------------------------------------------------
export function buildReminder(overrides: Partial<ReminderSchedule> = {}): ReminderSchedule {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    course_id: null,
    days_of_week: ['mon', 'wed', 'fri'],
    time: '09:00',
    timezone: 'UTC',
    enabled: true,
    channels: ['in_app'],
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Study Buddy
// ---------------------------------------------------------------------------
export function buildBuddy(overrides: Partial<StudyBuddy> = {}): StudyBuddy {
  return {
    id: uuid(),
    requester_id: '00000000-0000-0000-0000-000000000001',
    recipient_id: '00000000-0000-0000-0000-000000000002',
    status: 'accepted',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Achievement
// ---------------------------------------------------------------------------
export function buildAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: uuid(),
    user_id: '00000000-0000-0000-0000-000000000001',
    achievement_type: 'first_session',
    course_id: null,
    metadata: { trigger: 'session_logged' },
    earned_at: now,
    shared: false,
    ...overrides,
  };
}

/**
 * Build an array of consecutive daily stats for streak testing.
 */
export function buildConsecutiveDailyStats(
  count: number,
  options: {
    startDate?: string;
    minutesPerDay?: number;
    includeGapAtIndex?: number;
  } = {}
): DailyStat[] {
  const { startDate = '2026-02-20', minutesPerDay = 60, includeGapAtIndex } = options;
  const stats: DailyStat[] = [];
  const start = new Date(startDate + 'T00:00:00Z');

  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const isGap = includeGapAtIndex !== undefined && i === includeGapAtIndex;

    stats.push(
      buildDailyStat({
        date: dateStr,
        total_minutes: isGap ? 0 : minutesPerDay,
        streak_day: !isGap,
        session_count: isGap ? 0 : 2,
      })
    );
  }

  return stats;
}
