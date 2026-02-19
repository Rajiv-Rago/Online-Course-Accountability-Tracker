'use client';

import { Play, Pause, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimerControlsProps {
  status: 'idle' | 'running' | 'paused';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  courseSelected: boolean;
  isStopLoading?: boolean;
}

export function TimerControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  courseSelected,
  isStopLoading,
}: TimerControlsProps) {
  if (status === 'idle') {
    return (
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onStart}
          disabled={!courseSelected}
          className="gap-2 px-8"
        >
          <Play className="h-5 w-5" />
          Start
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4">
      {status === 'running' ? (
        <Button size="lg" variant="outline" onClick={onPause} className="gap-2 px-8">
          <Pause className="h-5 w-5" />
          Pause
        </Button>
      ) : (
        <Button size="lg" onClick={onResume} className="gap-2 px-8">
          <Play className="h-5 w-5" />
          Resume
        </Button>
      )}
      <Button
        size="lg"
        variant="destructive"
        onClick={onStop}
        disabled={isStopLoading}
        className="gap-2 px-8"
      >
        <Square className="h-5 w-5" />
        {isStopLoading ? 'Saving...' : 'Stop & Save'}
      </Button>
    </div>
  );
}
