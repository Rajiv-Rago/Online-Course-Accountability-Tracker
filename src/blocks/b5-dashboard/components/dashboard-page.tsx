'use client';

import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { useSummaryStats } from '../hooks/use-summary-stats';
import { useTodaysPlan } from '../hooks/use-todays-plan';
import { useRecentActivity } from '../hooks/use-recent-activity';
import {
  getGreeting,
  mapCourseToDashboardData,
  ACHIEVEMENT_NAMES,
  type BuddyActivityItem,
} from '../lib/dashboard-utils';
import { SummaryStats } from './summary-stats';
import { TodaysPlan } from './todays-plan';
import { CourseCardsGrid } from './course-cards-grid';
import { WeeklyReportBanner } from './weekly-report-banner';
import { QuickActions } from './quick-actions';
import { RecentActivityFeed } from './recent-activity-feed';
import { NotificationPreview } from './notification-preview';
import { BuddyActivitySidebar } from './buddy-activity-sidebar';
import { EmptyState } from './empty-state';
import type { DayOfWeek } from '@/lib/types';

export function DashboardPage() {
  const { data, isLoading, error } = useDashboardData();

  // Achievement toast
  const seenAchievementsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!data?.achievements) return;

    const currentIds = new Set(data.achievements.map((a) => a.id));

    if (isInitialLoadRef.current) {
      seenAchievementsRef.current = currentIds;
      isInitialLoadRef.current = false;
      return;
    }

    for (const achievement of data.achievements) {
      if (!seenAchievementsRef.current.has(achievement.id)) {
        const name =
          ACHIEVEMENT_NAMES[achievement.achievement_type] ??
          achievement.achievement_type;
        toast.success(`Achievement Unlocked: ${name}`, {
          duration: 5000,
        });
      }
    }

    seenAchievementsRef.current = currentIds;
  }, [data?.achievements]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-destructive font-medium mb-2">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!data) return null;

  const { profile, courses, sessions, dailyStats, analyses, weeklyReport, notifications, buddyActivity } = data;

  if (courses.length === 0) {
    return <EmptyState displayName={profile.display_name} />;
  }

  return (
    <DashboardContent
      profile={profile}
      courses={courses}
      sessions={sessions}
      dailyStats={dailyStats}
      analyses={analyses}
      weeklyReport={weeklyReport}
      notifications={notifications}
      buddyActivity={buddyActivity}
    />
  );
}

function DashboardContent({
  profile,
  courses,
  sessions,
  dailyStats,
  analyses,
  weeklyReport,
  notifications,
  buddyActivity,
}: {
  profile: { display_name: string; avatar_url: string | null; timezone: string; daily_study_goal_mins: number; preferred_days: DayOfWeek[] };
  courses: import('@/lib/types').Course[];
  sessions: import('@/lib/types').StudySession[];
  dailyStats: import('@/lib/types').DailyStat[];
  analyses: import('@/lib/types').AiAnalysis[];
  weeklyReport: import('@/lib/types').WeeklyReport | null;
  notifications: import('@/lib/types').Notification[];
  buddyActivity: BuddyActivityItem[];
}) {
  const stats = useSummaryStats(dailyStats, courses);
  const plan = useTodaysPlan(courses, analyses, profile.daily_study_goal_mins, profile.preferred_days);
  const activityItems = useRecentActivity(sessions, [], courses, analyses);

  const dashboardCourses = courses.map((c) =>
    mapCourseToDashboardData(c, sessions, analyses)
  );

  const greeting = getGreeting(profile.timezone);
  const displayName = profile.display_name || undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}
            {displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <QuickActions />
          <NotificationPreview notifications={notifications} />
        </div>
      </div>

      {/* Summary Stats */}
      <SummaryStats stats={stats} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <TodaysPlan plan={plan} />
          <CourseCardsGrid courses={dashboardCourses} />
          <WeeklyReportBanner report={weeklyReport} />
          <RecentActivityFeed items={activityItems} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <BuddyActivitySidebar buddies={buddyActivity} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
