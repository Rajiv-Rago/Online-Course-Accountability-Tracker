'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionLogForm } from '@/blocks/b3-progress-tracking/components/session-log-form';

export default function LogSessionPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/progress">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Progress
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Log Study Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record a study session you&apos;ve completed.
        </p>
      </div>

      <SessionLogForm />
    </div>
  );
}
