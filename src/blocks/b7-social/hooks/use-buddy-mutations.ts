'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendBuddyRequest, acceptRequest, declineRequest, removeBuddy } from '../actions/buddy-actions';
import { checkAchievements } from '../actions/achievement-actions';
import { toast } from 'sonner';

export function useBuddyMutations() {
  const queryClient = useQueryClient();

  const invalidateBuddies = () => {
    queryClient.invalidateQueries({ queryKey: ['buddies'] });
    queryClient.invalidateQueries({ queryKey: ['buddy-search'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  };

  const sendRequestMutation = useMutation({
    mutationFn: (recipientId: string) => sendBuddyRequest(recipientId),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return; }
      toast.success('Buddy request sent!');
      invalidateBuddies();
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const acceptMutation = useMutation({
    mutationFn: (relationshipId: string) => acceptRequest(relationshipId),
    onSuccess: async (result) => {
      if (result.error) { toast.error(result.error); return; }
      toast.success('Buddy request accepted!');
      invalidateBuddies();
      // Check social_butterfly achievement
      await checkAchievements('buddy_count_changed');
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const declineMutation = useMutation({
    mutationFn: (relationshipId: string) => declineRequest(relationshipId),
    onSuccess: (result) => {
      if (result.error) { toast.error(result.error); return; }
      toast.success('Request declined');
      invalidateBuddies();
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const removeMutation = useMutation({
    mutationFn: (relationshipId: string) => removeBuddy(relationshipId),
    onSuccess: async (result) => {
      if (result.error) { toast.error(result.error); return; }
      toast.success('Buddy removed');
      invalidateBuddies();
      await checkAchievements('buddy_count_changed');
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  return {
    sendRequest: sendRequestMutation,
    accept: acceptMutation,
    decline: declineMutation,
    remove: removeMutation,
    isLoading:
      sendRequestMutation.isPending ||
      acceptMutation.isPending ||
      declineMutation.isPending ||
      removeMutation.isPending,
  };
}
