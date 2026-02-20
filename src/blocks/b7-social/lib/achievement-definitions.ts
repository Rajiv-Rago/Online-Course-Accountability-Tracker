import type { AchievementType } from '@/lib/types';
import type { AchievementTrigger } from './buddy-validation';

export interface AchievementDefinition {
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  category: 'study' | 'streak' | 'social' | 'milestone';
  triggers: AchievementTrigger[];
  repeatable: boolean;
  progressTrackable: boolean;
  maxProgress: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: 'first_session',
    name: 'First Steps',
    description: 'Log your first study session',
    icon: 'play',
    category: 'study',
    triggers: ['session_logged'],
    repeatable: false,
    progressTrackable: false,
    maxProgress: 1,
  },
  {
    type: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: 'flame',
    category: 'streak',
    triggers: ['daily_stats_updated'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 7,
  },
  {
    type: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day study streak',
    icon: 'flame',
    category: 'streak',
    triggers: ['daily_stats_updated'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 30,
  },
  {
    type: 'streak_100',
    name: 'Century Champion',
    description: 'Maintain a 100-day study streak',
    icon: 'flame',
    category: 'streak',
    triggers: ['daily_stats_updated'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 100,
  },
  {
    type: 'course_complete',
    name: 'Course Conqueror',
    description: 'Complete a course',
    icon: 'graduation-cap',
    category: 'milestone',
    triggers: ['course_status_changed'],
    repeatable: true,
    progressTrackable: false,
    maxProgress: 1,
  },
  {
    type: 'night_owl',
    name: 'Night Owl',
    description: 'Log 5 study sessions after 10 PM',
    icon: 'moon',
    category: 'study',
    triggers: ['session_logged'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 5,
  },
  {
    type: 'early_bird',
    name: 'Early Bird',
    description: 'Log 5 study sessions before 7 AM',
    icon: 'sunrise',
    category: 'study',
    triggers: ['session_logged'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 5,
  },
  {
    type: 'marathon',
    name: 'Marathon Runner',
    description: 'Complete a single session of 3+ hours',
    icon: 'timer',
    category: 'study',
    triggers: ['session_logged'],
    repeatable: false,
    progressTrackable: false,
    maxProgress: 1,
  },
  {
    type: 'consistency_king',
    name: 'Consistency King',
    description: 'Study consistently for 14 days (low variation in daily time)',
    icon: 'crown',
    category: 'streak',
    triggers: ['daily_stats_updated'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 14,
  },
  {
    type: 'speed_learner',
    name: 'Speed Learner',
    description: 'Complete a course before the target date',
    icon: 'zap',
    category: 'milestone',
    triggers: ['course_status_changed'],
    repeatable: true,
    progressTrackable: false,
    maxProgress: 1,
  },
  {
    type: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Connect with 5 study buddies',
    icon: 'users',
    category: 'social',
    triggers: ['buddy_count_changed'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 5,
  },
  {
    type: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Complete a course that was previously paused',
    icon: 'rotate-ccw',
    category: 'milestone',
    triggers: ['course_status_changed'],
    repeatable: true,
    progressTrackable: false,
    maxProgress: 1,
  },
  {
    type: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 100% of modules in a course',
    icon: 'check-circle',
    category: 'milestone',
    triggers: ['course_status_changed'],
    repeatable: true,
    progressTrackable: false,
    maxProgress: 1,
  },
  {
    type: 'explorer',
    name: 'Explorer',
    description: 'Study courses on 3 or more different platforms',
    icon: 'compass',
    category: 'study',
    triggers: ['session_logged', 'course_status_changed'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 3,
  },
  {
    type: 'dedication',
    name: 'Dedication',
    description: 'Accumulate 100 total hours of study time',
    icon: 'heart',
    category: 'milestone',
    triggers: ['session_logged', 'daily_stats_updated'],
    repeatable: false,
    progressTrackable: true,
    maxProgress: 6000,
  },
];

export const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENT_DEFINITIONS.map((def) => [def.type, def])
);

export function getDefinitionsForTrigger(
  trigger: AchievementTrigger
): AchievementDefinition[] {
  return ACHIEVEMENT_DEFINITIONS.filter((def) => def.triggers.includes(trigger));
}
