'use client';

import Link from 'next/link';
import { PenLine, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StreakDisplay } from './streak-display';
import { DailyStatsSummary } from './daily-stats-summary';
import { WeeklyStatsSummary } from './weekly-stats-summary';
import { SessionList } from './session-list';

export function ProgressOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Progress Overview</h1>
      </div>

      {/* Streak */}
      <StreakDisplay />

      {/* Today's stats */}
      <DailyStatsSummary />

      {/* Weekly summary */}
      <WeeklyStatsSummary />

      {/* Quick actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/progress/log">
            <PenLine className="h-4 w-4 mr-2" />
            Log Session
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/progress/timer">
            <Timer className="h-4 w-4 mr-2" />
            Start Timer
          </Link>
        </Button>
      </div>

      {/* Recent Sessions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Sessions</h2>
        <SessionList />
      </div>
    </div>
  );
}
