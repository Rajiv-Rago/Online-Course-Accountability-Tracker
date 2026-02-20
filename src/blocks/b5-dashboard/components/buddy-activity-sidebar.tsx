'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { formatRelativeTime, type BuddyActivityItem } from '../lib/dashboard-utils';

interface BuddyActivitySidebarProps {
  buddies: BuddyActivityItem[];
}

export function BuddyActivitySidebar({ buddies }: BuddyActivitySidebarProps) {
  const displayBuddies = buddies.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Study Buddies</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {displayBuddies.length === 0 ? (
          <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Connect with study buddies to stay motivated!
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/buddies">Find Buddies</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayBuddies.map((buddy) => (
              <div key={buddy.buddyId} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={buddy.buddyAvatar ?? undefined} alt={buddy.buddyName} />
                  <AvatarFallback className="text-xs">
                    {buddy.buddyName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{buddy.buddyName}</p>
                  {buddy.recentSession ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {buddy.recentSession.courseTitle} &middot;{' '}
                      {formatRelativeTime(buddy.recentSession.startedAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
