# Integration Phase Guide

This document guides the integration phase after all 8 blocks (B1-B8) are independently developed and individually tested. Integration is the process of wiring cross-block concerns that could not be handled during parallel development.

---

## Table of Contents

1. [Integration Overview](#1-integration-overview)
2. [Pre-Integration Checklist](#2-pre-integration-checklist)
3. [Cross-Block Wiring Tasks](#3-cross-block-wiring-tasks)
4. [E2E Test Scenarios](#4-e2e-test-scenarios)
5. [Integration Testing Approach](#5-integration-testing-approach)
6. [Post-Integration Checklist](#6-post-integration-checklist)

---

## 1. Integration Overview

### What Integration Means

During parallel development, each block (B1-B8) is built in isolation with its own routes, components, server actions, and database queries. Blocks communicate only through the shared database schema and shared TypeScript types -- never through direct code imports across block boundaries.

Integration is the phase where we:

- Wire the **dashboard (B5)** to pull real data from every other block instead of mock/placeholder data.
- Connect **achievement triggers (B7)** so that actions in B2 and B3 cause achievement criteria to be evaluated.
- Connect **notification triggers (B6)** so that events in B4 and B7 insert notifications that B6 delivers.
- Verify the **AI analysis pipeline (B4)** reads real study session and course data from B3 and B2.
- Verify **visualizations (B8)** render correctly with real data from B3, B4, and B2.
- Wire the **navigation and layout** so sidebar links, notification bell, and user avatar connect to the correct block routes and components.
- Wire the **onboarding flow (B1)** so new users are routed through onboarding before reaching the dashboard.

### Expected Timeline

Integration begins only after all 8 blocks pass their individual test suites. Expect 2-4 days of integration work depending on the number of edge cases discovered.

### Who Does It

One developer reviews and connects all blocks. This person should have familiarity with every block's data model and API surface. A second developer reviews the integration PR.

---

## 2. Pre-Integration Checklist

Complete every item before starting integration work:

- [ ] All 8 blocks pass their individual unit and component tests
- [ ] All blocks use the shared types from `src/types/` consistently (no local type overrides)
- [ ] No cross-block code imports exist (blocks only share through DB and types)
- [ ] Each block's routes render without errors in isolation
- [ ] Database migrations are applied and seed data loads without errors
- [ ] Authentication flow works end-to-end (sign up, sign in, sign out, OAuth)
- [ ] All server actions return the expected shapes defined in the API contracts
- [ ] No TypeScript compiler errors (`npx tsc --noEmit` passes cleanly)
- [ ] Linting passes across all blocks (`npm run lint` exits with 0)

---

## 3. Cross-Block Wiring Tasks

### 3.1 Dashboard Composition (B5)

The dashboard is the central hub. It reads data from nearly every other block.

**Data sources to wire:**

| Dashboard Section          | Source Block | Data                                        |
| -------------------------- | ------------ | ------------------------------------------- |
| Active courses list        | B2           | Courses with status `in_progress`           |
| Today's stats              | B3           | `daily_stats` for current date              |
| Current streak             | B3           | Streak count from `daily_stats`             |
| Recent study sessions      | B3           | Last 5 study sessions                       |
| Risk indicators on courses | B4           | Latest `ai_analyses` per course             |
| Weekly report banner       | B4           | Most recent `weekly_reports` entry           |
| Unread notification count  | B6           | Count of `notifications` where `read = false` |
| Recent achievements        | B7           | Latest unlocked `user_achievements`         |
| Buddy activity summary     | B7           | Active buddy pairs and recent activity      |

**Steps:**

1. Replace any mock data in B5 dashboard components with real Supabase queries.
2. Ensure each data-fetching function handles the empty state (new user with no data).
3. Ensure each data-fetching function handles partial states (user has courses but no sessions yet).
4. Ensure each data-fetching function handles full states (user with 30+ days of activity).
5. Verify loading states render correctly (Suspense boundaries, skeleton loaders).
6. Verify error boundaries catch and display errors gracefully if a query fails.

**Testing:**

- Render dashboard with an empty database (new user).
- Render dashboard with seed data covering all sections.
- Simulate a slow or failed Supabase query and verify the error boundary activates.

---

### 3.2 Achievement Triggers (B7 -> B3, B2)

Achievements are evaluated when specific actions occur. The triggering blocks (B3, B2) do not import B7 code. Instead, they call achievement-checking functions that run DB queries against the `achievements` and `user_achievements` tables.

**Trigger points:**

| Trigger Event                    | Source Block | Achievement Categories to Check         |
| -------------------------------- | ------------ | --------------------------------------- |
| Study session logged             | B3           | Session milestones, streak milestones   |
| Daily stats updated              | B3           | Consistency achievements, hour goals    |
| Course status changed            | B2           | Course completion achievements          |
| Buddy request accepted           | B7           | Social achievements                     |
| Buddy count changes              | B7           | Social milestones                       |

**Implementation approach:**

1. Create a shared achievement-checking utility at `src/lib/achievements.ts` (or verify it already exists).
2. This utility performs DB queries only -- it does not import any block-specific code.
3. In B3's `logStudySession` server action, add a call to check session-based achievements after the session is saved.
4. In B3's `updateDailyStats` logic, add a call to check streak and consistency achievements.
5. In B2's `updateCourseStatus` server action, add a call to check completion achievements when status becomes `completed`.
6. In B7's buddy acceptance logic, add a call to check social achievements.

**Testing:**

- Log a first study session and verify the "First Steps" achievement unlocks.
- Complete a 7-day streak and verify the streak achievement unlocks.
- Complete a course and verify the "Graduate" achievement unlocks.
- Accept a buddy request and verify the social achievement unlocks.
- Verify that already-earned achievements are not duplicated.

---

### 3.3 Notification Triggers (B6 -> B4, B7)

Notifications are created by inserting rows into the `notifications` table. B6 is responsible for delivering them (in-app, email, push). Other blocks create notifications by writing to the table directly.

**Notification sources:**

| Event                        | Source Block | Notification Type   | Delivery             |
| ---------------------------- | ------------ | ------------------- | -------------------- |
| AI risk alert generated      | B4           | `risk_alert`        | In-app + email       |
| Weekly report ready          | B4           | `weekly_report`     | In-app               |
| Achievement earned           | B7           | `achievement`       | In-app               |
| Buddy request received       | B7           | `buddy_request`     | In-app + email       |
| Buddy request accepted       | B7           | `buddy_accepted`    | In-app               |
| Study reminder (cron)        | B6           | `reminder`          | In-app + push + email|

**Implementation approach:**

1. B4's daily analysis cron: after computing a risk score >= threshold, insert a `risk_alert` notification for the user.
2. B4's weekly report cron: after generating a weekly report, insert a `weekly_report` notification.
3. B7's achievement logic: after unlocking an achievement, insert an `achievement` notification.
4. B7's buddy request logic: after creating a buddy request, insert a `buddy_request` notification for the recipient.
5. B7's buddy acceptance logic: after accepting, insert a `buddy_accepted` notification for the requester.
6. B6's reminder cron: queries users who should be reminded and inserts `reminder` notifications.
7. B6's delivery system (realtime subscription + cron) picks up undelivered notifications and delivers through the appropriate channels.

**Testing:**

- Trigger a risk alert and verify the notification appears in the bell dropdown.
- Earn an achievement and verify the notification appears.
- Send a buddy request and verify the recipient sees a notification.
- Verify email delivery for notification types that include email.

---

### 3.4 AI Analysis Data Pipeline (B4 -> B3, B2)

B4 reads study session data and course data to produce AI-powered analyses and risk scores.

**Data flow:**

```
B3 (study_sessions, daily_stats) ──┐
                                    ├──> B4 (AI Analysis) ──> ai_analyses, weekly_reports
B2 (courses, course_modules)  ─────┘
```

**Verification steps:**

1. Confirm B4's analysis queries correctly join `study_sessions` with `courses` using `course_id`.
2. Confirm B4 reads `daily_stats` for the trailing 7/14/30-day windows.
3. Confirm B4 reads `courses` to understand target hours and deadlines.
4. Test with realistic data volumes:
   - User with 30+ days of daily sessions across 3 courses.
   - User with sporadic sessions (gaps of 2-3 days).
   - User with no sessions in the last 7 days (should produce high risk score).
5. Verify the GPT-4 prompt includes the correct data context.
6. Verify risk scores are stored in `ai_analyses` and are queryable by B5 and B8.
7. Verify weekly reports summarize the correct date range (Monday to Sunday).

**Testing:**

- Run the daily analysis cron with seed data and verify `ai_analyses` rows are created.
- Run the weekly report cron and verify `weekly_reports` rows are created.
- Verify risk scores make sense: a user who studied consistently should have a low risk score; a user who skipped 5 days should have a high risk score.

---

### 3.5 Visualization Data (B8 -> B3, B4, B2)

B8 renders 6 chart types using data from multiple blocks.

**Chart data sources:**

| Chart Type              | Source Block | Data                                       |
| ----------------------- | ------------ | ------------------------------------------ |
| Study heatmap           | B3           | `daily_stats` (date, minutes studied)      |
| Daily/weekly hours      | B3           | `study_sessions` aggregated by day/week    |
| Subject distribution    | B3 + B2      | `study_sessions` joined with `courses`     |
| Progress per course     | B2           | `courses` (progress percentage)            |
| Risk trend over time    | B4           | `ai_analyses` (risk_score over dates)      |
| Forecast / projection   | B4 + B2      | `ai_analyses` projections + course targets |

**Verification steps:**

1. Render each chart with real data and verify axes, labels, and data points are correct.
2. Test edge cases for each chart:
   - **No data**: chart shows an empty state message, not a crash.
   - **Single data point**: chart renders without errors (line charts show a dot, bar charts show one bar).
   - **Large dataset** (365 days): chart remains performant and readable.
   - **Missing days**: heatmap and line charts handle gaps correctly.
3. Verify color coding matches the design system (risk levels, course colors).
4. Verify tooltips show correct values on hover.
5. Verify responsive behavior on mobile viewports.

---

### 3.6 Navigation & Layout

The app shell (sidebar, header, mobile menu) connects all block routes together.

**Wiring tasks:**

1. **Sidebar links**: Wire every sidebar item to the correct route:
   - Dashboard: `/dashboard` (B5)
   - Courses: `/courses` (B2)
   - Study Timer: `/timer` (B3)
   - Study Log: `/log` (B3)
   - Analysis: `/analysis` (B4)
   - Achievements: `/achievements` (B7)
   - Buddies: `/buddies` (B7)
   - Visualizations: `/visualizations` (B8)
   - Settings: `/settings` (B1)

2. **Active route highlighting**: Verify the current route is visually highlighted in the sidebar using `usePathname()`.

3. **Mobile responsive menu**: Test the hamburger menu on viewports < 768px. Ensure the sidebar slides in/out and links navigate correctly.

4. **Notification bell (header)**: Wire the bell icon to B6's notification dropdown component. Show the unread count badge. Clicking the bell opens the notification list.

5. **User avatar (header)**: Wire the avatar dropdown to B1's profile/settings. Include sign-out action.

6. **Breadcrumbs** (if applicable): Verify breadcrumb trails update correctly when navigating between blocks.

**Testing:**

- Click every sidebar link and verify the correct page renders.
- Verify active state updates on each navigation.
- Resize to mobile and verify the hamburger menu works.
- Click the notification bell and verify the dropdown shows real notifications.
- Click the user avatar and verify profile/sign-out options work.

---

### 3.7 Onboarding Flow (B1 -> Dashboard)

New users must complete onboarding before accessing the dashboard.

**Flow:**

```
Sign Up ──> Check onboarding_completed ──> false ──> /onboarding (5-step wizard)
                                          ──> true  ──> /dashboard
```

**Wiring tasks:**

1. In the root layout or middleware, check if the authenticated user has `onboarding_completed = true` in their profile.
2. If not, redirect to `/onboarding`.
3. The onboarding wizard (B1) walks through 5 steps:
   - Step 1: Welcome and profile basics (name, timezone)
   - Step 2: Add first course (uses B2 course creation logic)
   - Step 3: Set study goals (daily hour targets)
   - Step 4: Configure notifications (B6 preferences)
   - Step 5: Optional buddy invitation (B7 invite link)
4. On completion, set `onboarding_completed = true` and redirect to `/dashboard`.
5. The dashboard (B5) should show a contextual welcome state for new users.

**Testing:**

- Create a new account and verify redirect to `/onboarding`.
- Complete all 5 steps and verify redirect to `/dashboard`.
- Sign out and sign back in -- verify redirect goes straight to `/dashboard` (not onboarding again).
- Test abandoning onboarding midway: user should return to the step they left off.

---

## 4. E2E Test Scenarios

These scenarios validate complete user workflows that span multiple blocks.

### Scenario 1: New User Journey

| Step | Action                                  | Expected Result                                           | Blocks Involved |
| ---- | --------------------------------------- | --------------------------------------------------------- | --------------- |
| 1    | User signs up with email                | Account created, redirected to `/onboarding`              | B1              |
| 2    | Completes onboarding wizard (5 steps)   | Profile updated, `onboarding_completed = true`            | B1, B2, B6, B7  |
| 3    | Redirected to dashboard                 | Dashboard loads with empty/welcome state                  | B5              |
| 4    | Adds first course                       | Course appears in courses list and dashboard              | B2, B5          |
| 5    | Logs first study session (30 min)       | Session saved, `daily_stats` row created                  | B3              |
| 6    | Returns to dashboard                    | Stats show 30 min today, 1 session, streak = 1           | B5, B3          |
| 7    | Achievement "First Steps" unlocked      | `user_achievements` row created                           | B7              |
| 8    | Achievement notification appears        | Notification in bell dropdown                             | B6, B7          |

### Scenario 2: Daily Study Flow

| Step | Action                                  | Expected Result                                           | Blocks Involved |
| ---- | --------------------------------------- | --------------------------------------------------------- | --------------- |
| 1    | User opens dashboard                    | Sees today's planned study, active courses, current streak| B5, B3, B2      |
| 2    | Clicks "Start Timer" on a course        | Timer page loads with course context                      | B3              |
| 3    | Studies for 30 minutes, clicks stop     | Timer stops, session preview shown                        | B3              |
| 4    | Confirms session save                   | `study_sessions` row created, `daily_stats` updated       | B3              |
| 5    | Navigates back to dashboard             | Dashboard shows updated stats (new session, new total)    | B5, B3          |
| 6    | Streak counter reflects today's study   | Streak incremented if this is a new day of study          | B3, B5          |

### Scenario 3: Risk Detection & Intervention

| Step | Action                                  | Expected Result                                           | Blocks Involved |
| ---- | --------------------------------------- | --------------------------------------------------------- | --------------- |
| 1    | User hasn't studied for 3 days          | No new `study_sessions` rows for 3 days                   | --              |
| 2    | Daily cron runs at 2 AM                 | `POST /api/cron/daily-analysis` executes                  | B4              |
| 3    | AI analysis detects inactivity          | Risk score set to "high" in `ai_analyses`                 | B4              |
| 4    | Risk alert notification created         | Row inserted into `notifications` with type `risk_alert`  | B4, B6          |
| 5    | User opens app, sees notification bell  | Bell shows unread count, dropdown shows risk alert        | B6              |
| 6    | Dashboard shows risk indicator          | Course card displays risk badge (yellow/red)              | B5, B4          |
| 7    | User visits analysis page               | Sees risk details and AI-generated intervention tips      | B4              |

### Scenario 4: Weekly Report

| Step | Action                                  | Expected Result                                           | Blocks Involved |
| ---- | --------------------------------------- | --------------------------------------------------------- | --------------- |
| 1    | Monday 3 AM cron fires                  | `POST /api/cron/weekly-report` executes                   | B4              |
| 2    | Weekly report generated via GPT-4       | Row inserted into `weekly_reports`                        | B4              |
| 3    | Notification created                    | `weekly_report` notification inserted                     | B4, B6          |
| 4    | User opens dashboard                    | Banner or card shows "Weekly report ready"                | B5              |
| 5    | User clicks to view full report         | Report page shows summary, comparisons, recommendations  | B4              |
| 6    | Report includes week-over-week comparison | Hours, sessions, streak compared to previous week       | B4, B3          |

### Scenario 5: Buddy System

| Step | Action                                  | Expected Result                                           | Blocks Involved |
| ---- | --------------------------------------- | --------------------------------------------------------- | --------------- |
| 1    | User A sends buddy request to User B    | `buddy_pairs` row created with status `pending`           | B7              |
| 2    | User B receives notification            | `buddy_request` notification appears in B's bell          | B6, B7          |
| 3    | User B accepts the request              | `buddy_pairs` status updated to `active`                  | B7              |
| 4    | User A receives acceptance notification | `buddy_accepted` notification appears in A's bell         | B6, B7          |
| 5    | Both users see each other in buddy list | Buddy list component shows the pair                       | B7              |
| 6    | Leaderboard includes both users         | Leaderboard ranks both by study hours/streaks             | B7              |
| 7    | Buddy activity respects privacy         | Only shared data (hours, streak) visible, not session notes| B7             |

### Scenario 6: Course Completion

| Step | Action                                  | Expected Result                                           | Blocks Involved |
| ---- | --------------------------------------- | --------------------------------------------------------- | --------------- |
| 1    | User marks final module as complete     | Module status updated in `course_modules`                 | B2              |
| 2    | Course progress reaches 100%            | Course status transitions to `completed`                  | B2              |
| 3    | "Graduate" achievement earned           | `user_achievements` row created for completion achievement | B7, B2          |
| 4    | Achievement notification created        | `achievement` notification inserted                       | B6, B7          |
| 5    | Dashboard updates                       | Completed course moves to "completed" section             | B5, B2          |
| 6    | Visualizations update                   | Progress chart shows 100%, distribution chart adjusts     | B8, B2          |

---

## 5. Integration Testing Approach

### Framework

Use **Playwright** for end-to-end testing. Playwright provides cross-browser testing, network interception, and reliable async waiting.

### Test Environment Setup

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install
```

### Database Seeding

Create a seed script that populates the test database with predictable data:

```bash
# Reset and seed the test database before each test suite
npm run db:reset && npm run db:seed
```

The seed script should create:
- 3 test users (new user, active user, inactive user)
- 5 courses across users (varying statuses)
- 30 days of study sessions for the active user
- Study sessions with gaps for the inactive user
- Pre-existing achievements for the active user
- Buddy pair between two users
- Unread notifications for each user

### Test Organization

```
tests/
  e2e/
    new-user-journey.spec.ts      # Scenario 1
    daily-study-flow.spec.ts      # Scenario 2
    risk-detection.spec.ts        # Scenario 3
    weekly-report.spec.ts         # Scenario 4
    buddy-system.spec.ts          # Scenario 5
    course-completion.spec.ts     # Scenario 6
  integration/
    dashboard-data.spec.ts        # B5 reads from all blocks
    achievement-triggers.spec.ts  # B7 triggers from B3, B2
    notification-flow.spec.ts     # B6 receives from B4, B7
    ai-pipeline.spec.ts           # B4 reads from B3, B2
    visualization-data.spec.ts    # B8 reads from B3, B4, B2
```

### Error Handling Tests

Test degraded states where external dependencies fail:

| Scenario                        | Expected Behavior                                            |
| ------------------------------- | ------------------------------------------------------------ |
| OpenAI API is down              | Analysis page shows "temporarily unavailable" message        |
| OpenAI API returns slowly (>10s)| Request times out, user sees retry option                    |
| Supabase is slow (>5s)          | Loading states render, no blank screens                      |
| Supabase is unreachable         | Error boundary shows "connection error" with retry button    |
| Invalid session token            | User is redirected to sign-in page                           |
| Rate limit hit on AI endpoint   | Graceful error message, queued for retry on next cron run    |

### Running Tests

```bash
# Run all E2E tests
npx playwright test tests/e2e/

# Run all integration tests
npx playwright test tests/integration/

# Run a specific scenario
npx playwright test tests/e2e/new-user-journey.spec.ts

# Run with UI mode for debugging
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed
```

---

## 6. Post-Integration Checklist

Complete every item before considering integration done:

### Functional

- [ ] All 6 E2E scenarios pass in Playwright
- [ ] Dashboard shows real data from all source blocks (B2, B3, B4, B6, B7)
- [ ] Notifications flow end-to-end: event -> notification row -> bell dropdown -> delivery
- [ ] Achievements trigger correctly from study sessions, course completion, and buddy actions
- [ ] AI analysis produces reasonable risk scores with real data
- [ ] Weekly reports generate and are accessible from dashboard and analysis page
- [ ] All 6 visualization chart types render correctly with real data
- [ ] Onboarding flow works for new users and does not re-trigger for existing users

### Navigation & Layout

- [ ] All sidebar links navigate to the correct routes
- [ ] Active route highlighting works on every page
- [ ] Mobile responsive sidebar/hamburger menu works on viewports < 768px
- [ ] Notification bell shows correct unread count and opens dropdown
- [ ] User avatar dropdown shows profile link and sign-out action

### Performance

- [ ] Dashboard initial load < 2 seconds (measured with Lighthouse)
- [ ] Page transitions < 500ms (measured with Playwright timing)
- [ ] No layout shifts during data loading (CLS < 0.1)
- [ ] Chart rendering < 1 second even with 365 days of data

### Quality

- [ ] No console errors or warnings in browser dev tools
- [ ] No unhandled promise rejections in server logs
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] ESLint passes with zero warnings (`npm run lint`)
- [ ] Accessibility audit passes (Lighthouse accessibility score >= 90)
- [ ] All images have alt text, all interactive elements are keyboard accessible
- [ ] Color contrast meets WCAG AA standards

### Security

- [ ] RLS policies prevent users from accessing other users' data
- [ ] Service role key is never exposed to the client
- [ ] CRON_SECRET is validated on all cron endpoints
- [ ] OAuth redirect URLs are restricted to the production domain
- [ ] No sensitive data in client-side JavaScript bundles
