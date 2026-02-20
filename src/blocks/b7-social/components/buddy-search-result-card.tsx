'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, Clock } from 'lucide-react';
import type { SearchResult } from '../actions/buddy-actions';

interface BuddySearchResultCardProps {
  user: SearchResult;
  onSendRequest: (id: string) => void;
  isLoading?: boolean;
}

export function BuddySearchResultCard({ user, onSendRequest, isLoading }: BuddySearchResultCardProps) {
  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
        <AvatarFallback>{initials || '??'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">{user.display_name}</p>
      </div>
      {user.relationship === 'none' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSendRequest(user.id)}
          disabled={isLoading}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Add
        </Button>
      )}
      {user.relationship === 'accepted' && (
        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <Check className="h-3.5 w-3.5" />
          Connected
        </span>
      )}
      {(user.relationship === 'pending_outgoing' || user.relationship === 'pending_incoming') && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Pending
        </span>
      )}
    </div>
  );
}
