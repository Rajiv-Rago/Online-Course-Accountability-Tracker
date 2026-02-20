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
import { Eye, EyeOff } from 'lucide-react';

interface AchievementShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementName: string;
  currentlyShared: boolean;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function AchievementShareDialog({
  open,
  onOpenChange,
  achievementName,
  currentlyShared,
  onConfirm,
  isLoading,
}: AchievementShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {currentlyShared ? 'Hide Achievement' : 'Share Achievement'}
          </DialogTitle>
          <DialogDescription>
            {currentlyShared
              ? `Hide "${achievementName}" from your buddies?`
              : `Share "${achievementName}" with your study buddies?`}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {currentlyShared
            ? 'Your buddies will no longer see this achievement on your profile.'
            : 'Your buddies will be able to see this achievement when viewing your profile.'}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {currentlyShared ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
