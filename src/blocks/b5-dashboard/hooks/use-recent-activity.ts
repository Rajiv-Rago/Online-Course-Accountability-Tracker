'use client';

import { useMemo } from 'react';
import type { StudySession, Achievement, Course, AiAnalysis } from '@/lib/types';
import { buildActivityFeed, type ActivityItemData } from '../lib/dashboard-utils';

export function useRecentActivity(
  sessions: StudySession[],
  achievements: Achievement[],
  courses: Course[],
  analyses: AiAnalysis[]
): ActivityItemData[] {
  return useMemo(
    () => buildActivityFeed(sessions, achievements, courses, analyses),
    [sessions, achievements, courses, analyses]
  );
}
