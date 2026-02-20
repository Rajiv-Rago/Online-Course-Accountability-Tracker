'use client';

import { Trophy } from 'lucide-react';

export function EmptyAchievements() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Trophy className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No achievements earned yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Start studying to unlock achievements! Log sessions, maintain streaks, and complete courses to earn badges.
      </p>
    </div>
  );
}
