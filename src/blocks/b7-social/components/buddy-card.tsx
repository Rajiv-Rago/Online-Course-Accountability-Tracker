'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { BuddyWithProfile } from '@/lib/types';

interface BuddyCardProps {
  buddy: BuddyWithProfile;
}

export function BuddyCard({ buddy }: BuddyCardProps) {
  const initials = buddy.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={buddy.avatar_url ?? undefined} alt={buddy.display_name} />
          <AvatarFallback>{initials || '??'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{buddy.display_name}</p>
          <p className="text-xs text-muted-foreground">
            Connected {new Date(buddy.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/social/buddies/${buddy.buddy_user_id}`}>
            <Eye className="h-4 w-4 mr-1" />
            View
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
