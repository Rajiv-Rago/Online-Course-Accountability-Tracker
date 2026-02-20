'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Notification } from '@/lib/types';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../actions/notification-actions';

interface UseNotificationsOptions {
  type?: string | null;
  unreadOnly?: boolean;
  pageSize?: number;
}

export function useNotifications(options?: UseNotificationsOptions) {
  const pageSize = options?.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: ['notifications', options?.type, options?.unreadOnly],
    queryFn: async ({ pageParam }) => {
      const result = await getNotifications({
        type: options?.type,
        unreadOnly: options?.unreadOnly,
        cursor: pageParam as string | undefined,
        limit: pageSize,
      });
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-count'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueriesData<{ pages: { notifications: Notification[]; nextCursor: string | null }[] }>(
        { queryKey: ['notifications'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((n) =>
                n.id === id ? { ...n, read: true } : n
              ),
            })),
          };
        }
      );
      // Decrement unread count
      queryClient.setQueryData<number>(['unread-count'], (prev) =>
        Math.max((prev ?? 1) - 1, 0)
      );
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message);
      invalidate();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      queryClient.setQueriesData<{ pages: { notifications: Notification[]; nextCursor: string | null }[] }>(
        { queryKey: ['notifications'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((n) => ({ ...n, read: true })),
            })),
          };
        }
      );
      queryClient.setQueryData<number>(['unread-count'], 0);
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        invalidate();
      } else {
        toast.success('All notifications marked as read');
      }
    },
    onError: (error) => {
      toast.error(error.message);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      // Save snapshot for potential rollback
      let wasUnread = false;
      queryClient.setQueriesData<{ pages: { notifications: Notification[]; nextCursor: string | null }[] }>(
        { queryKey: ['notifications'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.filter((n) => {
                if (n.id === id && !n.read) wasUnread = true;
                return n.id !== id;
              }),
            })),
          };
        }
      );
      if (wasUnread) {
        queryClient.setQueryData<number>(['unread-count'], (prev) =>
          Math.max((prev ?? 1) - 1, 0)
        );
      }
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        invalidate();
      } else {
        toast.success('Notification deleted');
      }
    },
    onError: (error) => {
      toast.error(error.message);
      invalidate();
    },
  });

  return {
    markAsRead: markReadMutation,
    markAllAsRead: markAllReadMutation,
    deleteNotification: deleteMutation,
  };
}
