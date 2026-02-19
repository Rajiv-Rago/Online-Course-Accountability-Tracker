# Block B3 - Progress Tracking

> **Status**: Spec Complete
> **Owner**: TBD
> **Last Updated**: 2026-02-19

## Overview

Block B3 is the core data-entry and stats engine for the Course Accountability Tracker. It owns all study session logging (manual and timer-based), streak computation, and daily/weekly statistics aggregation. It is the primary block through which users record their learning effort and see quantitative feedback.

---

## Table Ownership

| Relationship | Table | Purpose |
|---|---|---|
| **Owns** | `study_sessions` | Individual study session records (manual or timer-created) |
| **Owns** | `daily_stats` | Pre-aggregated per-user per-date statistics |
| **Reads** | `courses` | Display course title, platform, module counts in session forms and lists |
| **Reads** | `user_profiles` | Read `streak_freeze_count` for freeze feature; read `daily_study_goal_minutes` for goal comparison |

### `study_sessions` Table Schema

```sql
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,  -- NULL while timer is active
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  session_type TEXT NOT NULL CHECK (session_type IN ('manual', 'timer')) DEFAULT 'manual',
  modules_completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_study_sessions_user_date ON study_sessions(user_id, started_at DESC);
CREATE INDEX idx_study_sessions_course ON study_sessions(course_id);
CREATE INDEX idx_study_sessions_active ON study_sessions(user_id) WHERE ended_at IS NULL;

-- RLS
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own sessions"
  ON study_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### `daily_stats` Table Schema

```sql
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  modules_completed INTEGER NOT NULL DEFAULT 0,
  courses_studied UUID[] NOT NULL DEFAULT '{}',
  streak_day BOOLEAN NOT NULL DEFAULT false,  -- true if total_minutes >= threshold
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);
CREATE INDEX idx_daily_stats_streak ON daily_stats(user_id, date DESC) WHERE streak_day = true;

-- RLS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own daily stats"
  ON daily_stats FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Server can upsert daily stats"
  ON daily_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Routes

| Route | Page | Description |
|---|---|---|
| `/progress` | Progress Overview | Dashboard with streaks, daily/weekly stats, recent sessions |
| `/progress/log` | Log Session | Manual session logging form |
| `/progress/timer` | Timer Mode | Live timer with course selection, module tracking, notes |

### Route File Mapping

```
src/app/progress/
  page.tsx          -> ProgressOverviewPage
  layout.tsx        -> Progress layout (shared header/nav)
  log/
    page.tsx        -> LogSessionPage
  timer/
    page.tsx        -> TimerPage
```

---

## File Structure

```
src/blocks/b3-progress-tracking/
  components/
    session-log-form.tsx          # Manual session logging form
    study-timer.tsx               # Start/pause/stop timer with elapsed display
    timer-display.tsx             # Large timer readout (HH:MM:SS)
    timer-controls.tsx            # Start, pause, stop buttons
    timer-course-select.tsx       # Select which course to time
    session-list.tsx              # Paginated list of past sessions
    session-item.tsx              # Single session row (course, duration, date, notes)
    session-edit-dialog.tsx       # Edit session inline dialog
    streak-display.tsx            # Current streak + longest streak + calendar
    streak-calendar.tsx           # Mini calendar showing study days
    streak-freeze-button.tsx      # Use streak freeze
    daily-stats-summary.tsx       # Today's stats (hours, sessions, modules)
    weekly-stats-summary.tsx      # This week's aggregate stats
    progress-overview.tsx         # Main overview combining all stats
    module-checklist.tsx          # Checkbox list for module-based tracking
  hooks/
    use-sessions.ts               # Fetch sessions with filters
    use-timer.ts                  # Timer logic (start, pause, stop, elapsed time, auto-save)
    use-streak.ts                 # Streak calculation
    use-daily-stats.ts            # Daily/weekly stat aggregates
  actions/
    session-actions.ts            # Server actions for session CRUD
    timer-actions.ts              # Server actions for timer start/stop
    stats-actions.ts              # Server actions for stats queries
  lib/
    session-validation.ts         # Zod schemas for session forms
    streak-calculator.ts          # Pure function: given daily_stats[], compute streaks
    stats-aggregator.ts           # Aggregate session data into summaries
```

---

## Component Specifications

### `session-log-form.tsx`

Manual entry form for recording a study session after the fact.

**Props**: None (reads course list from DB via hook)

**State**:
- `courseId: string` - Selected course UUID
- `date: Date` - Session date (default: today, max: today)
- `durationMinutes: number` - Duration in minutes (min: 1, max: 480)
- `modulesCompleted: number` - Number of modules completed (min: 0)
- `notes: string` - Optional free-text notes (max: 500 chars)

**Behavior**:
1. Load user's `in_progress` courses via Supabase query on `courses` table
2. Validate all fields with Zod schema before submission
3. On submit: call `createSession` server action
4. On success: redirect to `/progress` with success toast
5. On error: display inline validation errors

**UI Elements** (shadcn/ui):
- `Select` for course selection
- `DatePicker` (calendar popover) for date
- `Input[type=number]` for duration with +/- 5-minute stepper buttons
- `Input[type=number]` for modules completed
- `Textarea` for notes
- `Button` for submit ("Log Session")

---

### `study-timer.tsx`

Orchestrator component that composes all timer sub-components.

**Props**: None

**State** (via `useTimer` hook):
- `status: 'idle' | 'running' | 'paused'`
- `courseId: string | null`
- `sessionId: string | null`
- `elapsedSeconds: number`
- `modulesCompleted: number`
- `notes: string`

**Behavior**:
1. On mount: check localStorage for active timer state; if found, restore and resume
2. Renders `TimerCourseSelect` (disabled once timer starts), `TimerDisplay`, `TimerControls`, `ModuleChecklist`, notes input
3. On stop: finalizes session, clears localStorage, shows summary

---

### `timer-display.tsx`

Large, prominent timer readout.

**Props**:
- `elapsedSeconds: number`
- `isRunning: boolean`

**Rendering**:
- Formats seconds into `HH:MM:SS`
- Uses monospace font, large size (text-5xl on desktop, text-3xl on mobile)
- Pulses gently when running (CSS animation)
- Static display when paused (with "PAUSED" indicator)

---

### `timer-controls.tsx`

Control buttons for the timer.

**Props**:
- `status: 'idle' | 'running' | 'paused'`
- `onStart: () => void`
- `onPause: () => void`
- `onResume: () => void`
- `onStop: () => void`
- `courseSelected: boolean`

**Rendering**:
- `idle` state: "Start" button (disabled if no course selected)
- `running` state: "Pause" button + "Stop & Save" button
- `paused` state: "Resume" button + "Stop & Save" button
- Uses shadcn `Button` with appropriate variants (default, destructive for stop)

---

### `timer-course-select.tsx`

Course selector for timer mode.

**Props**:
- `selectedCourseId: string | null`
- `onSelect: (courseId: string) => void`
- `disabled: boolean`

**Behavior**:
- Fetches user's `in_progress` courses from `courses` table
- Renders shadcn `Select` with course titles
- Disabled once the timer is running (cannot switch courses mid-session)

---

### `session-list.tsx`

Paginated list of past study sessions.

**Props**:
- `courseFilter?: string` - Optional course UUID to filter by
- `limit?: number` - Page size (default: 10)

**Behavior**:
- Fetches sessions via `useSessions` hook with cursor-based pagination
- Displays each session via `SessionItem`
- "Load More" button at bottom for next page
- Empty state: "No sessions recorded yet. Start tracking!"

---

### `session-item.tsx`

Single row in the session list.

**Props**:
- `session: StudySession` - The session data
- `courseName: string` - Resolved course name
- `onEdit: (session: StudySession) => void`
- `onDelete: (sessionId: string) => void`

**Rendering**:
- Course name (color-coded badge)
- Duration formatted as "Xh Ym" or "Xm"
- Date formatted as relative ("Today", "Yesterday") or absolute ("Feb 18")
- Notes preview (truncated to 60 chars)
- Edit/Delete actions via dropdown menu (shadcn `DropdownMenu`)

---

### `session-edit-dialog.tsx`

Inline edit dialog for modifying a past session.

**Props**:
- `session: StudySession`
- `open: boolean`
- `onClose: () => void`
- `onSave: (updated: Partial<StudySession>) => void`

**Behavior**:
- Shadcn `Dialog` with form fields pre-filled from session
- Editable fields: duration, modules_completed, notes
- Non-editable fields: course (displayed but greyed out), date (displayed but greyed out)
- Validates changes via Zod schema
- On save: calls `updateSession` server action, then `onSave` callback

---

### `streak-display.tsx`

Shows current streak, longest streak, and the streak calendar.

**Props**: None (fetches data via `useStreak` hook)

**Rendering**:
- Current streak: large number with fire icon label
- Longest streak: smaller display with trophy icon label
- Streak freeze count: displayed with snowflake icon, freeze button if count > 0
- `StreakCalendar` rendered below

---

### `streak-calendar.tsx`

Mini heatmap calendar showing study activity.

**Props**:
- `dailyStats: DailyStat[]` - Last 90 days of daily stats
- `today: Date`

**Rendering**:
- 7-column grid (Mon-Sun), scrollable 90-day window
- Each cell colored by intensity:
  - No data / 0 minutes: gray/empty
  - 1-14 minutes: light green (below threshold, does NOT count as study day)
  - 15-59 minutes: medium green
  - 60+ minutes: dark green
- Today highlighted with border
- Streak freeze days marked with snowflake overlay

---

### `streak-freeze-button.tsx`

Button to apply a streak freeze.

**Props**:
- `freezeCount: number` - Remaining freezes from `user_profiles`
- `onFreeze: () => void`

**Behavior**:
- Disabled if `freezeCount <= 0`
- On click: shows confirmation dialog ("Use 1 streak freeze? You have X remaining.")
- On confirm: calls server action that:
  1. Inserts a `daily_stats` row for yesterday with `streak_day = true` and `total_minutes = 0`
  2. Decrements `streak_freeze_count` in `user_profiles`
- Displays remaining freeze count

---

### `daily-stats-summary.tsx`

Today's statistics summary.

**Props**: None (fetches via `useDailyStats` hook)

**Rendering**:
- Three stat cards in a row:
  1. Total study time today (formatted as hours and minutes)
  2. Number of sessions today
  3. Modules completed today
- Progress bar showing progress toward daily goal (from `user_profiles.daily_study_goal_minutes`)
- Color: green if goal met, yellow if >50%, gray if <50%

---

### `weekly-stats-summary.tsx`

This week's aggregate stats.

**Props**: None (fetches via `useDailyStats` hook for current week)

**Rendering**:
- Total hours this week
- Average session duration
- Number of active days (out of 7)
- Comparison to previous week (arrow up/down + percentage)
- Simple bar visualization using CSS (one bar per day, height = minutes)

---

### `progress-overview.tsx`

Main overview component that composes the progress dashboard.

**Props**: None

**Rendering**: Composes `StreakDisplay`, `DailyStatsSummary`, `WeeklyStatsSummary`, quick action buttons, and `SessionList`.

---

### `module-checklist.tsx`

Checkbox list for tracking modules completed during a timer session.

**Props**:
- `count: number`
- `onChange: (count: number) => void`

**Rendering**:
- Numeric stepper: `[-]` button, count display, `[+]` button
- Min: 0, no hard max
- Label: "Modules completed this session"

---

## Hook Specifications

### `use-sessions.ts`

```typescript
interface UseSessionsOptions {
  courseId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  cursor?: string; // session ID for cursor-based pagination
}

interface UseSessionsReturn {
  sessions: StudySession[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

function useSessions(options?: UseSessionsOptions): UseSessionsReturn;
```

**Implementation**:
- Uses React Query (`useInfiniteQuery`) with query key `['sessions', options]`
- Fetches from `study_sessions` joined with `courses` for course name
- Ordered by `started_at DESC`
- Stale time: 30 seconds
- Refetch on window focus: true

---

### `use-timer.ts`

```typescript
interface TimerState {
  status: 'idle' | 'running' | 'paused';
  courseId: string | null;
  sessionId: string | null;
  elapsedSeconds: number;
  startedAt: number | null; // Unix timestamp ms
  pausedAt: number | null;  // Unix timestamp ms
  totalPausedMs: number;    // Accumulated pause duration
}

interface UseTimerReturn {
  state: TimerState;
  start: (courseId: string) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: (notes?: string, modulesCompleted?: number) => Promise<StudySession>;
  reset: () => void;
}

function useTimer(): UseTimerReturn;
```

**Implementation Details**:

1. **Start**:
   - Creates `study_session` in DB with `ended_at = null`, `session_type = 'timer'`
   - Stores session ID in state
   - Begins `setInterval` (1 second tick) via `useRef`
   - Saves state to `localStorage` key `timer_state`

2. **Pause**:
   - Records `pausedAt` timestamp
   - Clears interval
   - Updates localStorage

3. **Resume**:
   - Calculates pause duration, adds to `totalPausedMs`
   - Restarts interval
   - Updates localStorage

4. **Stop**:
   - Clears interval
   - Calculates final `duration_minutes = Math.round(elapsedSeconds / 60)`
   - Calls `finalizeTimerSession` server action (sets `ended_at`, `duration_minutes`, `notes`, `modules_completed`)
   - Clears localStorage
   - Triggers daily stats recalculation
   - Returns finalized session

5. **Auto-save** (every 60 seconds while running):
   - Updates `duration_minutes` in DB for the active session
   - Ensures data survives crashes

6. **Recovery on mount**:
   - Reads localStorage for `timer_state`
   - If found with `status === 'running'`:
     - Recalculates elapsed time from `startedAt` to `now()` minus `totalPausedMs`
     - Resumes interval
   - If found with `status === 'paused'`:
     - Restores paused state

7. **Browser close handling**:
   - `beforeunload` event listener saves current state to localStorage
   - On next page load, recovery logic handles finalization prompt

---

### `use-streak.ts`

```typescript
interface StreakData {
  currentStreak: number;
  longestStreak: number;
  freezeCount: number;
  lastStudyDate: Date | null;
  isStudiedToday: boolean;
}

function useStreak(): {
  data: StreakData | null;
  isLoading: boolean;
  error: Error | null;
};
```

**Implementation**:
- Fetches last 365 days of `daily_stats` where `streak_day = true`
- Fetches `streak_freeze_count` from `user_profiles`
- Passes data to `streakCalculator` pure function
- React Query with stale time: 60 seconds

---

### `use-daily-stats.ts`

```typescript
interface DailyStatsData {
  today: DailyStat | null;
  thisWeek: DailyStat[];
  lastWeek: DailyStat[];
  dailyGoalMinutes: number;
  goalProgress: number; // 0.0 to 1.0+
}

function useDailyStats(): {
  data: DailyStatsData | null;
  isLoading: boolean;
  error: Error | null;
};
```

**Implementation**:
- Fetches `daily_stats` for current week (Mon-Sun) and previous week
- Fetches `daily_study_goal_minutes` from `user_profiles`
- Calculates `goalProgress` as `today.total_minutes / dailyGoalMinutes`
- React Query with stale time: 30 seconds

---

## Server Actions

### `session-actions.ts`

```typescript
'use server'

// Create a manual study session
async function createSession(data: CreateSessionInput): Promise<StudySession>
// - Validates input with Zod
// - Inserts into study_sessions with session_type='manual'
// - Calls upsertDailyStats for the session date
// - Returns created session

// Update an existing session
async function updateSession(sessionId: string, data: UpdateSessionInput): Promise<StudySession>
// - Validates ownership (user_id matches auth.uid())
// - Updates allowed fields only (duration, modules, notes)
// - Recalculates daily_stats for affected date(s)

// Delete a session
async function deleteSession(sessionId: string): Promise<void>
// - Validates ownership
// - Soft-deletes or hard-deletes the session
// - Recalculates daily_stats for the affected date

// Fetch sessions with pagination
async function fetchSessions(options: FetchSessionsInput): Promise<PaginatedSessions>
// - Validates input
// - Queries study_sessions with joins, filters, cursor pagination
// - Returns sessions + hasNextPage flag
```

### `timer-actions.ts`

```typescript
'use server'

// Start a timer session (creates DB record)
async function startTimerSession(courseId: string): Promise<{ sessionId: string }>
// - Creates study_session with ended_at = null, session_type = 'timer'
// - Returns the new session ID

// Auto-save timer progress
async function autoSaveTimerProgress(sessionId: string, durationMinutes: number): Promise<void>
// - Updates duration_minutes for the given session
// - Only updates if session is still active (ended_at IS NULL)

// Finalize a timer session
async function finalizeTimerSession(
  sessionId: string,
  durationMinutes: number,
  notes?: string,
  modulesCompleted?: number
): Promise<StudySession>
// - Sets ended_at = now()
// - Sets final duration_minutes, notes, modules_completed
// - Calls upsertDailyStats for the session date
// - Returns finalized session

// Recover orphaned timer session (browser crashed)
async function recoverTimerSession(sessionId: string): Promise<StudySession | null>
// - Checks if session exists and ended_at IS NULL
// - If so, returns session data for client-side recovery prompt
// - Returns null if session already finalized
```

### `stats-actions.ts`

```typescript
'use server'

// Upsert daily stats for a given date (called after session CRUD)
async function upsertDailyStats(userId: string, date: Date): Promise<DailyStat>
// - Aggregates all study_sessions for user + date
// - Calculates total_minutes, session_count, modules_completed, courses_studied
// - Sets streak_day = total_minutes >= STREAK_THRESHOLD (15 min)
// - Upserts into daily_stats (INSERT ON CONFLICT UPDATE)

// Fetch daily stats for a date range
async function fetchDailyStats(startDate: Date, endDate: Date): Promise<DailyStat[]>

// Apply a streak freeze
async function applyStreakFreeze(date: Date): Promise<{ success: boolean; remainingFreezes: number }>
// - Checks user_profiles.streak_freeze_count > 0
// - Inserts/updates daily_stats for the target date with streak_day = true
// - Decrements streak_freeze_count in user_profiles
// - Returns success status and remaining count
```

---

## Library Functions

### `session-validation.ts`

```typescript
import { z } from 'zod';

export const createSessionSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  date: z.coerce.date().max(new Date(), 'Cannot log future sessions'),
  durationMinutes: z.number().int().min(1, 'Minimum 1 minute').max(480, 'Maximum 8 hours'),
  modulesCompleted: z.number().int().min(0).default(0),
  notes: z.string().max(500, 'Notes too long').optional(),
});

export const updateSessionSchema = z.object({
  durationMinutes: z.number().int().min(1).max(480).optional(),
  modulesCompleted: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
```

### `streak-calculator.ts`

```typescript
const STREAK_THRESHOLD_MINUTES = 15;

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: Date | null;
  isStudiedToday: boolean;
}

/**
 * Pure function: given an array of daily_stats sorted by date DESC,
 * computes current streak and longest streak.
 *
 * Rules:
 * - A "study day" has streak_day = true (total_minutes >= threshold)
 * - Current streak: consecutive study days ending at today or yesterday
 * - If today has no study yet, streak still counts if yesterday was a study day
 * - Freeze days (streak_day = true, total_minutes = 0) count as valid streak days
 */
export function calculateStreaks(
  dailyStats: Array<{ date: string; streak_day: boolean; total_minutes: number }>,
  today: Date
): StreakResult;
```

**Edge Cases Handled**:
1. No data at all: streaks = 0
2. Only today has data: current streak = 1
3. Yesterday missed but freeze applied: streak continues
4. Timezone boundary: uses UTC date comparison
5. Multiple freezes in a row: each counts as one streak day
6. Longest streak in the past (not current): correctly separated

### `stats-aggregator.ts`

```typescript
interface WeeklyAggregate {
  totalMinutes: number;
  totalSessions: number;
  activeDays: number;
  avgSessionMinutes: number;
  coursesStudied: string[];   // unique course IDs
  modulesCompleted: number;
}

/**
 * Aggregates an array of DailyStat records into a weekly summary.
 */
export function aggregateWeek(dailyStats: DailyStat[]): WeeklyAggregate;

/**
 * Compares two weekly aggregates and returns delta percentages.
 */
export function compareWeeks(
  current: WeeklyAggregate,
  previous: WeeklyAggregate
): {
  minutesDelta: number;       // percentage change
  sessionsDelta: number;
  activeDaysDelta: number;
};
```

---

## Timer Behavior (Detailed)

### Lifecycle

```
[idle] --start(courseId)--> [running] --pause--> [paused] --resume--> [running]
                               |                    |
                               +----stop----------->+----stop------> [idle]
```

### Auto-Save Protocol

```
Timer Running:
  Every 60 seconds:
    1. Calculate current duration from startedAt, totalPausedMs
    2. Call autoSaveTimerProgress(sessionId, durationMinutes)
    3. Update localStorage with latest state
```

### Recovery Protocol

```
On page load:
  1. Read localStorage('timer_state')
  2. If no state: done
  3. If state.status === 'idle': clear localStorage, done
  4. Call recoverTimerSession(state.sessionId)
  5. If session is null (already finalized): clear localStorage, done
  6. If session exists (still active):
     a. Calculate elapsed = (now - state.startedAt - state.totalPausedMs)
     b. Show recovery dialog: "You have an active session (Xm). Resume or Stop?"
     c. Resume: restore timer with calculated elapsed
     d. Stop: finalize session with calculated duration
```

### localStorage Schema

```typescript
interface TimerLocalStorage {
  sessionId: string;
  courseId: string;
  status: 'running' | 'paused';
  startedAt: number;      // Unix timestamp ms
  pausedAt: number | null; // Unix timestamp ms
  totalPausedMs: number;
  lastSavedAt: number;    // Unix timestamp ms
}
// Key: 'b3_timer_state'
```

---

## Streak Calculation (Detailed)

### Algorithm

```
Input: daily_stats[] sorted by date DESC, today's date

1. Normalize today to UTC date (strip time)
2. Set pointer = today
3. Check if today has a streak_day entry:
   - Yes: include today, set pointer = today - 1 day
   - No: set pointer = yesterday (grace period: streak not broken yet)
4. Walk backwards from pointer:
   - If date has streak_day = true: increment currentStreak, move to previous day
   - If date has no entry or streak_day = false: stop
5. currentStreak = count of consecutive study days (including today if applicable)
6. For longestStreak: scan all data, find maximum consecutive streak_day = true sequence
```

### Streak Freeze Logic

```
When user applies a freeze for date D:
1. Verify D is yesterday (can only freeze the most recent missed day)
2. Verify user_profiles.streak_freeze_count > 0
3. UPSERT daily_stats SET streak_day = true, total_minutes = 0 WHERE date = D
4. UPDATE user_profiles SET streak_freeze_count = streak_freeze_count - 1
5. Invalidate streak cache on client
```

---

## Daily Stats Aggregation (Detailed)

### Trigger Points

Daily stats are recalculated whenever:
1. A session is **created** (manual or timer finalized)
2. A session is **updated** (duration or modules changed)
3. A session is **deleted**
4. A streak freeze is **applied**

### Aggregation Query

```sql
-- Upsert daily_stats for a specific user and date
INSERT INTO daily_stats (user_id, date, total_minutes, session_count, modules_completed, courses_studied, streak_day)
SELECT
  :user_id,
  :date,
  COALESCE(SUM(duration_minutes), 0),
  COUNT(*),
  COALESCE(SUM(modules_completed), 0),
  ARRAY_AGG(DISTINCT course_id) FILTER (WHERE course_id IS NOT NULL),
  COALESCE(SUM(duration_minutes), 0) >= 15
FROM study_sessions
WHERE user_id = :user_id
  AND DATE(started_at AT TIME ZONE 'UTC') = :date
  AND ended_at IS NOT NULL  -- exclude active timer sessions
ON CONFLICT (user_id, date) DO UPDATE SET
  total_minutes = EXCLUDED.total_minutes,
  session_count = EXCLUDED.session_count,
  modules_completed = EXCLUDED.modules_completed,
  courses_studied = EXCLUDED.courses_studied,
  streak_day = EXCLUDED.streak_day,
  updated_at = now();
```

---

## UI Mockups

### Progress Overview Page (`/progress`)

```
+----------------------------------------------------------+
|  Progress Overview                                        |
+----------------------------------------------------------+
|                                                           |
|  +-------------+  +-------------+  +-------------+       |
|  |   12        |  |   2.5h      |  |   3         |       |
|  |   Day       |  |   Today     |  |   Sessions  |       |
|  |   Streak    |  |             |  |   Today     |       |
|  +-------------+  +-------------+  +-------------+       |
|                                                           |
|  Daily Goal: [=========>--------] 67% (40/60 min)         |
|                                                           |
|  +---------------------------------------------------+   |
|  | Streak Calendar (last 90 days)                     |   |
|  | Mo Tu We Th Fr Sa Su                               |   |
|  | .  .  #  #  #  .  #   <- # = study day, . = none  |   |
|  | #  #  .  #  #  #  .                                |   |
|  | #  #  #  *  #  #  #   <- * = freeze day            |   |
|  +---------------------------------------------------+   |
|  Longest streak: 18 days  |  Freezes remaining: 2         |
|  [Use Streak Freeze]                                      |
|                                                           |
|  This Week              vs Last Week                      |
|  +------------------+  +------------------+               |
|  | 8.5 hours (+12%) |  | Mon [===]        |               |
|  | 6 sessions       |  | Tue [=====]      |               |
|  | 5/7 active days  |  | Wed [==]         |               |
|  | 42 min avg       |  | Thu [======]     |               |
|  +------------------+  | Fri [====]       |               |
|                         | Sat [=]          |               |
|                         | Sun [-]          |               |
|                         +------------------+               |
|                                                           |
|  [Log Session]  [Start Timer]                             |
|                                                           |
|  Recent Sessions                                          |
|  +---------------------------------------------------+   |
|  | React Course  | 45 min  | Today    | Ch.5  | ...  |   |
|  | Python ML     | 30 min  | Today    | Lab 3 | ...  |   |
|  | React Course  | 60 min  | Yesterday| Ch.4  | ...  |   |
|  | Data Struct.  | 25 min  | Feb 16   | Wk 3  | ...  |   |
|  +---------------------------------------------------+   |
|  [Load More]                                              |
|                                                           |
+----------------------------------------------------------+
```

### Timer Page (`/progress/timer`)

```
+----------------------------------------------------------+
|  Timer Mode                                               |
+----------------------------------------------------------+
|                                                           |
|  Course: [React - The Complete Guide          v]          |
|                                                           |
|                  +-------------------+                    |
|                  |                   |                     |
|                  |     01:23:45      |                     |
|                  |                   |                     |
|                  +-------------------+                    |
|                                                           |
|            [Pause]       [Stop & Save]                    |
|                                                           |
|  Modules completed: [-]  2  [+]                           |
|                                                           |
|  Notes:                                                   |
|  +---------------------------------------------------+   |
|  | Finished chapter 5, started chapter 6 exercises    |   |
|  +---------------------------------------------------+   |
|                                                           |
+----------------------------------------------------------+
```

### Log Session Page (`/progress/log`)

```
+----------------------------------------------------------+
|  Log Study Session                                        |
+----------------------------------------------------------+
|                                                           |
|  Course *                                                 |
|  [Select a course...                          v]          |
|                                                           |
|  Date *                                                   |
|  [February 19, 2026                       ] [cal]         |
|                                                           |
|  Duration *                                               |
|  [-5]  [  45  ] minutes  [+5]                             |
|                                                           |
|  Modules Completed                                        |
|  [-]  [  2  ]  [+]                                        |
|                                                           |
|  Notes (optional)                                         |
|  +---------------------------------------------------+   |
|  |                                                    |   |
|  +---------------------------------------------------+   |
|  0/500 characters                                         |
|                                                           |
|  [Cancel]                      [Log Session]              |
|                                                           |
+----------------------------------------------------------+
```

---

## Component Tree

```
ProgressPage (/progress)
  +-- StreakDisplay
  |     +-- StreakCalendar
  |     +-- StreakFreezeButton
  +-- DailyStatsSummary
  +-- WeeklyStatsSummary
  +-- QuickActions (Link to /progress/log, Link to /progress/timer)
  +-- SessionList
        +-- SessionItem (x N)
              +-- SessionEditDialog

TimerPage (/progress/timer)
  +-- StudyTimer
        +-- TimerCourseSelect
        +-- TimerDisplay
        +-- TimerControls
        +-- ModuleChecklist
        +-- NotesInput (Textarea)

LogSessionPage (/progress/log)
  +-- SessionLogForm
        +-- CourseSelect (shadcn Select)
        +-- DatePicker (shadcn Calendar + Popover)
        +-- DurationInput (number + stepper)
        +-- ModulesInput (number + stepper)
        +-- NotesTextarea (shadcn Textarea)
```

---

## State Management

| Concern | Solution | Details |
|---|---|---|
| Session list data | React Query (`useInfiniteQuery`) | Key: `['sessions', filters]`, stale: 30s |
| Daily/weekly stats | React Query (`useQuery`) | Key: `['daily-stats', dateRange]`, stale: 30s |
| Streak data | React Query (`useQuery`) | Key: `['streak']`, stale: 60s |
| Timer state | `useRef` (interval) + `useState` + `localStorage` | NOT in React Query; local-only, persisted to localStorage |
| Form state | React `useState` / React Hook Form | Per-component, no global store needed |
| Optimistic updates | React Query mutation with `onMutate` | Session create/edit/delete update cache immediately |

---

## Type Definitions

```typescript
interface StudySession {
  id: string;
  user_id: string;
  course_id: string;
  started_at: string;       // ISO datetime
  ended_at: string | null;  // null = active timer
  duration_minutes: number;
  session_type: 'manual' | 'timer';
  modules_completed: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (not in table)
  course_title?: string;
  course_platform?: string;
}

interface DailyStat {
  id: string;
  user_id: string;
  date: string;             // YYYY-MM-DD
  total_minutes: number;
  session_count: number;
  modules_completed: number;
  courses_studied: string[];  // UUID[]
  streak_day: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Session create fails (DB error) | Show toast with error message, form remains filled |
| Timer auto-save fails | Retry once after 10 seconds; if still fails, log warning but keep timer running |
| Timer session recovery - session not found | Clear localStorage, show info toast "Previous session was already saved" |
| Streak calculation with missing data | Treat missing dates as non-study days |
| Daily stats aggregation conflict | Use `ON CONFLICT` upsert; log but don't throw |
| Network offline during timer | Timer continues locally; auto-save retries when online |

---

## Testing Plan

### Unit Tests

| Test | File | Cases |
|---|---|---|
| Streak calculation | `streak-calculator.test.ts` | No data; single day; consecutive days; gap breaks streak; freeze preserves streak; today vs yesterday grace; longest streak in past; timezone boundaries |
| Stats aggregation | `stats-aggregator.test.ts` | Empty week; partial week; full week; week comparison deltas; zero previous week (avoid divide-by-zero) |
| Session validation | `session-validation.test.ts` | Valid input; missing required fields; duration out of range; future date rejected; notes too long |
| Timer state machine | `use-timer.test.ts` | Start/pause/resume/stop transitions; auto-save interval fires; localStorage save/restore; recovery flow |

### Integration Tests

| Test | Scope |
|---|---|
| Session CRUD | Create manual session -> verify daily_stats updated -> edit session -> verify stats recalculated -> delete session -> verify stats recalculated |
| Timer flow | Start timer -> auto-save fires -> pause -> resume -> stop -> verify session in DB with correct duration |
| Streak freeze | Apply freeze -> verify streak continues -> verify freeze count decremented |

---

## Performance Considerations

- **Session list**: Cursor-based pagination (not offset) for consistent performance
- **Daily stats**: Pre-aggregated table avoids expensive real-time aggregation on each page load
- **Streak calendar**: Fetches only 90 days of daily_stats (small payload)
- **Timer interval**: 1-second `setInterval` is lightweight; auto-save DB call only every 60 seconds
- **Indexes**: Composite indexes on `(user_id, started_at)` and `(user_id, date)` for fast lookups

---

## "Do Not Touch" Boundaries

This block:
- **DOES NOT** perform AI analysis on study patterns (that is B4's responsibility)
- **DOES NOT** send notifications or reminders (that is B6's responsibility)
- **DOES NOT** render charts or data visualizations (that is B8's responsibility)
- **DOES NOT** manage course CRUD (that is B2's responsibility)
- **DOES NOT** handle user authentication or profile management (that is B1's responsibility)
- **DOES NOT** import code from any other block; communicates only through database tables

This block **ONLY** logs study sessions, manages timer state, computes streaks, and aggregates daily/weekly statistics.
