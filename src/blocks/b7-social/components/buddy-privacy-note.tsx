'use client';

import { Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function BuddyPrivacyNote() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-3 p-4">
        <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Privacy</p>
          <p>
            Buddies can only see your study streaks, weekly hours, active course count, and achievements you choose to share.
            Your course details, notes, and personal settings remain private.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
