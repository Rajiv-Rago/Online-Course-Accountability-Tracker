'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Timer, PenLine, BookPlus } from 'lucide-react';

const actions = [
  { label: 'Start Timer', href: '/progress/timer', icon: Timer },
  { label: 'Log Session', href: '/progress/log', icon: PenLine },
  { label: 'Add Course', href: '/courses/new', icon: BookPlus },
] as const;

export function QuickActions() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Tooltip key={action.href}>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" asChild>
                <Link href={action.href}>
                  <action.icon className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{action.label}</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">
              <p>{action.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
