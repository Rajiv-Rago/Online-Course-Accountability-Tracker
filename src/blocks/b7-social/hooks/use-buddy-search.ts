'use client';

import { useQuery } from '@tanstack/react-query';
import { searchUsers, type SearchResult } from '../actions/buddy-actions';

export function useBuddySearch(query: string) {
  return useQuery({
    queryKey: ['buddy-search', query],
    queryFn: async (): Promise<SearchResult[]> => {
      const result = await searchUsers(query);
      if (result.error) throw new Error(result.error);
      return result.data!;
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
