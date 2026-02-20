'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus } from 'lucide-react';
import { useBuddies } from '../hooks/use-buddies';
import { useBuddyMutations } from '../hooks/use-buddy-mutations';
import { BuddyList } from './buddy-list';
import { BuddyRequestList } from './buddy-request-list';
import { BuddySearch } from './buddy-search';
import { EmptyBuddies } from './empty-buddies';

export function BuddiesPage() {
  const { data, isLoading, error } = useBuddies();
  const { accept, decline, isLoading: mutationsLoading } = useBuddyMutations();
  const [searchOpen, setSearchOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load buddies: {error.message}
      </div>
    );
  }

  const hasAny =
    (data?.accepted.length ?? 0) > 0 ||
    (data?.incoming.length ?? 0) > 0 ||
    (data?.outgoing.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Buddies</h2>
        <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Find Buddies
        </Button>
      </div>

      {!hasAny && <EmptyBuddies onSearchClick={() => setSearchOpen(true)} />}

      <BuddyRequestList
        title="Incoming Requests"
        requests={data?.incoming ?? []}
        onAccept={(id) => accept.mutate(id)}
        onDecline={(id) => decline.mutate(id)}
        isLoading={mutationsLoading}
      />

      <BuddyRequestList
        title="Outgoing Requests"
        requests={data?.outgoing ?? []}
      />

      <BuddyList buddies={data?.accepted ?? []} />

      <BuddySearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
