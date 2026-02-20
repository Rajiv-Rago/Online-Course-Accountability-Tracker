'use client';

import { Flame, Clock, BookOpen, TrendingUp } from 'lucide-react';
import { StatCard } from './stat-card';
import type { SummaryStatsData } from '../lib/dashboard-utils';

interface SummaryStatsProps {
  stats: SummaryStatsData;
}

export function SummaryStats({ stats }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={Flame}
        label="Day Streak"
        value={stats.streak}
        className={stats.streak > 0 ? 'border-orange-500/20' : ''}
      />
      <StatCard
        icon={Clock}
        label="Hours This Week"
        value={stats.hoursThisWeek}
        trend={stats.hoursThisWeekTrend}
        trendLabel={stats.hoursThisWeekTrend === 'up' ? 'vs last week' : stats.hoursThisWeekTrend === 'down' ? 'vs last week' : undefined}
      />
      <StatCard
        icon={BookOpen}
        label="Active Courses"
        value={stats.activeCourseCount}
      />
      <StatCard
        icon={TrendingUp}
        label="Overall Progress"
        value={`${stats.overallProgress}%`}
      />
    </div>
  );
}
