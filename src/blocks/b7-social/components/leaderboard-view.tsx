'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeaderboard } from '../hooks/use-leaderboard';
import { LeaderboardHeader } from './leaderboard-header';
import { LeaderboardTable } from './leaderboard-table';
import { LeaderboardEmpty } from './leaderboard-empty';

interface LeaderboardViewProps {
  currentUserId: string;
}

export function LeaderboardView({ currentUserId }: LeaderboardViewProps) {
  const { data: entries, isLoading, error } = useLeaderboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load leaderboard: {error.message}
      </div>
    );
  }

  const hasData = entries && entries.length > 1;
  const currentUserEntry = entries?.find((e) => e.user_id === currentUserId);

  return (
    <div className="space-y-6">
      <LeaderboardHeader />

      {!hasData ? (
        <LeaderboardEmpty />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <LeaderboardTable entries={entries} currentUserId={currentUserId} />
            </CardContent>
          </Card>

          {/* Personal stats summary */}
          {currentUserEntry && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Your Stats This Week</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{currentUserEntry.hours_this_week}h</p>
                    <p className="text-xs text-muted-foreground">Study Time</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{currentUserEntry.sessions_this_week}</p>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{currentUserEntry.streak}d</p>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
