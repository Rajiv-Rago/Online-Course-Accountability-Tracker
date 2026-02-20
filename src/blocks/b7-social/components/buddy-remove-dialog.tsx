'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BuddyRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buddyName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function BuddyRemoveDialog({
  open,
  onOpenChange,
  buddyName,
  onConfirm,
  isLoading,
}: BuddyRemoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Buddy</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {buddyName} as a study buddy?
          </DialogDescription>
        </DialogHeader>
        <ul className="text-sm text-muted-foreground space-y-1 pl-4 list-disc">
          <li>You will no longer see each other&apos;s activity</li>
          <li>They will be removed from your leaderboard</li>
          <li>You can send a new request later</li>
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            Remove Buddy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
