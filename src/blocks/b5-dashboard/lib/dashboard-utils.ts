import {
  startOfISOWeek,
  endOfISOWeek,
  subWeeks,
  isWithinInterval,
  differenceInDays,
  differenceInMinutes,
  differenceInHours,
  parseISO,
  isToday,
  isYesterday,
  format,
} from 'date-fns';
import type {
  Course,
  DailyStat,
  StudySession,
  Achievement,
  AiAnalysis,
  AchievementType,
  RiskLevel,
  DayOfWeek,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SummaryStatsData {
  streak: number;
  hoursThisWeek: number;
  hoursThisWeekTrend: 'up' | 'down' | 'stable';
  activeCourseCount: number;
  overallProgress: number;
}

export interface PlanCourseItemData {
  courseId: string;
  title: string;
  priority: number;
  suggestedMinutes: number;
  currentProgress: number;
  riskLevel: RiskLevel | null;
}

export interface TodaysPlanData {
  planItems: PlanCourseItemData[];
  aiMessage: string | null;
  isAiGenerated: boolean;
  isStudyDay: boolean;
}

export interface DashboardCourseData {
  id: string;
  title: string;
  platform: string | null;
  completedModules: number;
  totalModules: number | null;
  completedHours: number;
  totalHours: number | null;
  priority: number;
  status: string;
  riskLevel: RiskLevel | null;
  riskScore: number | null;
  lastStudiedAt: string | null;
  targetCompletionDate: string | null;
}

export interface ActivityItemData {
  id: string;
  type: 'session' | 'achievement' | 'analysis';
  icon: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  actionUrl: string | null;
}

export interface NotificationPreviewData {
  unreadCount: number;
  recent: Array<{
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    actionUrl: string | null;
  }>;
}

export interface BuddyActivityItem {
  buddyId: string;
  buddyName: string;
  buddyAvatar: string | null;
  recentSession: { courseTitle: string; startedAt: string } | null;
}

// ---------------------------------------------------------------------------
// Pure Functions
// ---------------------------------------------------------------------------

export function getGreeting(timezone?: string): string {
  const now = new Date();
  let hour = now.getUTCHours();

  if (timezone) {
    try {
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: timezone,
      }).format(now);
      hour = parseInt(formatted, 10);
    } catch {
      // fallback to UTC
    }
  }

  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Burning the midnight oil';
}

export function calculateStreak(dailyStats: DailyStat[]): number {
  if (dailyStats.length === 0) return 0;

  // dailyStats are ordered DESC by date
  const sorted = [...dailyStats].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let streak = 0;
  let checkDate = today;

  // Start from today; if today is not a streak day, try yesterday as starting point
  const firstStatDate = new Date(sorted[0].date + 'T00:00:00');
  if (firstStatDate.getTime() === today.getTime()) {
    if (!sorted[0].streak_day) return 0;
  } else if (firstStatDate.getTime() === yesterday.getTime()) {
    checkDate = yesterday;
  } else {
    return 0;
  }

  for (const stat of sorted) {
    const statDate = new Date(stat.date + 'T00:00:00');
    if (statDate.getTime() === checkDate.getTime()) {
      if (stat.streak_day) {
        streak++;
        checkDate = new Date(checkDate);
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    } else if (statDate.getTime() < checkDate.getTime()) {
      break;
    }
  }

  return streak;
}

export function calculateWeeklyHours(dailyStats: DailyStat[]): number {
  const now = new Date();
  const weekStart = startOfISOWeek(now);
  const weekEnd = endOfISOWeek(now);

  const totalMinutes = dailyStats
    .filter((s) => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: weekStart, end: weekEnd });
    })
    .reduce((sum, s) => sum + s.total_minutes, 0);

  return Math.round((totalMinutes / 60) * 10) / 10;
}

export function calculatePreviousWeekHours(dailyStats: DailyStat[]): number {
  const now = new Date();
  const prevWeekStart = startOfISOWeek(subWeeks(now, 1));
  const prevWeekEnd = endOfISOWeek(subWeeks(now, 1));

  const totalMinutes = dailyStats
    .filter((s) => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: prevWeekStart, end: prevWeekEnd });
    })
    .reduce((sum, s) => sum + s.total_minutes, 0);

  return Math.round((totalMinutes / 60) * 10) / 10;
}

export function calculateOverallProgress(courses: Course[]): number {
  const inProgress = courses.filter((c) => c.status === 'in_progress');
  if (inProgress.length === 0) return 0;

  let totalWeight = 0;
  let weightedProgress = 0;

  for (const course of inProgress) {
    const weight = course.total_modules ?? course.total_hours ?? 1;
    const progress = calcProgress(
      course.completed_modules,
      course.total_modules ?? undefined,
      course.completed_hours,
      course.total_hours ?? undefined
    );
    weightedProgress += progress * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
}

export function calculateTrend(
  current: number,
  previous: number
): 'up' | 'down' | 'stable' {
  if (previous === 0 && current === 0) return 'stable';
  if (previous === 0) return 'up';
  const diff = ((current - previous) / previous) * 100;
  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = parseISO(timestamp);
  const mins = differenceInMinutes(now, date);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;

  if (isYesterday(date)) return 'yesterday';

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d ago`;

  return format(date, 'MMM d');
}

export function buildActivityFeed(
  sessions: StudySession[],
  achievements: Achievement[],
  courses: Course[],
  analyses: AiAnalysis[]
): ActivityItemData[] {
  const courseMap = new Map(courses.map((c) => [c.id, c.title]));
  const items: ActivityItemData[] = [];

  for (const session of sessions) {
    const courseTitle = courseMap.get(session.course_id) ?? 'Unknown Course';
    items.push({
      id: `session-${session.id}`,
      type: 'session',
      icon: 'Clock',
      description: `Studied ${courseTitle} for ${session.duration_minutes}m`,
      timestamp: session.started_at,
      relativeTime: formatRelativeTime(session.started_at),
      actionUrl: `/courses/${session.course_id}`,
    });
  }

  for (const achievement of achievements) {
    items.push({
      id: `achievement-${achievement.id}`,
      type: 'achievement',
      icon: 'Trophy',
      description: `Earned: ${ACHIEVEMENT_NAMES[achievement.achievement_type] ?? achievement.achievement_type}`,
      timestamp: achievement.earned_at,
      relativeTime: formatRelativeTime(achievement.earned_at),
      actionUrl: null,
    });
  }

  for (const analysis of analyses) {
    if (analysis.analysis_type === 'risk_alert' && analysis.risk_level) {
      const courseTitle = analysis.course_id
        ? courseMap.get(analysis.course_id) ?? 'a course'
        : 'your progress';
      items.push({
        id: `analysis-${analysis.id}`,
        type: 'analysis',
        icon: 'AlertTriangle',
        description: `Risk alert (${analysis.risk_level}) for ${courseTitle}`,
        timestamp: analysis.created_at,
        relativeTime: formatRelativeTime(analysis.created_at),
        actionUrl: null,
      });
    }
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 10);
}

export function distributeDailyGoal(
  courses: Course[],
  dailyGoalMins: number
): PlanCourseItemData[] {
  const active = courses.filter(
    (c) => c.status === 'in_progress' || c.status === 'not_started'
  );
  if (active.length === 0) return [];

  const p1 = active.filter((c) => c.priority === 1);
  const p2 = active.filter((c) => c.priority === 2);
  const rest = active.filter((c) => c.priority >= 3);

  const distribute = (
    group: Course[],
    availableMinutes: number
  ): PlanCourseItemData[] => {
    if (group.length === 0) return [];
    const perCourse = Math.max(15, Math.floor(availableMinutes / group.length));
    return group.map((c) => ({
      courseId: c.id,
      title: c.title,
      priority: c.priority,
      suggestedMinutes: roundTo5(Math.max(15, perCourse)),
      currentProgress: calcProgress(
        c.completed_modules,
        c.total_modules ?? undefined,
        c.completed_hours,
        c.total_hours ?? undefined
      ),
      riskLevel: null,
    }));
  };

  const p1Budget = Math.floor(dailyGoalMins * 0.5);
  const p2Budget = Math.floor(dailyGoalMins * 0.3);
  const restBudget = dailyGoalMins - p1Budget - p2Budget;

  return [
    ...distribute(p1, p1Budget),
    ...distribute(p2, p2Budget),
    ...distribute(rest, restBudget),
  ];
}

export function calcProgress(
  completedModules: number,
  totalModules?: number,
  completedHours?: number,
  totalHours?: number
): number {
  if (totalModules && totalModules > 0) {
    return Math.min(100, Math.round((completedModules / totalModules) * 100));
  }
  if (totalHours && totalHours > 0 && completedHours !== undefined) {
    return Math.min(100, Math.round((completedHours / totalHours) * 100));
  }
  return 0;
}

export function calcDaysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const days = differenceInDays(parseISO(targetDate), new Date());
  return Math.max(0, days);
}

export function getRiskBadgeVariant(
  level: RiskLevel | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'critical':
    case 'high':
      return 'destructive';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
}

export function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[new Date().getDay()];
}

export function mapCourseToDashboardData(
  course: Course,
  sessions: StudySession[],
  analyses: AiAnalysis[]
): DashboardCourseData {
  const courseSessions = sessions.filter((s) => s.course_id === course.id);
  const lastSession = courseSessions[0] ?? null;
  const courseAnalysis = analyses.find(
    (a) => a.course_id === course.id && a.risk_level
  );

  return {
    id: course.id,
    title: course.title,
    platform: course.platform,
    completedModules: course.completed_modules,
    totalModules: course.total_modules,
    completedHours: course.completed_hours,
    totalHours: course.total_hours,
    priority: course.priority,
    status: course.status,
    riskLevel: courseAnalysis?.risk_level ?? null,
    riskScore: courseAnalysis?.risk_score ?? null,
    lastStudiedAt: lastSession?.started_at ?? null,
    targetCompletionDate: course.target_completion_date,
  };
}

export const ACHIEVEMENT_NAMES: Record<string, string> = {
  first_session: 'First Session',
  streak_7: '7-Day Streak',
  streak_30: '30-Day Streak',
  streak_100: '100-Day Streak',
  course_complete: 'Course Complete',
  night_owl: 'Night Owl',
  early_bird: 'Early Bird',
  marathon: 'Marathon Learner',
  consistency_king: 'Consistency King',
  speed_learner: 'Speed Learner',
  social_butterfly: 'Social Butterfly',
  comeback_kid: 'Comeback Kid',
  perfectionist: 'Perfectionist',
  explorer: 'Explorer',
  dedication: 'Dedication',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}
