'use client';

import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../actions/profile-actions';

export function useProfile() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  return {
    profile: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
