'use client';

import type { BuddyWithProfile } from '@/lib/types';
import { BuddyCard } from './buddy-card';

interface BuddyListProps {
  buddies: BuddyWithProfile[];
}

export function BuddyList({ buddies }: BuddyListProps) {
  if (buddies.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Study Buddies ({buddies.length})
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {buddies.map((buddy) => (
          <BuddyCard key={buddy.id} buddy={buddy} />
        ))}
      </div>
    </div>
  );
}
