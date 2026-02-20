'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { useBuddySearch } from '../hooks/use-buddy-search';
import { useBuddyMutations } from '../hooks/use-buddy-mutations';
import { BuddySearchResultCard } from './buddy-search-result-card';

interface BuddySearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuddySearch({ open, onOpenChange }: BuddySearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { sendRequest } = useBuddyMutations();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(inputValue.trim()), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setInputValue('');
      setDebouncedQuery('');
    }
  }, [open]);

  const { data: results, isLoading } = useBuddySearch(debouncedQuery);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find Study Buddies</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {isLoading && (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && debouncedQuery.length >= 2 && results && results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No users found
            </p>
          )}
          {!isLoading && results && results.length > 0 && (
            <div className="space-y-1">
              {results.map((user) => (
                <BuddySearchResultCard
                  key={user.id}
                  user={user}
                  onSendRequest={(id) => sendRequest.mutate(id)}
                  isLoading={sendRequest.isPending}
                />
              ))}
            </div>
          )}
          {debouncedQuery.length < 2 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Type at least 2 characters to search
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
