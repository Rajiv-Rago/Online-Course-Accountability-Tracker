'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  displayName: string;
}

export function EmptyState({ displayName }: EmptyStateProps) {
  const name = displayName || 'there';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <BookOpen className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        Welcome{name !== 'there' ? `, ${name}` : ''}!
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Start by adding your first course to track. We&apos;ll help you stay accountable
        and on top of your learning goals.
      </p>
      <Button asChild>
        <Link href="/courses/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Course
        </Link>
      </Button>
    </div>
  );
}
