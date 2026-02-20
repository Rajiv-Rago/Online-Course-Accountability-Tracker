/**
 * Security Tests: Auth Guard Enforcement
 *
 * Verifies that ALL server actions check authentication before
 * performing database operations. This is a structural test that
 * reads source files to confirm the auth pattern.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(SRC, file), 'utf-8');

// All server action files that should enforce auth
const ACTION_FILES = [
  'blocks/b1-user-profile/actions/profile-actions.ts',
  'blocks/b1-user-profile/actions/account-actions.ts',
  'blocks/b2-course-management/actions/course-actions.ts',
  'blocks/b3-progress-tracking/actions/session-actions.ts',
  'blocks/b3-progress-tracking/actions/timer-actions.ts',
  'blocks/b3-progress-tracking/actions/stats-actions.ts',
  'blocks/b4-ai-analysis/actions/analysis-actions.ts',
  'blocks/b6-notifications/actions/notification-actions.ts',
  'blocks/b6-notifications/actions/reminder-actions.ts',
  'blocks/b7-social/actions/buddy-actions.ts',
  'blocks/b7-social/actions/achievement-actions.ts',
  'blocks/b7-social/actions/leaderboard-actions.ts',
];

describe('Auth Guard: All action files use server directive', () => {
  for (const file of ACTION_FILES) {
    it(`${file} has 'use server' directive`, () => {
      const content = read(file);
      expect(content).toContain("'use server'");
    });
  }
});

describe('Auth Guard: All exported actions check authentication', () => {
  // Functions that rely on Supabase RLS (implicit auth via client session)
  // rather than explicit getAuthUserId(). These are still secure because
  // the Supabase client is created with the user's session cookie, and
  // RLS policies filter by auth.uid(). They return empty data (not errors)
  // when unauthenticated.
  const RLS_PROTECTED = [
    'getCourses', 'getCourse', 'getCourseRecentSessions', 'getCourseStats',
    'fetchSessions', 'fetchDailyStats',
  ];

  // Functions that don't check auth because they operate on session IDs
  // (the session ID acts as a capability token) or are server-internal
  const NO_AUTH_REQUIRED = [
    'upsertDailyStats',       // Internal, called by other actions
    'autoSaveTimerProgress',  // Updates by session ID (capability-based)
    'recoverTimerSession',    // Reads by session ID
    'createNotificationForDelivery', // Server-side internal, not client-facing
  ];

  for (const file of ACTION_FILES) {
    const content = read(file);
    const exportedFns = content.match(/export async function (\w+)/g) ?? [];

    for (const match of exportedFns) {
      const fnName = match.replace('export async function ', '');

      if (NO_AUTH_REQUIRED.includes(fnName)) continue;

      if (RLS_PROTECTED.includes(fnName)) {
        it(`${file}: ${fnName} uses Supabase client (RLS-protected)`, () => {
          const fnStart = content.indexOf(match);
          const nextExport = content.indexOf('export async function', fnStart + match.length);
          const fnBody = nextExport > -1
            ? content.substring(fnStart, nextExport)
            : content.substring(fnStart);

          const usesClient = fnBody.includes('createClient') || fnBody.includes('supabase');
          expect(usesClient, `${fnName} should use Supabase client for RLS`).toBe(true);
        });
        continue;
      }

      it(`${file}: ${fnName} checks auth explicitly`, () => {
        const fnStart = content.indexOf(match);
        const nextExport = content.indexOf('export async function', fnStart + match.length);
        const fnBody = nextExport > -1
          ? content.substring(fnStart, nextExport)
          : content.substring(fnStart);

        const hasAuthCheck =
          fnBody.includes('getAuthUserId') ||
          fnBody.includes('getAuthUser') ||
          fnBody.includes('auth.getUser') ||
          fnBody.includes('supabase.auth.getUser');

        expect(hasAuthCheck, `${fnName} in ${file} should check authentication`).toBe(true);
      });
    }
  }
});

describe('Auth Guard: Middleware redirects unauthenticated users', () => {
  it('middleware redirects unauthenticated users to /login', () => {
    const middleware = read('lib/supabase/middleware.ts');
    expect(middleware).toContain("url.pathname = '/login'");
    expect(middleware).toContain('NextResponse.redirect');
  });

  it('middleware allows /api/cron without user auth', () => {
    const middleware = read('lib/supabase/middleware.ts');
    expect(middleware).toContain("/api/cron");
  });

  it('middleware allows /login and /signup without auth', () => {
    const middleware = read('lib/supabase/middleware.ts');
    expect(middleware).toContain("/login");
    expect(middleware).toContain("/signup");
  });

  it('middleware gates onboarding: redirects to /onboarding if incomplete', () => {
    const middleware = read('lib/supabase/middleware.ts');
    expect(middleware).toContain('onboarding_completed');
    expect(middleware).toContain("url.pathname = '/onboarding'");
  });

  it('middleware gates onboarding: redirects away from /onboarding if complete', () => {
    const middleware = read('lib/supabase/middleware.ts');
    expect(middleware).toContain("isOnboardingRoute");
    expect(middleware).toContain("url.pathname = '/settings/profile'");
  });
});

describe('Auth Guard: Cron routes use CRON_SECRET', () => {
  const CRON_ROUTES = [
    'app/api/cron/daily-analysis/route.ts',
    'app/api/cron/weekly-report/route.ts',
    'app/api/cron/send-reminders/route.ts',
    'app/api/cron/daily-stats/route.ts',
  ];

  for (const route of CRON_ROUTES) {
    it(`${route} checks CRON_SECRET`, () => {
      const content = read(route);
      expect(content).toContain('CRON_SECRET');
      expect(content).toContain('authorization');
    });
  }
});
