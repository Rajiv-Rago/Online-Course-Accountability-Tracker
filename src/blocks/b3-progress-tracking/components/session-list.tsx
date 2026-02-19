'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { StudySession } from '@/lib/types';
import { useSessions, useSessionMutations } from '../hooks/use-sessions';
import { SessionItem } from './session-item';
import { SessionEditDialog } from './session-edit-dialog';

interface SessionListProps {
  courseFilter?: string;
  limit?: number;
}

export function SessionList({ courseFilter, limit = 10 }: SessionListProps) {
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useSessions({ courseId: courseFilter, limit });
  const mutations = useSessionMutations();

  const [editingSession, setEditingSession] = useState<
    (StudySession & { course_title?: string }) | null
  >(null);

  const sessions = data?.pages.flatMap((page) => page.sessions) ?? [];

  const handleEdit = (session: StudySession) => {
    setEditingSession(session as StudySession & { course_title?: string });
  };

  const handleDelete = (sessionId: string) => {
    if (confirm('Delete this session? This cannot be undone.')) {
      mutations.deleteSession.mutate(sessionId);
    }
  };

  const handleSaveEdit = (updates: {
    durationMinutes?: number;
    modulesCompleted?: number;
    notes?: string | null;
  }) => {
    if (!editingSession) return;
    mutations.updateSession.mutate(
      { sessionId: editingSession.id, data: updates },
      {
        onSuccess: () => setEditingSession(null),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Failed to load sessions: {error.message}
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No sessions recorded yet. Start tracking!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      {editingSession && (
        <SessionEditDialog
          session={editingSession}
          open={!!editingSession}
          onClose={() => setEditingSession(null)}
          onSave={handleSaveEdit}
          isSaving={mutations.updateSession.isPending}
        />
      )}
    </div>
  );
}
