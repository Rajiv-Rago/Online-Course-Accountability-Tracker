'use client';

import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyBuddiesProps {
  onSearchClick: () => void;
}

export function EmptyBuddies({ onSearchClick }: EmptyBuddiesProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No study buddies yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Connect with other learners to stay motivated and track each other&apos;s progress.
      </p>
      <Button onClick={onSearchClick}>Find Study Buddies</Button>
    </div>
  );
}
