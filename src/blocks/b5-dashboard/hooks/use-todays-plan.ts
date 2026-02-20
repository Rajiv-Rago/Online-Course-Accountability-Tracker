'use client';

import { useMemo } from 'react';
import type { Course, AiAnalysis, DayOfWeek } from '@/lib/types';
import {
  distributeDailyGoal,
  calcProgress,
  getTodayDayOfWeek,
  getTodayDateStr,
  type TodaysPlanData,
  type PlanCourseItemData,
} from '../lib/dashboard-utils';

export function useTodaysPlan(
  courses: Course[],
  analyses: AiAnalysis[],
  dailyGoalMins: number,
  preferredDays: DayOfWeek[],
  timezone?: string
): TodaysPlanData {
  return useMemo(() => {
    const today = getTodayDayOfWeek(timezone);
    const isStudyDay = preferredDays.length === 0 || preferredDays.includes(today);

    // Look for today's daily analysis with interventions (timezone-aware)
    const todayStr = getTodayDateStr(timezone);
    const todayAnalysis = analyses.find(
      (a) =>
        a.analysis_type === 'daily' &&
        a.created_at.startsWith(todayStr) &&
        a.interventions &&
        a.interventions.length > 0
    );

    if (todayAnalysis) {
      // Build plan items from AI interventions that reference courses
      const aiPlanItems: PlanCourseItemData[] = [];
      const courseMap = new Map(courses.map((c) => [c.id, c]));

      for (const intervention of todayAnalysis.interventions) {
        if (intervention.action_url) {
          // Try to extract course_id from action_url like /courses/{id}
          const match = intervention.action_url.match(/\/courses\/([a-f0-9-]+)/);
          if (match) {
            const course = courseMap.get(match[1]);
            if (course) {
              aiPlanItems.push({
                courseId: course.id,
                title: course.title,
                priority: course.priority,
                suggestedMinutes: 30,
                currentProgress: calcProgress(
                  course.completed_modules,
                  course.total_modules ?? undefined,
                  course.completed_hours,
                  course.total_hours ?? undefined
                ),
                riskLevel: null,
              });
            }
          }
        }
      }

      if (aiPlanItems.length > 0) {
        const aiMessage =
          todayAnalysis.insights?.[0]?.description ??
          todayAnalysis.interventions[0]?.message ??
          null;
        return { planItems: aiPlanItems, aiMessage, isAiGenerated: true, isStudyDay };
      }
    }

    // Fallback: distribute daily goal across courses by priority
    const planItems = distributeDailyGoal(courses, dailyGoalMins);
    return { planItems, aiMessage: null, isAiGenerated: false, isStudyDay };
  }, [courses, analyses, dailyGoalMins, preferredDays, timezone]);
}
