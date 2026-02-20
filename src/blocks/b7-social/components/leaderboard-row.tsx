'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/lib/types';
import { getRankBadge } from '../lib/leaderboard-calculator';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ entry, isCurrentUser }: LeaderboardRowProps) {
  const { emoji, label } = getRankBadge(entry.rank);
  const initials = entry.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <TableRow className={cn(isCurrentUser && 'bg-primary/5')}>
      <TableCell className="font-medium w-16">
        {emoji ? (
          <span className="text-lg">{emoji}</span>
        ) : (
          <span className="text-muted-foreground">{label}</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={entry.avatar_url ?? undefined} alt={entry.name} />
            <AvatarFallback className="text-xs">{initials || '??'}</AvatarFallback>
          </Avatar>
          <span className={cn('truncate', isCurrentUser && 'font-semibold')}>
            {entry.name}
            {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right font-medium">{entry.hours_this_week}h</TableCell>
      <TableCell className="text-right">{entry.sessions_this_week}</TableCell>
      <TableCell className="text-right">{entry.streak}d</TableCell>
    </TableRow>
  );
}
