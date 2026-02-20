'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Flame, Clock, BookOpen, UserMinus } from 'lucide-react';
import { useBuddyActivity } from '../hooks/use-buddy-activity';
import { useBuddyMutations } from '../hooks/use-buddy-mutations';
import { useBuddies } from '../hooks/use-buddies';
import { BuddyPrivacyNote } from './buddy-privacy-note';
import { BuddyRemoveDialog } from './buddy-remove-dialog';
import { ACHIEVEMENT_MAP } from '../lib/achievement-definitions';
import { ACHIEVEMENT_ICONS } from '../lib/achievement-icons';
import { formatLastActive } from '../lib/buddy-privacy';

interface BuddyActivityViewProps {
  buddyUserId: string;
}

export function BuddyActivityView({ buddyUserId }: BuddyActivityViewProps) {
  const router = useRouter();
  const { data: activity, isLoading, error } = useBuddyActivity(buddyUserId);
  const { data: buddiesData } = useBuddies();
  const { remove } = useBuddyMutations();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Find the relationship ID for remove
  const relationship = buddiesData?.accepted.find((b) => b.buddy_user_id === buddyUserId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error?.message || 'Could not load buddy activity'}</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/social/buddies')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Buddies
        </Button>
      </div>
    );
  }

  const initials = activity.profile.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/social/buddies')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Buddies
      </Button>

      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={activity.profile.avatar_url ?? undefined} alt={activity.profile.display_name} />
          <AvatarFallback className="text-lg">{initials || '??'}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{activity.profile.display_name}</h2>
          <p className="text-sm text-muted-foreground">
            Last active: {formatLastActive(activity.lastActive)}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{activity.streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-teal-500" />
            <div>
              <p className="text-2xl font-bold">{activity.hoursThisWeek}</p>
              <p className="text-xs text-muted-foreground">Hours/Week</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{activity.activeCoursesCount}</p>
              <p className="text-xs text-muted-foreground">Active Courses</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shared achievements */}
      {activity.sharedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shared Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activity.sharedAchievements.map((a) => {
                const def = ACHIEVEMENT_MAP.get(a.achievement_type as keyof typeof ACHIEVEMENT_ICONS);
                const Icon = def ? ACHIEVEMENT_ICONS[a.achievement_type as keyof typeof ACHIEVEMENT_ICONS] : null;
                return (
                  <Badge key={a.achievement_type + a.earned_at} variant="secondary" className="gap-1.5 py-1">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {def?.name ?? a.achievement_type}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <BuddyPrivacyNote />

      {/* Remove buddy */}
      {relationship && (
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowRemoveDialog(true)}
          >
            <UserMinus className="h-4 w-4 mr-2" />
            Remove Buddy
          </Button>
          <BuddyRemoveDialog
            open={showRemoveDialog}
            onOpenChange={setShowRemoveDialog}
            buddyName={activity.profile.display_name}
            onConfirm={() => {
              remove.mutate(relationship.id);
              setShowRemoveDialog(false);
              router.push('/social/buddies');
            }}
            isLoading={remove.isPending}
          />
        </div>
      )}
    </div>
  );
}
