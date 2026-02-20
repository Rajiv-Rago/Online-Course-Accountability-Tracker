'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getUnreadCount } from '../actions/notification-actions';

interface NotificationPayloadRow {
  read?: boolean;
  [key: string]: unknown;
}

export function useUnreadCount() {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const result = await getUnreadCount();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const userId = data.user?.id ?? null;
      if (!userId) return;

      const channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            queryClient.setQueryData<number>(['unread-count'], (prev) =>
              (prev ?? 0) + 1
            );
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const oldRow = payload.old as NotificationPayloadRow;
            const newRow = payload.new as NotificationPayloadRow;
            if (!oldRow.read && newRow.read) {
              queryClient.setQueryData<number>(['unread-count'], (prev) =>
                Math.max((prev ?? 1) - 1, 0)
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const oldRow = payload.old as NotificationPayloadRow;
            if (oldRow && !oldRow.read) {
              queryClient.setQueryData<number>(['unread-count'], (prev) =>
                Math.max((prev ?? 1) - 1, 0)
              );
            }
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, queryClient]);

  return { unreadCount };
}
