'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyTimer } from '@/blocks/b3-progress-tracking/components/study-timer';

export default function TimerPage() {
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link href="/progress">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Progress
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Timer Mode</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Start a timer to track your study session in real time.
        </p>
      </div>

      <StudyTimer />
    </div>
  );
}
