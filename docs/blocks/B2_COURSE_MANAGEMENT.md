# Block B2 - Course Management

> **Block ID**: B2
> **Block Name**: Course Management
> **Directory**: `src/blocks/b2-course-management/`
> **Status**: Specification Complete
> **Last Updated**: 2026-02-19

---

## 1. Purpose

This block owns everything related to course lifecycle management: creating, editing, viewing, filtering, sorting, and managing the status of courses. It is the single source of truth for what courses a user is tracking, their progress, priority, and current status. Other blocks read from the `courses` table but never write to it.

---

## 2. Table Ownership

### Owns

#### `courses`

| Column                   | Type                          | Default              | Nullable | Description                                       |
|--------------------------|-------------------------------|----------------------|---------:|---------------------------------------------------|
| `id`                     | `uuid` PK                    | `gen_random_uuid()`  | No       | Course ID                                          |
| `user_id`                | `uuid` FK -> `auth.users.id` | -                    | No       | Owner of this course                               |
| `title`                  | `text`                        | -                    | No       | Course title                                       |
| `platform`               | `text`                        | -                    | No       | Platform name (see enum below)                     |
| `url`                    | `text`                        | `null`               | Yes      | Link to course on the platform                     |
| `description`            | `text`                        | `null`               | Yes      | Optional user-added description or notes           |
| `status`                 | `text`                        | `'not_started'`      | No       | Current status (see status enum below)             |
| `priority`               | `text`                        | `'p3'`               | No       | Priority level: `p1`, `p2`, `p3`, `p4`             |
| `total_modules`          | `integer`                     | `0`                  | No       | Total number of modules/lessons/chapters           |
| `completed_modules`      | `integer`                     | `0`                  | No       | Number of completed modules                        |
| `total_hours`            | `numeric(6,2)`                | `0`                  | No       | Estimated total hours to complete                  |
| `completed_hours`        | `numeric(6,2)`                | `0`                  | No       | Hours spent so far (aggregated from sessions)      |
| `target_date`            | `date`                        | `null`               | Yes      | Target completion date                             |
| `started_at`             | `timestamptz`                 | `null`               | Yes      | When the course was started                        |
| `completed_at`           | `timestamptz`                 | `null`               | Yes      | When the course was completed                      |
| `abandoned_at`           | `timestamptz`                 | `null`               | Yes      | When the course was abandoned                      |
| `current_streak_days`    | `integer`                     | `0`                  | No       | Current consecutive study days                     |
| `longest_streak_days`    | `integer`                     | `0`                  | No       | Longest consecutive study days ever                |
| `risk_score`             | `numeric(3,2)`                | `0`                  | No       | AI-calculated risk score 0.00-1.00                 |
| `risk_factors`           | `jsonb`                       | `'{}'`               | No       | AI-generated risk factor breakdown                 |
| `sort_order`             | `integer`                     | `0`                  | No       | Manual sort order within priority group            |
| `color_label`            | `text`                        | `null`               | Yes      | Optional color label for visual grouping           |
| `tags`                   | `text[]`                      | `'{}'`               | No       | User-defined tags for categorization               |
| `notes`                  | `text`                        | `null`               | Yes      | Free-form notes about the course                   |
| `created_at`             | `timestamptz`                 | `now()`              | No       | Row creation timestamp                             |
| `updated_at`             | `timestamptz`                 | `now()`              | No       | Last update timestamp (auto via trigger)           |

**Status Enum Values**: `not_started`, `in_progress`, `paused`, `completed`, `abandoned`

**Platform Enum Values**: `udemy`, `coursera`, `pluralsight`, `youtube`, `frontend_masters`, `egghead`, `linkedin_learning`, `codecademy`, `freecodecamp`, `edx`, `skillshare`, `domestika`, `book`, `documentation`, `other`

**Priority Enum Values**: `p1` (Critical), `p2` (High), `p3` (Medium), `p4` (Low)

**RLS Policies**:
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

**Indexes**:
- `INDEX` on `user_id`
- `INDEX` on `user_id, status`
- `INDEX` on `user_id, priority`
- `INDEX` on `user_id, sort_order`
- `INDEX` on `target_date` (for deadline queries)
- `INDEX` on `created_at`

**Triggers**:
- `updated_at` auto-set via `moddatetime` trigger
- `started_at` auto-set when status transitions to `in_progress` for the first time
- `completed_at` auto-set when status transitions to `completed`
- `abandoned_at` auto-set when status transitions to `abandoned`

### Reads

| Table           | Owned By | Fields Read                                            | Purpose                                  |
|-----------------|----------|--------------------------------------------------------|------------------------------------------|
| `user_profiles` | B1       | `timezone`, `daily_study_goal_mins`, `display_name`    | Display context, date calculations       |
| `study_sessions`| B3       | Aggregated: `SUM(duration)`, `COUNT(*)`, `MAX(date)`   | Progress stats, streak calculation display|

**Important**: This block reads these tables via SQL joins/subqueries in its server actions. It does NOT import code from B1 or B3.

---

## 3. Routes

| Route                      | Page Component      | Auth Required | Description                          |
|----------------------------|---------------------|:------------:|---------------------------------------|
| `/courses`                 | `CoursesPage`       | Yes          | Course list with filters and sorting  |
| `/courses/new`             | `CourseNewPage`     | Yes          | Create new course form                |
| `/courses/[id]`            | `CourseDetailPage`  | Yes          | Single course detail view             |
| `/courses/[id]/edit`       | `CourseEditPage`    | Yes          | Edit existing course form             |

---

## 4. Files to Create

```
src/blocks/b2-course-management/
  components/
    course-list.tsx                # Grid/list view of course cards with empty state
    course-card.tsx                # Individual course card with progress, risk, streak
    course-form.tsx                # Create/edit course form (shared for new + edit)
    course-detail.tsx              # Full course detail view with all stats
    course-status-badge.tsx        # Colored status badge (not_started, in_progress, etc.)
    course-priority-badge.tsx      # Priority badge P1-P4 with color coding
    status-transition-dialog.tsx   # Confirmation dialog for status changes
    course-filters.tsx             # Filter bar: status, priority, platform dropdowns
    course-sort.tsx                # Sort dropdown: date, priority, progress, name
    platform-select.tsx            # Platform dropdown with platform icons
    platform-icon.tsx              # Individual platform icon component
    priority-selector.tsx          # P1-P4 priority radio/button group
    bulk-actions-bar.tsx           # Toolbar for bulk operations (status change, delete, priority)
    drag-handle.tsx                # Drag handle icon for manual reordering
    course-progress-bar.tsx        # Progress bar with percentage label
    course-stats-panel.tsx         # Stats sidebar: streak, hours, risk, dates
    risk-indicator.tsx             # Risk score visual indicator (low/medium/high/critical)
    days-remaining-badge.tsx       # Days until target date badge (red if overdue)
    course-empty-state.tsx         # Empty state when no courses exist
    course-action-menu.tsx         # Three-dot menu: edit, status change, delete
    tag-input.tsx                  # Tag input with autocomplete from existing tags
    color-label-picker.tsx         # Color swatch picker for course color labels
  hooks/
    use-courses.ts                 # Fetch, filter, sort courses list with React Query
    use-course.ts                  # Single course with computed stats
    use-course-mutations.ts        # Create, update, delete, reorder mutations
    use-course-filters.ts          # Filter state management (URL search params)
    use-course-stats.ts            # Computed stats: progress %, days remaining, pace
  actions/
    course-actions.ts              # Server actions: CRUD, status transitions, reorder
  lib/
    course-validation.ts           # Zod schemas for course create/edit forms
    course-utils.ts                # Status transition rules, progress calculations, risk display
    platform-config.ts             # Platform definitions: name, icon, color, URL pattern
    priority-config.ts             # Priority definitions: label, color, sort weight
```

---

## 5. UI Mockups

### 5.1 Course List Page - Grid View

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|  Nav: [Dashboard] [*Courses*] [Sessions] [Analytics] [Settings]           |
+===========================================================================+
|                                                                           |
|  My Courses (7)                                       [ + Add Course ]    |
|                                                                           |
|  +-------------------------------------------------------------------+   |
|  | Filters:                                                          |   |
|  | Status: [All Statuses  v]  Priority: [All  v]  Platform: [All  v] |   |
|  |                                                                   |   |
|  | Sort by: [Priority (High to Low)  v]     View: [Grid] [List]      |   |
|  +-------------------------------------------------------------------+   |
|                                                                           |
|  +-- Bulk Actions (2 selected) ------------------------------------------+
|  | [ Change Status v ]  [ Change Priority v ]  [ Delete Selected ]       |
|  +-----------------------------------------------------------------------+
|                                                                           |
|  +------------------------------+  +------------------------------+      |
|  | [x] [Udemy]         [P1]    |  | [ ] [Coursera]        [P1]   |      |
|  |                              |  |                              |      |
|  | React - The Complete Guide   |  | Machine Learning Spec.       |      |
|  |                              |  |                              |      |
|  | ████████████░░░░░░░░ 62%     |  | ████░░░░░░░░░░░░░░░░ 20%    |      |
|  | 18/29 modules                |  | 4/20 modules                 |      |
|  |                              |  |                              |      |
|  | Streak: 5 days               |  | Streak: 0 days               |      |
|  | Target: 12 days left         |  | Target: 45 days left         |      |
|  | Risk: LOW                    |  | Risk: HIGH                   |      |
|  |                              |  |                              |      |
|  | [In Progress]         [...]  |  | [In Progress]         [...]  |      |
|  +------------------------------+  +------------------------------+      |
|                                                                           |
|  +------------------------------+  +------------------------------+      |
|  | [ ] [YouTube]         [P2]   |  | [ ] [Book]            [P2]   |      |
|  |                              |  |                              |      |
|  | CS50 Introduction to CS      |  | Designing Data-Intensive     |      |
|  |                              |  | Applications                 |      |
|  | ██████████████░░░░░░ 75%     |  | ░░░░░░░░░░░░░░░░░░░░  0%    |      |
|  | 9/12 modules                 |  | 0/12 chapters                |      |
|  |                              |  |                              |      |
|  | Streak: 12 days              |  | Streak: --                   |      |
|  | Target: 3 days left          |  | Target: not set              |      |
|  | Risk: MEDIUM                 |  | Risk: --                     |      |
|  |                              |  |                              |      |
|  | [In Progress]         [...]  |  | [Not Started]         [...]  |      |
|  +------------------------------+  +------------------------------+      |
|                                                                           |
|  +------------------------------+  +------------------------------+      |
|  | [ ] [Pluralsight]     [P3]   |  | [ ] [FrontendMasters]  [P3]  |      |
|  |                              |  |                              |      |
|  | Docker Deep Dive             |  | Complete Intro to React v9   |      |
|  |                              |  |                              |      |
|  | ████████████████████ 100%    |  | ██████████░░░░░░░░░░ 50%    |      |
|  | 15/15 modules                |  | 8/16 modules                 |      |
|  |                              |  |                              |      |
|  | Streak: --                   |  | Streak: 2 days               |      |
|  | Completed 2 days ago         |  | Target: 30 days left         |      |
|  | Risk: --                     |  | Risk: LOW                    |      |
|  |                              |  |                              |      |
|  | [Completed]           [...]  |  | [Paused]              [...]  |      |
|  +------------------------------+  +------------------------------+      |
|                                                                           |
+===========================================================================+
```

### 5.2 Course List Page - Empty State

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|  Nav: [Dashboard] [*Courses*] [Sessions] [Analytics] [Settings]           |
+===========================================================================+
|                                                                           |
|  My Courses (0)                                       [ + Add Course ]    |
|                                                                           |
|  +-------------------------------------------------------------------+   |
|  |                                                                   |   |
|  |                                                                   |   |
|  |                     No courses yet                                |   |
|  |                                                                   |   |
|  |          Start tracking your learning journey by                  |   |
|  |              adding your first course.                            |   |
|  |                                                                   |   |
|  |              [ + Add Your First Course ]                          |   |
|  |                                                                   |   |
|  |                                                                   |   |
|  +-------------------------------------------------------------------+   |
|                                                                           |
+===========================================================================+
```

### 5.3 Course Card - Detailed Anatomy

```
+----------------------------------------------+
|  [x]  [Platform Icon]              [P1] [..] |  <- Checkbox, platform, priority, menu
|                                               |
|  Course Title Goes Here                       |  <- Title (truncated if long)
|  udemy.com                                    |  <- Platform subtitle / domain
|                                               |
|  ████████████░░░░░░░░░░░░░░  45%             |  <- Progress bar + percentage
|  13 / 29 modules  |  12.5 / 28 hrs           |  <- Module + hour progress
|                                               |
|  Streak: 5 days     Daily avg: 1.2 hrs       |  <- Streak and pace
|  Target: Mar 15 (24 days left)                |  <- Target date + countdown
|                                               |
|  Risk: ██░░░ MEDIUM                           |  <- Risk indicator bar
|                                               |
|  [In Progress]                                |  <- Status badge
|  #react  #frontend                            |  <- Tags
+----------------------------------------------+
```

### 5.4 Add/Edit Course Form

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|  Nav: [Dashboard] [*Courses*] [Sessions] [Analytics] [Settings]           |
+===========================================================================+
|                                                                           |
|  <- Back to Courses                                                       |
|                                                                           |
|  Add New Course                                                           |
|  ----------------------------------------------------------------         |
|                                                                           |
|  Course Title *                                                           |
|  +----------------------------------------------------------+            |
|  | React - The Complete Guide 2026                           |            |
|  +----------------------------------------------------------+            |
|                                                                           |
|  Platform *                                                               |
|  +----------------------------------------------------------+            |
|  | [Udemy icon] Udemy                                   [v]  |            |
|  +----------------------------------------------------------+            |
|                                                                           |
|  Course URL                                                               |
|  +----------------------------------------------------------+            |
|  | https://udemy.com/course/react-complete-guide             |            |
|  +----------------------------------------------------------+            |
|                                                                           |
|  Description                                                              |
|  +----------------------------------------------------------+            |
|  | Comprehensive React course covering hooks, Redux,         |            |
|  | Next.js, and more.                                        |            |
|  +----------------------------------------------------------+            |
|                                                                           |
|  +----------------------------+  +----------------------------+           |
|  | Total Modules *            |  | Estimated Total Hours      |           |
|  | +----------------------+   |  | +----------------------+   |           |
|  | | 29                   |   |  | | 28                   |   |           |
|  | +----------------------+   |  | +----------------------+   |           |
|  +----------------------------+  +----------------------------+           |
|                                                                           |
|  Target Completion Date                                                   |
|  +----------------------------------------------------------+            |
|  | March 15, 2026                                    [cal]   |            |
|  +----------------------------------------------------------+            |
|                                                                           |
|  Priority                                                                 |
|  [*P1*]  [ P2 ]  [ P3 ]  [ P4 ]                                          |
|  Critical  High   Medium   Low                                            |
|                                                                           |
|  Color Label                                                              |
|  ( ) None  (*) Red  ( ) Orange  ( ) Yellow  ( ) Green  ( ) Blue  ( ) Purple|
|                                                                           |
|  Tags                                                                     |
|  +----------------------------------------------------------+            |
|  | react, frontend  |  + add tag                             |            |
|  +----------------------------------------------------------+            |
|                                                                           |
|           [ Cancel ]                      [ Create Course ]               |
|                                                                           |
+===========================================================================+
```

### 5.5 Course Detail Page

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|  Nav: [Dashboard] [*Courses*] [Sessions] [Analytics] [Settings]           |
+===========================================================================+
|                                                                           |
|  <- Back to Courses                           [ Edit ]  [ ... ]           |
|                                                                           |
|  +-----------------------------------------------------------------------+|
|  |  [Udemy]                                                              ||
|  |  React - The Complete Guide 2026                                      ||
|  |  https://udemy.com/course/react-complete-guide                        ||
|  |                                                                       ||
|  |  [In Progress]  [P1 Critical]  #react  #frontend                     ||
|  +-----------------------------------------------------------------------+|
|                                                                           |
|  +----------------------------------+  +--------------------------------+ |
|  |  Progress                        |  |  Stats                         | |
|  |  --------------------------------|  |  ------------------------------| |
|  |                                  |  |                                | |
|  |  Overall                         |  |  Current Streak:  5 days      | |
|  |  ████████████░░░░░░░░  62%       |  |  Longest Streak:  12 days     | |
|  |                                  |  |  Daily Average:   1.2 hrs     | |
|  |  Modules                         |  |  Total Sessions:  23          | |
|  |  18 / 29 completed               |  |  Total Time:      18.5 hrs    | |
|  |                                  |  |                                | |
|  |  Hours                           |  |  ----------------------------- | |
|  |  18.5 / 28.0 hours               |  |                                | |
|  |                                  |  |  Started:     Jan 15, 2026    | |
|  |  Pace                            |  |  Target:      Mar 15, 2026    | |
|  |  On track - 1.3 hrs/day needed   |  |  Days Left:   24              | |
|  |  to meet target date             |  |  Days Elapsed: 35             | |
|  |                                  |  |                                | |
|  +----------------------------------+  |  ----------------------------- | |
|                                        |                                | |
|  +----------------------------------+  |  Risk Assessment               | |
|  |  Status Actions                  |  |  ██░░░ 0.35 MEDIUM            | |
|  |  --------------------------------|  |                                | |
|  |                                  |  |  Factors:                      | |
|  |  Current: In Progress            |  |  - Pace slightly behind        | |
|  |                                  |  |  - 2 missed days this week     | |
|  |  [ Pause ]  [Complete] [Abandon] |  |  + Strong streak history       | |
|  |                                  |  |                                | |
|  +----------------------------------+  +--------------------------------+ |
|                                                                           |
|  +-----------------------------------------------------------------------+|
|  |  Notes                                                                ||
|  |  ------------------------------------------------------------------   ||
|  |  Comprehensive React course covering hooks, Redux, Next.js.           ||
|  |  Focus on the hooks section - lots of practical exercises.            ||
|  |  [ Edit Notes ]                                                       ||
|  +-----------------------------------------------------------------------+|
|                                                                           |
|  +-----------------------------------------------------------------------+|
|  |  Recent Study Sessions                             [ View All ]       ||
|  |  ------------------------------------------------------------------   ||
|  |  Feb 18, 2026  |  1.5 hrs  |  Modules 17-18  |  "Redux middleware"   ||
|  |  Feb 17, 2026  |  1.0 hrs  |  Module 16      |  "Redux basics"       ||
|  |  Feb 15, 2026  |  2.0 hrs  |  Modules 14-15  |  "Context API"        ||
|  |  Feb 14, 2026  |  0.5 hrs  |  Module 13      |  "Custom hooks"       ||
|  |  Feb 13, 2026  |  1.5 hrs  |  Modules 11-12  |  "useEffect deep"     ||
|  +-----------------------------------------------------------------------+|
|                                                                           |
+===========================================================================+
```

### 5.6 Status Transition Confirmation Dialog

```
+-------------------------------------------------------+
|                                                       |
|  Change Course Status                          [X]    |
|  ---------------------------------------------------- |
|                                                       |
|  Are you sure you want to abandon this course?        |
|                                                       |
|  Course: React - The Complete Guide 2026              |
|  Current Status: In Progress                          |
|  New Status: Abandoned                                |
|                                                       |
|  Current progress (62%) will be preserved.            |
|  You can restart this course later.                   |
|                                                       |
|  Reason (optional):                                   |
|  +-----------------------------------------------+   |
|  | Course content is outdated                     |   |
|  +-----------------------------------------------+   |
|                                                       |
|           [ Cancel ]         [ Confirm Abandon ]      |
|                                                       |
+-------------------------------------------------------+
```

### 5.7 Course Action Menu (Three-dot)

```
                                +-------------------------+
                                |  Edit Course            |
                                |  ---------------------- |
                                |  Start Course      ->   |
                                |  Pause              ->   |
                                |  Mark Complete      ->   |
                                |  Abandon            ->   |
                                |  ---------------------- |
                                |  Change Priority    ->   |
                                |  ---------------------- |
                                |  Delete Course           |
                                +-------------------------+
```

### 5.8 Bulk Actions Bar

```
+===========================================================================+
|  2 courses selected                                                       |
|                                                                           |
|  [ Change Status  v ]  [ Change Priority  v ]  [ Delete Selected ]        |
|                                                                           |
|  [ Clear Selection ]                                                      |
+===========================================================================+
```

---

## 6. Status Transition Rules

### State Machine

```
                        +---------------+
                        |  not_started  |
                        +-------+-------+
                                |
                          start |
                                v
            +----------> in_progress <----------+
            |           +-----+-----+           |
            |             |   |   |             |
      resume|       pause |   |   | complete    | restart
            |             v   |   v             |
            |         +-------+  +----------+   |
            |         | paused | | completed |   |
            |         +---+---+  +----------+   |
            |             |       (terminal)     |
            +-------------+                      |
                          |                      |
                   abandon|                      |
                          v                      |
                     +---------+                 |
                     |abandoned +-----------------+
                     +---------+
```

### Transition Table

| From           | To            | Action Label     | Requires Confirmation | Auto-set Fields                        | Validation Rules                           |
|----------------|---------------|------------------|-----------------------|----------------------------------------|--------------------------------------------|
| `not_started`  | `in_progress` | Start Course     | No                    | `started_at = now()`                   | None                                       |
| `in_progress`  | `paused`      | Pause            | No                    | -                                      | None                                       |
| `in_progress`  | `completed`   | Mark Complete    | Yes                   | `completed_at = now()`                 | Progress >= 100% OR manual override checkbox|
| `in_progress`  | `abandoned`   | Abandon          | Yes (with reason)     | `abandoned_at = now()`                 | None                                       |
| `paused`       | `in_progress` | Resume           | No                    | -                                      | None                                       |
| `paused`       | `abandoned`   | Abandon          | Yes (with reason)     | `abandoned_at = now()`                 | None                                       |
| `completed`    | -             | (terminal)       | -                     | -                                      | No transitions allowed from completed      |
| `abandoned`    | `in_progress` | Restart          | Yes                   | `abandoned_at = null`, reset streak    | None                                       |

### Invalid Transitions (blocked in code)

- `not_started` -> `completed` (must start first)
- `not_started` -> `paused` (must start first)
- `not_started` -> `abandoned` (nothing to abandon)
- `completed` -> any state (terminal)
- `paused` -> `completed` (must resume first)

---

## 7. Component Tree

```
CoursesPage (route: /courses)
├── PageHeader
│   ├── Title + CourseCount
│   └── AddCourseButton (link to /courses/new)
├── CourseFilters
│   ├── StatusFilter (Select: All, Not Started, In Progress, Paused, Completed, Abandoned)
│   ├── PriorityFilter (Select: All, P1, P2, P3, P4)
│   ├── PlatformFilter (Select: All, Udemy, Coursera, ... other)
│   └── SearchInput (search by title)
├── CourseSort
│   ├── SortField (Select: Priority, Progress, Name, Target Date, Created, Updated)
│   └── SortDirection (Asc / Desc toggle)
├── ViewToggle (Grid / List toggle)
├── BulkActionsBar (visible when items selected)
│   ├── SelectedCount
│   ├── ChangeStatusDropdown
│   ├── ChangePriorityDropdown
│   ├── DeleteSelectedButton
│   └── ClearSelectionButton
├── CourseGrid / CourseListView (based on view toggle)
│   └── CourseCard (x N)
│       ├── Checkbox (for bulk select)
│       ├── PlatformIcon
│       ├── CoursePriorityBadge
│       ├── CourseTitle (link to /courses/[id])
│       ├── PlatformSubtitle
│       ├── CourseProgressBar
│       ├── ModuleCount + HourCount
│       ├── StreakBadge
│       ├── DaysRemainingBadge
│       ├── RiskIndicator
│       ├── CourseStatusBadge
│       ├── TagList
│       ├── DragHandle (for manual reorder)
│       └── CourseActionMenu
│           ├── Edit (link to /courses/[id]/edit)
│           ├── StatusTransitions (dynamic based on current status)
│           ├── ChangePriority (submenu: P1, P2, P3, P4)
│           └── Delete (with confirmation)
└── CourseEmptyState (when no courses match filters)

CourseDetailPage (route: /courses/[id])
├── BackLink (to /courses)
├── ActionButtons
│   ├── EditButton (link to /courses/[id]/edit)
│   └── MoreMenu (delete, etc.)
├── CourseHeader
│   ├── PlatformIcon
│   ├── CourseTitle
│   ├── CourseUrl (external link)
│   ├── CourseStatusBadge
│   ├── CoursePriorityBadge
│   └── TagList
├── ProgressSection
│   ├── OverallProgressBar (percentage)
│   ├── ModuleProgress (X / Y modules)
│   ├── HourProgress (X / Y hours)
│   └── PaceIndicator (on track / behind / ahead)
├── CourseStatsPanel
│   ├── CurrentStreak
│   ├── LongestStreak
│   ├── DailyAverage
│   ├── TotalSessions
│   ├── TotalTime
│   ├── StartedDate
│   ├── TargetDate
│   ├── DaysLeft
│   └── DaysElapsed
├── RiskAssessment
│   ├── RiskIndicator (score + level)
│   └── RiskFactorsList (from risk_factors jsonb)
├── StatusActionsPanel
│   ├── CurrentStatusDisplay
│   └── TransitionButtons (dynamic based on current status)
│       └── StatusTransitionDialog (on click)
├── NotesSection
│   ├── NotesDisplay
│   └── EditNotesButton (inline edit)
└── RecentSessionsList (reads from study_sessions, display only)
    └── SessionRow (x 5, most recent)
        ├── Date
        ├── Duration
        ├── ModulesCompleted
        └── SessionNotes

CourseNewPage (route: /courses/new)
├── BackLink (to /courses)
├── PageTitle ("Add New Course")
└── CourseForm (mode: "create")
    ├── Input (title, required)
    ├── PlatformSelect (required)
    ├── Input (url, optional, validated as URL)
    ├── Textarea (description, optional)
    ├── NumberInput (total_modules, required, min 1)
    ├── NumberInput (total_hours, optional, min 0)
    ├── DatePicker (target_date, optional, must be future)
    ├── PrioritySelector (P1-P4 radio group, default P3)
    ├── ColorLabelPicker (optional)
    ├── TagInput (optional, autocomplete from existing tags)
    ├── Textarea (notes, optional)
    ├── CancelButton (navigates back)
    └── SubmitButton ("Create Course")

CourseEditPage (route: /courses/[id]/edit)
├── BackLink (to /courses/[id])
├── PageTitle ("Edit Course")
└── CourseForm (mode: "edit", prefilled with current data)
    ├── (same fields as create, but prefilled)
    ├── AdditionalFields (visible in edit only):
    │   ├── NumberInput (completed_modules, min 0, max total_modules)
    │   └── NumberInput (completed_hours, min 0, max total_hours)
    ├── CancelButton (navigates back)
    └── SubmitButton ("Save Changes")
```

---

## 8. Hooks

### `use-courses.ts`

```typescript
// Input:
{
  status?: CourseStatus | 'all';     // Filter by status
  priority?: Priority | 'all';      // Filter by priority
  platform?: Platform | 'all';      // Filter by platform
  search?: string;                   // Search by title (debounced)
  sortBy?: 'priority' | 'progress' | 'name' | 'target_date' | 'created_at' | 'updated_at';
  sortDir?: 'asc' | 'desc';
}

// Returns:
{
  courses: Course[];                 // Filtered and sorted course list
  total: number;                     // Total count (before filters)
  filteredCount: number;             // Count after filters
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// React Query key: ['courses', userId, filters, sort]
// Stale time: 2 minutes
// Refetches on window focus
```

### `use-course.ts`

```typescript
// Input: courseId: string

// Returns:
{
  course: CourseWithStats | null;    // Course with computed stats
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Computed fields in CourseWithStats:
{
  ...Course,
  progressPercent: number;           // completed_modules / total_modules * 100
  hoursPercent: number;              // completed_hours / total_hours * 100
  daysRemaining: number | null;     // target_date - today (null if no target)
  daysElapsed: number | null;       // today - started_at (null if not started)
  paceRequired: number | null;      // hours_remaining / days_remaining
  isOnTrack: boolean | null;        // current pace >= required pace
  riskLevel: 'low' | 'medium' | 'high' | 'critical';  // derived from risk_score
}

// React Query key: ['course', courseId]
// Stale time: 1 minute
```

### `use-course-mutations.ts`

```typescript
// Returns:
{
  createCourse: (data: CreateCourseInput) => Promise<Course>;
  updateCourse: (id: string, data: UpdateCourseInput) => Promise<Course>;
  deleteCourse: (id: string) => Promise<void>;
  transitionStatus: (id: string, newStatus: CourseStatus, reason?: string) => Promise<Course>;
  updatePriority: (id: string, priority: Priority) => Promise<Course>;
  reorderCourses: (orderedIds: string[]) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: CourseStatus) => Promise<void>;
  bulkUpdatePriority: (ids: string[], priority: Priority) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<void>;
  isLoading: boolean;
}

// All mutations invalidate ['courses'] query on success
// Optimistic updates for reorder, priority changes
// Pessimistic updates for status transitions (wait for server validation)
```

### `use-course-filters.ts`

```typescript
// Syncs filter state with URL search params for shareable/bookmarkable URLs

// Returns:
{
  filters: CourseFilters;
  setFilter: (key: keyof CourseFilters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

// URL params: ?status=in_progress&priority=p1&platform=udemy&sort=progress&dir=desc&q=react
```

### `use-course-stats.ts`

```typescript
// Input: course: Course

// Returns:
{
  progressPercent: number;
  hoursPercent: number;
  daysRemaining: number | null;
  daysElapsed: number | null;
  paceRequired: number | null;       // hrs/day needed to meet target
  currentPace: number | null;        // actual hrs/day since start
  isOnTrack: boolean | null;
  isOverdue: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

---

## 9. Server Actions

### `course-actions.ts`

| Action              | Input                                          | Output           | Description                                    |
|---------------------|------------------------------------------------|------------------|------------------------------------------------|
| `getCourses`        | `{ filters, sort }`                            | `Course[]`       | Fetch filtered/sorted courses for current user |
| `getCourse`         | `{ id: string }`                               | `CourseWithStats` | Fetch single course with computed stats       |
| `createCourse`      | `CreateCourseInput`                            | `Course`         | Create new course                              |
| `updateCourse`      | `{ id: string, data: UpdateCourseInput }`      | `Course`         | Update course fields                           |
| `deleteCourse`      | `{ id: string }`                               | `void`           | Soft or hard delete course                     |
| `transitionStatus`  | `{ id, newStatus, reason? }`                   | `Course`         | Change status with validation                  |
| `updatePriority`    | `{ id: string, priority: Priority }`           | `Course`         | Change priority                                |
| `reorderCourses`    | `{ orderedIds: string[] }`                     | `void`           | Update sort_order for all provided IDs         |
| `bulkUpdateStatus`  | `{ ids: string[], status: CourseStatus }`      | `void`           | Bulk status change                             |
| `bulkUpdatePriority`| `{ ids: string[], priority: Priority }`        | `void`           | Bulk priority change                           |
| `bulkDelete`        | `{ ids: string[] }`                            | `void`           | Bulk delete courses                            |
| `getUserTags`       | -                                              | `string[]`       | Get unique tags across all user's courses      |

**Status Transition Validation** (inside `transitionStatus`):

```typescript
const VALID_TRANSITIONS: Record<CourseStatus, CourseStatus[]> = {
  not_started:  ['in_progress'],
  in_progress:  ['paused', 'completed', 'abandoned'],
  paused:       ['in_progress', 'abandoned'],
  completed:    [],  // terminal state
  abandoned:    ['in_progress'],
};

// 1. Check current status allows transition to newStatus
// 2. For 'completed': verify progress >= 100% OR override flag
// 3. For 'abandoned': require confirmation (handled client-side, reason stored)
// 4. Auto-set timestamp fields (started_at, completed_at, abandoned_at)
// 5. For 'restart' (abandoned -> in_progress): clear abandoned_at, reset streak
```

---

## 10. Validation Schemas (Zod)

```typescript
// course-validation.ts

export const platformEnum = z.enum([
  'udemy', 'coursera', 'pluralsight', 'youtube', 'frontend_masters',
  'egghead', 'linkedin_learning', 'codecademy', 'freecodecamp',
  'edx', 'skillshare', 'domestika', 'book', 'documentation', 'other',
]);

export const courseStatusEnum = z.enum([
  'not_started', 'in_progress', 'paused', 'completed', 'abandoned',
]);

export const priorityEnum = z.enum(['p1', 'p2', 'p3', 'p4']);

export const colorLabelEnum = z.enum([
  'red', 'orange', 'yellow', 'green', 'blue', 'purple',
]).nullable();

export const createCourseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  platform: platformEnum,
  url: z.string().url("Must be a valid URL").nullable().or(z.literal('')),
  description: z.string().max(2000).nullable(),
  total_modules: z.number().int().min(1, "Must have at least 1 module").max(9999),
  total_hours: z.number().min(0).max(9999).default(0),
  target_date: z.string().date().nullable().refine(
    (val) => !val || new Date(val) > new Date(),
    { message: "Target date must be in the future" }
  ),
  priority: priorityEnum.default('p3'),
  color_label: colorLabelEnum.default(null),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  notes: z.string().max(5000).nullable().default(null),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  completed_modules: z.number().int().min(0).optional(),
  completed_hours: z.number().min(0).optional(),
}).refine(
  (data) => {
    if (data.completed_modules !== undefined && data.total_modules !== undefined) {
      return data.completed_modules <= data.total_modules;
    }
    return true;
  },
  { message: "Completed modules cannot exceed total modules", path: ['completed_modules'] }
).refine(
  (data) => {
    if (data.completed_hours !== undefined && data.total_hours !== undefined) {
      return data.completed_hours <= data.total_hours;
    }
    return true;
  },
  { message: "Completed hours cannot exceed total hours", path: ['completed_hours'] }
);

export const statusTransitionSchema = z.object({
  courseId: z.string().uuid(),
  newStatus: courseStatusEnum,
  reason: z.string().max(500).optional(),
  overrideCompletion: z.boolean().default(false),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});
```

---

## 11. Utility Functions

### `course-utils.ts`

```typescript
// Status transition validation
isValidTransition(from: CourseStatus, to: CourseStatus): boolean

// Get available transitions for a status
getAvailableTransitions(status: CourseStatus): CourseStatus[]

// Get transition label
getTransitionLabel(from: CourseStatus, to: CourseStatus): string
// e.g., "Start Course", "Pause", "Resume", "Mark Complete", "Abandon", "Restart"

// Does this transition require confirmation?
requiresConfirmation(from: CourseStatus, to: CourseStatus): boolean

// Calculate progress percentage
calcProgress(completed: number, total: number): number  // 0-100, handles div by 0

// Calculate days remaining
calcDaysRemaining(targetDate: string | null, timezone: string): number | null

// Calculate required daily pace
calcRequiredPace(remainingHours: number, daysRemaining: number): number | null

// Derive risk level from score
riskLevel(score: number): 'low' | 'medium' | 'high' | 'critical'
// 0.00-0.25 = low, 0.26-0.50 = medium, 0.51-0.75 = high, 0.76-1.00 = critical
```

### `platform-config.ts`

```typescript
export const PLATFORMS: Record<Platform, {
  label: string;
  icon: string;           // Icon name from lucide-react or custom
  color: string;          // Brand color hex
  urlPattern?: RegExp;    // For URL validation/auto-detection
}> = {
  udemy:              { label: 'Udemy',              icon: 'graduation-cap', color: '#A435F0', urlPattern: /udemy\.com/ },
  coursera:           { label: 'Coursera',           icon: 'book-open',      color: '#0056D2', urlPattern: /coursera\.org/ },
  pluralsight:        { label: 'Pluralsight',        icon: 'play-circle',    color: '#E80A89', urlPattern: /pluralsight\.com/ },
  youtube:            { label: 'YouTube',            icon: 'youtube',        color: '#FF0000', urlPattern: /youtube\.com|youtu\.be/ },
  frontend_masters:   { label: 'Frontend Masters',   icon: 'monitor',        color: '#C02D28', urlPattern: /frontendmasters\.com/ },
  egghead:            { label: 'egghead.io',         icon: 'egg',            color: '#FCFBFA', urlPattern: /egghead\.io/ },
  linkedin_learning:  { label: 'LinkedIn Learning',  icon: 'linkedin',       color: '#0A66C2', urlPattern: /linkedin\.com\/learning/ },
  codecademy:         { label: 'Codecademy',         icon: 'code',           color: '#1F4056', urlPattern: /codecademy\.com/ },
  freecodecamp:       { label: 'freeCodeCamp',       icon: 'campfire',       color: '#0A0A23', urlPattern: /freecodecamp\.org/ },
  edx:                { label: 'edX',                icon: 'university',     color: '#02262B', urlPattern: /edx\.org/ },
  skillshare:         { label: 'Skillshare',         icon: 'palette',        color: '#00FF84', urlPattern: /skillshare\.com/ },
  domestika:          { label: 'Domestika',          icon: 'paintbrush',     color: '#FF6B00', urlPattern: /domestika\.org/ },
  book:               { label: 'Book',               icon: 'book',           color: '#8B6914' },
  documentation:      { label: 'Documentation',      icon: 'file-text',      color: '#4A5568' },
  other:              { label: 'Other',              icon: 'globe',          color: '#718096' },
};
```

### `priority-config.ts`

```typescript
export const PRIORITIES: Record<Priority, {
  label: string;
  shortLabel: string;
  color: string;         // Tailwind color class
  bgColor: string;       // Background color class
  sortWeight: number;    // Lower = higher priority in sort
  description: string;
}> = {
  p1: { label: 'Critical',  shortLabel: 'P1', color: 'text-red-700',    bgColor: 'bg-red-100',    sortWeight: 1, description: 'Must complete ASAP' },
  p2: { label: 'High',      shortLabel: 'P2', color: 'text-orange-700', bgColor: 'bg-orange-100', sortWeight: 2, description: 'Important, complete soon' },
  p3: { label: 'Medium',    shortLabel: 'P3', color: 'text-blue-700',   bgColor: 'bg-blue-100',   sortWeight: 3, description: 'Standard priority' },
  p4: { label: 'Low',       shortLabel: 'P4', color: 'text-gray-600',   bgColor: 'bg-gray-100',   sortWeight: 4, description: 'Nice to have, no rush' },
};
```

---

## 12. State Management

| Concern                  | Strategy                      | Details                                                      |
|--------------------------|-------------------------------|--------------------------------------------------------------|
| Course list data         | React Query                   | Key: `['courses', userId, filters, sort]`, stale: 2min       |
| Single course data       | React Query                   | Key: `['course', courseId]`, stale: 1min                     |
| Filter state             | URL search params             | Synced via `use-course-filters.ts`, bookmarkable             |
| Sort state               | URL search params             | Included with filters in URL                                 |
| Bulk selection           | Local state (`useState`)      | Set of selected course IDs                                   |
| Form editing             | React Hook Form + Zod         | `useForm` with zodResolver for validation                    |
| Reorder (drag-drop)      | Optimistic update             | Update local order immediately, sync sort_order to DB        |
| Status transitions       | Pessimistic update            | Wait for server validation before updating UI                |
| View toggle (grid/list)  | Local storage                 | Persist preference across sessions                           |
| Toast notifications      | `sonner` (via shadcn/ui)      | Success/error feedback on all mutations                      |

---

## 13. shadcn/ui Components Used

- `Button`, `Input`, `Label`, `Select`, `Textarea`, `NumberInput`
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Badge` (status badges, priority badges, tags)
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter` (status transitions, delete confirmations)
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` (action menu, sort, bulk actions)
- `Progress` (progress bars)
- `Checkbox` (bulk select)
- `RadioGroup`, `RadioGroupItem` (priority selector)
- `Popover` + `Calendar` (date picker)
- `Separator`
- `Tooltip` (risk indicator, pace info)
- `Skeleton` (loading states)
- `ToggleGroup`, `ToggleGroupItem` (view toggle: grid/list)
- `Command`, `CommandInput`, `CommandList`, `CommandItem` (tag autocomplete, platform search)

---

## 14. Error Handling

| Scenario                         | Handling                                                           |
|----------------------------------|--------------------------------------------------------------------|
| Course list fetch fails          | Show error state with retry button, preserve filter state          |
| Single course not found          | Show 404 page with link back to courses list                       |
| Course create fails              | Toast error, keep form data, re-enable submit button               |
| Course update fails              | Toast error, keep form data, re-enable submit button               |
| Invalid status transition        | Server rejects with specific error message; toast error            |
| Complete without 100% progress   | Show override checkbox in confirmation dialog                      |
| Delete fails                     | Toast error, keep dialog open                                      |
| Bulk action partial failure      | Toast with count: "3 of 5 courses updated. 2 failed."             |
| Drag reorder fails               | Revert to previous order, toast error                              |
| URL validation fails             | Inline field error on the URL input                                |
| Target date in past              | Inline field error: "Target date must be in the future"            |
| Completed modules > total        | Inline field error: "Cannot exceed total modules"                  |
| Network error (any action)       | Toast: "Network error, please try again" + keep current UI state   |
| Concurrent edit conflict         | Toast: "Course was updated by another session. Refreshing..."      |

---

## 15. Testing Plan

### Unit Tests

| Test                                                  | File                          |
|-------------------------------------------------------|-------------------------------|
| Create course Zod schema validates correct data       | `course-validation.test.ts`   |
| Create course schema rejects missing title            | `course-validation.test.ts`   |
| Create course schema rejects past target date         | `course-validation.test.ts`   |
| Update course schema allows partial fields            | `course-validation.test.ts`   |
| Update course schema rejects completed > total        | `course-validation.test.ts`   |
| Status transition schema validates                    | `course-validation.test.ts`   |
| `isValidTransition` allows valid transitions          | `course-utils.test.ts`        |
| `isValidTransition` rejects invalid transitions       | `course-utils.test.ts`        |
| `getAvailableTransitions` returns correct options     | `course-utils.test.ts`        |
| `calcProgress` handles edge cases (0, div by 0)      | `course-utils.test.ts`        |
| `calcDaysRemaining` handles null, past, future dates  | `course-utils.test.ts`        |
| `calcRequiredPace` handles edge cases                 | `course-utils.test.ts`        |
| `riskLevel` maps score ranges correctly               | `course-utils.test.ts`        |
| Platform config has all required fields               | `platform-config.test.ts`     |
| Priority config sort weights are unique and ordered   | `priority-config.test.ts`     |

### Integration Tests

| Test                                                  | File                          |
|-------------------------------------------------------|-------------------------------|
| Course list renders with mock data                    | `course-list.test.tsx`        |
| Course filters update URL params                      | `course-filters.test.tsx`     |
| Course filters correctly filter displayed courses     | `course-filters.test.tsx`     |
| Course sort reorders cards correctly                  | `course-sort.test.tsx`        |
| Course form validates and submits                     | `course-form.test.tsx`        |
| Course form shows inline errors for invalid fields    | `course-form.test.tsx`        |
| Status transition dialog shows correct options        | `status-transition.test.tsx`  |
| Status transition updates badge after confirmation    | `status-transition.test.tsx`  |
| Bulk selection and bulk actions work correctly        | `bulk-actions.test.tsx`       |
| Course card displays all expected information         | `course-card.test.tsx`        |
| Course detail page shows stats correctly              | `course-detail.test.tsx`      |
| Empty state shows when no courses exist               | `course-list.test.tsx`        |
| Priority badge renders correct color per level        | `course-priority.test.tsx`    |

### E2E Tests

| Test                                                  | File                          |
|-------------------------------------------------------|-------------------------------|
| User creates a new course end-to-end                  | `course-crud.e2e.ts`         |
| User edits a course and sees changes persisted        | `course-crud.e2e.ts`         |
| User deletes a course with confirmation               | `course-crud.e2e.ts`         |
| User transitions course through full lifecycle        | `course-lifecycle.e2e.ts`    |
| User filters and sorts course list                    | `course-filtering.e2e.ts`    |
| User uses bulk actions on multiple courses            | `course-bulk.e2e.ts`         |

---

## 16. "Do Not Touch" Boundaries

| Boundary                              | Reason                                                                 |
|---------------------------------------|------------------------------------------------------------------------|
| Study sessions (CRUD)                 | Owned by Block B3. This block reads `study_sessions` via DB joins for display (recent sessions, streaks, hours) but NEVER creates, updates, or deletes sessions. |
| AI risk score calculation             | Owned by a separate AI/analytics block. This block reads `risk_score` and `risk_factors` from the `courses` table (which the AI block writes to) but never computes risk scores itself. |
| Streak calculation logic              | Owned by Block B3 or a background job. This block reads `current_streak_days` and `longest_streak_days` but does not calculate them. |
| User profile CRUD                     | Owned by Block B1. This block reads `user_profiles` for timezone and display_name but never modifies profile data. |
| Authentication                        | Handled by foundation layer. This block uses `auth.uid()` for RLS but does not manage auth flows. |
| Notifications/reminders               | Owned by a notification block. This block does not send any notifications. |
| Dashboard aggregations                | Owned by a dashboard block. This block provides the raw data, not the aggregated dashboard views. |

---

## 17. Cross-Block Communication

This block communicates with other blocks **exclusively through the database**:

### Data This Block Writes (others read)

- **`courses` table** - The canonical source for:
  - Course metadata (title, platform, url, description)
  - Course status and priority
  - Module/hour progress (completed_modules, completed_hours)
  - Target dates
  - Tags and color labels
  - Sort order

### Data This Block Reads (others write)

- **`user_profiles`** (B1 writes): timezone, daily_study_goal_mins, display_name
- **`study_sessions`** (B3 writes): aggregated for display in course detail (recent sessions list, total time)
- **`courses.risk_score`** and **`courses.risk_factors`** (AI block writes): displayed in course detail and course cards
- **`courses.current_streak_days`** and **`courses.longest_streak_days`** (B3 or background job writes): displayed in course cards and detail

**No cross-block code imports.** All inter-block data flows happen through database reads. Each block maintains its own components, hooks, actions, and utilities independently.

---

## 18. Performance Considerations

| Concern                     | Strategy                                                             |
|-----------------------------|----------------------------------------------------------------------|
| Course list query           | Index on `(user_id, status)` and `(user_id, priority)` for filtered queries |
| Pagination                  | Initial load: all courses (most users have < 50). If > 100, add cursor pagination. |
| Progress bar rendering      | CSS-only progress bars (no JS animation on each render)              |
| Drag-drop reorder           | Optimistic update with debounced DB sync (batch sort_order updates)  |
| Course card images          | No images in cards (text + icons only) for fast rendering            |
| Tag autocomplete            | Debounced search, cached tag list per session                        |
| Filter/sort URL sync        | Debounced URL updates to prevent excessive history entries           |
| Bulk actions                | Server-side batch operations (single query, not N queries)           |
| Course detail page          | Parallel fetch: course data + recent sessions in separate queries    |
| Bundle size                 | Each route is a separate page (Next.js automatic code splitting)     |
