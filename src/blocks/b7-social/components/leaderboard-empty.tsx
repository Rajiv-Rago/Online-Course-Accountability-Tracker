'use client';

import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LeaderboardEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <BarChart3 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No leaderboard data yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Connect with study buddies to see how you compare on the weekly leaderboard.
      </p>
      <Button asChild>
        <Link href="/social/buddies">Find Buddies</Link>
      </Button>
    </div>
  );
}
