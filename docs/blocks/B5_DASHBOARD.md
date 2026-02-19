# Block B5 -- Dashboard

> **Block ID:** B5
> **Block Name:** `b5-dashboard`
> **Owner:** Read-only aggregation block
> **Last Updated:** 2026-02-19

---

## Table of Contents

1. [Overview](#overview)
2. [Table Dependencies](#table-dependencies)
3. [Routes](#routes)
4. [File Structure](#file-structure)
5. [Component Specifications](#component-specifications)
6. [Hooks](#hooks)
7. [Server Actions](#server-actions)
8. [Utility Library](#utility-library)
9. [Dashboard Layout](#dashboard-layout)
10. [Component Tree](#component-tree)
11. [Data Loading Strategy](#data-loading-strategy)
12. [Activity Feed Construction](#activity-feed-construction)
13. [State Management](#state-management)
14. [TypeScript Interfaces](#typescript-interfaces)
15. [Supabase Queries](#supabase-queries)
16. [Edge Cases & Empty States](#edge-cases--empty-states)
17. [Accessibility](#accessibility)
18. [Performance Considerations](#performance-considerations)
19. [Testing Plan](#testing-plan)
20. [Do Not Touch Boundaries](#do-not-touch-boundaries)

---

## Overview

The Dashboard block is the **default authenticated landing page** for the application. It provides a consolidated, read-only view of the user's entire learning journey by pulling data from all tables in the system. It displays summary statistics, today's AI-recommended study plan, active course cards with progress indicators, the latest weekly report, quick-action navigation buttons, a merged activity feed, notification previews, and buddy activity.

The Dashboard **never writes data**. All mutations (starting a timer, logging a session, adding a course) are handled by navigating to the owning block's routes.

---

## Table Dependencies

| Relationship | Table | What B5 Reads |
|---|---|---|
| **Owns** | _(none)_ | This block owns no tables. It is strictly read-only. |
| **Reads** | `user_profiles` | `full_name`, `avatar_url`, `timezone`, `daily_study_goal_minutes`, `preferred_study_days`, `streak_freeze_count` |
| **Reads** | `courses` | All active/in-progress courses: `title`, `platform`, `completed_modules`, `total_modules`, `completed_hours`, `total_hours`, `target_completion_date`, `priority`, `status`, `sort_order` |
| **Reads** | `study_sessions` | Recent sessions for activity feed, today's session count/duration |
| **Reads** | `daily_stats` | Current streak calculation (consecutive `streak_day = true`), today's stats, this week's totals |
| **Reads** | `ai_analyses` | Latest per-course risk scores/levels, today's plan recommendations |
| **Reads** | `weekly_reports` | Most recent weekly report: `ai_summary`, `total_minutes`, `total_sessions`, `compared_to_previous`, `highlights` |
| **Reads** | `notifications` | Unread count for bell badge, 3 most recent for preview drawer |
| **Reads** | `achievements` | Recently earned achievements for feed + toast, total count |
| **Reads** | `study_buddies` | Accepted buddies and their recent activity (via joined queries on buddy's `study_sessions`) |

---

## Routes

| Route | Page Component | Auth Required | Description |
|---|---|---|---|
| `/dashboard` | `DashboardPage` | Yes | Main dashboard. This is the default redirect target after login. |

The `/dashboard` route is defined in:
```
src/app/(authenticated)/dashboard/page.tsx
```

This page file is a thin server component that imports and renders `DashboardPage` from the block:
```tsx
import { DashboardPage } from '@/blocks/b5-dashboard/components/dashboard-page';

export default function Page() {
  return <DashboardPage />;
}
```

---

## File Structure

```
src/blocks/b5-dashboard/
  components/
    dashboard-page.tsx            # Main dashboard layout (server component, fetches initial data)
    todays-plan.tsx               # AI-recommended study plan for today
    plan-course-item.tsx          # Single course row inside today's plan
    course-cards-grid.tsx         # Grid wrapper for all active course cards
    dashboard-course-card.tsx     # Compact course card with progress, risk, deadline
    summary-stats.tsx             # Horizontal stats bar (streak, hours, courses, progress)
    stat-card.tsx                 # Individual stat card with icon, value, label, and trend arrow
    weekly-report-banner.tsx      # Expandable/collapsible weekly report summary
    quick-actions.tsx             # Row of quick action navigation buttons
    recent-activity-feed.tsx      # Chronological activity timeline
    activity-item.tsx             # Single activity row (icon, description, timestamp)
    notification-preview.tsx      # Bell icon with unread badge + mini dropdown of recent 3
    buddy-activity-sidebar.tsx    # Sidebar widget showing buddy study activity
    achievement-toast.tsx         # Toast notification for newly earned achievements
    empty-state.tsx               # Full empty state shown when user has no courses
  hooks/
    use-dashboard-data.ts         # Parallel client-side refetch of all dashboard data
    use-todays-plan.ts            # Fetch/compute AI-generated today's plan
    use-summary-stats.ts          # Derive summary statistics from raw data
    use-recent-activity.ts        # Merge + sort activity events from multiple sources
  actions/
    dashboard-actions.ts          # Server actions for all dashboard data fetching
  lib/
    dashboard-utils.ts            # Pure functions: activity feed construction, stat calculations, formatting
```

---

## Component Specifications

### `dashboard-page.tsx`

**Type:** Server Component (with client component children)

**Responsibilities:**
- Fetch all initial dashboard data server-side using `Promise.all` for parallel loading
- Pass data down to child components as props
- Wrap client-interactive sections in Suspense boundaries with skeleton fallbacks
- Determine greeting based on user's timezone and current time
- Detect new users (no courses) and render `EmptyState` instead

**Props:** None (server component, fetches its own data)

**Greeting Logic:**
```
Time of day (in user's timezone):
  05:00 - 11:59  →  "Good morning, {first_name}"
  12:00 - 16:59  →  "Good afternoon, {first_name}"
  17:00 - 20:59  →  "Good evening, {first_name}"
  21:00 - 04:59  →  "Burning the midnight oil, {first_name}?"
```

---

### `summary-stats.tsx`

**Type:** Client Component

**Responsibilities:**
- Render a horizontal row of 4 `StatCard` components
- Accept pre-computed stats as props
- Responsive: 4 columns on desktop, 2x2 grid on tablet, scrollable row on mobile

**Props:**
```typescript
interface SummaryStatsProps {
  streak: number;                    // Current consecutive streak days
  streakTrend: 'up' | 'down' | 'stable';
  hoursThisWeek: number;            // Total hours studied this week (decimal)
  hoursTrend: 'up' | 'down' | 'stable';
  activeCourseCount: number;        // Count of courses with status 'in_progress'
  overallProgress: number;          // Weighted average progress across active courses (0-100)
  progressTrend: 'up' | 'down' | 'stable';
}
```

### `stat-card.tsx`

**Type:** Client Component

**Props:**
```typescript
interface StatCardProps {
  icon: React.ReactNode;            // Lucide icon component
  value: string | number;           // Display value ("12", "8.5h", "67%")
  label: string;                    // Description ("Day Streak", "This Week", etc.)
  trend?: 'up' | 'down' | 'stable'; // Optional trend arrow
  trendLabel?: string;              // e.g., "+2h vs last week"
  className?: string;
}
```

**Visual:** Uses shadcn `Card` component. Trend arrow is green (up), red (down), or gray (stable) with an `ArrowUp`, `ArrowDown`, or `Minus` Lucide icon.

---

### `todays-plan.tsx`

**Type:** Client Component

**Responsibilities:**
- Display AI-recommended study plan for today
- Show ordered list of courses to study with suggested durations
- Include AI motivational message at the bottom
- "View All" link navigates to full AI analysis page (B4 route)
- If no plan exists, show a fallback based on course priorities

**Props:**
```typescript
interface TodaysPlanProps {
  planItems: PlanCourseItemData[];   // Ordered courses for today
  aiMessage: string | null;          // AI-generated motivational note
  isStudyDay: boolean;               // Whether today is in user's preferred_study_days
}
```

**Fallback logic (no AI plan available):**
1. Filter courses with status `in_progress`, order by `priority` ASC then `sort_order` ASC
2. Suggest duration based on `daily_study_goal_minutes` distributed by priority weight
3. Show generic message: "Based on your priorities, here's a suggested plan."

---

### `plan-course-item.tsx`

**Type:** Client Component

**Props:**
```typescript
interface PlanCourseItemData {
  courseId: string;
  courseTitle: string;
  priority: number;                  // 1-4
  suggestedMinutes: number;
  currentProgress: number;           // 0-100 percentage
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
}
```

**Behavior:**
- Displays priority badge (P1/P2/P3/P4) with color coding
- Shows suggested duration in minutes
- "Start" button navigates to `/progress/timer?course={courseId}` (B3 route)

---

### `course-cards-grid.tsx`

**Type:** Client Component

**Responsibilities:**
- Render a responsive CSS grid of `DashboardCourseCard` components
- "Add Course" button in the header navigates to `/courses/new` (B2 route)
- Sort cards by `sort_order` ASC
- Filter to show only `in_progress` and `not_started` courses by default, with a toggle to show all

**Props:**
```typescript
interface CourseCardsGridProps {
  courses: DashboardCourseData[];
}
```

---

### `dashboard-course-card.tsx`

**Type:** Client Component

**Responsibilities:**
- Compact card showing course progress at a glance
- Clicking the card navigates to `/courses/{courseId}` (B2 route)

**Props:**
```typescript
interface DashboardCourseData {
  id: string;
  title: string;
  platform: string | null;
  completedModules: number;
  totalModules: number | null;
  completedHours: number;
  totalHours: number | null;
  targetCompletionDate: string | null;  // ISO date string
  priority: number;
  status: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  riskScore: number | null;
  streak: number;                       // Current user streak (shared)
  lastStudiedAt: string | null;         // ISO timestamp of most recent session for this course
}
```

**Visual Elements:**
- Course title (truncated to 2 lines)
- Platform icon (small, muted)
- Progress bar: `completedModules / totalModules` or `completedHours / totalHours` as fallback
- Progress percentage text
- Risk indicator badge: green (low), yellow (medium), red (high), pulsing red (critical)
- Days remaining until `target_completion_date` (or "No deadline" if null)
- Quick-start button: navigates to `/progress/timer?course={courseId}` (B3 route)

**Progress Calculation:**
```
if totalModules > 0:
  progress = (completedModules / totalModules) * 100
else if totalHours > 0:
  progress = (completedHours / totalHours) * 100
else:
  progress = 0  (show "Set a target" hint)
```

---

### `weekly-report-banner.tsx`

**Type:** Client Component

**Responsibilities:**
- Show a collapsible banner with the latest weekly report summary
- Collapsed: one-line AI summary preview + "Expand" button
- Expanded: full AI summary, highlights list, comparison to previous week
- "View Full Report" link navigates to `/reports` (B4 route)
- If no weekly report exists, show "Your first weekly report will appear after 7 days of tracking."

**Props:**
```typescript
interface WeeklyReportBannerProps {
  report: {
    aiSummary: string;
    totalMinutes: number;
    totalSessions: number;
    highlights: string[];
    comparedToPrevious: {
      minutesDiff: number;
      sessionsDiff: number;
      trend: 'up' | 'down' | 'stable';
    } | null;
    weekStart: string;
    weekEnd: string;
  } | null;
}
```

---

### `quick-actions.tsx`

**Type:** Client Component

**Responsibilities:**
- Render a row of 3 primary action buttons
- Each button navigates to the appropriate block's route
- Buttons are visually distinct with icons

**Actions:**

| Button Label | Icon | Navigation Target | Block Owner |
|---|---|---|---|
| Start Timer | `Timer` (Lucide) | `/progress/timer` | B3 |
| Log Session | `PenLine` (Lucide) | `/progress/log` | B3 |
| Add Course | `BookPlus` (Lucide) | `/courses/new` | B2 |

**Visual:** Uses shadcn `Button` with `variant="outline"` and icon + text. Responsive: full text on desktop, icon-only on mobile with tooltip.

---

### `recent-activity-feed.tsx`

**Type:** Client Component

**Responsibilities:**
- Display a chronological timeline of recent activity across all tables
- Limited to 10 most recent items
- Each item rendered via `ActivityItem`
- "View All" link could navigate to a dedicated activity page (future)

**Props:**
```typescript
interface RecentActivityFeedProps {
  activities: ActivityItemData[];
}
```

---

### `activity-item.tsx`

**Type:** Client Component

**Props:**
```typescript
interface ActivityItemData {
  id: string;
  type: 'study_session' | 'achievement' | 'course_status' | 'risk_alert';
  icon: string;                      // Lucide icon name
  description: string;               // Human-readable description
  timestamp: string;                 // ISO timestamp
  relativeTime: string;              // "2h ago", "yesterday", etc.
  actionUrl?: string;                // Optional link to related page
  metadata?: Record<string, unknown>;
}
```

**Visual:** Timeline dot + icon, description text, relative timestamp. Clickable if `actionUrl` is present.

---

### `notification-preview.tsx`

**Type:** Client Component

**Responsibilities:**
- Render a bell icon button in the dashboard header
- Show a red badge with unread notification count (capped at "9+")
- On click, open a dropdown/popover with the 3 most recent notifications
- "See All" link navigates to `/notifications` (B6 route)
- "Mark All as Read" button available in the dropdown

**Props:**
```typescript
interface NotificationPreviewProps {
  unreadCount: number;
  recentNotifications: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    actionUrl: string | null;
  }[];
}
```

**Note:** The unread count uses Supabase Realtime subscription (via `use-unread-count` from B6 if exposed, or B5's own subscription) to stay live without polling.

---

### `buddy-activity-sidebar.tsx`

**Type:** Client Component

**Responsibilities:**
- Show a sidebar widget with recent study activity from accepted buddies
- Each entry: buddy avatar + name + "Studied {course} for {duration}" + relative time
- "Find Buddies" link if no buddies are connected
- Compact list limited to 5 most recent buddy activities

**Props:**
```typescript
interface BuddyActivitySidebarProps {
  buddies: {
    buddyId: string;
    buddyName: string;
    buddyAvatar: string | null;
    recentSession: {
      courseTitle: string;
      durationMinutes: number;
      startedAt: string;
    } | null;
  }[];
}
```

---

### `achievement-toast.tsx`

**Type:** Client Component

**Responsibilities:**
- Display a toast notification when a new achievement is detected
- Uses shadcn `Toast` / `Sonner` component
- Auto-dismisses after 5 seconds
- Shows achievement icon, name, and description
- Clicking navigates to achievements page

**Trigger:** Compared `achievements` data between initial load and subsequent refetch. If a new achievement ID appears, fire the toast.

---

### `empty-state.tsx`

**Type:** Client Component

**Responsibilities:**
- Shown when the user has zero courses
- Illustration + welcoming message + "Add Your First Course" CTA
- CTA navigates to `/courses/new` (B2 route)

**Props:**
```typescript
interface EmptyStateProps {
  userName: string;
}
```

**Copy:**
```
Welcome, {userName}!

You haven't added any courses yet. Add your first course
to start tracking your learning journey.

[+ Add Your First Course]
```

---

## Hooks

### `use-dashboard-data.ts`

**Purpose:** Client-side React Query hook that fetches all dashboard data in parallel and manages refetching.

**Behavior:**
- Calls the `getDashboardData` server action
- Returns a single unified object with all dashboard sections
- `refetchInterval: 30000` (30-second polling)
- `refetchOnWindowFocus: true`
- Each section can be individually invalidated via React Query keys

**Return Type:**
```typescript
interface DashboardData {
  profile: UserProfileSummary;
  stats: SummaryStatsData;
  todaysPlan: TodaysPlanData;
  courses: DashboardCourseData[];
  weeklyReport: WeeklyReportData | null;
  recentActivity: ActivityItemData[];
  notifications: NotificationPreviewData;
  buddyActivity: BuddyActivityData[];
  newAchievements: AchievementData[];
}
```

**Query Key:** `['dashboard', userId]`

---

### `use-todays-plan.ts`

**Purpose:** Derive today's study plan from AI analyses and course data.

**Logic:**
1. Check if there is a recent (today) `ai_analyses` entry with `analysis_type = 'daily'`
2. If yes, extract `interventions` and `insights` to build the plan
3. If no, fall back to priority-based plan:
   - Take all `in_progress` courses, ordered by `priority` ASC
   - Distribute `daily_study_goal_minutes` across courses (P1 gets 50%, P2 gets 30%, rest split evenly)
4. Return ordered plan items + AI message (or null)

**Return Type:**
```typescript
interface TodaysPlanResult {
  planItems: PlanCourseItemData[];
  aiMessage: string | null;
  isAiGenerated: boolean;
  isStudyDay: boolean;
}
```

---

### `use-summary-stats.ts`

**Purpose:** Compute summary statistics from raw dashboard data.

**Calculations:**

| Stat | Calculation |
|---|---|
| **Current Streak** | Count consecutive days (backwards from today/yesterday) where `daily_stats.streak_day = true`. If today has no entry yet but yesterday was a streak day, streak is still alive (user may study later today). |
| **Hours This Week** | Sum `daily_stats.total_minutes` for current ISO week (Monday-Sunday), divide by 60, round to 1 decimal. |
| **Active Courses** | Count of courses with `status = 'in_progress'`. |
| **Overall Progress** | Weighted average of all `in_progress` course progress percentages, weighted by `total_hours` (or equal weight if `total_hours` is null). |
| **Trends** | Compare current week's value to previous week's value. `up` if current > previous, `down` if current < previous, `stable` if equal. |

---

### `use-recent-activity.ts`

**Purpose:** Merge activity events from multiple tables into a single sorted timeline.

**Sources:**
- `study_sessions` (last 7 days)
- `achievements` (last 30 days)
- `courses` status changes (inferred from `updated_at` and `status`)
- `ai_analyses` with `risk_level = 'critical'` (last 7 days)

**Return:** Array of `ActivityItemData`, sorted by timestamp DESC, limited to 10 items.

---

## Server Actions

### `dashboard-actions.ts`

All server actions use `'use server'` directive and authenticate via Supabase server client.

#### `getDashboardData()`

**Purpose:** Single server action that fetches all dashboard data in parallel.

**Implementation:**
```typescript
'use server';

export async function getDashboardData() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const [
    profile,
    courses,
    recentSessions,
    dailyStats,
    latestAnalyses,
    weeklyReport,
    notifications,
    achievements,
    buddies,
  ] = await Promise.all([
    // 1. User profile
    supabase
      .from('user_profiles')
      .select('full_name, avatar_url, timezone, daily_study_goal_minutes, preferred_study_days, streak_freeze_count')
      .eq('id', user.id)
      .single(),

    // 2. All non-abandoned courses
    supabase
      .from('courses')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'abandoned')
      .order('sort_order', { ascending: true }),

    // 3. Recent study sessions (last 30 days)
    supabase
      .from('study_sessions')
      .select('id, course_id, started_at, duration_minutes, modules_completed, notes')
      .eq('user_id', user.id)
      .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: false })
      .limit(50),

    // 4. Daily stats (last 60 days for streak calculation)
    supabase
      .from('daily_stats')
      .select('date, total_minutes, session_count, modules_completed, streak_day')
      .eq('user_id', user.id)
      .gte('date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false }),

    // 5. Latest AI analysis per course
    supabase
      .from('ai_analyses')
      .select('course_id, risk_score, risk_level, insights, interventions, analysis_type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // 6. Most recent weekly report
    supabase
      .from('weekly_reports')
      .select('ai_summary, total_minutes, total_sessions, highlights, compared_to_previous, week_start, week_end')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // 7. Unread notifications + 3 most recent
    supabase
      .from('notifications')
      .select('id, type, title, message, read, created_at, action_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // 8. Recent achievements (last 30 days)
    supabase
      .from('achievements')
      .select('id, achievement_type, course_id, metadata, earned_at')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .limit(10),

    // 9. Accepted buddies
    supabase
      .from('study_buddies')
      .select('requester_id, recipient_id, status')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq('status', 'accepted'),
  ]);

  return {
    profile: profile.data,
    courses: courses.data ?? [],
    recentSessions: recentSessions.data ?? [],
    dailyStats: dailyStats.data ?? [],
    latestAnalyses: latestAnalyses.data ?? [],
    weeklyReport: weeklyReport.data ?? null,
    notifications: notifications.data ?? [],
    achievements: achievements.data ?? [],
    buddies: buddies.data ?? [],
  };
}
```

#### `getBuddyActivity(buddyIds: string[])`

**Purpose:** Fetch recent study sessions for a list of buddy user IDs.

**Implementation:** For each buddy ID, fetch their most recent study session (joined with course title). Returns an array of buddy activity summaries. Uses `supabase` service role or RLS-aware query depending on buddy visibility policies.

---

## Utility Library

### `dashboard-utils.ts`

Pure utility functions with no side effects.

#### `buildActivityFeed(sessions, achievements, courses, analyses): ActivityItemData[]`

Merges events from multiple sources into a single activity feed:

| Source Table | Condition | Activity Description Template |
|---|---|---|
| `study_sessions` | All recent sessions | `"Studied {courseTitle} for {duration} minutes"` |
| `achievements` | All earned achievements | `"Earned \"{achievementName}\" achievement"` |
| `courses` | `status = 'completed'` | `"Completed {courseTitle}"` |
| `courses` | `status = 'in_progress'` and `created_at` is recent | `"Started {courseTitle}"` |
| `ai_analyses` | `risk_level = 'critical'` | `"Risk alert: {courseTitle} needs attention"` |

Returns array sorted by timestamp DESC, limited to 10 items.

#### `calculateStreak(dailyStats: DailyStatRow[]): number`

```
Input: daily_stats rows sorted by date DESC
Algorithm:
  1. Start from yesterday (or today if today has an entry)
  2. Walk backwards through consecutive dates
  3. Count consecutive days where streak_day = true
  4. Stop at first gap or streak_day = false
  Return: streak count (integer)
```

#### `calculateWeeklyHours(dailyStats: DailyStatRow[]): number`

```
Input: daily_stats rows
Algorithm:
  1. Determine current ISO week boundaries (Monday 00:00 to Sunday 23:59)
  2. Filter stats within this week
  3. Sum total_minutes
  4. Return total_minutes / 60, rounded to 1 decimal
```

#### `calculateOverallProgress(courses: CourseRow[]): number`

```
Input: courses with status 'in_progress'
Algorithm:
  1. For each course, compute individual progress:
     - If total_modules > 0: progress = completed_modules / total_modules
     - Else if total_hours > 0: progress = completed_hours / total_hours
     - Else: progress = 0 (excluded from weighted average)
  2. Weight by total_hours (or 1 if null)
  3. Return weighted average * 100, rounded to nearest integer
```

#### `calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable'`

```
If current > previous: return 'up'
If current < previous: return 'down'
Else: return 'stable'
```

#### `formatRelativeTime(timestamp: string): string`

Returns human-readable relative time: "just now", "2m ago", "1h ago", "5h ago", "yesterday", "2d ago", "1w ago", etc.

#### `getGreeting(timezone: string): string`

Returns time-of-day greeting based on current hour in the user's timezone.

#### `distributeDailyGoal(courses: CourseRow[], dailyGoalMinutes: number): PlanCourseItemData[]`

```
Input: in_progress courses sorted by priority, user's daily goal
Algorithm:
  1. P1 courses get 50% of total minutes (split evenly if multiple)
  2. P2 courses get 30% of total minutes
  3. P3-P4 courses get remaining 20%
  4. Minimum 15 minutes per course
  5. Round to nearest 5 minutes
  Return: array of plan items with suggested minutes
```

---

## Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header: "Good evening, Alex"                  [Notification Bell (3)]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │  Fire  12   │ │  Clock 8.5h │ │  Book  3    │ │  Chart 67%  │ │
│  │  Day        │ │  This       │ │  Active     │ │  Overall    │ │
│  │  Streak     │ │  Week       │ │  Courses    │ │  Progress   │ │
│  │  +2 vs last │ │  +1.5h up   │ │             │ │  +5% up     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
│                                                                   │
│  Today's Plan                                         [View All]  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 1. [P1] React Course - 45 min suggested        [Start >] │   │
│  │ 2. [P2] Python ML - 30 min suggested           [Start >] │   │
│  │                                                            │   │
│  │ "Focus on React today -- you are behind schedule"         │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Your Courses                                     [+ Add Course]  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ React        │ │ Python ML    │ │ AWS Cert     │             │
│  │ ████░░░ 67%  │ │ ██░░░░░ 34%  │ │ █░░░░░░ 12%  │             │
│  │ Streak:12    │ │ Streak:12    │ │ Streak:5     │             │
│  │ Risk: Low    │ │ Risk: High   │ │ Risk: Med    │             │
│  │ 15d left     │ │ 30d left     │ │ 45d left     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                   │
│  Weekly Report                                     [Expand v]     │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ "Solid week! 8.5h across 12 sessions. You studied        │   │
│  │  20% more than last week. Keep the momentum!"            │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Quick Actions                                                    │
│  [ Timer: Start Timer ] [ Pen: Log Session ] [ Book: Add Course ] │
│                                                                   │
│  Recent Activity                                                  │
│  * Completed Chapter 5 of React Course              2h ago       │
│  * Earned "7-Day Streak" achievement                5h ago       │
│  * Logged 30min Python ML session                   yesterday    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Responsive Breakpoints:**
- **Desktop (>= 1024px):** Full layout as shown above. Buddy activity sidebar appears on the right.
- **Tablet (768px - 1023px):** Stats grid becomes 2x2. Course cards grid becomes 2 columns. Buddy sidebar moves below activity feed.
- **Mobile (< 768px):** Stats become horizontally scrollable. Course cards stack vertically. All sections stack in single column. Quick actions become icon-only buttons.

---

## Component Tree

```
DashboardPage (server component -- fetches initial data)
├── Header
│   ├── Greeting text
│   └── NotificationPreview
│       ├── BellIcon + UnreadBadge
│       └── Popover
│           └── NotificationItem (x3 most recent)
├── SummaryStats
│   └── StatCard (x4)
│       ├── Icon
│       ├── Value
│       ├── Label
│       └── TrendIndicator
├── TodaysPlan
│   ├── SectionHeader ("Today's Plan" + "View All" link)
│   ├── PlanCourseItem (xN)
│   │   ├── PriorityBadge
│   │   ├── CourseTitle
│   │   ├── SuggestedDuration
│   │   └── StartButton (navigates to B3)
│   └── AiMessage (motivational note)
├── CourseCardsGrid
│   ├── SectionHeader ("Your Courses" + "Add Course" button)
│   └── DashboardCourseCard (xN)
│       ├── CourseTitle
│       ├── PlatformIcon
│       ├── ProgressBar (shadcn Progress)
│       ├── ProgressPercentage
│       ├── RiskIndicator (color-coded badge)
│       ├── DeadlineText
│       └── QuickStartButton (navigates to B3)
├── WeeklyReportBanner
│   ├── CollapsedView (one-line summary)
│   └── ExpandedView
│       ├── AiSummary (full text)
│       ├── HighlightsList
│       ├── ComparisonBadge (vs previous week)
│       └── ViewFullReportLink (navigates to B4)
├── QuickActions
│   ├── StartTimerButton (navigates to B3)
│   ├── LogSessionButton (navigates to B3)
│   └── AddCourseButton (navigates to B2)
├── RecentActivityFeed
│   └── ActivityItem (xN, max 10)
│       ├── TimelineDot + TypeIcon
│       ├── Description
│       └── RelativeTimestamp
├── BuddyActivitySidebar (desktop: right sidebar, mobile: below feed)
│   └── BuddyActivityItem (xN, max 5)
│       ├── BuddyAvatar
│       ├── BuddyName
│       └── SessionSummary
├── AchievementToast (triggered on new achievement detection)
└── EmptyState (shown INSTEAD of above when no courses exist)
    ├── Illustration
    ├── WelcomeText
    └── AddFirstCourseCTA
```

---

## Data Loading Strategy

### Server-Side Initial Load

The `DashboardPage` server component calls `getDashboardData()` which uses `Promise.all` to fetch all 9 data sources in parallel from Supabase. This ensures the initial page load has data without client-side waterfalls.

### Client-Side Refresh

After initial hydration, the `use-dashboard-data` hook (React Query) takes over:

| Mechanism | Interval | Scope |
|---|---|---|
| **Polling** | Every 30 seconds | Full dashboard data refetch |
| **Window focus** | On tab/window refocus | Full dashboard data refetch |
| **Supabase Realtime** | Live | `notifications` table inserts (for unread badge count) |
| **Supabase Realtime** | Live | `study_sessions` table inserts (for live session updates) |

### Skeleton Loading

Each dashboard section has an independent `Suspense` boundary with a skeleton fallback:

| Section | Skeleton |
|---|---|
| SummaryStats | 4 shimmer rectangles |
| TodaysPlan | 2 shimmer rows |
| CourseCardsGrid | 3 shimmer cards |
| WeeklyReportBanner | 1 shimmer rectangle |
| RecentActivityFeed | 3 shimmer rows |

---

## Activity Feed Construction

The activity feed merges events from multiple tables into a unified timeline:

| Source Table | Event Type | Template | Icon |
|---|---|---|---|
| `study_sessions` | `study_session` | "Studied {courseTitle} for {durationMinutes} minutes" | `BookOpen` |
| `achievements` | `achievement` | "Earned \"{achievementName}\" achievement" | `Trophy` |
| `courses` (status = `completed`) | `course_status` | "Completed {courseTitle}" | `CheckCircle` |
| `courses` (status = `in_progress`, created recently) | `course_status` | "Started {courseTitle}" | `PlayCircle` |
| `ai_analyses` (risk_level = `critical`) | `risk_alert` | "Risk alert: {courseTitle} needs attention" | `AlertTriangle` |

**Merge Algorithm:**
1. Query each source for events within the relevant time window (7 days for sessions/alerts, 30 days for achievements/course changes)
2. Map each row to `ActivityItemData` with a unified shape
3. Concatenate all arrays
4. Sort by `timestamp` DESC
5. Slice to first 10 items

**Achievement Name Mapping:**
```
first_session     → "First Steps"
streak_7          → "7-Day Streak"
streak_30         → "Monthly Warrior"
streak_100        → "Unstoppable"
course_complete   → "Course Complete"
night_owl         → "Night Owl"
early_bird        → "Early Bird"
marathon          → "Marathon Learner"
consistency_king  → "Consistency King"
speed_learner     → "Speed Learner"
social_butterfly  → "Social Butterfly"
comeback_kid      → "Comeback Kid"
perfectionist     → "Perfectionist"
explorer          → "Explorer"
dedication        → "True Dedication"
```

---

## State Management

| Concern | Solution |
|---|---|
| **Initial data** | Server component fetch via `getDashboardData()` server action |
| **Client-side cache** | React Query (`@tanstack/react-query`) with `['dashboard', userId]` key |
| **Polling** | React Query `refetchInterval: 30000` |
| **Window focus refetch** | React Query `refetchOnWindowFocus: true` |
| **Realtime notifications** | Supabase Realtime channel subscription on `notifications` table for `INSERT` events |
| **Realtime sessions** | Supabase Realtime channel subscription on `study_sessions` table for `INSERT` events |
| **Achievement toast** | Local state comparison: diff previous achievement IDs vs current on each refetch |
| **Section collapse** | Local `useState` for weekly report banner expand/collapse |
| **Filter toggle** | Local `useState` for course grid "show all" vs "active only" |

---

## TypeScript Interfaces

All interfaces are defined within the block at `src/blocks/b5-dashboard/lib/dashboard-utils.ts` or co-located with their component. Key shared types:

```typescript
// Summary stats
interface SummaryStatsData {
  streak: number;
  streakTrend: 'up' | 'down' | 'stable';
  hoursThisWeek: number;
  hoursTrend: 'up' | 'down' | 'stable';
  activeCourseCount: number;
  overallProgress: number;
  progressTrend: 'up' | 'down' | 'stable';
}

// Today's plan
interface TodaysPlanData {
  planItems: PlanCourseItemData[];
  aiMessage: string | null;
  isAiGenerated: boolean;
  isStudyDay: boolean;
}

interface PlanCourseItemData {
  courseId: string;
  courseTitle: string;
  priority: number;
  suggestedMinutes: number;
  currentProgress: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
}

// Course card
interface DashboardCourseData {
  id: string;
  title: string;
  platform: string | null;
  completedModules: number;
  totalModules: number | null;
  completedHours: number;
  totalHours: number | null;
  targetCompletionDate: string | null;
  priority: number;
  status: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  riskScore: number | null;
  lastStudiedAt: string | null;
}

// Weekly report
interface WeeklyReportData {
  aiSummary: string;
  totalMinutes: number;
  totalSessions: number;
  highlights: string[];
  comparedToPrevious: {
    minutesDiff: number;
    sessionsDiff: number;
    trend: 'up' | 'down' | 'stable';
  } | null;
  weekStart: string;
  weekEnd: string;
}

// Activity feed
interface ActivityItemData {
  id: string;
  type: 'study_session' | 'achievement' | 'course_status' | 'risk_alert';
  icon: string;
  description: string;
  timestamp: string;
  relativeTime: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// Notification preview
interface NotificationPreviewData {
  unreadCount: number;
  recent: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    actionUrl: string | null;
  }[];
}

// Buddy activity
interface BuddyActivityData {
  buddyId: string;
  buddyName: string;
  buddyAvatar: string | null;
  recentSession: {
    courseTitle: string;
    durationMinutes: number;
    startedAt: string;
  } | null;
}

// User profile summary (subset for dashboard)
interface UserProfileSummary {
  fullName: string | null;
  avatarUrl: string | null;
  timezone: string;
  dailyStudyGoalMinutes: number;
  preferredStudyDays: string[];
  streakFreezeCount: number;
}
```

---

## Supabase Queries

### Streak Calculation Query

The streak is calculated client-side from `daily_stats` data, but the query to fetch the data is:

```sql
SELECT date, streak_day
FROM daily_stats
WHERE user_id = $1
  AND date >= current_date - interval '60 days'
ORDER BY date DESC;
```

### Latest Risk Per Course

To get the most recent risk level for each course:

```sql
SELECT DISTINCT ON (course_id)
  course_id, risk_score, risk_level
FROM ai_analyses
WHERE user_id = $1
  AND course_id IS NOT NULL
ORDER BY course_id, created_at DESC;
```

### Unread Notification Count

```sql
SELECT count(*)
FROM notifications
WHERE user_id = $1
  AND read = false;
```

### Buddy Recent Sessions

```sql
SELECT
  sb.requester_id,
  sb.recipient_id,
  up.full_name,
  up.avatar_url,
  ss.duration_minutes,
  ss.started_at,
  c.title as course_title
FROM study_buddies sb
JOIN user_profiles up ON up.id = (
  CASE WHEN sb.requester_id = $1 THEN sb.recipient_id ELSE sb.requester_id END
)
LEFT JOIN LATERAL (
  SELECT duration_minutes, started_at, course_id
  FROM study_sessions
  WHERE user_id = up.id
  ORDER BY started_at DESC
  LIMIT 1
) ss ON true
LEFT JOIN courses c ON c.id = ss.course_id
WHERE (sb.requester_id = $1 OR sb.recipient_id = $1)
  AND sb.status = 'accepted';
```

---

## Edge Cases & Empty States

| Scenario | Behavior |
|---|---|
| **New user, no courses** | Show `EmptyState` component instead of full dashboard |
| **No study sessions yet** | Stats show 0 for streak, hours, progress. Activity feed shows "No activity yet." |
| **No AI analyses yet** | Today's plan uses priority-based fallback. Risk indicators show as gray "N/A". |
| **No weekly report** | Banner shows "Your first weekly report will appear after 7 days of tracking." |
| **No notifications** | Bell shows no badge. Dropdown shows "You're all caught up!" |
| **No buddies** | Buddy sidebar shows "Connect with study buddies for mutual accountability." with link. |
| **All courses completed** | Stats reflect completed state. Quick actions still available. Suggest starting a new course. |
| **Course with no `total_modules` or `total_hours`** | Progress shows "Set a target" instead of percentage. Progress bar hidden. |
| **Today is not a preferred study day** | Today's plan shows with note: "Today is a rest day. No study scheduled." |
| **Supabase Realtime disconnects** | Fall back to polling-only. No error shown to user. Reconnect automatically. |
| **Server action fails** | Show error boundary per section. Other sections continue to render. |

---

## Accessibility

| Feature | Implementation |
|---|---|
| **Keyboard navigation** | All interactive elements (buttons, links, toggles) are focusable and operable via keyboard |
| **Screen reader labels** | StatCards use `aria-label` (e.g., "12 day streak, up from last week") |
| **Progress bars** | `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| **Activity feed** | Rendered as `<ol>` with `role="feed"`, each item is `<li>` with `role="article"` |
| **Notification bell** | `aria-label="Notifications, 3 unread"` with live region for count updates |
| **Color contrast** | Risk indicators use both color AND text label (not color alone) |
| **Reduced motion** | Trend arrows and toast animations respect `prefers-reduced-motion` |
| **Focus management** | When toast appears, it does not steal focus from current interaction |

---

## Performance Considerations

| Optimization | Detail |
|---|---|
| **Parallel fetching** | All 9 Supabase queries run via `Promise.all`, not sequentially |
| **Query limits** | Sessions limited to 50 rows, analyses to 20, notifications to 20, achievements to 10 |
| **Index usage** | All queries hit dedicated indexes (see DATABASE.md Indexes section) |
| **Skeleton loading** | Independent Suspense boundaries prevent full-page loading states |
| **React Query stale time** | `staleTime: 15000` (15s) prevents unnecessary refetches on re-renders |
| **Memoization** | Expensive computations (streak, activity feed merge) wrapped in `useMemo` |
| **Image optimization** | Buddy avatars use Next.js `Image` with `width={32} height={32}` and `loading="lazy"` |
| **Bundle splitting** | Each section is a separate client component, enabling code splitting |

---

## Testing Plan

### Unit Tests

| Test | File | Description |
|---|---|---|
| `calculateStreak` | `dashboard-utils.test.ts` | Streak of 0, 1, 7, 30; gaps in middle; today not yet studied |
| `calculateWeeklyHours` | `dashboard-utils.test.ts` | Empty week, partial week, full week, cross-week boundary |
| `calculateOverallProgress` | `dashboard-utils.test.ts` | Single course, multiple courses, courses with no targets |
| `calculateTrend` | `dashboard-utils.test.ts` | Up, down, stable cases |
| `buildActivityFeed` | `dashboard-utils.test.ts` | Empty inputs, single source, multiple sources, correct sort, limit to 10 |
| `distributeDailyGoal` | `dashboard-utils.test.ts` | Single course, multiple priorities, minimum 15min enforcement |
| `formatRelativeTime` | `dashboard-utils.test.ts` | Just now, minutes, hours, days, weeks |

### Component Tests

| Test | File | Description |
|---|---|---|
| StatCard renders | `stat-card.test.tsx` | Renders value, label, icon, trend arrow correctly |
| SummaryStats layout | `summary-stats.test.tsx` | All 4 cards render with correct data |
| DashboardCourseCard | `dashboard-course-card.test.tsx` | Renders title, progress, risk badge, deadline |
| EmptyState | `empty-state.test.tsx` | Renders when no courses, CTA navigates correctly |
| TodaysPlan fallback | `todays-plan.test.tsx` | Shows priority-based plan when no AI plan exists |
| ActivityItem | `activity-item.test.tsx` | Renders each type correctly |

### Integration Tests

| Test | Description |
|---|---|
| Full dashboard render | Mock all Supabase responses, verify all sections render |
| Empty state flow | Mock 0 courses, verify EmptyState shown, other sections hidden |
| Error handling | Mock failed queries, verify error boundaries per section |
| Notification badge | Mock unread count, verify badge shows correct number |

---

## Do Not Touch Boundaries

**CRITICAL: This block is READ-ONLY.**

| Rule | Detail |
|---|---|
| **No writes** | Dashboard does NOT insert, update, or delete rows in any table |
| **No cross-block imports** | Dashboard does NOT import code from B1-B4 or B6-B8. All communication is through database reads. |
| **Quick actions navigate** | "Start Timer" navigates to `/progress/timer` (B3). It does NOT start a timer. |
| **Log Session navigates** | "Log Session" navigates to `/progress/log` (B3). It does NOT create a session. |
| **Add Course navigates** | "Add Course" navigates to `/courses/new` (B2). It does NOT create a course. |
| **Mark as Read navigates** | Notification "Mark All as Read" navigates to `/notifications` (B6). Dashboard does NOT update notification read status. |
| **No AI calls** | Dashboard does NOT call OpenAI. It reads AI results from `ai_analyses` and `weekly_reports`. |
| **No notification creation** | Dashboard does NOT create notification rows. |
| **No achievement granting** | Dashboard does NOT insert achievements. It only displays them. |

---

## Dependencies (npm packages used)

| Package | Purpose |
|---|---|
| `@supabase/supabase-js` | Database queries and Realtime subscriptions |
| `@tanstack/react-query` | Client-side data fetching, caching, polling |
| `lucide-react` | Icons for stats, actions, activity feed |
| `date-fns` or `dayjs` | Date manipulation, relative time formatting, ISO week calculation |
| `shadcn/ui` components | `Card`, `Button`, `Progress`, `Badge`, `Popover`, `Skeleton`, `Toast` |

---

## Cross-Block Navigation Map

| Dashboard Element | Navigates To | Block |
|---|---|---|
| Course card click | `/courses/{courseId}` | B2 |
| "Add Course" button | `/courses/new` | B2 |
| "Start Timer" button | `/progress/timer` | B3 |
| "Start" on plan item | `/progress/timer?course={courseId}` | B3 |
| "Log Session" button | `/progress/log` | B3 |
| "View Full Report" link | `/reports` | B4 |
| "View All" on Today's Plan | `/reports/insights` | B4 |
| Notification bell → "See All" | `/notifications` | B6 |
| Buddy sidebar → "Find Buddies" | `/buddies` | B7 |
| Achievement toast click | `/achievements` | B8 |
