/**
 * Spec Compliance Audit
 *
 * Verifies that all blocks have the expected structural components
 * (actions, hooks, components, lib) and spec-required features.
 * Flags gaps with clear messages.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const exists = (file: string) => fs.existsSync(path.join(SRC, file));
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf-8');

// =============================================================================
// B1: User Profile
// =============================================================================
describe('B1: User Profile - Spec Compliance', () => {
  it('has profile actions (CRUD)', () => {
    const content = read('blocks/b1-user-profile/actions/profile-actions.ts');
    expect(content).toContain('getProfile');
    expect(content).toContain('updateProfile');
    expect(content).toContain('completeOnboarding');
    expect(content).toContain('updateOnboardingStep');
  });

  it('has account actions (email, password, export, delete)', () => {
    const content = read('blocks/b1-user-profile/actions/account-actions.ts');
    expect(content).toContain('changeEmail');
    expect(content).toContain('changePassword');
    expect(content).toContain('exportUserData');
    expect(content).toContain('deleteAccount');
  });

  it('has onboarding wizard with all steps', () => {
    expect(exists('blocks/b1-user-profile/components/onboarding-wizard.tsx')).toBe(true);
    expect(exists('blocks/b1-user-profile/components/onboarding-step-welcome.tsx')).toBe(true);
    expect(exists('blocks/b1-user-profile/components/onboarding-step-goals.tsx')).toBe(true);
    expect(exists('blocks/b1-user-profile/components/onboarding-step-schedule.tsx')).toBe(true);
    expect(exists('blocks/b1-user-profile/components/onboarding-step-style.tsx')).toBe(true);
    expect(exists('blocks/b1-user-profile/components/onboarding-step-complete.tsx')).toBe(true);
  });

  it('has theme toggle', () => {
    expect(exists('blocks/b1-user-profile/components/theme-toggle.tsx')).toBe(true);
  });

  it('has avatar upload', () => {
    expect(exists('blocks/b1-user-profile/components/avatar-upload.tsx')).toBe(true);
  });

  it('has notification preferences', () => {
    expect(exists('blocks/b1-user-profile/components/notification-prefs.tsx')).toBe(true);
  });

  it('has integration settings (webhooks)', () => {
    expect(exists('blocks/b1-user-profile/components/integration-settings.tsx')).toBe(true);
  });

  it('has profile validation schemas', () => {
    const content = read('blocks/b1-user-profile/lib/profile-validation.ts');
    expect(content).toContain('profileSchema');
    expect(content).toContain('onboardingStep1Schema');
  });

  it('has hooks: useProfile, useOnboarding', () => {
    expect(exists('blocks/b1-user-profile/hooks/use-profile.ts')).toBe(true);
    expect(exists('blocks/b1-user-profile/hooks/use-onboarding.ts')).toBe(true);
  });
});

// =============================================================================
// B2: Course Management
// =============================================================================
describe('B2: Course Management - Spec Compliance', () => {
  it('has full CRUD actions', () => {
    const content = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(content).toContain('getCourses');
    expect(content).toContain('createCourse');
    expect(content).toContain('updateCourse');
    expect(content).toContain('deleteCourse');
    expect(content).toContain('transitionStatus');
  });

  it('has bulk operations', () => {
    const content = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(content).toContain('bulkUpdateStatus');
    expect(content).toContain('bulkDeleteCourses');
  });

  it('has reorder functionality', () => {
    const content = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(content).toContain('reorderCourses');
  });

  it('has status transition validation', () => {
    const content = read('blocks/b2-course-management/lib/course-utils.ts');
    expect(content).toContain('isValidTransition');
    expect(content).toContain('VALID_TRANSITIONS');
  });

  it('has course form and card components', () => {
    expect(exists('blocks/b2-course-management/components/course-form.tsx')).toBe(true);
    expect(exists('blocks/b2-course-management/components/course-card.tsx')).toBe(true);
    expect(exists('blocks/b2-course-management/components/course-list.tsx')).toBe(true);
  });

  it('has filter and sort components', () => {
    expect(exists('blocks/b2-course-management/components/course-filters.tsx')).toBe(true);
    expect(exists('blocks/b2-course-management/components/course-sort.tsx')).toBe(true);
  });

  it('has empty state', () => {
    expect(exists('blocks/b2-course-management/components/course-empty-state.tsx')).toBe(true);
  });

  it('has validation schemas (create, update, transition, bulk)', () => {
    const content = read('blocks/b2-course-management/lib/course-validation.ts');
    expect(content).toContain('createCourseSchema');
    expect(content).toContain('updateCourseSchema');
    expect(content).toContain('statusTransitionSchema');
    expect(content).toContain('bulkActionSchema');
  });
});

// =============================================================================
// B3: Progress Tracking
// =============================================================================
describe('B3: Progress Tracking - Spec Compliance', () => {
  it('has manual session CRUD', () => {
    const content = read('blocks/b3-progress-tracking/actions/session-actions.ts');
    expect(content).toContain('createSession');
    expect(content).toContain('updateSession');
    expect(content).toContain('deleteSession');
    expect(content).toContain('fetchSessions');
  });

  it('has timer actions', () => {
    const content = read('blocks/b3-progress-tracking/actions/timer-actions.ts');
    expect(content).toContain('startTimerSession');
    expect(content).toContain('autoSaveTimerProgress');
    expect(content).toContain('finalizeTimerSession');
    expect(content).toContain('recoverTimerSession');
  });

  it('has daily stats and streak management', () => {
    const content = read('blocks/b3-progress-tracking/actions/stats-actions.ts');
    expect(content).toContain('upsertDailyStats');
    expect(content).toContain('fetchDailyStats');
    expect(content).toContain('fetchStreakData');
    expect(content).toContain('applyStreakFreeze');
    expect(content).toContain('fetchTodayStats');
  });

  it('has study timer component', () => {
    expect(exists('blocks/b3-progress-tracking/components/study-timer.tsx')).toBe(true);
    expect(exists('blocks/b3-progress-tracking/components/timer-display.tsx')).toBe(true);
    expect(exists('blocks/b3-progress-tracking/components/timer-controls.tsx')).toBe(true);
  });

  it('has streak display', () => {
    expect(exists('blocks/b3-progress-tracking/components/streak-display.tsx')).toBe(true);
    expect(exists('blocks/b3-progress-tracking/components/streak-calendar.tsx')).toBe(true);
    expect(exists('blocks/b3-progress-tracking/components/streak-freeze-button.tsx')).toBe(true);
  });

  it('has streak calculator with threshold', () => {
    const content = read('blocks/b3-progress-tracking/lib/streak-calculator.ts');
    expect(content).toContain('STREAK_THRESHOLD_MINUTES');
    expect(content).toContain('calculateStreaks');
  });

  it('session logging auto-transitions not_started -> in_progress', () => {
    const content = read('blocks/b3-progress-tracking/actions/session-actions.ts');
    expect(content).toContain("status === 'not_started'");
    expect(content).toContain("'in_progress'");
  });
});

// =============================================================================
// B4: AI Analysis
// =============================================================================
describe('B4: AI Analysis - Spec Compliance', () => {
  it('has AI pipeline (daily analysis + weekly reports)', () => {
    const content = read('blocks/b4-ai-analysis/lib/ai-pipeline.ts');
    expect(content).toContain('runDailyAnalysis');
    expect(content).toContain('generateWeeklyReports');
  });

  it('has risk calculator', () => {
    const content = read('blocks/b4-ai-analysis/lib/risk-calculator.ts');
    expect(content).toContain('calculateAdjustedRisk');
    expect(content).toContain('riskLevelFromScore');
  });

  it('has prompt builder with motivation styles', () => {
    const content = read('blocks/b4-ai-analysis/lib/prompt-builder.ts');
    expect(content).toContain('buildSystemPrompt');
    expect(content).toContain('motivationStyle');
  });

  it('has response parser with validation', () => {
    const content = read('blocks/b4-ai-analysis/lib/response-parser.ts');
    expect(content).toContain('parseCourseAnalysisResponse');
    expect(content).toContain('cleanJsonOutput');
  });

  it('has analysis actions (fetch, history, weekly, risk)', () => {
    const content = read('blocks/b4-ai-analysis/actions/analysis-actions.ts');
    expect(content).toContain('fetchLatestAnalyses');
    expect(content).toContain('fetchAnalysisHistory');
    expect(content).toContain('fetchWeeklyReport');
    expect(content).toContain('fetchRiskSummary');
  });

  it('has analysis UI components', () => {
    expect(exists('blocks/b4-ai-analysis/components/insight-card.tsx')).toBe(true);
    expect(exists('blocks/b4-ai-analysis/components/risk-score-badge.tsx')).toBe(true);
    expect(exists('blocks/b4-ai-analysis/components/weekly-report-view.tsx')).toBe(true);
    expect(exists('blocks/b4-ai-analysis/components/analysis-overview.tsx')).toBe(true);
  });
});

// =============================================================================
// B5: Dashboard
// =============================================================================
describe('B5: Dashboard - Spec Compliance', () => {
  it('has dashboard page component', () => {
    expect(exists('blocks/b5-dashboard/components/dashboard-page.tsx')).toBe(true);
  });

  it('has summary stats component', () => {
    expect(exists('blocks/b5-dashboard/components/summary-stats.tsx')).toBe(true);
  });

  it('has today\'s plan', () => {
    expect(exists('blocks/b5-dashboard/components/todays-plan.tsx')).toBe(true);
  });

  it('has course cards grid', () => {
    expect(exists('blocks/b5-dashboard/components/course-cards-grid.tsx')).toBe(true);
  });

  it('has recent activity feed', () => {
    expect(exists('blocks/b5-dashboard/components/recent-activity-feed.tsx')).toBe(true);
  });

  it('has buddy activity sidebar', () => {
    expect(exists('blocks/b5-dashboard/components/buddy-activity-sidebar.tsx')).toBe(true);
  });

  it('has empty state', () => {
    expect(exists('blocks/b5-dashboard/components/empty-state.tsx')).toBe(true);
  });

  it('has quick actions', () => {
    expect(exists('blocks/b5-dashboard/components/quick-actions.tsx')).toBe(true);
  });

  it('has dashboard hooks', () => {
    expect(exists('blocks/b5-dashboard/hooks/use-dashboard-data.ts')).toBe(true);
    expect(exists('blocks/b5-dashboard/hooks/use-summary-stats.ts')).toBe(true);
    expect(exists('blocks/b5-dashboard/hooks/use-todays-plan.ts')).toBe(true);
  });
});

// =============================================================================
// B6: Notifications
// =============================================================================
describe('B6: Notifications - Spec Compliance', () => {
  it('has notification CRUD actions', () => {
    const content = read('blocks/b6-notifications/actions/notification-actions.ts');
    expect(content).toContain('getNotifications');
    expect(content).toContain('getUnreadCount');
    expect(content).toContain('markAsRead');
    expect(content).toContain('markAllAsRead');
    expect(content).toContain('deleteNotification');
  });

  it('has reminder CRUD actions', () => {
    const content = read('blocks/b6-notifications/actions/reminder-actions.ts');
    expect(content).toContain('getReminders');
    expect(content).toContain('createReminder');
    expect(content).toContain('updateReminder');
    expect(content).toContain('toggleReminder');
    expect(content).toContain('deleteReminder');
  });

  it('has multi-channel notification sender', () => {
    const content = read('blocks/b6-notifications/lib/notification-sender.ts');
    expect(content).toContain('sendToChannels');
    expect(content).toContain('sendEmail');
    expect(content).toContain('sendSlack');
    expect(content).toContain('sendDiscord');
  });

  it('has 4 channel adapters', () => {
    expect(exists('blocks/b6-notifications/lib/channel-adapters/email-adapter.ts')).toBe(true);
    expect(exists('blocks/b6-notifications/lib/channel-adapters/slack-adapter.ts')).toBe(true);
    expect(exists('blocks/b6-notifications/lib/channel-adapters/discord-adapter.ts')).toBe(true);
    expect(exists('blocks/b6-notifications/lib/channel-adapters/push-adapter.ts')).toBe(true);
  });

  it('has reminder scheduler', () => {
    const content = read('blocks/b6-notifications/lib/reminder-scheduler.ts');
    expect(content).toContain('processReminders');
  });

  it('has notification bell and center UI', () => {
    expect(exists('blocks/b6-notifications/components/notification-bell.tsx')).toBe(true);
    expect(exists('blocks/b6-notifications/components/notification-center.tsx')).toBe(true);
    expect(exists('blocks/b6-notifications/components/notification-item.tsx')).toBe(true);
  });

  it('has 6 notification types defined', () => {
    const content = read('blocks/b6-notifications/lib/notification-validation.ts');
    expect(content).toContain('reminder');
    expect(content).toContain('risk_alert');
    expect(content).toContain('achievement');
    expect(content).toContain('buddy_update');
    expect(content).toContain('weekly_report');
    expect(content).toContain('streak_warning');
  });
});

// =============================================================================
// B7: Social / Buddy
// =============================================================================
describe('B7: Social / Buddy - Spec Compliance', () => {
  it('has buddy CRUD actions', () => {
    const content = read('blocks/b7-social/actions/buddy-actions.ts');
    expect(content).toContain('getBuddies');
    expect(content).toContain('searchUsers');
    expect(content).toContain('sendBuddyRequest');
    expect(content).toContain('acceptRequest');
    expect(content).toContain('declineRequest');
    expect(content).toContain('removeBuddy');
    expect(content).toContain('getBuddyActivity');
  });

  it('has achievement actions', () => {
    const content = read('blocks/b7-social/actions/achievement-actions.ts');
    expect(content).toContain('getAchievements');
    expect(content).toContain('checkAchievements');
    expect(content).toContain('shareAchievement');
  });

  it('has leaderboard actions', () => {
    const content = read('blocks/b7-social/actions/leaderboard-actions.ts');
    expect(content).toContain('getWeeklyLeaderboard');
  });

  it('has 15 achievement definitions', () => {
    const content = read('blocks/b7-social/lib/achievement-definitions.ts');
    expect(content).toContain('ACHIEVEMENT_DEFINITIONS');
    // Check for key achievement types
    expect(content).toContain('first_session');
    expect(content).toContain('streak_7');
    expect(content).toContain('streak_30');
    expect(content).toContain('streak_100');
    expect(content).toContain('night_owl');
    expect(content).toContain('early_bird');
    expect(content).toContain('marathon');
    expect(content).toContain('consistency_king');
    expect(content).toContain('course_complete');
    expect(content).toContain('speed_learner');
    expect(content).toContain('dedication');
    expect(content).toContain('explorer');
    expect(content).toContain('social_butterfly');
    expect(content).toContain('comeback_kid');
    expect(content).toContain('perfectionist');
  });

  it('has buddy privacy helper', () => {
    expect(exists('blocks/b7-social/lib/buddy-privacy.ts')).toBe(true);
  });

  it('has buddy UI components', () => {
    expect(exists('blocks/b7-social/components/buddy-search.tsx')).toBe(true);
    expect(exists('blocks/b7-social/components/buddy-list.tsx')).toBe(true);
    expect(exists('blocks/b7-social/components/buddy-card.tsx')).toBe(true);
    expect(exists('blocks/b7-social/components/achievement-gallery.tsx')).toBe(true);
    expect(exists('blocks/b7-social/components/leaderboard-table.tsx')).toBe(true);
  });

  it('has buddy request flow UI', () => {
    expect(exists('blocks/b7-social/components/buddy-request-card.tsx')).toBe(true);
    expect(exists('blocks/b7-social/components/buddy-request-list.tsx')).toBe(true);
    expect(exists('blocks/b7-social/components/buddy-remove-dialog.tsx')).toBe(true);
  });
});

// =============================================================================
// B8: Visualization
// =============================================================================
describe('B8: Visualization - Spec Compliance', () => {
  it('has study heatmap', () => {
    expect(exists('blocks/b8-visualization/components/study-heatmap.tsx')).toBe(true);
    expect(exists('blocks/b8-visualization/components/heatmap-day-cell.tsx')).toBe(true);
    expect(exists('blocks/b8-visualization/components/heatmap-tooltip.tsx')).toBe(true);
  });

  it('has completion forecast', () => {
    expect(exists('blocks/b8-visualization/components/completion-forecast.tsx')).toBe(true);
    const content = read('blocks/b8-visualization/lib/forecast-calculator.ts');
    expect(content).toContain('calculateForecast');
    expect(content).toContain('linearRegression');
  });

  it('has pattern detection', () => {
    const content = read('blocks/b8-visualization/lib/pattern-detector.ts');
    expect(content).toContain('detectPatterns');
  });

  it('has chart components', () => {
    expect(exists('blocks/b8-visualization/components/study-hours-bar-chart.tsx')).toBe(true);
    expect(exists('blocks/b8-visualization/components/progress-line-chart.tsx')).toBe(true);
    expect(exists('blocks/b8-visualization/components/session-distribution.tsx')).toBe(true);
    expect(exists('blocks/b8-visualization/components/risk-trend-chart.tsx')).toBe(true);
  });

  it('has export functionality', () => {
    expect(exists('blocks/b8-visualization/components/export-chart-button.tsx')).toBe(true);
    expect(exists('blocks/b8-visualization/lib/export-utils.ts')).toBe(true);
  });
});

// =============================================================================
// Route Completeness
// =============================================================================
describe('Route Completeness', () => {
  it('has all app routes', () => {
    expect(exists('app/(app)/dashboard/page.tsx')).toBe(true);
    expect(exists('app/(app)/courses/page.tsx')).toBe(true);
    expect(exists('app/(app)/courses/new/page.tsx')).toBe(true);
    expect(exists('app/(app)/courses/[id]/page.tsx')).toBe(true);
    expect(exists('app/(app)/courses/[id]/edit/page.tsx')).toBe(true);
    expect(exists('app/(app)/progress/page.tsx')).toBe(true);
    expect(exists('app/(app)/progress/log/page.tsx')).toBe(true);
    expect(exists('app/(app)/progress/timer/page.tsx')).toBe(true);
    expect(exists('app/(app)/analysis/page.tsx')).toBe(true);
    expect(exists('app/(app)/analysis/weekly/page.tsx')).toBe(true);
    expect(exists('app/(app)/notifications/page.tsx')).toBe(true);
    expect(exists('app/(app)/social/buddies/page.tsx')).toBe(true);
    expect(exists('app/(app)/social/achievements/page.tsx')).toBe(true);
    expect(exists('app/(app)/social/leaderboard/page.tsx')).toBe(true);
    expect(exists('app/(app)/visualizations/page.tsx')).toBe(true);
    expect(exists('app/(app)/settings/profile/page.tsx')).toBe(true);
    expect(exists('app/(app)/settings/notifications/page.tsx')).toBe(true);
    expect(exists('app/(app)/settings/integrations/page.tsx')).toBe(true);
    expect(exists('app/(app)/settings/account/page.tsx')).toBe(true);
  });

  it('has auth routes', () => {
    expect(exists('app/(auth)/login/page.tsx')).toBe(true);
    expect(exists('app/(auth)/signup/page.tsx')).toBe(true);
  });

  it('has all 4 cron routes', () => {
    expect(exists('app/api/cron/daily-analysis/route.ts')).toBe(true);
    expect(exists('app/api/cron/weekly-report/route.ts')).toBe(true);
    expect(exists('app/api/cron/send-reminders/route.ts')).toBe(true);
    expect(exists('app/api/cron/daily-stats/route.ts')).toBe(true);
  });
});
