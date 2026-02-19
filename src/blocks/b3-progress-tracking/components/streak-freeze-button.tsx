'use client';

import { useState } from 'react';
import { Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface StreakFreezeButtonProps {
  freezeCount: number;
  onFreeze: () => void;
  isLoading?: boolean;
}

export function StreakFreezeButton({
  freezeCount,
  onFreeze,
  isLoading,
}: StreakFreezeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirm = () => {
    onFreeze();
    setShowConfirm(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={freezeCount <= 0 || isLoading}
        className="gap-1.5"
      >
        <Snowflake className="h-4 w-4 text-blue-500" />
        Use Freeze ({freezeCount})
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Streak Freeze?</DialogTitle>
            <DialogDescription>
              This will apply a streak freeze for yesterday, preserving your
              current streak. You have {freezeCount} freeze
              {freezeCount !== 1 ? 's' : ''} remaining.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? 'Applying...' : 'Use Freeze'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
