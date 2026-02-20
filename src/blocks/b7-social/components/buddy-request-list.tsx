'use client';

import type { BuddyWithProfile } from '@/lib/types';
import { BuddyRequestCard } from './buddy-request-card';

interface BuddyRequestListProps {
  title: string;
  requests: BuddyWithProfile[];
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  isLoading?: boolean;
}

export function BuddyRequestList({ title, requests, onAccept, onDecline, isLoading }: BuddyRequestListProps) {
  if (requests.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        {title} ({requests.length})
      </h3>
      <div className="space-y-3">
        {requests.map((request) => (
          <BuddyRequestCard
            key={request.id}
            request={request}
            onAccept={onAccept}
            onDecline={onDecline}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
