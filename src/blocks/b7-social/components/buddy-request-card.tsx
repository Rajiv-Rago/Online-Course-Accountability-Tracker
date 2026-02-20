'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Clock } from 'lucide-react';
import type { BuddyWithProfile } from '@/lib/types';

interface BuddyRequestCardProps {
  request: BuddyWithProfile;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  isLoading?: boolean;
}

export function BuddyRequestCard({ request, onAccept, onDecline, isLoading }: BuddyRequestCardProps) {
  const initials = request.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isIncoming = !request.is_requester;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={request.avatar_url ?? undefined} alt={request.display_name} />
          <AvatarFallback>{initials || '??'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{request.display_name}</p>
          <p className="text-xs text-muted-foreground">
            {isIncoming ? 'Wants to connect' : 'Request sent'}
          </p>
        </div>
        {isIncoming ? (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => onAccept?.(request.id)}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-1" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecline?.(request.id)}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-1" />
              Decline
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Pending
          </div>
        )}
      </CardContent>
    </Card>
  );
}
