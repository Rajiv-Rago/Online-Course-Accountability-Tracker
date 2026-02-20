'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Coffee } from 'lucide-react';
import { PlanCourseItem } from './plan-course-item';
import type { TodaysPlanData } from '../lib/dashboard-utils';

interface TodaysPlanProps {
  plan: TodaysPlanData;
}

export function TodaysPlan({ plan }: TodaysPlanProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Today&apos;s Plan</CardTitle>
            {plan.isAiGenerated && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            )}
          </div>
          <Link
            href="/reports/insights"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!plan.isStudyDay ? (
          <div className="flex items-center gap-3 py-4 text-center justify-center">
            <Coffee className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Rest day! Take a break or do some light review.
            </p>
          </div>
        ) : plan.planItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No active courses to plan for. Add a course to get started!
          </p>
        ) : (
          <>
            <div className="divide-y">
              {plan.planItems.map((item) => (
                <PlanCourseItem key={item.courseId} item={item} />
              ))}
            </div>
            {plan.aiMessage && (
              <div className="mt-3 rounded-md bg-muted/50 p-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{plan.aiMessage}</p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
