'use client';

import { cn } from '@/lib/utils';

interface TimerDisplayProps {
  elapsedSeconds: number;
  isRunning: boolean;
}

export function TimerDisplay({ elapsedSeconds, isRunning }: TimerDisplayProps) {
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const formatted = [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'font-mono text-5xl md:text-7xl font-bold tabular-nums tracking-wider select-none',
          isRunning && 'animate-pulse'
        )}
      >
        {formatted}
      </div>
      {!isRunning && elapsedSeconds > 0 && (
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Paused
        </span>
      )}
    </div>
  );
}
