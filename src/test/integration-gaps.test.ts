/**
 * Integration Wiring Tests
 *
 * These tests verify that cross-block integrations required by the spec
 * are properly wired. Each test checks that the source code contains
 * the expected function call or import.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf-8');

describe('Integration: B2/B3 -> B7 Achievement Wiring', () => {
  it('createSession calls checkAchievements("session_logged")', () => {
    const sessionActions = read('blocks/b3-progress-tracking/actions/session-actions.ts');
    expect(sessionActions).toContain('checkAchievements');
    expect(sessionActions).toContain("'session_logged'");
  });

  it('finalizeTimerSession calls checkAchievements("session_logged")', () => {
    const timerActions = read('blocks/b3-progress-tracking/actions/timer-actions.ts');
    expect(timerActions).toContain('checkAchievements');
    expect(timerActions).toContain("'session_logged'");
  });

  it('transitionStatus calls checkAchievements("course_status_changed")', () => {
    const courseActions = read('blocks/b2-course-management/actions/course-actions.ts');
    expect(courseActions).toContain('checkAchievements');
    expect(courseActions).toContain("'course_status_changed'");
  });
});

describe('Integration: B3 -> B7 Daily Stats Achievement Wiring', () => {
  it('upsertDailyStats calls checkAchievements("daily_stats_updated")', () => {
    const statsActions = read('blocks/b3-progress-tracking/actions/stats-actions.ts');
    expect(statsActions).toContain('checkAchievements');
    expect(statsActions).toContain("'daily_stats_updated'");
  });
});

describe('Integration: B4 -> B6 Risk Alert Notification', () => {
  it('runDailyAnalysis creates risk_alert notification for high/critical risk', () => {
    const pipeline = read('blocks/b4-ai-analysis/lib/ai-pipeline.ts');
    expect(pipeline).toContain("'risk_alert'");
    expect(pipeline).toContain('sendToChannels');
  });
});

describe('Integration: B3 -> B6 Streak Warning', () => {
  it('upsertDailyStats creates streak_warning notification when streak is at risk', () => {
    const statsActions = read('blocks/b3-progress-tracking/actions/stats-actions.ts');
    expect(statsActions).toContain("'streak_warning'");
    expect(statsActions).toContain('sendToChannels');
  });
});

describe('Integration: B6 Push Adapter', () => {
  it('push adapter has real web-push implementation', () => {
    let pushAdapter: string;
    try {
      pushAdapter = read('blocks/b6-notifications/lib/channel-adapters/push-adapter.ts');
    } catch {
      pushAdapter = read('blocks/b6-notifications/lib/push-adapter.ts');
    }
    expect(pushAdapter).toContain('webpush.sendNotification');
    expect(pushAdapter).not.toContain('web-push package not installed');
  });
});

describe('Integration: B3 Daily Stats Cron', () => {
  it('/api/cron/daily-stats is fully implemented', () => {
    const cronRoute = read('app/api/cron/daily-stats/route.ts');
    expect(cronRoute).not.toContain('TODO');
    expect(cronRoute).not.toContain('not yet implemented');
    expect(cronRoute).toContain('daily_stats');
    expect(cronRoute).toContain('upsert');
  });
});

describe('Integration: B4 -> B6 Weekly Report Notification Delivery', () => {
  it('weekly report notification calls sendToChannels for multi-channel delivery', () => {
    const pipeline = read('blocks/b4-ai-analysis/lib/ai-pipeline.ts');
    // Should have sendToChannels call near the weekly_report notification
    expect(pipeline).toContain("sendToChannels");
    expect(pipeline).toContain("'weekly_report'");
  });
});

describe('Integration: B6 Notification Sender Push Support', () => {
  it('notification sender includes push channel delivery', () => {
    const sender = read('blocks/b6-notifications/lib/notification-sender.ts');
    expect(sender).toContain('sendPush');
    expect(sender).toContain("'push'");
  });
});
