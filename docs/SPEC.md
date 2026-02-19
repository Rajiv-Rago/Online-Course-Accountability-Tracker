# Course Accountability Tracker - Product Specification

**Version:** 1.0.0
**Last Updated:** 2026-02-19
**Status:** Draft
**Stack:** Next.js 14+ (App Router), TypeScript, Supabase (Postgres + Auth + Realtime), OpenAI GPT-4, Vercel

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Profile & Onboarding Flow](#2-user-profile--onboarding-flow)
3. [Course Management (CRUD)](#3-course-management-crud)
4. [Progress Tracking (4 Methods)](#4-progress-tracking-4-methods)
5. [AI Analysis Engine](#5-ai-analysis-engine)
6. [Dashboard](#6-dashboard)
7. [Notifications (5 Channels)](#7-notifications-5-channels)
8. [Social Features](#8-social-features)
9. [Visualization](#9-visualization)
10. [Settings & Preferences](#10-settings--preferences)
11. [Non-Functional Requirements](#11-non-functional-requirements)

---

## 1. Product Overview

### 1.1 Vision

Course Accountability Tracker is an AI-powered web application that solves the number one problem with online learning: completion rates. Industry data shows that fewer than 15% of enrolled online course students finish what they start. This app uses behavioral nudging, AI-driven risk analysis, social accountability, and detailed progress tracking to dramatically increase course completion rates.

### 1.2 Target Users

| Segment | Description | Key Needs |
|---------|-------------|-----------|
| **Career Switchers** | Professionals learning new skills via online courses (e.g., learning to code, UX design, data science) | Structure, deadline management, motivation |
| **Lifelong Learners** | Curious individuals taking courses across many topics | Organization, prioritization, avoiding overcommitment |
| **Students** | University or bootcamp students supplementing with online courses | Time management, progress tracking, accountability |
| **Team Leads** | Managers encouraging team upskilling | Visibility into team learning progress (future scope) |

### 1.3 Value Proposition

- **AI-Powered Accountability:** GPT-4 analyzes study patterns and provides personalized interventions before a user falls off track.
- **Multi-Method Tracking:** Flexible logging (manual entry, timer, checkboxes) accommodates every learning style.
- **Social Motivation:** Study buddy matching and achievement sharing create peer accountability.
- **Actionable Insights:** Visualizations and AI reports surface patterns users cannot see themselves.
- **Zero Friction:** The app meets users where they are -- no forced workflows, progressive complexity.

### 1.4 Core Metrics (Product KPIs)

| Metric | Target |
|--------|--------|
| Course completion rate among active users | > 40% (vs. 15% industry baseline) |
| Weekly active users (WAU) / Monthly active users (MAU) | > 60% |
| Average study sessions per week per active user | >= 3 |
| Day-7 retention | > 50% |
| Day-30 retention | > 30% |

### 1.5 Technical Architecture Summary

```
Browser (Next.js App Router, React Server Components)
  |
  v
Vercel Edge Network (hosting, serverless functions, cron)
  |
  v
Supabase
  |- Postgres (data storage, RLS policies)
  |- Auth (email/password, OAuth providers)
  |- Realtime (live buddy updates, notifications)
  |- Storage (avatars, exports)
  |
  v
OpenAI GPT-4 API (analysis pipeline, called from server-side only)
```

---

## 2. User Profile & Onboarding Flow

### 2.1 Authentication

#### 2.1.1 Sign Up

**Route:** `/auth/signup`

**Methods:**
- **Email/Password:** User provides email and password. Password requirements: minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number.
- **Google OAuth:** Single-click sign-up via Google. Uses Supabase Auth with Google provider.
- **GitHub OAuth:** Single-click sign-up via GitHub. Uses Supabase Auth with GitHub provider.

**Flow:**
1. User visits `/auth/signup`.
2. User chooses authentication method.
3. For email/password:
   a. User enters email and password.
   b. Client-side validation runs (email format, password strength meter with visual indicator).
   c. On submit, call `supabase.auth.signUp({ email, password })`.
   d. Supabase sends a confirmation email.
   e. User sees a "Check your email" screen with a resend link (resend throttled to once per 60 seconds).
   f. On email confirmation, user is redirected to onboarding wizard.
4. For OAuth:
   a. User clicks "Continue with Google" or "Continue with GitHub".
   b. Supabase handles the OAuth redirect flow.
   c. On successful auth, user is redirected to onboarding wizard (if first login) or dashboard (if returning).

**Edge Cases:**
- Email already registered: Show inline error "An account with this email already exists. Try signing in instead." with link to `/auth/login`.
- OAuth email conflict: If a user signed up with email/password and later tries OAuth with the same email, Supabase links the accounts automatically. Show a toast: "We linked your Google account to your existing account."
- Network failure during signup: Show retry button with error message.
- Confirmation email not received: "Check your spam folder" hint, plus resend button.

#### 2.1.2 Sign In

**Route:** `/auth/login`

**Methods:** Same three as sign-up (email/password, Google, GitHub).

**Flow:**
1. User enters credentials or clicks OAuth button.
2. On success, redirect to `/dashboard`.
3. On failure, show inline error: "Invalid email or password. Please try again."

**Additional:**
- "Forgot password?" link leads to `/auth/reset-password`.
- Password reset sends an email with a magic link. Link expires after 1 hour.
- After 5 failed login attempts within 15 minutes, show CAPTCHA (hCaptcha).

#### 2.1.3 Session Management

- Sessions are managed by Supabase Auth with JWT tokens.
- Access tokens expire after 1 hour; refresh tokens are used automatically.
- "Remember me" checkbox extends the session to 30 days (persists refresh token).
- Signing out clears all tokens and redirects to `/auth/login`.

### 2.2 Onboarding Wizard

**Route:** `/onboarding` (protected, only accessible to authenticated users with `onboarding_completed = false`)

The onboarding wizard is a 4-step guided flow. Users can navigate back to previous steps. A progress indicator (step dots) is shown at the top. The wizard can be skipped entirely via a "Skip for now" link (sets sensible defaults), but a persistent banner on the dashboard will remind the user to complete it.

#### Step 1: Learning Goals

**UI:** Full-screen centered card with illustration.

**Fields:**
- **Primary goal** (required, single select radio):
  - "Switch careers"
  - "Get a promotion"
  - "Learn for fun"
  - "Build a project"
  - "Prepare for certification"
  - "Other" (shows text input for custom goal)
- **How many courses are you currently taking?** (required, single select):
  - "None yet - just getting started"
  - "1-2 courses"
  - "3-5 courses"
  - "More than 5"
- **What is your biggest challenge with online courses?** (optional, multi-select checkboxes):
  - "Staying motivated"
  - "Finding time"
  - "Too many courses at once"
  - "Forgetting to study"
  - "Courses feel too long"
  - "Getting stuck on difficult material"

**Defaults if skipped:** primary_goal = "Learn for fun", current_courses = "None yet", challenges = [].

#### Step 2: Study Schedule

**UI:** Interactive weekly calendar grid.

**Fields:**
- **Preferred study days** (required, multi-select day pills): Mon, Tue, Wed, Thu, Fri, Sat, Sun. Defaults to Mon-Fri.
- **Preferred study time** (required, single select dropdown):
  - "Early morning (5-8 AM)"
  - "Morning (8-11 AM)"
  - "Afternoon (12-3 PM)"
  - "Evening (5-8 PM)"
  - "Night (8-11 PM)"
  - "Late night (11 PM-2 AM)"
- **Target hours per week** (required, number input with stepper, range 1-40, default 5):
  - Visual hint: "Most successful learners on our platform study 5-10 hours per week."
- **Timezone** (required, auto-detected from browser via `Intl.DateTimeFormat().resolvedOptions().timeZone`, editable dropdown with search).

**Defaults if skipped:** days = Mon-Fri, time = "Evening (5-8 PM)", hours = 5, timezone = auto-detected.

#### Step 3: Experience Level

**UI:** Card selection with icons.

**Fields:**
- **Experience with online learning** (required, single select card):
  - "Beginner" - "I have not completed an online course before" (icon: seedling)
  - "Intermediate" - "I have completed 1-5 courses" (icon: plant)
  - "Advanced" - "I have completed 6+ courses" (icon: tree)
- **Technical comfort level** (required, single select):
  - "I prefer simple interfaces"
  - "I like detailed data and charts"
  - "Show me everything"

**Defaults if skipped:** experience = "Beginner", comfort = "I prefer simple interfaces".

#### Step 4: Motivation Style

**UI:** Personality-quiz style cards with example messages.

**Fields:**
- **Motivation style** (required, single select card with preview):
  - **Gentle Encouragement:** Preview shows: "Great job studying today! Every small step counts. Maybe try 15 more minutes tomorrow?"
  - **Tough Love:** Preview shows: "You have not studied in 3 days. Your completion date is slipping. Time to get back on track -- no excuses."
  - **Data-Driven:** Preview shows: "Your study velocity has decreased 23% this week. At current pace, you will miss your target by 12 days. Recommended: add 2 sessions this week."
- **Enable study reminders?** (toggle, default on):
  - If on, show: "We will remind you at your preferred study time."

**Defaults if skipped:** style = "Gentle Encouragement", reminders = true.

#### Completion

On finishing the wizard (or skipping):
1. Save all preferences to `user_profiles` table.
2. Set `onboarding_completed = true`.
3. Redirect to `/dashboard`.
4. Show a welcome toast: "Welcome to Course Accountability Tracker! Add your first course to get started."
5. If no courses exist, show an empty state on dashboard with prominent "Add Your First Course" CTA.

### 2.3 User Profile

**Route:** `/profile`

#### 2.3.1 Profile Display

- Avatar (circular, 120px, with upload overlay on hover)
- Display name
- Email (read-only, change via settings)
- Member since date
- Stats summary: total courses, completed courses, total study hours, longest streak
- Active achievements (top 3, clickable to see all)
- Current motivation style badge

#### 2.3.2 Profile Editing

**Route:** `/profile/edit`

**Editable Fields:**
- **Display name** (text, 2-50 characters, required)
- **Avatar** (image upload):
  - Accepted formats: JPG, PNG, WebP
  - Max file size: 2 MB
  - Upload to Supabase Storage bucket `avatars`
  - Auto-crop to square with client-side preview
  - On upload failure: show error toast, keep previous avatar
- **Bio** (textarea, 0-250 characters, optional)
- **Primary goal** (same options as onboarding)
- **Motivation style** (same options as onboarding)
- **Study schedule** (same UI as onboarding step 2)

**Save behavior:** Optimistic UI update. On save failure, revert and show error toast.

### 2.4 Settings

**Route:** `/settings`

Organized as a tabbed interface with the following tabs:

#### Tab: Account
- Change email (requires current password confirmation)
- Change password (requires current password, new password, confirm new password)
- Delete account (requires typing "DELETE" to confirm, 7-day grace period before permanent deletion, sends confirmation email)

#### Tab: Notifications
- See Section 7 for full detail.

#### Tab: Preferences
- **Timezone** (dropdown with search)
- **Theme** (toggle: Light / Dark / System). Persisted in `user_profiles.theme` and applied via `next-themes`.
- **Default session duration** (number input, 15-180 minutes, default 30)
- **Break reminder interval** (number input, 0-120 minutes, default 25, 0 = off). Shows a non-blocking toast: "Time for a break! You have been studying for 25 minutes."
- **Week starts on** (Monday or Sunday)

#### Tab: Data & Privacy
- **Export data** (button): Generates a ZIP containing:
  - `courses.json` / `courses.csv`
  - `sessions.json` / `sessions.csv`
  - `achievements.json`
  - `profile.json`
  - Export is generated server-side as a Vercel serverless function and download link is emailed (for large datasets) or downloaded directly (if < 5 MB).
- **Connected accounts**: Shows linked OAuth providers with option to unlink (cannot unlink the last auth method).

#### Tab: Integrations
- Slack webhook URL configuration (see Section 7)
- Discord webhook URL configuration (see Section 7)
- Test connection button for each

---

## 3. Course Management (CRUD)

### 3.1 Data Model

```
courses {
  id: uuid (PK, default gen_random_uuid())
  user_id: uuid (FK -> auth.users, NOT NULL)
  title: text (NOT NULL, 1-200 chars)
  platform: text (NOT NULL, enum: 'udemy' | 'coursera' | 'youtube' | 'skillshare' | 'pluralsight' | 'linkedin_learning' | 'edx' | 'custom')
  url: text (nullable, valid URL format)
  total_modules: integer (nullable, >= 1)
  total_hours: numeric(6,2) (nullable, >= 0.25)
  completed_modules: integer (default 0, >= 0)
  logged_hours: numeric(8,2) (default 0)
  target_completion_date: date (nullable)
  priority: integer (NOT NULL, 1-4, default 2)
  status: text (NOT NULL, default 'not_started', enum: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'abandoned')
  notes: text (nullable, 0-5000 chars)
  color: text (nullable, hex color for UI accent)
  sort_order: integer (NOT NULL, default 0)
  created_at: timestamptz (default now())
  updated_at: timestamptz (default now(), auto-updated via trigger)
  completed_at: timestamptz (nullable)
  abandoned_at: timestamptz (nullable)
  paused_at: timestamptz (nullable)
}
```

**RLS Policies:**
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`
- DELETE: `auth.uid() = user_id`

### 3.2 Add Course

**Route:** `/courses/new`
**Also accessible via:** Modal from dashboard "Add Course" button.

**Form Fields:**

| Field | Type | Required | Validation | Default |
|-------|------|----------|------------|---------|
| Title | text input | Yes | 1-200 chars | - |
| Platform | select dropdown | Yes | Must be valid enum value | "custom" |
| URL | text input | No | Valid URL format (https:// prefix auto-added if missing) | - |
| Total Modules | number input | No | Integer >= 1 | - |
| Total Hours | number input | No | Number >= 0.25, step 0.25 | - |
| Target Completion Date | date picker | No | Must be today or future date | - |
| Priority | segmented control | Yes | 1-4 | 2 |
| Notes | textarea | No | 0-5000 chars | - |
| Color | color picker (preset palette + custom) | No | Valid hex | Auto-assigned from palette |

**Priority Levels:**
- **P1 - Critical:** "Must complete ASAP" (red indicator)
- **P2 - High:** "Important, has a deadline" (orange indicator)
- **P3 - Medium:** "Working on it" (blue indicator)
- **P4 - Low:** "When I get to it" (gray indicator)

**Platform-Specific Behavior:**
- When a platform is selected, the URL field shows a placeholder with an example URL for that platform.
- When a URL is pasted first, the app attempts to auto-detect the platform from the domain.
- Platform icons are displayed next to the platform name in all UI contexts.

**Form Submission:**
1. Client-side validation (all fields).
2. POST to `/api/courses` (Next.js Route Handler).
3. Server-side validation (repeat all checks).
4. Insert into `courses` table with `sort_order` = max existing sort_order + 1.
5. Return created course.
6. Client navigates to `/dashboard` with success toast: "Course added! Start tracking your progress."

**Edge Cases:**
- Duplicate course title: Allowed (users may retake courses). No uniqueness constraint.
- Very long URL: Truncated in display with ellipsis, full URL on hover tooltip.
- Past target completion date: Rejected with error "Target date must be today or in the future."

### 3.3 Edit Course

**Route:** `/courses/[id]/edit`
**Also accessible via:** Edit button on course card (pencil icon).

Same form as Add Course, pre-populated with current values. Additional fields visible:
- **Status** (read-only display; changed via status transition buttons, not free-form editing).
- **Created date** (read-only).
- **Total logged hours** (read-only).

**Save:** PATCH to `/api/courses/[id]`. Optimistic UI update.

### 3.4 Course Status Transitions

Statuses follow a state machine. Not all transitions are valid.

```
                   +---> paused ---+
                   |               |
not_started --> in_progress -------+--> completed
                   |               |
                   +---> abandoned |
                                   |
              paused --------------+---> abandoned
```

**Valid Transitions:**

| From | To | Trigger | Confirmation Required |
|------|----|---------|-----------------------|
| not_started | in_progress | User logs first session OR clicks "Start Course" | No |
| in_progress | paused | User clicks "Pause Course" | Yes: "Pause this course? You can resume anytime." |
| in_progress | completed | User clicks "Mark Complete" OR modules completed = total modules | Yes: "Congratulations! Mark this course as completed?" |
| in_progress | abandoned | User clicks "Abandon Course" | Yes: "Are you sure? This will mark the course as abandoned. You can always restart it later." (requires typing course title to confirm) |
| paused | in_progress | User clicks "Resume Course" | No |
| paused | abandoned | User clicks "Abandon Course" | Yes (same as above) |
| completed | in_progress | User clicks "Retake Course" | Yes: "This will reset your progress. Continue?" (resets completed_modules to 0, logged_hours preserved) |
| abandoned | in_progress | User clicks "Restart Course" | Yes: "Restart this course? Previous progress data will be preserved for reference." |

**On Transition:**
- Update `status` field.
- Set relevant timestamp (`completed_at`, `abandoned_at`, `paused_at`) or null it out on resume/restart.
- If transitioning to `completed`: trigger achievement checks, send notification.
- If transitioning to `abandoned`: the AI pipeline excludes this course from future analysis.

### 3.5 Course Cards

Course cards are the primary UI element for courses, displayed in a responsive grid on the dashboard and `/courses` page.

**Card Layout:**

```
+--------------------------------------------------+
| [Platform Icon] Course Title              [P1] |
| Platform Name                                    |
|--------------------------------------------------|
| Progress: [=========>        ] 62%               |
|                                                  |
| [clock icon] 14.5 hrs logged                     |
| [calendar icon] 23 days remaining                |
| [fire icon] 7-day streak                         |
| [warning icon] Risk: Medium (42)                 |
|--------------------------------------------------|
| [Start Timer] [Log Session] [Edit] [...]         |
+--------------------------------------------------+
```

**Card Data Points:**
- **Progress percentage:** `(completed_modules / total_modules * 100)` if modules set, else `(logged_hours / total_hours * 100)` if hours set, else shows "No target set" with a link to set one.
- **Days remaining:** Calendar days until `target_completion_date`. Shows "Overdue by X days" in red if past. Shows "No deadline" if not set.
- **Streak:** Consecutive calendar days with at least one session logged for this course. Calculated from `study_sessions` table.
- **Risk level:** From AI analysis. Color-coded: green (low), yellow (medium), orange (high), red (critical). Not shown if AI has not run yet (shows "Analyzing..." with a spinner on first day).

**Card States:**
- **not_started:** Muted appearance, "Start" CTA button.
- **in_progress:** Full color, all metrics visible.
- **paused:** Slightly muted, "Paused" badge overlay, "Resume" CTA button.
- **completed:** Green checkmark overlay, celebration confetti animation on first view, "Completed" badge.
- **abandoned:** Grayed out, "Abandoned" badge, moved to bottom of list by default.

### 3.6 Course List View

**Route:** `/courses`

**Features:**
- Toggle between grid view (cards) and list view (table).
- **Filters:**
  - Status: All, Active (not_started + in_progress), Paused, Completed, Abandoned
  - Platform: All, or specific platform
  - Priority: All, P1, P2, P3, P4
  - Risk: All, Low, Medium, High, Critical
- **Sort:**
  - Custom order (drag-and-drop, default)
  - Priority (P1 first)
  - Progress (least to most, or most to least)
  - Target date (soonest first)
  - Recently updated
  - Title (A-Z)
- **Search:** Text search across course title and notes. Debounced at 300ms.

### 3.7 Bulk Operations

Activated by a "Select" toggle button that puts the list into multi-select mode with checkboxes.

**Available Bulk Actions (appear in a toolbar when 1+ courses selected):**
- **Archive:** Moves selected courses to abandoned status (with single confirmation dialog for all).
- **Change Priority:** Opens a priority picker. Applies selected priority to all selected courses.
- **Change Status:** Opens a status picker with only valid shared transitions.
- **Delete:** Permanently deletes selected courses and all associated data. Requires typing "DELETE" to confirm. This is a hard delete, not recoverable.

**Select All:** Checkbox in header selects all currently visible (filtered) courses.

### 3.8 Drag-and-Drop Reordering

- Available in grid view and list view.
- Uses a drag handle (grip dots icon) on the left of each card/row.
- On drop, updates `sort_order` for all affected courses in a single batch PATCH request.
- Optimistic UI: reorder happens immediately, reverts on server error.
- Disabled when a sort other than "Custom order" is active. Shows tooltip: "Switch to custom order to reorder courses."
- Keyboard accessible: select item with Enter, move with arrow keys, confirm with Enter.

---

## 4. Progress Tracking (4 Methods)

### 4.1 Data Model

```
study_sessions {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  course_id: uuid (FK -> courses, NOT NULL)
  started_at: timestamptz (NOT NULL)
  ended_at: timestamptz (nullable, null if timer is active)
  duration_minutes: numeric(8,2) (NOT NULL, computed on end)
  modules_completed: integer (default 0, >= 0)
  notes: text (nullable, 0-2000 chars)
  method: text (NOT NULL, enum: 'manual' | 'timer' | 'module' | 'auto_sync')
  created_at: timestamptz (default now())
}

daily_stats {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  course_id: uuid (FK -> courses, nullable; null = aggregated across all courses)
  date: date (NOT NULL)
  total_minutes: numeric(8,2) (default 0)
  sessions_count: integer (default 0)
  modules_completed: integer (default 0)
  created_at: timestamptz (default now())
  UNIQUE(user_id, course_id, date)
}

streaks {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  course_id: uuid (FK -> courses, nullable; null = global streak)
  current_streak: integer (default 0)
  longest_streak: integer (default 0)
  last_study_date: date (nullable)
  streak_freezes_remaining: integer (default 1)
  updated_at: timestamptz (default now())
  UNIQUE(user_id, course_id)
}
```

**RLS Policies:** Same pattern as courses -- users can only access their own rows.

### 4.2 Method 1: Manual Entry

**Access:** "Log Session" button on course card, or `/courses/[id]/log`.

**Form Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Date | date picker | Yes | Cannot be in the future, default today |
| Duration | time picker (hours + minutes) | Yes | Minimum 1 minute, maximum 24 hours |
| Modules completed | number input | No | >= 0, cannot exceed remaining modules |
| Notes | textarea | No | 0-2000 chars |

**Submission Flow:**
1. Validate all fields.
2. Create `study_sessions` record with `method = 'manual'`. Set `started_at` to the selected date at midnight in user's timezone, `ended_at` to started_at + duration, `duration_minutes` to entered duration.
3. Update `courses.logged_hours` += duration.
4. Update `courses.completed_modules` += modules completed.
5. Upsert `daily_stats` for the date (increment totals).
6. Recalculate streak for this course and global streak.
7. Check achievement triggers.
8. If `completed_modules >= total_modules`, prompt to mark course as completed.
9. Show success toast: "Session logged! You studied for X hours Y minutes."

**Edge Cases:**
- Logging a session for a past date that breaks a streak: Streaks are recalculated from session history, not just incremented. Backfilling a past date can extend a historical streak and potentially reconnect the current streak.
- Logging more modules than remaining: Error message "You only have X modules remaining. Did you mean to mark the course complete?"
- Logging a session for an `abandoned` or `completed` course: Blocked. Toast: "This course is [abandoned/completed]. Resume or restart it to log sessions."

### 4.3 Method 2: Timer Mode

**Access:** "Start Timer" button on course card, or persistent timer widget in the app header.

**Timer States:**
- **Idle:** Timer shows `00:00:00`. "Start" button visible.
- **Running:** Timer counts up in `HH:MM:SS`. "Pause" and "Stop" buttons visible. Course title shown above timer.
- **Paused:** Timer frozen. "Resume" and "Stop" buttons visible. Pulsing animation on the timer display.

**Timer UI:**
- When a timer is running, a mini timer badge appears in the app header/navbar visible on all pages. Clicking it expands to the full timer view.
- The timer page (`/timer`) shows a large, centered timer display with the course name, elapsed time, and control buttons.

**Timer Behavior:**

1. **Start:**
   - User selects a course from a dropdown (only `in_progress` courses shown, sorted by last studied).
   - Click "Start" creates a `study_sessions` record with `started_at = now()`, `ended_at = null`, `method = 'timer'`.
   - Timer begins counting.

2. **Auto-save (every 60 seconds):**
   - While running, the client sends a heartbeat PATCH to `/api/sessions/[id]` every 60 seconds updating `duration_minutes`.
   - This protects against data loss from browser crashes, tab closure, or network loss.
   - Implementation: `setInterval` with `navigator.sendBeacon` as fallback on `beforeunload`.

3. **Pause:**
   - Pauses the client-side counter. Does not create a new record.
   - Auto-save still fires to persist the current duration.

4. **Resume:**
   - Resumes counting from where it paused.

5. **Stop:**
   - Opens a session summary dialog:
     - Shows total duration.
     - "Modules completed this session" (number input, optional).
     - "Session notes" (textarea, optional).
   - On confirm: PATCH the session record with final `ended_at`, `duration_minutes`, `modules_completed`, `notes`. Update course and daily stats. Recalculate streak. Check achievements.
   - On cancel: Stay on timer (do not discard).

6. **Discard:**
   - Available as a secondary action: "Discard this session".
   - Confirmation required: "Discard this session? Time tracked will not be saved."
   - Deletes the `study_sessions` record.

**Edge Cases:**
- Browser tab closed while timer running: The last auto-save (within 60 seconds) is preserved. On next app visit, if a session with `ended_at = null` exists, show a recovery dialog: "You have an unfinished session from [date/time] ([duration] minutes). Resume timer, save and close, or discard?"
- Multiple timers: Only one timer can be active at a time. Starting a new timer while one is running prompts: "You have a timer running for [Course A]. Stop it before starting a new one?"
- Timer running for > 8 hours: Show a notification toast: "You have been studying for over 8 hours. Consider taking a break!" (does not auto-stop).
- Offline: Timer continues locally. Auto-save retries with exponential backoff. Session is saved when connection restores.

**Break Reminders:**
- If user has configured break reminders (see Settings), a non-blocking toast appears at the interval: "Time for a break! You have been studying for [X] minutes. Stretch, hydrate, rest your eyes."
- Toast auto-dismisses after 10 seconds. Timer is NOT paused.

### 4.4 Method 3: Module Completion

**Access:** `/courses/[id]` course detail page, "Modules" tab.

**UI:** A checklist of modules. If the course has `total_modules` set but no individual module names, the list shows "Module 1", "Module 2", ..., "Module N" with checkboxes.

**Optional Module Names:** Users can optionally name each module. A "Name your modules" button opens an editable list where they can type names for each module.

```
module_items {
  id: uuid (PK)
  course_id: uuid (FK -> courses, NOT NULL)
  user_id: uuid (FK -> auth.users, NOT NULL)
  position: integer (NOT NULL)
  title: text (NOT NULL, default 'Module {position}')
  is_completed: boolean (default false)
  completed_at: timestamptz (nullable)
  UNIQUE(course_id, position)
}
```

**Behavior:**
- Checking a module checkbox:
  1. Sets `is_completed = true`, `completed_at = now()` on the module item.
  2. Increments `courses.completed_modules`.
  3. Creates a `study_sessions` record with `method = 'module'`, `duration_minutes = 0`, `modules_completed = 1`.
  4. Updates daily stats.
  5. Shows brief animation (checkmark fills green).
- Unchecking a module:
  1. Confirmation: "Unmark this module as completed?"
  2. Reverses all the above.
- Checking the last module: Prompts to mark course as completed.

**Edge Cases:**
- Course has no `total_modules` set: Show a prompt "How many modules does this course have?" with a number input. Once set, module items are auto-generated.
- Checking modules out of order: Allowed. No forced sequential completion.

### 4.5 Method 4: Auto-Sync (Future Feature Placeholder)

**Status:** Not implemented in v1. Placeholder UI shown.

**Design:**
- On course detail page, an "Auto-Sync" tab shows: "Coming soon: automatic progress sync with [Platform]. We are working on integrations with Udemy, Coursera, and more."
- A "Notify me" button lets users opt in to an email notification when the feature launches.
- Backend: `course_syncs` table is created but unused. No API endpoints.

```
course_syncs {
  id: uuid (PK)
  course_id: uuid (FK -> courses)
  user_id: uuid (FK -> auth.users)
  platform: text
  external_course_id: text
  last_synced_at: timestamptz
  sync_status: text (enum: 'pending' | 'syncing' | 'synced' | 'error')
}
```

### 4.6 Daily Stats Aggregation

Daily stats are computed in two ways:
1. **Real-time:** Upserted on every session create/update/delete.
2. **Nightly reconciliation:** A Vercel cron job runs at 1:00 AM UTC daily, recomputes all daily stats for the previous day by querying `study_sessions` directly. This catches any inconsistencies.

**Aggregation per (user_id, course_id, date):**
- `total_minutes`: SUM of `duration_minutes` from all sessions that day for that course.
- `sessions_count`: COUNT of sessions.
- `modules_completed`: SUM of `modules_completed`.

**Global daily stats (course_id = NULL):**
- Aggregated across all courses for the user for that date.

### 4.7 Streak Tracking

**Definition:** A streak is the count of consecutive calendar days (in the user's timezone) where at least one study session with `duration_minutes > 0` was logged.

**Calculation:**
- On every session log, recalculate the user's global streak and the per-course streak.
- Compare `last_study_date` with today:
  - Same day: no change.
  - Yesterday: increment `current_streak` by 1.
  - 2+ days ago: reset `current_streak` to 1 (unless a streak freeze is used).
- Update `longest_streak` if `current_streak > longest_streak`.

**Streak Freezes:**
- Each user starts with 1 streak freeze per month (awarded on the 1st of each month, does not stack beyond 2 max).
- A streak freeze automatically activates if the user misses exactly 1 day and has a freeze available.
- On the missed day's evening (8 PM user timezone), a notification is sent: "Your streak was saved by a streak freeze! You have X freezes remaining."
- If the user misses 2+ consecutive days, the streak resets regardless of freezes.

**Streak Display:**
- Dashboard shows global streak with a flame icon. Number is large and prominent.
- Per-course streaks shown on course cards.
- Streak milestones (7, 14, 30, 60, 100, 365 days) trigger achievements.

---

## 5. AI Analysis Engine

### 5.1 Architecture Overview

```
Vercel Cron (2:00 AM UTC daily)
  |
  v
/api/cron/ai-analysis (Route Handler, secured with CRON_SECRET)
  |
  v
For each active user (has logged a session in last 30 days):
  |
  +--> Gather data (last 14 days sessions, course metadata, user prefs)
  +--> Build GPT-4 prompt
  +--> Call OpenAI API
  +--> Parse structured response
  +--> Store in ai_analyses table
  +--> Trigger notifications if risk thresholds crossed
```

### 5.2 Data Model

```
ai_analyses {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  course_id: uuid (FK -> courses, NOT NULL)
  analysis_date: date (NOT NULL)
  risk_score: integer (NOT NULL, 0-100)
  risk_level: text (NOT NULL, enum: 'low' | 'medium' | 'high' | 'critical')
  risk_factors: jsonb (NOT NULL)
  -- Example: [{"factor": "declining_hours", "weight": 0.4, "detail": "Study hours dropped 35% vs last week"}]
  recommendations: jsonb (NOT NULL)
  -- Example: [{"text": "Try a 15-minute session today to rebuild momentum", "priority": 1}]
  patterns: jsonb (nullable)
  -- Example: {"best_day": "Tuesday", "best_time": "19:00", "avg_session_minutes": 42, "optimal_session_length": 35}
  confidence_score: numeric(3,2) (NOT NULL, 0.00-1.00)
  model_version: text (NOT NULL, e.g., 'gpt-4-turbo-2024-04-09')
  prompt_tokens: integer
  completion_tokens: integer
  created_at: timestamptz (default now())
  UNIQUE(user_id, course_id, analysis_date)
}

weekly_reports {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  week_start: date (NOT NULL)
  week_end: date (NOT NULL)
  summary: text (NOT NULL)
  highlights: jsonb (NOT NULL)
  -- Example: [{"type": "achievement", "text": "You completed Module 5 of React Course!"}]
  metrics: jsonb (NOT NULL)
  -- Example: {"total_hours": 8.5, "sessions": 12, "modules_completed": 4, "avg_session_minutes": 42.5}
  trends: jsonb (NOT NULL)
  -- Example: {"hours_change_pct": 15, "streak_status": "growing", "risk_direction": "improving"}
  recommendations: jsonb (NOT NULL)
  ai_confidence: numeric(3,2)
  created_at: timestamptz (default now())
  UNIQUE(user_id, week_start)
}
```

### 5.3 GPT-4 Prompt Design

**System Prompt:**

```
You are an AI study accountability coach. You analyze student study patterns and provide personalized, actionable guidance. You are supportive but honest.

Your response MUST be valid JSON matching the provided schema. Do not include any text outside the JSON object.
```

**User Prompt Template:**

```
Analyze the following student's study data and provide a risk assessment with recommendations.

## Student Profile
- Motivation style: {user.motivation_style}
- Experience level: {user.experience_level}
- Weekly study goal: {user.target_hours_per_week} hours
- Preferred study days: {user.preferred_days}
- Preferred study time: {user.preferred_time}
- Primary goal: {user.primary_goal}

## Course: {course.title}
- Platform: {course.platform}
- Status: {course.status}
- Total modules: {course.total_modules ?? 'Not set'}
- Completed modules: {course.completed_modules}
- Total estimated hours: {course.total_hours ?? 'Not set'}
- Logged hours: {course.logged_hours}
- Target completion date: {course.target_completion_date ?? 'Not set'}
- Days remaining: {days_remaining ?? 'No deadline'}
- Priority: P{course.priority}

## Last 14 Days Study Data
{daily_stats as a table: date | minutes | sessions | modules_completed}

## Current Streak
- Course streak: {course_streak} days
- Global streak: {global_streak} days

## Response Schema
{
  "risk_score": <integer 0-100>,
  "risk_factors": [
    {
      "factor": "<declining_hours|missed_days|low_velocity|behind_schedule|no_recent_activity|inconsistent_schedule>",
      "weight": <float 0-1, how much this factor contributed to the score>,
      "detail": "<human readable explanation>"
    }
  ],
  "recommendations": [
    {
      "text": "<specific, actionable recommendation tailored to the student's motivation style>",
      "priority": <integer 1-3, 1 being most important>
    }
  ],
  "patterns": {
    "best_day": "<day of week or null>",
    "best_time": "<HH:MM or null>",
    "avg_session_minutes": <number>,
    "optimal_session_length": <number or null>,
    "consistency_score": <float 0-1>
  },
  "confidence_score": <float 0-1>,
  "weekly_summary": "<2-3 sentence summary of the week, written in second person, matching the student's motivation_style>"
}
```

**Motivation Style Influence on Recommendations:**

| Style | Tone | Example Recommendation |
|-------|------|----------------------|
| Gentle Encouragement | Warm, supportive, celebrates small wins | "You did amazing on Tuesday! Try to recreate that by setting up the same study environment tomorrow." |
| Tough Love | Direct, no-nonsense, urgency-driven | "You are falling behind schedule. At this pace, you will miss your deadline by 2 weeks. Cancel evening plans and study tonight." |
| Data-Driven | Analytical, metrics-focused, objective | "Your 7-day moving average dropped from 45 to 28 minutes/day. Increasing to 3 sessions of 35 minutes this week will put you back on track for your April 15 deadline." |

### 5.4 Risk Scoring Algorithm

The AI produces the risk score, but it is guided by these heuristics included in the system prompt:

| Factor | Weight | Logic |
|--------|--------|-------|
| Declining study hours | 0.25 | Compare this week's hours to previous week. > 30% drop = high contribution. |
| Missed scheduled days | 0.20 | Count days in preferred study days with no sessions in last 7 days. |
| Behind schedule | 0.20 | Compare actual progress % to expected progress % based on target date. |
| Low velocity | 0.15 | Modules/day or hours/day trending below what is needed to complete by target date. |
| No recent activity | 0.15 | Days since last session. 3+ days = moderate, 7+ days = high. |
| Inconsistent schedule | 0.05 | High variance in session times/durations. |

**Risk Levels:**

| Level | Score Range | Color | UI Treatment | Notification Trigger |
|-------|-------------|-------|--------------|---------------------|
| Low | 0-25 | Green | Subtle green dot | None |
| Medium | 26-50 | Yellow | Yellow warning icon | None (unless rising from low) |
| High | 51-75 | Orange | Orange warning icon with pulse | Email + in-app notification |
| Critical | 76-100 | Red | Red alert badge with pulse | Email + in-app + push notification |

### 5.5 Confidence Scores

Every AI output includes a confidence score (0.00 to 1.00):
- **0.90-1.00:** High confidence. Sufficient data (14+ days of sessions).
- **0.70-0.89:** Medium confidence. Some data gaps (7-13 days of sessions).
- **0.50-0.69:** Low confidence. Limited data (3-6 days of sessions).
- **Below 0.50:** Very low confidence. Insufficient data (< 3 days). Displayed with a disclaimer: "This analysis is based on limited data and may not be accurate yet. Keep logging sessions!"

The confidence score is displayed as a small indicator next to risk scores and recommendations in the UI.

### 5.6 Pattern Detection

Patterns are extracted from the study data and surfaced as insights:

- **Best study day:** Day of the week with the highest average minutes studied.
- **Best study time:** Hour of the day with the most session starts.
- **Optimal session length:** Session duration that correlates with highest module completion rate (if trackable).
- **Consistency score:** Ratio of actual study days to planned study days over the last 14 days.

**UI Surfacing:**
- Pattern insights appear on the course detail page under an "Insights" section.
- Dashboard shows a "tip of the day" based on the strongest pattern: e.g., "You study best on Tuesdays at 7 PM. Your next Tuesday session is scheduled!"

### 5.7 Weekly Reports

**Generation:** Every Sunday at 3:00 AM UTC, a Vercel cron job generates weekly reports for all active users.

**Content:**
- AI-generated narrative summary of the week (2-3 paragraphs, matching motivation style).
- Key metrics: total hours, sessions, modules completed, average session length.
- Trend arrows: hours (up/down/flat compared to previous week), streak status, overall risk direction.
- Highlights: achievements earned, courses completed, notable sessions.
- Recommendations for next week.

**Delivery:**
- Stored in `weekly_reports` table.
- Available on dashboard as an expandable "Weekly Report Card".
- Sent via email (if email notifications enabled).
- Sent to Slack/Discord (if configured).

### 5.8 Rate Limiting and Cost Control

- The analysis pipeline processes users in batches of 50 with a 1-second delay between batches to respect OpenAI rate limits.
- Each user analysis (across all their active courses) is estimated at ~1,000-2,000 tokens. Budget: ~$0.10/user/day.
- If OpenAI API returns a rate limit error (429), the pipeline retries with exponential backoff (1s, 2s, 4s, max 3 retries).
- If OpenAI API is down, the pipeline logs the failure and retries at the next scheduled run. No stale data is served; the last successful analysis remains visible.
- A monthly cost cap can be configured via environment variable `AI_MONTHLY_BUDGET_USD`. If exceeded, analysis is paused and an admin alert is sent.

---

## 6. Dashboard

### 6.1 Route and Layout

**Route:** `/dashboard` (protected, redirects to `/auth/login` if not authenticated)

**Layout:** Full-width page with a responsive grid layout. Sidebar navigation on desktop (collapsed to hamburger on mobile).

### 6.2 Page Sections (Top to Bottom)

#### 6.2.1 Header Bar

- Greeting: "Good [morning/afternoon/evening], [Display Name]!" (time-aware based on user's timezone)
- Current date in user's locale
- Global streak badge: flame icon + streak count
- Quick action buttons: [+ Add Course] [Start Timer]
- Notification bell (see Section 7)

#### 6.2.2 Today's Plan

**Purpose:** AI-recommended study schedule for today.

**Content:**
- If AI analysis exists: Shows recommended courses to study today, ordered by priority and risk.
  ```
  Today's Plan
  1. [React Course] - "Study for 30 min to stay on track" [Start Timer]
  2. [Python Course] - "Review Module 7 notes" [Log Session]
  ```
- If no AI analysis yet: Shows courses sorted by priority with generic suggestion "Study your highest priority course today."
- If user already studied today: Shows progress with encouragement "You have already studied X hours today. [motivation-style message]."
- If today is not a scheduled study day: Shows "Today is a rest day. Enjoy! (Or sneak in a quick session.)" with a dimmed quick-start button.

**Data Source:** Latest `ai_analyses` for each active course, filtered to today's recommended actions.

#### 6.2.3 Summary Stats Row

A horizontal row of 4 stat cards:

| Stat | Icon | Value | Subtitle |
|------|------|-------|----------|
| Hours This Week | Clock | e.g., "8.5" | "hrs studied" + trend arrow vs. last week |
| Active Courses | Book | e.g., "4" | "in progress" |
| Current Streak | Flame | e.g., "12" | "days" + "Best: 21" |
| Weekly Goal | Target | e.g., "85%" | "{hours_this_week} / {target_hours}" progress ring |

Each card is clickable and navigates to the relevant detailed view.

#### 6.2.4 Course Cards Grid

- Displays all `in_progress` and `not_started` courses as cards (see Section 3.5).
- Default sort: custom order (drag-and-drop `sort_order`).
- "View all courses" link at bottom navigates to `/courses`.
- If no courses: Empty state illustration with "Add your first course" CTA button.
- Maximum 6 cards shown by default. "Show more" button if user has more active courses.

#### 6.2.5 Weekly Report Card

**UI:** Collapsible card, collapsed by default (except on Monday, when it auto-expands for the first visit).

**Collapsed View:**
- "Weekly Report - [Week Date Range]"
- One-line summary: "You studied 8.5 hours across 12 sessions. [trend summary]."
- Expand button.

**Expanded View:**
- Full AI-generated narrative summary.
- Metrics grid: hours studied, sessions count, modules completed, average session duration.
- Trend arrows for each metric (vs. previous week).
- Highlights list (achievements, completions).
- Recommendations list for the coming week.
- "View past reports" link to `/reports`.

#### 6.2.6 Recent Activity Feed

- Shows the last 10 actions in reverse chronological order.
- Activity types:
  - Session logged: "[Timer icon] Studied [Course] for [duration]" + timestamp
  - Module completed: "[Check icon] Completed Module [X] of [Course]" + timestamp
  - Course status change: "[Arrow icon] [Course] marked as [status]" + timestamp
  - Achievement earned: "[Trophy icon] Earned [Achievement Name]!" + timestamp
  - Buddy activity: "[People icon] [Buddy Name] completed [Course]" + timestamp (if privacy allows)
- "View all activity" link to `/activity`.

#### 6.2.7 Quick Actions (Floating Action Button - Mobile)

On mobile, a floating action button (FAB) in the bottom right provides:
- Start Timer
- Log Session
- Add Course

On desktop, these are in the header bar.

### 6.3 Real-time Updates

- The dashboard subscribes to Supabase Realtime channels for:
  - `study_sessions` changes (for live timer updates if running in another tab).
  - `notifications` inserts (for notification bell count).
  - `buddy_activities` inserts (for activity feed).
- Updates are reflected immediately without page refresh.

### 6.4 Loading States

- Skeleton screens (shimmer placeholders) shown while data loads.
- Each section loads independently via React Suspense boundaries.
- If a section fails to load, it shows an inline error with a retry button. Other sections remain functional.

### 6.5 Empty States

| Scenario | Display |
|----------|---------|
| No courses added | Illustration + "Add your first course to get started" + CTA button |
| No sessions logged | "Start studying to see your stats here" + quick start button |
| No AI analysis yet | "We need a few days of data to provide insights. Keep studying!" |
| No weekly report | "Your first report will be generated this Sunday." |
| No buddy activity | "Add study buddies to see their activity here" + link to social page |

---

## 7. Notifications (5 Channels)

### 7.1 Data Model

```
notifications {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  type: text (NOT NULL, enum: 'reminder' | 'risk_alert' | 'achievement' | 'buddy_update' | 'weekly_report' | 'streak_warning')
  title: text (NOT NULL)
  body: text (NOT NULL)
  data: jsonb (nullable, additional context like course_id, achievement_id)
  channels_sent: text[] (array of channels this was sent to)
  is_read: boolean (default false)
  read_at: timestamptz (nullable)
  created_at: timestamptz (default now())
}

notification_preferences {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL, UNIQUE)
  in_app_enabled: boolean (default true)
  email_enabled: boolean (default true)
  push_enabled: boolean (default false)
  slack_enabled: boolean (default false)
  slack_webhook_url: text (nullable)
  discord_enabled: boolean (default false)
  discord_webhook_url: text (nullable)
  quiet_hours_enabled: boolean (default false)
  quiet_hours_start: time (default '22:00')
  quiet_hours_end: time (default '08:00')
  -- Per-type preferences (overrides channel defaults)
  type_preferences: jsonb (default '{}')
  -- Example: {"reminder": {"email": false, "push": true}, "risk_alert": {"email": true, "push": true}}
  created_at: timestamptz (default now())
  updated_at: timestamptz (default now())
}

study_reminders {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  course_id: uuid (FK -> courses, nullable; null = general reminder)
  days: text[] (NOT NULL, e.g., ['mon', 'wed', 'fri'])
  time: time (NOT NULL, e.g., '19:00')
  message: text (nullable, custom reminder message)
  is_active: boolean (default true)
  created_at: timestamptz (default now())
}
```

### 7.2 Channel 1: In-App Notifications

**UI Components:**

1. **Notification Bell** (in header bar):
   - Bell icon with unread count badge (red circle with number, max display "99+").
   - Clicking opens the Notification Center drawer.

2. **Notification Center Drawer:**
   - Slides in from the right.
   - Header: "Notifications" + "Mark all as read" link.
   - Tabs: "All" | "Unread".
   - Each notification item:
     - Icon based on type (bell for reminder, warning for risk, trophy for achievement, etc.).
     - Title (bold if unread).
     - Body text (truncated to 2 lines, expandable).
     - Timestamp (relative: "2 hours ago", "Yesterday").
     - Click to mark as read and navigate to relevant page.
   - Empty state: "You are all caught up!"
   - Paginated: loads 20 at a time with "Load more" button.

3. **Toast Notifications:**
   - For real-time events (timer saved, session logged, achievement earned).
   - Appear in top-right corner, auto-dismiss after 5 seconds.
   - Stackable up to 3 simultaneously.
   - Include a close button.

**Delivery:** Instant via Supabase Realtime subscription. Insert into `notifications` table triggers real-time event to connected client.

### 7.3 Channel 2: Email Notifications

**Provider:** Sent via Supabase Edge Functions calling a transactional email service (Resend recommended).

**Email Types:**

| Type | Trigger | Subject Line Template | Content |
|------|---------|----------------------|---------|
| Daily Digest | 8 AM user timezone (if enabled) | "Your study plan for today" | Today's recommended courses, yesterday's summary, streak status |
| Risk Alert | AI analysis detects high/critical risk | "Heads up: [Course] needs attention" | Risk details, specific recommendations |
| Weekly Report | Sunday 9 AM user timezone | "Your week in review - [date range]" | Full weekly report content |
| Achievement Earned | Achievement unlocked | "You earned: [Achievement Name]!" | Achievement details, shareable link |
| Streak Warning | Streak at risk (no session today, within 2 hours of day end) | "Your [X]-day streak is at risk!" | Motivational message, quick log link |
| Buddy Request | Someone sends a buddy request | "[Name] wants to be your study buddy" | Accept/decline links |

**Email Design:**
- Responsive HTML email templates.
- Match app theme colors.
- All emails include an unsubscribe link (one-click unsubscribe per email type).
- Sender: "Course Tracker <notifications@[domain]>".

**Edge Cases:**
- Undeliverable email: Log failure, retry once after 5 minutes, then mark as failed.
- User has email disabled but a critical risk alert fires: Still send in-app notification.

### 7.4 Channel 3: Push Notifications (Web)

**Implementation:** Web Push API with service worker.

**Setup Flow:**
1. User enables push in notification preferences.
2. Browser prompts for push notification permission.
3. If granted, save the push subscription to `push_subscriptions` table.
4. If denied, show message: "Push notifications were blocked by your browser. You can enable them in your browser's site settings."

**Push Notification Types:**

| Type | When | Title | Body |
|------|------|-------|------|
| Study Reminder | At scheduled reminder time | "Time to study!" | "Your [Course] session is scheduled now. Let's go!" |
| Streak at Risk | 2 hours before end of day (user timezone) if no session today | "Streak at risk!" | "Log a quick session to keep your [X]-day streak alive!" |
| Risk Alert | AI detects critical risk | "Course needs attention" | "[Course] risk is critical. Check your dashboard." |

**Edge Cases:**
- Push subscription expires: Catch errors on send, remove invalid subscriptions, prompt user to re-enable.
- Multiple devices: Store multiple push subscriptions per user. Send to all active subscriptions.

### 7.5 Channel 4: Slack Integration

**Setup:**
1. User navigates to Settings > Integrations > Slack.
2. User creates an Incoming Webhook in their Slack workspace (instructions provided with screenshots).
3. User pastes the webhook URL into the settings field.
4. User clicks "Test Connection" -- sends a test message to the Slack channel.
5. On success: "Connected! Notifications will be sent to this Slack channel."
6. On failure: "Could not reach that webhook. Please check the URL and try again."

**Message Format:**
Slack Block Kit formatted messages:
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "Study Reminder"}
    },
    {
      "type": "section",
      "text": {"type": "mrkdwn", "text": "Time to study *React Masterclass*! Your streak is at *12 days*."}
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {"type": "plain_text", "text": "Open Dashboard"},
          "url": "https://[app-domain]/dashboard"
        }
      ]
    }
  ]
}
```

**Notification Types Sent to Slack:**
- Study reminders (if Slack channel enabled for reminders)
- Risk alerts (high and critical only)
- Weekly report summary
- Achievement earned

### 7.6 Channel 5: Discord Integration

**Setup:** Identical flow to Slack but with Discord webhook URL.

**Message Format:** Discord embed format:
```json
{
  "embeds": [{
    "title": "Study Reminder",
    "description": "Time to study **React Masterclass**! Your streak is at **12 days**.",
    "color": 5814783,
    "fields": [
      {"name": "Course", "value": "React Masterclass", "inline": true},
      {"name": "Streak", "value": "12 days", "inline": true}
    ],
    "footer": {"text": "Course Accountability Tracker"}
  }]
}
```

**Notification Types Sent:** Same as Slack.

### 7.7 Reminder Scheduling

**Route:** `/settings/reminders` or per-course in course detail page.

**UI:**
- List of configured reminders with toggle switches.
- "Add Reminder" button opens a form:
  - Course (dropdown, or "General" for non-course-specific).
  - Days (multi-select day pills).
  - Time (time picker).
  - Custom message (optional text, e.g., "Time for your Python session!").
- Each reminder shows next scheduled fire time.
- Reminders can be edited or deleted.

**Execution:**
- A Vercel cron job runs every 15 minutes, checks for reminders due in the next 15-minute window.
- For each due reminder, creates a notification and sends it through all enabled channels.
- Respects quiet hours: reminders during quiet hours are suppressed (not queued, just skipped).

### 7.8 Quiet Hours

- When enabled, NO notifications are sent through ANY channel during the quiet window.
- Quiet hours are defined by start time and end time in the user's timezone.
- Default: 10:00 PM to 8:00 AM.
- Exception: No exceptions. Critical alerts are held until quiet hours end.
- Held notifications are delivered at the end of quiet hours (all at once, batched into a single digest).

### 7.9 Notification Preferences UI

**Route:** `/settings/notifications`

**Layout:** A matrix grid:

| | In-App | Email | Push | Slack | Discord |
|---|---|---|---|---|---|
| Study Reminders | toggle | toggle | toggle | toggle | toggle |
| Risk Alerts | toggle | toggle | toggle | toggle | toggle |
| Achievements | toggle | toggle | toggle | toggle | toggle |
| Buddy Updates | toggle | toggle | toggle | toggle | toggle |
| Weekly Report | toggle | toggle | toggle | toggle | toggle |
| Streak Warning | toggle | toggle | toggle | toggle | toggle |

- Master toggles at the top of each column to enable/disable the entire channel.
- Slack and Discord columns are disabled (grayed out) until webhook is configured.
- Changes are saved automatically (debounced PATCH, 500ms after last change).

---

## 8. Social Features

### 8.1 Data Model

```
buddy_connections {
  id: uuid (PK)
  requester_id: uuid (FK -> auth.users, NOT NULL)
  addressee_id: uuid (FK -> auth.users, NOT NULL)
  status: text (NOT NULL, enum: 'pending' | 'accepted' | 'declined' | 'removed')
  created_at: timestamptz (default now())
  updated_at: timestamptz (default now())
  UNIQUE(requester_id, addressee_id)
}

achievements {
  id: uuid (PK)
  key: text (NOT NULL, UNIQUE, e.g., 'first_session')
  name: text (NOT NULL)
  description: text (NOT NULL)
  icon: text (NOT NULL, emoji or icon key)
  category: text (NOT NULL, enum: 'streak' | 'progress' | 'social' | 'habit' | 'milestone')
  requirement: jsonb (NOT NULL)
  -- Example: {"type": "streak", "value": 7}
  points: integer (NOT NULL, default 10)
  rarity: text (NOT NULL, enum: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary')
}

user_achievements {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL)
  achievement_id: uuid (FK -> achievements, NOT NULL)
  earned_at: timestamptz (NOT NULL, default now())
  shared: boolean (default false)
  UNIQUE(user_id, achievement_id)
}

privacy_settings {
  id: uuid (PK)
  user_id: uuid (FK -> auth.users, NOT NULL, UNIQUE)
  show_streak: boolean (default true)
  show_courses: boolean (default true)
  show_activity: boolean (default false)
  show_study_hours: boolean (default true)
  profile_visibility: text (default 'buddies', enum: 'public' | 'buddies' | 'private')
}
```

### 8.2 Study Buddy System

#### 8.2.1 Finding Buddies

**Route:** `/buddies`

**Methods to Find Buddies:**
1. **Search by username/email:** Text search input. Returns matching users (respects privacy: only shows users with `profile_visibility != 'private'`).
2. **Suggested matches:** Algorithm suggests buddies based on:
   - Shared courses (same platform + similar title).
   - Similar goals (same `primary_goal`).
   - Similar study schedule (overlapping preferred days/times).
   - Shown as: "Suggested Buddies" section with match reason: "Also studying React" or "Studies at similar times as you."
3. **Share invite link:** Generate a unique invite link. When visited by an authenticated user, auto-sends a buddy request.

#### 8.2.2 Buddy Requests

**Sending:**
- Click "Add Buddy" on a user's profile card.
- Optional message with the request (text, 0-200 chars).
- Creates a `buddy_connections` record with `status = 'pending'`.
- Notification sent to the addressee (in-app + email if enabled).

**Receiving:**
- Notification: "[Name] wants to be your study buddy."
- Actions: "Accept" or "Decline".
- Accept: Updates status to `accepted`. Both users now see each other in their buddy list. Notification sent to requester.
- Decline: Updates status to `declined`. No notification to requester. The requester's UI simply shows the request as "pending" indefinitely (no explicit rejection revealed to protect feelings).

**Limits:**
- Maximum 20 active buddy connections per user.
- Cannot send a request to someone who has already declined (cooldown: 30 days).
- Cannot send a request to someone you have an active connection with.

#### 8.2.3 Buddy Removal

- Either party can remove the connection at any time.
- Confirmation dialog: "Remove [Name] as a study buddy? They will not be notified."
- Updates status to `removed`.
- Both users are removed from each other's buddy lists.
- No notification sent.

#### 8.2.4 Buddy Dashboard

**Route:** `/buddies` (with buddy list sidebar)

**Buddy List:**
- Shows all accepted buddies as avatar + name cards.
- Each card shows: avatar, display name, current streak, "Active now" indicator (if they have studied today).

**Buddy Detail (click a buddy):**
- What is visible depends on the buddy's privacy settings:

| Data | Privacy Setting | Default |
|------|----------------|---------|
| Current streak | `show_streak` | Visible |
| Active courses (title + platform only, not progress) | `show_courses` | Visible |
| Recent activity (last 5 items) | `show_activity` | Hidden |
| Weekly study hours | `show_study_hours` | Visible |

- If a data point is hidden, it simply does not appear (no "hidden" placeholder).

### 8.3 Achievement System

#### 8.3.1 Achievement Definitions

| Key | Name | Description | Category | Requirement | Points | Rarity |
|-----|------|-------------|----------|-------------|--------|--------|
| first_session | First Steps | Log your first study session | milestone | 1 session logged | 10 | common |
| streak_7 | Week Warrior | Maintain a 7-day study streak | streak | 7-day streak | 25 | common |
| streak_14 | Two-Week Titan | Maintain a 14-day study streak | streak | 14-day streak | 50 | uncommon |
| streak_30 | Monthly Master | Maintain a 30-day study streak | streak | 30-day streak | 100 | rare |
| streak_100 | Centurion | Maintain a 100-day study streak | streak | 100-day streak | 500 | epic |
| streak_365 | Yearly Legend | Maintain a 365-day study streak | streak | 365-day streak | 2000 | legendary |
| course_complete | Finisher | Complete your first course | progress | 1 course completed | 50 | common |
| courses_3 | Triple Threat | Complete 3 courses | progress | 3 courses completed | 150 | uncommon |
| courses_10 | Scholar | Complete 10 courses | progress | 10 courses completed | 500 | rare |
| hours_10 | Getting Started | Log 10 total study hours | habit | 10 cumulative hours | 25 | common |
| hours_100 | Century Club | Log 100 total study hours | habit | 100 cumulative hours | 200 | uncommon |
| hours_500 | Dedicated Learner | Log 500 total study hours | habit | 500 cumulative hours | 750 | rare |
| night_owl | Night Owl | Log 10 sessions between 10 PM and 4 AM | habit | 10 late-night sessions | 50 | uncommon |
| early_bird | Early Bird | Log 10 sessions between 5 AM and 8 AM | habit | 10 early morning sessions | 50 | uncommon |
| social_butterfly | Social Butterfly | Connect with 5 study buddies | social | 5 accepted buddy connections | 75 | uncommon |
| first_buddy | Buddy Up | Connect with your first study buddy | social | 1 accepted buddy connection | 25 | common |

#### 8.3.2 Achievement Checks

Achievements are checked at these trigger points:
- After a study session is logged (manual, timer, or module).
- After a streak is updated.
- After a course status changes.
- After a buddy connection is accepted.

Implementation: A server-side function `checkAchievements(userId)` runs after each trigger. It queries current stats and compares against unearned achievement requirements.

**Earning an Achievement:**
1. Insert into `user_achievements`.
2. Create in-app notification with celebration animation.
3. Show a full-screen modal: "Achievement Unlocked! [Icon] [Name] - [Description]" with confetti animation and a "Share" button.
4. If email notifications enabled, send achievement email.

#### 8.3.3 Achievement Display

**Profile Page:** Grid of all achievements. Earned ones are full color with earned date. Unearned ones are grayscale silhouettes with progress bars showing how close the user is (e.g., "5/7 days" for streak_7).

**Dashboard:** Top 3 most recently earned achievements shown as badges.

#### 8.3.4 Achievement Sharing

**Shareable Image:**
- Click "Share" on an earned achievement.
- Generates an image (via server-side rendering or canvas) showing:
  - Achievement icon, name, description.
  - User's display name.
  - App branding.
  - Earned date.
- Options: "Copy link" (generates a public URL `/achievements/[share_id]`), "Download image", native share API on mobile.

**Public Achievement Page (`/achievements/[share_id]`):**
- Displays the achievement with the user's name.
- CTA: "Track your own learning with Course Accountability Tracker" + sign-up link.

### 8.4 Leaderboard

**Route:** `/buddies/leaderboard`

**Scope:** Only shows the user and their accepted buddies (no global leaderboard to avoid toxic competition).

**Metrics:**
- **Weekly Study Hours** (default view): Total hours studied in the current week (Monday-Sunday).
- **Current Streak:** Longest active streak.
- **Courses Completed (All Time):** Total completed courses.

**UI:**
- Tab selector for metric.
- Ranked list with position number, avatar, display name, metric value.
- Current user's row is highlighted.
- Updates in real-time via Supabase Realtime.
- If user has no buddies: "Add study buddies to see the leaderboard."

**Privacy:** Users who have set `profile_visibility = 'private'` do not appear on the leaderboard. Users can opt out of the leaderboard entirely via a toggle in privacy settings.

---

## 9. Visualization

### 9.1 Charting Library

Use **Recharts** (React-based, good SSR support with Next.js) for all charts. Fallback to **Chart.js** via react-chartjs-2 if Recharts cannot handle a specific visualization.

All charts must:
- Be responsive (resize with container).
- Support light and dark themes (colors adapt to theme).
- Be accessible (include `<title>` and `<desc>` for screen readers, keyboard-focusable tooltips).
- Show loading skeletons while data fetches.
- Show meaningful empty states when no data exists.

### 9.2 Study Hours Heatmap

**Location:** Dashboard (below summary stats), and `/stats` page.

**Design:** GitHub-contribution-style grid. 52 columns (weeks) x 7 rows (days). Each cell represents one day.

**Color Scale (light theme):**
- 0 hours: gray (#ebedf0)
- 0.1-1 hours: light green (#9be9a8)
- 1-2 hours: medium green (#40c463)
- 2-4 hours: dark green (#30a14e)
- 4+ hours: darkest green (#216e39)

**Color Scale (dark theme):** Adjusted for contrast against dark backgrounds.

**Interactions:**
- Hover on a cell: tooltip showing date and total hours: "Wed, Feb 18, 2026 - 2.5 hours (3 sessions)".
- Click on a cell: navigates to `/stats/[date]` showing that day's session details.
- Navigation: left/right arrows to scroll through weeks. Default view: last 365 days.

**Data Source:** `daily_stats` table where `course_id IS NULL` (global aggregates).

### 9.3 Progress Over Time (Line Chart)

**Location:** `/courses/[id]` course detail page, and `/stats` page (all courses overlay).

**X-Axis:** Date (daily granularity).
**Y-Axis:** Cumulative progress percentage (0-100%).
**Lines:** One line per course (different colors). Legend below the chart.

**Additional Elements:**
- Target line: Dashed straight line from start date at 0% to target completion date at 100%.
- If ahead of schedule: progress line is above the target line (green area fill between them).
- If behind schedule: progress line is below the target line (red area fill between them).

**Interactions:**
- Hover: tooltip with exact date and progress %.
- Click a point: navigate to that day's study log.
- Toggle courses on/off via legend clicks.
- Date range selector: 7 days, 30 days, 90 days, All time.

### 9.4 Study Hours Bar Chart

**Location:** `/stats` page.

**Modes (tab selector):**
- **Daily:** Last 14 days, one bar per day.
- **Weekly:** Last 12 weeks, one bar per week.
- **Monthly:** Last 12 months, one bar per month.

**X-Axis:** Date/week/month label.
**Y-Axis:** Total study hours.
**Bars:** Stacked by course (each course a different color segment) or unstacked (toggle).

**Additional Elements:**
- Horizontal dashed line showing weekly goal (target_hours_per_week / 7 for daily, target_hours_per_week for weekly, etc.).
- Average line across the bars.

**Interactions:**
- Hover on bar: tooltip with breakdown by course.
- Click on bar: drill into that time period.

### 9.5 Course Completion Forecast

**Location:** `/courses/[id]` course detail page.

**Chart Type:** Line chart with projection.

**Solid Line:** Actual progress over time (historical data points).
**Dashed Line:** Projected future progress based on current velocity (calculated as modules/day or hours/day over the last 14 days).

**Key Points Marked:**
- Target completion date (vertical dashed line).
- Projected completion date (where dashed line hits 100%).
- If projected completion is after target: warning callout "At current pace, you will finish [X days] late."
- If projected completion is before target: positive callout "You are on track to finish [X days] early!"

**Confidence Band:** Light shaded area around the projection showing uncertainty (wider as it projects further into the future). Based on variance in daily progress.

### 9.6 Risk Score Trend

**Location:** `/courses/[id]` course detail page, "Analytics" tab.

**Chart Type:** Line chart.

**X-Axis:** Date (last 30 days).
**Y-Axis:** Risk score (0-100).

**Background Bands:**
- 0-25: green background
- 26-50: yellow background
- 51-75: orange background
- 76-100: red background

**Interactions:**
- Hover: tooltip showing risk score, risk level, and top risk factor for that day.
- Click: expand to show full analysis for that date.

### 9.7 Session Duration Distribution (Histogram)

**Location:** `/stats` page.

**X-Axis:** Session duration buckets (0-15 min, 15-30 min, 30-45 min, 45-60 min, 60-90 min, 90-120 min, 120+ min).
**Y-Axis:** Number of sessions.

**Additional:**
- Vertical line showing average session duration.
- Annotation for optimal session length (from AI patterns analysis, if available): "Your most productive sessions are 30-45 minutes."

### 9.8 Pattern Insights

**Location:** Dashboard (as "tip" cards), `/stats` page (dedicated section).

**Format:** Insight cards with supporting mini-charts.

**Example Insights:**
1. "You study best on **Tuesdays** - averaging 1.8 hours vs. 0.9 hours on other days."
   - Mini bar chart showing average hours per day of week.
2. "Your most productive study time is **7-8 PM** - 65% of your module completions happen in evening sessions."
   - Mini pie chart showing session distribution by time of day.
3. "Sessions between **30-45 minutes** have your highest focus score (based on modules completed per hour)."
   - Mini histogram highlighting the optimal bucket.
4. "You have not studied on **Fridays** in the last 3 weeks. Consider moving your Friday study time to Saturday."
   - Mini heatmap highlighting the gap.

**Generation:** Insights are generated by the AI analysis pipeline and stored in `ai_analyses.patterns`. The frontend formats them into these card layouts.

---

## 10. Settings & Preferences

### 10.1 Route Structure

```
/settings
  /settings/account
  /settings/notifications
  /settings/preferences
  /settings/data
  /settings/integrations
```

Tabbed layout. On mobile, each tab is a full page accessible from a settings menu.

### 10.2 Account Management

**Route:** `/settings/account`

#### 10.2.1 Change Email

1. User enters new email address.
2. User enters current password (required for security).
3. System validates the new email is not already registered.
4. System sends a confirmation email to the NEW address.
5. Until confirmed, the old email remains active.
6. On confirmation, email is updated. Old email receives a notification: "Your email was changed to [new email]. If this was not you, contact support."

#### 10.2.2 Change Password

1. User enters current password.
2. User enters new password (same requirements as signup: 8+ chars, uppercase, lowercase, number).
3. User confirms new password.
4. Validation: new password must differ from current password.
5. On success: password updated, all other sessions are invalidated, user remains logged in on current session.
6. Confirmation email sent.

#### 10.2.3 Delete Account

1. User clicks "Delete Account" (red button, not prominent).
2. Warning dialog explains consequences:
   - "This will permanently delete your account and all associated data including courses, sessions, achievements, and buddy connections."
   - "This action cannot be undone."
   - "There is a 7-day grace period during which you can cancel the deletion by logging in."
3. User must type "DELETE" in a confirmation input.
4. On confirmation:
   - Account is soft-deleted (flag `scheduled_deletion_at = now() + 7 days`).
   - User is logged out.
   - Confirmation email sent with a "Cancel deletion" link.
   - All notifications and reminders are suspended.
5. After 7 days: A cron job hard-deletes all user data (cascade delete across all tables). Supabase Storage files (avatar) are deleted.
6. If user logs in during the grace period: deletion is cancelled, user is notified "Your account deletion has been cancelled. Welcome back!"

### 10.3 Notification Preferences

See Section 7.9 for the full notification preferences matrix UI.

### 10.4 Study Preferences

**Route:** `/settings/preferences`

| Setting | Type | Range | Default | Description |
|---------|------|-------|---------|-------------|
| Timezone | dropdown (searchable) | All IANA timezones | Auto-detected | Used for all time-based features |
| Theme | segmented control | Light / Dark / System | System | App color scheme |
| Default session duration | number (minutes) | 15-180 | 30 | Pre-fills the timer target |
| Break reminder interval | number (minutes) | 0-120 (0 = off) | 25 | Toast reminder during timer sessions |
| Week starts on | segmented control | Monday / Sunday | Monday | Affects weekly charts and reports |
| Date format | segmented control | MM/DD/YYYY / DD/MM/YYYY / YYYY-MM-DD | Locale default | All dates in the app |
| Compact mode | toggle | on/off | off | Reduces whitespace, smaller cards |

All changes save automatically (debounced 500ms).

### 10.5 Data Export

**Route:** `/settings/data`

**Export Options:**
- **Format:** JSON or CSV (radio selection).
- **Scope:** All data, or select categories (checkboxes):
  - Profile information
  - Courses
  - Study sessions
  - Achievements
  - AI analyses
  - Notification history
- **Date range:** All time, Last 30 days, Last 90 days, Last year, Custom range.

**Process:**
1. User selects options and clicks "Export Data".
2. Server-side Route Handler generates the export:
   a. Queries all selected data for the user.
   b. Formats as JSON or CSV.
   c. Packages into a ZIP file.
3. If file < 5 MB: immediate download via browser.
4. If file >= 5 MB: uploaded to Supabase Storage (temporary bucket, 24-hour expiry), download link sent via email.
5. Export includes a `metadata.json` with export date, format version, and data counts.

**CSV Format Details:**
- One CSV file per data type (courses.csv, sessions.csv, etc.).
- Header row with column names.
- UTF-8 encoding with BOM for Excel compatibility.
- Dates in ISO 8601 format.

### 10.6 Connected Integrations

**Route:** `/settings/integrations`

**OAuth Providers:**
- Shows linked providers (Google, GitHub) with "Linked" badge and "Unlink" button.
- Cannot unlink the last authentication method (button disabled with tooltip: "You must have at least one login method").
- "Link [Provider]" button for unlinked providers. Initiates OAuth flow.

**Slack Integration:**
- Webhook URL input (masked after save, showing only last 8 characters).
- "Test Connection" button: sends a test message to the webhook. Shows success/failure inline.
- "Disconnect" button: clears the webhook URL and disables Slack notifications.

**Discord Integration:**
- Same UI and behavior as Slack.

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.2s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.0s | Lighthouse |
| Time to Interactive (TTI) | < 2.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |
| First Input Delay (FID) | < 100ms | Lighthouse |
| API response time (p95) | < 500ms | Server-side monitoring |
| API response time (p99) | < 1000ms | Server-side monitoring |
| Database query time (p95) | < 100ms | Supabase dashboard |
| Client-side bundle size | < 200KB gzipped (initial) | Build analysis |

**Implementation Strategies:**
- React Server Components for data fetching (no client-side waterfalls).
- Streaming SSR with Suspense for progressive rendering.
- Dynamic imports for heavy components (charts, modals).
- Image optimization via Next.js `<Image>` component.
- Database indexes on all frequently queried columns (user_id, course_id, date, status).
- Pagination on all list endpoints (default 20, max 100).
- Supabase connection pooling via PgBouncer.

### 11.2 Security

#### Authentication & Authorization
- All routes except `/auth/*` and `/` (landing page) require authentication.
- Middleware (`middleware.ts`) checks Supabase session on every request.
- Row Level Security (RLS) enabled on ALL tables. Policies ensure users can only access their own data.
- No client-side secrets. All API keys (OpenAI, webhook URLs) stored in server-side environment variables only.

#### Data Protection
- Passwords hashed by Supabase Auth (bcrypt).
- HTTPS enforced (Vercel default).
- CORS configured to allow only the app's domain.
- CSRF protection via SameSite cookies.
- SQL injection prevented by Supabase client (parameterized queries).
- XSS prevented by React's default escaping and Content-Security-Policy headers.

#### Rate Limiting
- AI analysis endpoints: 10 requests per user per hour.
- Authentication endpoints: 5 attempts per email per 15 minutes.
- General API: 100 requests per user per minute.
- Data export: 3 exports per user per 24 hours.
- Implementation: Vercel Edge Middleware with upstash/ratelimit or similar.

#### Webhook Security
- Slack/Discord webhook URLs are encrypted at rest in the database using a server-side encryption key.
- Cron endpoints (`/api/cron/*`) are secured with a `CRON_SECRET` header that must match the environment variable. Reject all requests without the correct secret.

### 11.3 Scalability

**Target:** Support 10,000+ concurrent users.

**Database:**
- Supabase Pro plan (or higher) for connection limits and performance.
- Indexes: composite indexes on `(user_id, date)`, `(user_id, course_id)`, `(user_id, course_id, date)`.
- Partitioning: `study_sessions` and `daily_stats` tables partitioned by month if data volume requires it (future optimization).
- Read replicas for dashboard reads (future optimization).

**Application:**
- Vercel serverless functions auto-scale.
- AI analysis pipeline uses queue-based processing (process users in batches, not all at once).
- Supabase Realtime connections limited to active page subscriptions (unsubscribe on page leave).

**Cost Projections (10,000 users):**

| Service | Estimated Monthly Cost |
|---------|----------------------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| OpenAI API (GPT-4) | ~$1,000 (10k users x ~$0.10/day x 30 days, with active user filtering) |
| Email service (Resend) | ~$20 |
| **Total** | **~$1,065/month** |

### 11.4 Accessibility (WCAG 2.1 AA)

**Requirements:**
- All interactive elements are keyboard accessible (tab order, Enter/Space to activate).
- Focus indicators visible on all focusable elements (custom focus ring, not just browser default).
- All images have alt text. Decorative images have `alt=""`.
- Color is not the only means of conveying information (risk levels have both color AND icon/text).
- Contrast ratio minimum 4.5:1 for normal text, 3:1 for large text.
- Form inputs have associated `<label>` elements.
- Error messages are announced to screen readers via `aria-live` regions.
- Charts include `aria-label` descriptions summarizing the data. Tabular alternative available for all charts.
- Modals trap focus and can be closed with Escape.
- Skip navigation link at the top of every page.
- Reduced motion: respect `prefers-reduced-motion` media query (disable animations/confetti).
- Language attribute set on `<html>`.

**Testing:**
- Automated: axe-core integration in CI/CD pipeline.
- Manual: screen reader testing with NVDA/VoiceOver during development.

### 11.5 Mobile Responsiveness

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile-Specific Adaptations:**
- Sidebar navigation collapses to a bottom tab bar (Dashboard, Courses, Timer, Stats, Profile).
- Course cards stack vertically (single column).
- Charts are horizontally scrollable with touch gestures.
- Timer page is optimized for full-screen single-hand use.
- Drag-and-drop reordering uses long-press to initiate.
- Tables switch to card-based layouts.
- Modals become full-screen sheets sliding up from the bottom.
- FAB for quick actions (see Section 6.2.7).

**Touch Targets:** Minimum 44x44px for all interactive elements (per Apple HIG / WCAG).

### 11.6 Offline Support & Graceful Degradation

**Service Worker:** Registered via `next-pwa` or custom service worker.

**Offline Capabilities:**
- Dashboard renders from cached data (last fetched state).
- Timer continues to work offline (local state). Sessions are queued for sync.
- Manual session logging works offline. Entries are stored in IndexedDB and synced when online.
- Course list is viewable from cache.
- Charts display cached data with a "Last updated: [timestamp]" notice.

**Sync Mechanism:**
- On reconnection, queued actions are replayed in order.
- Conflict resolution: server data wins for reads, client data wins for writes (last-write-wins with timestamp).
- A sync status indicator appears in the header: "Syncing..." (spinner) or "Offline" (gray cloud icon).

**Degradation Behavior:**
- If Supabase is unreachable: app shows cached data with a banner "You are offline. Changes will sync when you reconnect."
- If OpenAI API is unreachable: AI analysis section shows "Analysis temporarily unavailable" with last available analysis.
- If Vercel Edge is down: users see Vercel's error page (out of app control).

### 11.7 Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit tests | Vitest | 80%+ for utility functions, hooks, and server actions |
| Component tests | React Testing Library + Vitest | All interactive components |
| Integration tests | Playwright | Critical user flows (auth, course CRUD, timer, session logging) |
| E2E tests | Playwright | Happy paths for all major features |
| API tests | Vitest + supertest | All Route Handlers |
| Accessibility tests | axe-core + Playwright | All pages |
| Performance tests | Lighthouse CI | All pages meet targets |

**CI/CD Pipeline (GitHub Actions):**
1. On every PR: lint (ESLint), type check (tsc), unit tests, component tests, accessibility audit.
2. On merge to main: all above + E2E tests, Lighthouse CI, deploy to Vercel preview.
3. On release tag: deploy to Vercel production.

### 11.8 Error Handling

**Client-Side:**
- Global error boundary (`error.tsx` in app router) catches unhandled React errors. Shows a friendly error page with "Something went wrong" and a retry button. Logs error to monitoring service.
- Per-section error boundaries in the dashboard so one failing section does not break the whole page.
- Form submission errors show inline error messages below the relevant field.
- Network errors show a toast: "Connection error. Please try again."
- 404 pages: custom `not-found.tsx` with navigation back to dashboard.

**Server-Side:**
- All Route Handlers use try/catch with structured error responses: `{ error: string, code: string, details?: any }`.
- HTTP status codes used correctly (400 for validation, 401 for unauth, 403 for forbidden, 404 for not found, 429 for rate limit, 500 for server error).
- Errors are logged with context (user_id, endpoint, request body) to a logging service.
- Sensitive data (passwords, tokens) NEVER included in error logs.

**Monitoring:**
- Vercel Analytics for Web Vitals.
- Sentry (or similar) for error tracking and alerting.
- Supabase dashboard for database health and slow query monitoring.
- Uptime monitoring on critical endpoints.

### 11.9 Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx (server-only, never exposed to client)

# OpenAI
OPENAI_API_KEY=xxx (server-only)
OPENAI_MODEL=gpt-4-turbo (server-only)

# Cron
CRON_SECRET=xxx (server-only, used to authenticate cron endpoints)

# Email (Resend)
RESEND_API_KEY=xxx (server-only)
EMAIL_FROM=notifications@yourdomain.com

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME=Course Accountability Tracker

# Optional
AI_MONTHLY_BUDGET_USD=500 (server-only)
ENCRYPTION_KEY=xxx (server-only, for encrypting webhook URLs)
```

**CRITICAL:** Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. ONLY the Supabase URL and anon key should have this prefix. All other secrets MUST be server-only.

---

## Appendix A: Database Schema Summary

### Tables

1. `user_profiles` - Extended user data (display name, bio, preferences, onboarding status)
2. `courses` - Course data with status, progress, priority, sort order
3. `module_items` - Individual module checkboxes per course
4. `study_sessions` - Individual study session records
5. `daily_stats` - Aggregated daily statistics per user per course
6. `streaks` - Current and longest streak tracking per user per course
7. `ai_analyses` - Daily AI analysis results per course
8. `weekly_reports` - Weekly AI-generated summaries
9. `notifications` - All notification records
10. `notification_preferences` - Per-user notification channel and type preferences
11. `study_reminders` - Scheduled study reminders
12. `buddy_connections` - Study buddy relationships
13. `achievements` - Achievement definitions (seed data)
14. `user_achievements` - Earned achievements per user
15. `privacy_settings` - Per-user privacy controls
16. `push_subscriptions` - Web Push subscription data
17. `course_syncs` - Future: platform sync configuration

### Key Indexes

```sql
CREATE INDEX idx_courses_user_status ON courses(user_id, status);
CREATE INDEX idx_sessions_user_course_date ON study_sessions(user_id, course_id, started_at);
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date);
CREATE INDEX idx_daily_stats_user_course_date ON daily_stats(user_id, course_id, date);
CREATE INDEX idx_analyses_user_course_date ON ai_analyses(user_id, course_id, analysis_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_buddy_connections_addressee ON buddy_connections(addressee_id, status);
CREATE INDEX idx_streaks_user ON streaks(user_id, course_id);
```

---

## Appendix B: API Routes

### Authentication
- `POST /auth/signup` - handled by Supabase client
- `POST /auth/login` - handled by Supabase client
- `POST /auth/logout` - handled by Supabase client
- `POST /auth/reset-password` - handled by Supabase client
- `GET /auth/callback` - OAuth callback handler

### Courses
- `GET /api/courses` - List user's courses (with filters, sort, pagination)
- `POST /api/courses` - Create a course
- `GET /api/courses/[id]` - Get course detail
- `PATCH /api/courses/[id]` - Update a course
- `DELETE /api/courses/[id]` - Delete a course
- `PATCH /api/courses/[id]/status` - Change course status
- `PATCH /api/courses/reorder` - Batch update sort_order

### Study Sessions
- `GET /api/sessions` - List sessions (with filters, pagination)
- `POST /api/sessions` - Create a session (manual or timer start)
- `PATCH /api/sessions/[id]` - Update a session (timer heartbeat, stop, add notes)
- `DELETE /api/sessions/[id]` - Delete/discard a session

### Module Items
- `GET /api/courses/[id]/modules` - List module items
- `POST /api/courses/[id]/modules` - Initialize module items
- `PATCH /api/courses/[id]/modules/[moduleId]` - Toggle module completion
- `PATCH /api/courses/[id]/modules/reorder` - Reorder modules

### AI Analysis
- `GET /api/analyses/[courseId]` - Get latest analysis for a course
- `GET /api/analyses/[courseId]/history` - Get analysis history
- `GET /api/reports/weekly` - Get weekly reports (with pagination)
- `GET /api/reports/weekly/[id]` - Get specific weekly report

### Notifications
- `GET /api/notifications` - List notifications (with filters, pagination)
- `PATCH /api/notifications/[id]/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/preferences` - Get notification preferences
- `PATCH /api/notifications/preferences` - Update notification preferences

### Study Reminders
- `GET /api/reminders` - List reminders
- `POST /api/reminders` - Create a reminder
- `PATCH /api/reminders/[id]` - Update a reminder
- `DELETE /api/reminders/[id]` - Delete a reminder

### Buddies
- `GET /api/buddies` - List buddy connections
- `POST /api/buddies/request` - Send buddy request
- `PATCH /api/buddies/[id]/accept` - Accept buddy request
- `PATCH /api/buddies/[id]/decline` - Decline buddy request
- `DELETE /api/buddies/[id]` - Remove buddy connection
- `GET /api/buddies/suggestions` - Get suggested buddies
- `GET /api/buddies/leaderboard` - Get buddy leaderboard

### Achievements
- `GET /api/achievements` - List all achievements with earned status
- `GET /api/achievements/[id]/share` - Get/create shareable link

### Stats
- `GET /api/stats/daily` - Daily stats (with date range)
- `GET /api/stats/streaks` - Current streaks
- `GET /api/stats/heatmap` - Heatmap data (last 365 days)
- `GET /api/stats/patterns` - Pattern insights

### User
- `GET /api/user/profile` - Get profile
- `PATCH /api/user/profile` - Update profile
- `POST /api/user/avatar` - Upload avatar
- `DELETE /api/user/account` - Request account deletion
- `POST /api/user/export` - Request data export

### Cron (internal, secured with CRON_SECRET)
- `POST /api/cron/ai-analysis` - Run daily AI analysis
- `POST /api/cron/weekly-report` - Generate weekly reports
- `POST /api/cron/daily-stats-reconcile` - Reconcile daily stats
- `POST /api/cron/streak-freeze` - Process streak freezes
- `POST /api/cron/reminders` - Process due reminders
- `POST /api/cron/account-cleanup` - Hard delete expired accounts

### Integrations
- `POST /api/integrations/slack/test` - Test Slack webhook
- `POST /api/integrations/discord/test` - Test Discord webhook

---

## Appendix C: Page Routes

| Route | Auth Required | Description |
|-------|--------------|-------------|
| `/` | No | Landing page / marketing page |
| `/auth/login` | No | Login page |
| `/auth/signup` | No | Signup page |
| `/auth/reset-password` | No | Password reset request |
| `/auth/callback` | No | OAuth callback handler |
| `/onboarding` | Yes | Onboarding wizard (if not completed) |
| `/dashboard` | Yes | Main dashboard |
| `/courses` | Yes | Course list (all courses) |
| `/courses/new` | Yes | Add new course |
| `/courses/[id]` | Yes | Course detail page (tabs: Overview, Modules, Analytics, Insights) |
| `/courses/[id]/edit` | Yes | Edit course |
| `/courses/[id]/log` | Yes | Log manual session |
| `/timer` | Yes | Full timer page |
| `/stats` | Yes | Statistics and visualizations |
| `/stats/[date]` | Yes | Day detail view |
| `/buddies` | Yes | Study buddies list and dashboard |
| `/buddies/leaderboard` | Yes | Buddy leaderboard |
| `/profile` | Yes | User profile |
| `/profile/edit` | Yes | Edit profile |
| `/reports` | Yes | Past weekly reports |
| `/settings` | Yes | Settings hub |
| `/settings/account` | Yes | Account management |
| `/settings/notifications` | Yes | Notification preferences |
| `/settings/preferences` | Yes | Study preferences |
| `/settings/data` | Yes | Data export and privacy |
| `/settings/integrations` | Yes | Slack, Discord, OAuth connections |
| `/settings/reminders` | Yes | Study reminder management |
| `/achievements/[shareId]` | No | Public achievement share page |

---

## Appendix D: Realtime Subscriptions

| Channel | Table | Event | Used By |
|---------|-------|-------|---------|
| `user:{userId}:notifications` | notifications | INSERT | Notification bell (all pages) |
| `user:{userId}:sessions` | study_sessions | INSERT, UPDATE | Dashboard activity feed, timer sync |
| `user:{userId}:achievements` | user_achievements | INSERT | Achievement popup (all pages) |
| `buddies:{userId}` | study_sessions (filtered by buddy user_ids) | INSERT | Buddy activity feed |

---

*End of specification.*
