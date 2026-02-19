// =============================================================================
// enums.ts
// Shared enum/const definitions for the Course Accountability Tracker.
// Uses `as const` objects + extracted union types for runtime access.
// =============================================================================

// -----------------------------------------------------------------------------
// Course Status
// -----------------------------------------------------------------------------
export const COURSE_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export type CourseStatus = (typeof COURSE_STATUS)[keyof typeof COURSE_STATUS];

// -----------------------------------------------------------------------------
// Course Platform
// -----------------------------------------------------------------------------
export const COURSE_PLATFORM = {
  UDEMY: 'udemy',
  COURSERA: 'coursera',
  YOUTUBE: 'youtube',
  SKILLSHARE: 'skillshare',
  PLURALSIGHT: 'pluralsight',
  CUSTOM: 'custom',
} as const;

export type CoursePlatform = (typeof COURSE_PLATFORM)[keyof typeof COURSE_PLATFORM];

// -----------------------------------------------------------------------------
// Course Priority (1 = highest, 4 = lowest)
// -----------------------------------------------------------------------------
export const COURSE_PRIORITY = {
  HIGHEST: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
} as const;

export type CoursePriority = (typeof COURSE_PRIORITY)[keyof typeof COURSE_PRIORITY];

// -----------------------------------------------------------------------------
// Session Type
// -----------------------------------------------------------------------------
export const SESSION_TYPE = {
  MANUAL: 'manual',
  TIMER: 'timer',
  MODULE: 'module',
} as const;

export type SessionType = (typeof SESSION_TYPE)[keyof typeof SESSION_TYPE];

// -----------------------------------------------------------------------------
// Motivation Style
// -----------------------------------------------------------------------------
export const MOTIVATION_STYLE = {
  GENTLE: 'gentle',
  BALANCED: 'balanced',
  DRILL_SERGEANT: 'drill_sergeant',
} as const;

export type MotivationStyle = (typeof MOTIVATION_STYLE)[keyof typeof MOTIVATION_STYLE];

// -----------------------------------------------------------------------------
// Experience Level
// -----------------------------------------------------------------------------
export const EXPERIENCE_LEVEL = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVEL)[keyof typeof EXPERIENCE_LEVEL];

// -----------------------------------------------------------------------------
// Theme
// -----------------------------------------------------------------------------
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

// -----------------------------------------------------------------------------
// Analysis Type
// -----------------------------------------------------------------------------
export const ANALYSIS_TYPE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  RISK_ALERT: 'risk_alert',
} as const;

export type AnalysisType = (typeof ANALYSIS_TYPE)[keyof typeof ANALYSIS_TYPE];

// -----------------------------------------------------------------------------
// Risk Level
// -----------------------------------------------------------------------------
export const RISK_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL];

// -----------------------------------------------------------------------------
// Notification Type
// -----------------------------------------------------------------------------
export const NOTIFICATION_TYPE = {
  REMINDER: 'reminder',
  RISK_ALERT: 'risk_alert',
  ACHIEVEMENT: 'achievement',
  BUDDY_UPDATE: 'buddy_update',
  WEEKLY_REPORT: 'weekly_report',
  STREAK_WARNING: 'streak_warning',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// -----------------------------------------------------------------------------
// Notification Channel
// -----------------------------------------------------------------------------
export const NOTIFICATION_CHANNEL = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  SLACK: 'slack',
  DISCORD: 'discord',
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

// -----------------------------------------------------------------------------
// Buddy Status
// -----------------------------------------------------------------------------
export const BUDDY_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REMOVED: 'removed',
} as const;

export type BuddyStatus = (typeof BUDDY_STATUS)[keyof typeof BUDDY_STATUS];

// -----------------------------------------------------------------------------
// Achievement Type (15 types from the database CHECK constraint)
// -----------------------------------------------------------------------------
export const ACHIEVEMENT_TYPE = {
  FIRST_SESSION: 'first_session',
  STREAK_7: 'streak_7',
  STREAK_30: 'streak_30',
  STREAK_100: 'streak_100',
  COURSE_COMPLETE: 'course_complete',
  NIGHT_OWL: 'night_owl',
  EARLY_BIRD: 'early_bird',
  MARATHON: 'marathon',
  CONSISTENCY_KING: 'consistency_king',
  SPEED_LEARNER: 'speed_learner',
  SOCIAL_BUTTERFLY: 'social_butterfly',
  COMEBACK_KID: 'comeback_kid',
  PERFECTIONIST: 'perfectionist',
  EXPLORER: 'explorer',
  DEDICATION: 'dedication',
} as const;

export type AchievementType =
  (typeof ACHIEVEMENT_TYPE)[keyof typeof ACHIEVEMENT_TYPE];

// -----------------------------------------------------------------------------
// Day of Week
// -----------------------------------------------------------------------------
export const DAY_OF_WEEK = {
  MON: 'mon',
  TUE: 'tue',
  WED: 'wed',
  THU: 'thu',
  FRI: 'fri',
  SAT: 'sat',
  SUN: 'sun',
} as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK];
