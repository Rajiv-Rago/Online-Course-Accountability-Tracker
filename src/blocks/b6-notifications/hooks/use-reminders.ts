'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  getCoursesForReminder,
  type ReminderWithCourse,
} from '../actions/reminder-actions';
import type { ReminderCreateInput, ReminderUpdateInput } from '../lib/notification-validation';

export function useReminders() {
  const queryClient = useQueryClient();

  const remindersQuery = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const result = await getReminders();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60_000,
  });

  const coursesQuery = useQuery({
    queryKey: ['reminder-courses'],
    queryFn: async () => {
      const result = await getCoursesForReminder();
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 120_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['reminders'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: ReminderCreateInput) => createReminder(input),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Reminder created');
        invalidate();
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReminderUpdateInput }) =>
      updateReminder(id, data),
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Reminder updated');
        invalidate();
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleReminder(id, enabled),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      queryClient.setQueryData<ReminderWithCourse[]>(['reminders'], (old) =>
        old?.map((r) => (r.id === id ? { ...r, enabled } : r))
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      queryClient.setQueryData<ReminderWithCourse[]>(['reminders'], (old) =>
        old?.filter((r) => r.id !== id)
      );
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error(result.error);
        invalidate();
      } else {
        toast.success('Reminder deleted');
      }
    },
    onError: (error) => {
      toast.error(error.message);
      invalidate();
    },
  });

  return {
    reminders: remindersQuery.data ?? [],
    courses: coursesQuery.data ?? [],
    isLoading: remindersQuery.isLoading,
    isCoursesLoading: coursesQuery.isLoading,
    createReminder: createMutation,
    updateReminder: updateMutation,
    toggleReminder: toggleMutation,
    deleteReminder: deleteMutation,
  };
}
