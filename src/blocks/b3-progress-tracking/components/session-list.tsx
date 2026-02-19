'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { StudySession } from '@/lib/types';
import { useSessions, useSessionMutations } from '../hooks/use-sessions';
import { SessionItem } from './session-item';
import { SessionEditDialog } from './session-edit-dialog';

type SessionWithCourse = StudySession & {
  course_title: string;
  course_platform: string | null;
};

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

  const [editingSession, setEditingSession] = useState<SessionWithCourse | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const sessions = data?.pages.flatMap((page) => page.sessions) ?? [];

  const handleEdit = (session: SessionWithCourse) => {
    setEditingSession(session);
  };

  const handleDelete = (sessionId: string) => {
    setDeletingSessionId(sessionId);
  };

  const confirmDelete = () => {
    if (deletingSessionId) {
      mutations.deleteSession.mutate(deletingSessionId, {
        onSettled: () => setDeletingSessionId(null),
      });
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

      <Dialog
        open={!!deletingSessionId}
        onOpenChange={(open) => {
          if (!open) setDeletingSessionId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this session? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingSessionId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={mutations.deleteSession.isPending}
            >
              {mutations.deleteSession.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
