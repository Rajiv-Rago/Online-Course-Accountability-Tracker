'use client';

import { formatWeekRange, getCurrentWeekRange } from '../lib/leaderboard-calculator';

export function LeaderboardHeader() {
  const { start, end } = getCurrentWeekRange();

  return (
    <div>
      <h2 className="text-lg font-semibold">Weekly Leaderboard</h2>
      <p className="text-sm text-muted-foreground">
        {formatWeekRange(start, end)}
      </p>
    </div>
  );
}
