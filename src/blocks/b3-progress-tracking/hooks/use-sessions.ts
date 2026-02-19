'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StudySession } from '@/lib/types';
import {
  fetchSessions,
  createSession,
  updateSession,
  deleteSession,
} from '../actions/session-actions';
import type { CreateSessionInput, UpdateSessionInput } from '../lib/session-validation';

type SessionWithCourse = StudySession & {
  course_title: string;
  course_platform: string | null;
};

interface UseSessionsOptions {
  courseId?: string;
  limit?: number;
}

export function useSessions(options?: UseSessionsOptions) {
  const limit = options?.limit ?? 10;

  return useInfiniteQuery({
    queryKey: ['sessions', options?.courseId],
    queryFn: async ({ pageParam }) => {
      const result = await fetchSessions({
        courseId: options?.courseId,
        limit,
        cursor: pageParam as string | undefined,
      });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasNextPage || lastPage.sessions.length === 0)
        return undefined;
      return lastPage.sessions[lastPage.sessions.length - 1].id;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useSessionMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['sessions'] });
    queryClient.invalidateQueries({ queryKey: ['streak'] });
    queryClient.invalidateQueries({ queryKey: ['daily-stats'] });
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateSessionInput) => createSession(input),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Session logged successfully');
        invalidate();
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: UpdateSessionInput;
    }) => updateSession(sessionId, data),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Session updated');
        invalidate();
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Session deleted');
        invalidate();
      }
    },
    onError: (error) => toast.error(error.message),
  });

  return {
    createSession: createMutation,
    updateSession: updateMutation,
    deleteSession: deleteMutation,
    isLoading:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
}
