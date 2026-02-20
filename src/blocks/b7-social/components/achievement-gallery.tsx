'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAchievements } from '../hooks/use-achievements';
import { shareAchievement } from '../actions/achievement-actions';
import { ACHIEVEMENT_MAP } from '../lib/achievement-definitions';
import { AchievementCard } from './achievement-card';
import { AchievementLockedCard } from './achievement-locked-card';
import { AchievementShareDialog } from './achievement-share-dialog';
import { EmptyAchievements } from './empty-achievements';

export function AchievementGallery() {
  const { data, isLoading, error } = useAchievements();
  const queryClient = useQueryClient();
  const [shareTarget, setShareTarget] = useState<{
    id: string;
    name: string;
    currentlyShared: boolean;
  } | null>(null);

  const shareMutation = useMutation({
    mutationFn: ({ id, shared }: { id: string; shared: boolean }) =>
      shareAchievement(id, shared),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return; }
      toast.success(shareTarget?.currentlyShared ? 'Achievement hidden' : 'Achievement shared');
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      setShareTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load achievements: {error.message}
      </div>
    );
  }

  const earned = data?.earned ?? [];
  const locked = data?.locked ?? [];

  const handleShareClick = (id: string, currentlyShared: boolean) => {
    const achievement = earned.find((a) => a.id === id);
    const def = achievement ? ACHIEVEMENT_MAP.get(achievement.achievement_type) : null;
    setShareTarget({
      id,
      name: def?.name ?? 'Achievement',
      currentlyShared,
    });
  };

  return (
    <div className="space-y-8">
      {/* Earned achievements */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Earned ({earned.length})
        </h2>
        {earned.length === 0 ? (
          <EmptyAchievements />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {earned.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onShareClick={handleShareClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Locked achievements */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Locked ({locked.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {locked.map((achievement) => (
              <AchievementLockedCard
                key={achievement.achievement_type}
                achievement={achievement}
              />
            ))}
          </div>
        </div>
      )}

      {/* Share dialog */}
      {shareTarget && (
        <AchievementShareDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          achievementName={shareTarget.name}
          currentlyShared={shareTarget.currentlyShared}
          onConfirm={() =>
            shareMutation.mutate({
              id: shareTarget.id,
              shared: !shareTarget.currentlyShared,
            })
          }
          isLoading={shareMutation.isPending}
        />
      )}
    </div>
  );
}
