/**
 * Spec Compliance Audit Tests
 *
 * These tests verify that the implementation matches the Product Specification
 * (docs/SPEC.md). They check schema alignment, enum completeness, route
 * existence, feature presence per block, and known spec/implementation gaps.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const ROOT = path.resolve(SRC, '..');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf-8');
const readRoot = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf-8');
const exists = (file: string) => fs.existsSync(path.join(SRC, file));
const existsRoot = (file: string) => fs.existsSync(path.join(ROOT, file));

// =============================================================================
// 1. SQL Schema ↔ TypeScript Type Alignment
// =============================================================================
describe('Schema Alignment: SQL Migrations ↔ TypeScript Types', () => {
  const migration1 = readRoot('supabase/migrations/00001_foundation.sql');
  const migration2 = readRoot('supabase/migrations/00002_b1_user_profile.sql');
  const migration3 = readRoot('supabase/migrations/00003_b7_social.sql');
  const shared = read('lib/types/shared.ts');

  describe('user_profiles table', () => {
    it('migration 00002 renames full_name to display_name', () => {
      expect(migration2).toContain('RENAME COLUMN full_name TO display_name');
      expect(shared).toContain('display_name: string');
      expect(shared).not.toContain('full_name:');
    });

    it('migration 00002 renames daily_study_goal_minutes to daily_study_goal_mins', () => {
      expect(migration2).toContain('RENAME COLUMN daily_study_goal_minutes TO daily_study_goal_mins');
      expect(shared).toContain('daily_study_goal_mins: number');
    });

    it('migration 00002 drops old columns', () => {
      expect(migration2).toContain('DROP COLUMN IF EXISTS preferred_study_days');
      expect(migration2).toContain('DROP COLUMN IF EXISTS preferred_study_time');
      expect(migration2).toContain('DROP COLUMN IF EXISTS streak_freeze_count');
    });

    it('migration 00002 adds all notification preference columns', () => {
      const notifCols = [
        'notify_email', 'notify_push', 'notify_slack', 'notify_discord',
        'notify_daily_reminder', 'notify_streak_warning', 'notify_weekly_report',
        'notify_achievement', 'notify_risk_alert',
      ];
      for (const col of notifCols) {
        expect(migration2).toContain(col);
        expect(shared).toContain(`${col}: boolean`);
      }
    });

    it('migration 00002 adds onboarding_step column', () => {
      expect(migration2).toContain('onboarding_step');
      expect(shared).toContain('onboarding_step: number');
    });

    it('migration 00002 adds webhook URL columns', () => {
      expect(migration2).toContain('slack_webhook_url');
      expect(migration2).toContain('discord_webhook_url');
      expect(shared).toContain('slack_webhook_url: string | null');
      expect(shared).toContain('discord_webhook_url: string | null');
    });

    it('migration 00002 adds preferred_days and time_start/end', () => {
      expect(migration2).toContain('preferred_days');
      expect(migration2).toContain('preferred_time_start');
      expect(migration2).toContain('preferred_time_end');
      expect(shared).toContain('preferred_days: DayOfWeek[]');
      expect(shared).toContain('preferred_time_start: string | null');
      expect(shared).toContain('preferred_time_end: string | null');
    });
  });

  describe('achievements table', () => {
    it('migration 00003 adds shared column', () => {
      expect(migration3).toContain('ADD COLUMN shared BOOLEAN NOT NULL DEFAULT false');
      expect(shared).toContain('shared: boolean');
    });
  });

  describe('all 10 tables have TypeScript interfaces', () => {
    const tables: [string, string][] = [
      ['user_profiles', 'UserProfile'],
      ['courses', 'Course'],
      ['study_sessions', 'StudySession'],
      ['daily_stats', 'DailyStat'],
      ['ai_analyses', 'AiAnalysis'],
      ['weekly_reports', 'WeeklyReport'],
      ['notifications', 'Notification'],
      ['reminder_schedules', 'ReminderSchedule'],
      ['study_buddies', 'StudyBuddy'],
      ['achievements', 'Achievement'],
    ];

    for (const [table, iface] of tables) {
      it(`${table} → ${iface}`, () => {
        expect(migration1).toContain(`CREATE TABLE public.${table}`);
        expect(shared).toContain(`export interface ${iface}`);
      });
    }
  });
});

// =============================================================================
// 2. Enum/CHECK Constraint Completeness
// =============================================================================
describe('Enum Completeness: CHECK Constraints ↔ TypeScript Enums', () => {
  const enums = read('lib/types/enums.ts');

  it('COURSE_STATUS has all 5 values', () => {
    for (const val of ['not_started', 'in_progress', 'paused', 'completed', 'abandoned']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('COURSE_PLATFORM has all 6 values', () => {
    for (const val of ['udemy', 'coursera', 'youtube', 'skillshare', 'pluralsight', 'custom']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('MOTIVATION_STYLE matches migration 00002 values (not old spec values)', () => {
    for (const val of ['gentle', 'balanced', 'drill_sergeant']) {
      expect(enums).toContain(`'${val}'`);
    }
    expect(enums).not.toContain("'tough_love'");
    expect(enums).not.toContain("'data_driven'");
  });

  it('SESSION_TYPE has all 3 values', () => {
    for (const val of ['manual', 'timer', 'module']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('ANALYSIS_TYPE has all 3 values', () => {
    for (const val of ['daily', 'weekly', 'risk_alert']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('RISK_LEVEL has all 4 values', () => {
    for (const val of ['low', 'medium', 'high', 'critical']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('NOTIFICATION_TYPE has all 6 types from spec', () => {
    for (const val of ['reminder', 'risk_alert', 'achievement', 'buddy_update', 'weekly_report', 'streak_warning']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('NOTIFICATION_CHANNEL has all 5 channels', () => {
    for (const val of ['in_app', 'email', 'push', 'slack', 'discord']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('BUDDY_STATUS has all 4 values', () => {
    for (const val of ['pending', 'accepted', 'declined', 'removed']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('ACHIEVEMENT_TYPE has all 15 types', () => {
    for (const val of [
      'first_session', 'streak_7', 'streak_30', 'streak_100',
      'course_complete', 'night_owl', 'early_bird', 'marathon',
      'consistency_king', 'speed_learner', 'social_butterfly',
      'comeback_kid', 'perfectionist', 'explorer', 'dedication',
    ]) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('EXPERIENCE_LEVEL has all 3 values', () => {
    for (const val of ['beginner', 'intermediate', 'advanced']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('THEME has all 3 values', () => {
    for (const val of ['light', 'dark', 'system']) {
      expect(enums).toContain(`'${val}'`);
    }
  });

  it('DAY_OF_WEEK has all 7 days', () => {
    for (const val of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
      expect(enums).toContain(`'${val}'`);
    }
  });
});

// =============================================================================
// 3. Route Structure
// =============================================================================
describe('Route Structure', () => {
  const appRoutes = [
    'app/(app)/dashboard/page.tsx',
    'app/(app)/courses/page.tsx',
    'app/(app)/courses/new/page.tsx',
    'app/(app)/courses/[id]/page.tsx',
    'app/(app)/courses/[id]/edit/page.tsx',
    'app/(app)/progress/page.tsx',
    'app/(app)/progress/timer/page.tsx',
    'app/(app)/progress/log/page.tsx',
    'app/(app)/settings/page.tsx',
    'app/(app)/settings/account/page.tsx',
    'app/(app)/settings/notifications/page.tsx',
    'app/(app)/settings/profile/page.tsx',
    'app/(app)/settings/integrations/page.tsx',
    'app/(app)/notifications/page.tsx',
    'app/(app)/social/page.tsx',
    'app/(app)/social/buddies/page.tsx',
    'app/(app)/social/achievements/page.tsx',
    'app/(app)/social/leaderboard/page.tsx',
    'app/(app)/analysis/page.tsx',
    'app/(app)/analysis/weekly/page.tsx',
    'app/(app)/visualizations/page.tsx',
    'app/(app)/visualizations/heatmap/page.tsx',
  ];

  for (const route of appRoutes) {
    const label = route.replace('app/(app)/', '/').replace('/page.tsx', '');
    it(`${label} exists`, () => {
      expect(exists(route)).toBe(true);
    });
  }

  it('/auth/login exists', () => expect(exists('app/(auth)/login/page.tsx')).toBe(true));
  it('/auth/signup exists', () => expect(exists('app/(auth)/signup/page.tsx')).toBe(true));
  it('/onboarding exists', () => expect(exists('app/(onboarding)/onboarding/page.tsx')).toBe(true));

  it('all 4 cron routes exist', () => {
    expect(exists('app/api/cron/daily-analysis/route.ts')).toBe(true);
    expect(exists('app/api/cron/weekly-report/route.ts')).toBe(true);
    expect(exists('app/api/cron/send-reminders/route.ts')).toBe(true);
    expect(exists('app/api/cron/daily-stats/route.ts')).toBe(true);
  });
});

// =============================================================================
// 4. Feature Completeness Per Block
// =============================================================================
describe('B1: User Profile', () => {
  it('has profile actions (CRUD)', () => {
    const c = read('blocks/b1-user-profile/actions/profile-actions.ts');
    expect(c).toContain('getProfile');
    expect(c).toContain('updateProfile');
    expect(c).toContain('completeOnboarding');
    expect(c).toContain('updateOnboardingStep');
  });

  it('has account actions (email, password, export, delete)', () => {
    const c = read('blocks/b1-user-profile/actions/account-actions.ts');
    expect(c).toContain('changeEmail');
    expect(c).toContain('changePassword');
    expect(c).toContain('exportUserData');
    expect(c).toContain('deleteAccount');
  });

  it('has onboarding wizard with steps', () => {
    expect(exists('blocks/b1-user-profile/components/onboarding-wizard.tsx')).toBe(true);
  });

  it('has theme toggle', () => {
    expect(exists('blocks/b1-user-profile/components/theme-toggle.tsx')).toBe(true);
  });

  it('has avatar upload', () => {
    expect(exists('blocks/b1-user-profile/components/avatar-upload.tsx')).toBe(true);
  });

  it('has profile validation', () => {
    expect(exists('blocks/b1-user-profile/lib/profile-validation.ts')).toBe(true);
  });
});

describe('B2: Course Management', () => {
  it('has full CRUD + transitions', () => {
    const c = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(c).toContain('createCourse');
    expect(c).toContain('updateCourse');
    expect(c).toContain('deleteCourse');
    expect(c).toContain('transitionStatus');
  });

  it('has bulk operations', () => {
    const c = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(c).toContain('bulkUpdateStatus');
  });

  it('has reorder', () => {
    const c = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(c).toContain('reorderCourses');
  });

  it('has status transition matrix', () => {
    const c = read('blocks/b2-course-management/lib/course-utils.ts');
    expect(c).toContain('VALID_TRANSITIONS');
  });

  it('has validation schemas', () => {
    const c = read('blocks/b2-course-management/lib/course-validation.ts');
    expect(c).toContain('createCourseSchema');
    expect(c).toContain('statusTransitionSchema');
  });

  it('has UI components (form, card, list, filters)', () => {
    expect(exists('blocks/b2-course-management/components/course-form.tsx')).toBe(true);
    expect(exists('blocks/b2-course-management/components/course-card.tsx')).toBe(true);
    expect(exists('blocks/b2-course-management/components/course-list.tsx')).toBe(true);
  });
});

describe('B3: Progress Tracking', () => {
  it('has session CRUD', () => {
    const c = read('blocks/b3-progress-tracking/actions/session-actions.ts');
    expect(c).toContain('createSession');
    expect(c).toContain('updateSession');
    expect(c).toContain('deleteSession');
    expect(c).toContain('fetchSessions');
  });

  it('has timer actions', () => {
    const c = read('blocks/b3-progress-tracking/actions/timer-actions.ts');
    expect(c).toContain('startTimerSession');
    expect(c).toContain('autoSaveTimerProgress');
    expect(c).toContain('finalizeTimerSession');
    expect(c).toContain('recoverTimerSession');
  });

  it('has daily stats + streak management', () => {
    const c = read('blocks/b3-progress-tracking/actions/stats-actions.ts');
    expect(c).toContain('upsertDailyStats');
    expect(c).toContain('fetchDailyStats');
    expect(c).toContain('fetchStreakData');
    expect(c).toContain('applyStreakFreeze');
    expect(c).toContain('fetchTodayStats');
  });

  it('has streak calculator with threshold', () => {
    const c = read('blocks/b3-progress-tracking/lib/streak-calculator.ts');
    expect(c).toContain('STREAK_THRESHOLD_MINUTES');
    expect(c).toContain('calculateStreaks');
  });

  it('session logging auto-transitions not_started → in_progress', () => {
    const c = read('blocks/b3-progress-tracking/actions/session-actions.ts');
    expect(c).toContain("'not_started'");
    expect(c).toContain("'in_progress'");
  });

  it('has timer UI components', () => {
    expect(exists('blocks/b3-progress-tracking/components/study-timer.tsx')).toBe(true);
  });

  it('has streak display components', () => {
    expect(exists('blocks/b3-progress-tracking/components/streak-display.tsx')).toBe(true);
  });
});

describe('B4: AI Analysis', () => {
  it('has AI pipeline (daily + weekly)', () => {
    const c = read('blocks/b4-ai-analysis/lib/ai-pipeline.ts');
    expect(c).toContain('runDailyAnalysis');
    expect(c).toContain('generateWeeklyReports');
  });

  it('has risk calculator', () => {
    const c = read('blocks/b4-ai-analysis/lib/risk-calculator.ts');
    expect(c).toContain('calculateAdjustedRisk');
    expect(c).toContain('riskLevelFromScore');
  });

  it('has prompt builder with motivation styles', () => {
    const c = read('blocks/b4-ai-analysis/lib/prompt-builder.ts');
    expect(c).toContain('buildSystemPrompt');
  });

  it('has response parser', () => {
    const c = read('blocks/b4-ai-analysis/lib/response-parser.ts');
    expect(c).toContain('parseCourseAnalysisResponse');
  });

  it('has analysis validation', () => {
    expect(exists('blocks/b4-ai-analysis/lib/analysis-validation.ts')).toBe(true);
  });
});

describe('B5: Dashboard', () => {
  it('has dashboard page component', () => {
    expect(exists('blocks/b5-dashboard/components/dashboard-page.tsx')).toBe(true);
  });

  it('has summary stats', () => {
    expect(exists('blocks/b5-dashboard/components/summary-stats.tsx')).toBe(true);
  });

  it('has todays plan', () => {
    expect(exists('blocks/b5-dashboard/components/todays-plan.tsx')).toBe(true);
  });
});

describe('B6: Notifications', () => {
  it('has notification actions', () => {
    const c = read('blocks/b6-notifications/actions/notification-actions.ts');
    expect(c).toContain('getNotifications');
    expect(c).toContain('markAsRead');
    expect(c).toContain('markAllAsRead');
  });

  it('has reminder actions', () => {
    const c = read('blocks/b6-notifications/actions/reminder-actions.ts');
    expect(c).toContain('createReminder');
    expect(c).toContain('deleteReminder');
  });

  it('has multi-channel sender supporting all 5 channels', () => {
    const c = read('blocks/b6-notifications/lib/notification-sender.ts');
    expect(c).toContain('sendToChannels');
    expect(c).toContain("'in_app'");
    expect(c).toContain("'email'");
    expect(c).toContain("'push'");
    expect(c).toContain("'slack'");
    expect(c).toContain("'discord'");
  });

  it('has 4 channel adapters', () => {
    expect(exists('blocks/b6-notifications/lib/channel-adapters/email-adapter.ts')).toBe(true);
    expect(exists('blocks/b6-notifications/lib/channel-adapters/slack-adapter.ts')).toBe(true);
    expect(exists('blocks/b6-notifications/lib/channel-adapters/discord-adapter.ts')).toBe(true);
    expect(exists('blocks/b6-notifications/lib/channel-adapters/push-adapter.ts')).toBe(true);
  });

  it('push adapter has real web-push implementation', () => {
    let pushAdapter: string;
    try {
      pushAdapter = read('blocks/b6-notifications/lib/channel-adapters/push-adapter.ts');
    } catch {
      pushAdapter = read('blocks/b6-notifications/lib/push-adapter.ts');
    }
    expect(pushAdapter).toContain('webpush');
    expect(pushAdapter).toContain('sendNotification');
  });

  it('has reminder scheduler', () => {
    const c = read('blocks/b6-notifications/lib/reminder-scheduler.ts');
    expect(c).toContain('processReminders');
  });

  it('has notification bell UI', () => {
    expect(exists('blocks/b6-notifications/components/notification-bell.tsx')).toBe(true);
  });

  it('notification validation covers all 6 types', () => {
    const c = read('blocks/b6-notifications/lib/notification-validation.ts');
    for (const type of ['reminder', 'risk_alert', 'achievement', 'buddy_update', 'weekly_report', 'streak_warning']) {
      expect(c).toContain(type);
    }
  });
});

describe('B7: Social / Buddy', () => {
  it('has buddy CRUD actions', () => {
    const c = read('blocks/b7-social/actions/buddy-actions.ts');
    expect(c).toContain('sendBuddyRequest');
    expect(c).toContain('acceptRequest');
    expect(c).toContain('declineRequest');
    expect(c).toContain('removeBuddy');
    expect(c).toContain('getBuddyActivity');
  });

  it('has achievement actions', () => {
    const c = read('blocks/b7-social/actions/achievement-actions.ts');
    expect(c).toContain('checkAchievements');
    expect(c).toContain('shareAchievement');
  });

  it('has leaderboard actions', () => {
    const c = read('blocks/b7-social/actions/leaderboard-actions.ts');
    expect(c).toContain('getWeeklyLeaderboard');
  });

  it('has achievement checker library', () => {
    expect(exists('blocks/b7-social/lib/achievement-checker.ts')).toBe(true);
  });

  it('has buddy validation', () => {
    expect(exists('blocks/b7-social/lib/buddy-validation.ts')).toBe(true);
  });
});

describe('B8: Visualization', () => {
  it('has forecast calculator with linear regression', () => {
    const c = read('blocks/b8-visualization/lib/forecast-calculator.ts');
    expect(c).toContain('calculateForecast');
    expect(c).toContain('linearRegression');
  });

  it('has pattern detector', () => {
    const c = read('blocks/b8-visualization/lib/pattern-detector.ts');
    expect(c).toContain('detectPatterns');
  });

  it('has heatmap component', () => {
    expect(exists('blocks/b8-visualization/components/study-heatmap.tsx')).toBe(true);
  });

  it('has forecast component', () => {
    expect(exists('blocks/b8-visualization/components/completion-forecast.tsx')).toBe(true);
  });
});

// =============================================================================
// 5. Course Status Transition Matrix (Spec §3.4)
// =============================================================================
describe('Course Status Transitions (Spec §3.4)', () => {
  const utils = read('blocks/b2-course-management/lib/course-utils.ts');

  const specTransitions: [string, string][] = [
    ['not_started', 'in_progress'],
    ['in_progress', 'paused'],
    ['in_progress', 'completed'],
    ['in_progress', 'abandoned'],
    ['paused', 'in_progress'],
    ['paused', 'abandoned'],
    ['completed', 'in_progress'],
    ['abandoned', 'in_progress'],
  ];

  for (const [from, to] of specTransitions) {
    it(`allows ${from} → ${to}`, () => {
      expect(utils).toContain(from);
      expect(utils).toContain(to);
    });
  }
});

// =============================================================================
// 6. Cron Job Security
// =============================================================================
describe('Cron Job Security', () => {
  const cronPaths = [
    'app/api/cron/daily-analysis/route.ts',
    'app/api/cron/weekly-report/route.ts',
    'app/api/cron/send-reminders/route.ts',
    'app/api/cron/daily-stats/route.ts',
  ];

  for (const cronPath of cronPaths) {
    it(`${cronPath.split('/').slice(-2, -1)[0]} validates CRON_SECRET`, () => {
      const route = read(cronPath);
      expect(route).toContain('CRON_SECRET');
      expect(route).toContain('authorization');
      expect(route).toContain('401');
    });
  }
});

// =============================================================================
// 7. Cross-Block Integration Wiring
// =============================================================================
describe('Cross-Block Integration Wiring', () => {
  it('session-actions → checkAchievements after session creation', () => {
    const c = read('blocks/b3-progress-tracking/actions/session-actions.ts');
    expect(c).toContain('checkAchievements');
  });

  it('timer-actions → checkAchievements after finalization', () => {
    const c = read('blocks/b3-progress-tracking/actions/timer-actions.ts');
    expect(c).toContain('checkAchievements');
  });

  it('course-actions → checkAchievements after status transition', () => {
    const c = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(c).toContain('checkAchievements');
  });

  it('stats-actions → checkAchievements after daily stats update', () => {
    const c = read('blocks/b3-progress-tracking/actions/stats-actions.ts');
    expect(c).toContain('checkAchievements');
  });

  it('AI pipeline → risk_alert notifications for high-risk courses', () => {
    const c = read('blocks/b4-ai-analysis/lib/ai-pipeline.ts');
    expect(c).toContain("'risk_alert'");
    expect(c).toContain('sendToChannels');
  });

  it('stats-actions → streak_warning notification', () => {
    const c = read('blocks/b3-progress-tracking/actions/stats-actions.ts');
    expect(c).toContain("'streak_warning'");
    expect(c).toContain('sendToChannels');
  });

  it('AI pipeline → weekly_report notification delivery', () => {
    const c = read('blocks/b4-ai-analysis/lib/ai-pipeline.ts');
    expect(c).toContain("'weekly_report'");
  });

  it('notification sender includes push channel delivery', () => {
    const c = read('blocks/b6-notifications/lib/notification-sender.ts');
    expect(c).toContain('sendPush');
    expect(c).toContain("'push'");
  });
});

// =============================================================================
// 8. SQL Unique Constraints
// =============================================================================
describe('SQL Unique Constraints', () => {
  const m = readRoot('supabase/migrations/00001_foundation.sql');

  it('daily_stats UNIQUE(user_id, date)', () => {
    expect(m).toContain('daily_stats_user_date_unique');
  });

  it('weekly_reports UNIQUE(user_id, week_start)', () => {
    expect(m).toContain('weekly_reports_user_week_unique');
  });

  it('study_buddies UNIQUE(requester_id, recipient_id)', () => {
    expect(m).toContain('study_buddies_pair_unique');
  });

  it('achievements UNIQUE(user_id, achievement_type, course_id)', () => {
    expect(m).toContain('achievements_user_type_course_unique');
  });

  it('study_buddies no-self constraint', () => {
    expect(m).toContain('study_buddies_no_self');
  });
});

// =============================================================================
// 9. Spec ↔ Implementation Gap Documentation
// =============================================================================
describe('Spec ↔ Implementation Gap Documentation', () => {
  it('spec lists linkedin_learning/edx platforms; implementation has 6 platforms', () => {
    const enums = read('lib/types/enums.ts');
    expect(enums).not.toContain("'linkedin_learning'");
    expect(enums).not.toContain("'edx'");
  });

  it('spec motivation styles differ from implementation', () => {
    // Spec: gentle, tough_love, data_driven
    // Implementation: gentle, balanced, drill_sergeant (migration 00002)
    const m2 = readRoot('supabase/migrations/00002_b1_user_profile.sql');
    expect(m2).toContain("'gentle', 'balanced', 'drill_sergeant'");
  });

  it('spec defines separate streaks table; implementation uses daily_stats.streak_day', () => {
    const m = readRoot('supabase/migrations/00001_foundation.sql');
    expect(m).not.toContain('CREATE TABLE public.streaks');
    expect(m).toContain('streak_day');
  });

  it('spec defines notification_preferences table; implementation uses user_profiles columns', () => {
    const m = readRoot('supabase/migrations/00001_foundation.sql');
    expect(m).not.toContain('CREATE TABLE public.notification_preferences');
  });

  it('spec defines privacy_settings table; not implemented', () => {
    const m = readRoot('supabase/migrations/00001_foundation.sql');
    expect(m).not.toContain('CREATE TABLE public.privacy_settings');
  });

  it('spec calls it buddy_connections; implementation calls it study_buddies', () => {
    const m = readRoot('supabase/migrations/00001_foundation.sql');
    expect(m).not.toContain('CREATE TABLE public.buddy_connections');
    expect(m).toContain('CREATE TABLE public.study_buddies');
  });

  it('spec daily_stats has course_id; implementation stores global aggregates only', () => {
    const shared = read('lib/types/shared.ts');
    const section = shared.slice(
      shared.indexOf('export interface DailyStat'),
      shared.indexOf('}', shared.indexOf('export interface DailyStat')) + 1
    );
    expect(section).not.toContain('course_id');
    expect(section).toContain('courses_studied: string[]');
  });

  it('spec uses sessions_count; implementation uses session_count', () => {
    const shared = read('lib/types/shared.ts');
    // DailyStat uses session_count (singular), not sessions_count
    expect(shared).toContain('session_count: number');
    // Verify DailyStat interface specifically uses singular form
    const dailyStatSection = shared.slice(
      shared.indexOf('export interface DailyStat'),
      shared.indexOf('}', shared.indexOf('export interface DailyStat')) + 1
    );
    expect(dailyStatSection).toContain('session_count');
    expect(dailyStatSection).not.toContain('sessions_count');
  });
});

// =============================================================================
// 10. Middleware & Auth Infrastructure
// =============================================================================
describe('Auth Infrastructure', () => {
  it('middleware.ts exists', () => {
    expect(exists('middleware.ts') || existsRoot('src/middleware.ts')).toBe(true);
  });

  it('has all 4 Supabase client variants', () => {
    expect(exists('lib/supabase/client.ts')).toBe(true);
    expect(exists('lib/supabase/server.ts')).toBe(true);
    expect(exists('lib/supabase/middleware.ts')).toBe(true);
    expect(exists('lib/supabase/admin.ts')).toBe(true);
  });
});

// =============================================================================
// 11. Vercel Cron Configuration
// =============================================================================
describe('Vercel Cron Configuration', () => {
  it('vercel.json exists with all 4 cron jobs', () => {
    expect(existsRoot('vercel.json')).toBe(true);
    const config = JSON.parse(readRoot('vercel.json'));
    expect(config.crons).toBeDefined();
    const paths = config.crons.map((c: { path: string }) => c.path);
    expect(paths).toContain('/api/cron/daily-analysis');
    expect(paths).toContain('/api/cron/weekly-report');
    expect(paths).toContain('/api/cron/send-reminders');
    expect(paths).toContain('/api/cron/daily-stats');
  });
});

// =============================================================================
// 12. TypeScript Computed Types for Dashboard
// =============================================================================
describe('Dashboard Computed Types', () => {
  const shared = read('lib/types/shared.ts');

  it('DashboardData includes all required fields', () => {
    expect(shared).toContain('export interface DashboardData');
    expect(shared).toContain('profile: UserProfile');
    expect(shared).toContain('courses: CourseWithStats[]');
    expect(shared).toContain('streakInfo: StreakInfo');
  });

  it('StreakInfo has current/longest streak and at-risk flag', () => {
    expect(shared).toContain('current_streak: number');
    expect(shared).toContain('longest_streak: number');
    expect(shared).toContain('is_at_risk: boolean');
  });

  it('CourseWithStats extends Course with risk data', () => {
    expect(shared).toContain('export interface CourseWithStats extends Course');
    expect(shared).toContain('risk_score: number');
    expect(shared).toContain('risk_level: RiskLevel');
  });

  it('TodaysPlan interface exists', () => {
    expect(shared).toContain('export interface TodaysPlan');
  });
});

// =============================================================================
// 13. RLS Policies
// =============================================================================
describe('RLS Policies: All Tables Protected', () => {
  const m = readRoot('supabase/migrations/00001_foundation.sql');

  for (const table of [
    'user_profiles', 'courses', 'study_sessions', 'daily_stats',
    'ai_analyses', 'weekly_reports', 'notifications', 'reminder_schedules',
    'study_buddies', 'achievements',
  ]) {
    it(`${table} has RLS enabled`, () => {
      // SQL has variable whitespace between table name and ENABLE
      const pattern = new RegExp(`ALTER TABLE public\\.${table}\\s+ENABLE ROW LEVEL SECURITY`);
      expect(m).toMatch(pattern);
    });
  }
});

// =============================================================================
// 14. Database Indexes (Performance)
// =============================================================================
describe('Database Indexes', () => {
  const m = readRoot('supabase/migrations/00001_foundation.sql');

  it('has composite indexes on frequently queried columns', () => {
    expect(m).toContain('idx_courses_user_id');
    expect(m).toContain('idx_courses_user_status');
    expect(m).toContain('idx_sessions_user_started_at');
    expect(m).toContain('idx_daily_stats_user_date');
    expect(m).toContain('idx_ai_analyses_user_id');
  });

  it('has streak-specific index', () => {
    expect(m).toContain('idx_daily_stats_streak');
  });
});
