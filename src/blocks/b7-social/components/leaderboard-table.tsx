'use client';

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { LeaderboardEntry } from '@/lib/types';
import { LeaderboardRow } from './leaderboard-row';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
}

export function LeaderboardTable({ entries, currentUserId }: LeaderboardTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Sessions</TableHead>
          <TableHead className="text-right">Streak</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.user_id}
            entry={entry}
            isCurrentUser={entry.user_id === currentUserId}
          />
        ))}
      </TableBody>
    </Table>
  );
}
