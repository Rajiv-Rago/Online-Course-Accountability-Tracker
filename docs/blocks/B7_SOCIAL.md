# Block B7 - Social Features

> **Block ID**: B7
> **Block Name**: Social Features
> **Directory**: `src/blocks/b7-social/`
> **Status**: Specification Complete
> **Last Updated**: 2026-02-19

---

## 1. Purpose

This block owns all social interaction features: the study buddy system (discovery, requests, connections, activity viewing) and the gamification achievement system (15 achievement types with automatic checking). It also provides a weekly leaderboard among connected buddies. Social features are designed to motivate users through peer accountability and recognition without exposing private study details.

---

## 2. Table Ownership

### Owns

#### `study_buddies`

| Column             | Type                          | Default             | Nullable | Description                                      |
|--------------------|-------------------------------|---------------------|----------|--------------------------------------------------|
| `id`               | `uuid` PK                    | `gen_random_uuid()` | No       | Buddy relationship ID                            |
| `requester_id`     | `uuid` FK -> `auth.users.id` | -                   | No       | User who sent the buddy request                  |
| `receiver_id`      | `uuid` FK -> `auth.users.id` | -                   | No       | User who received the buddy request              |
| `status`           | `text`                        | `'pending'`         | No       | One of: `pending`, `accepted`, `declined`, `removed` |
| `requested_at`     | `timestamptz`                 | `now()`             | No       | When the request was sent                        |
| `responded_at`     | `timestamptz`                 | `null`              | Yes      | When the request was accepted/declined           |
| `removed_at`       | `timestamptz`                 | `null`              | Yes      | When the buddy was removed                       |
| `created_at`       | `timestamptz`                 | `now()`             | No       | Row creation timestamp                           |
| `updated_at`       | `timestamptz`                 | `now()`             | No       | Last update timestamp (auto via trigger)         |

**RLS Policies**:
- `SELECT`: `auth.uid() = requester_id OR auth.uid() = receiver_id`
- `INSERT`: `auth.uid() = requester_id` (only the requester can create a request)
- `UPDATE`: `auth.uid() = receiver_id` (only the receiver can accept/decline) OR `auth.uid() IN (requester_id, receiver_id)` (either party can remove)
- `DELETE`: None (soft delete via `status = 'removed'`)

**Indexes**:
- `UNIQUE` on `(requester_id, receiver_id)` WHERE `status != 'removed'` (prevent duplicate active relationships)
- `INDEX` on `requester_id`
- `INDEX` on `receiver_id`
- `INDEX` on `status`
- `INDEX` on `(status, requester_id)`
- `INDEX` on `(status, receiver_id)`

**Triggers**:
- `updated_at` auto-set via `moddatetime` trigger
- `responded_at` auto-set when `status` changes from `pending` to `accepted` or `declined`

**Constraints**:
- `CHECK (requester_id != receiver_id)` - Cannot send a buddy request to yourself
- `CHECK (status IN ('pending', 'accepted', 'declined', 'removed'))`

---

#### `achievements`

| Column             | Type                          | Default             | Nullable | Description                                      |
|--------------------|-------------------------------|---------------------|----------|--------------------------------------------------|
| `id`               | `uuid` PK                    | `gen_random_uuid()` | No       | Achievement record ID                            |
| `user_id`          | `uuid` FK -> `auth.users.id` | -                   | No       | User who earned the achievement                  |
| `achievement_type` | `text`                        | -                   | No       | Achievement identifier (see definitions below)   |
| `earned_at`        | `timestamptz`                 | `now()`             | No       | When the achievement was earned                  |
| `context`          | `jsonb`                       | `'{}'`              | No       | Additional context (e.g., course_id for `course_complete`, session count for `night_owl`) |
| `shared`           | `boolean`                     | `false`             | No       | Whether the user has shared this achievement     |
| `created_at`       | `timestamptz`                 | `now()`             | No       | Row creation timestamp                           |

**RLS Policies**:
- `SELECT`: `auth.uid() = user_id` (users see own achievements) OR `user_id IN (SELECT buddy_user_id(...))` (buddies can see shared achievements)
- `INSERT`: `auth.uid() = user_id`
- `UPDATE`: `auth.uid() = user_id` (only `shared` field is updatable)
- `DELETE`: None (achievements are permanent once earned)

**Indexes**:
- `UNIQUE` on `(user_id, achievement_type)` WHERE `achievement_type NOT IN ('course_complete')` (most achievements earned once)
- `UNIQUE` on `(user_id, achievement_type, (context->>'course_id'))` WHERE `achievement_type = 'course_complete'` (one per course)
- `INDEX` on `user_id`
- `INDEX` on `achievement_type`
- `INDEX` on `earned_at`

**Constraints**:
- `CHECK (achievement_type IN ('first_session', 'streak_7', 'streak_30', 'streak_100', 'course_complete', 'night_owl', 'early_bird', 'marathon', 'consistency_king', 'speed_learner', 'social_butterfly', 'comeback_kid', 'perfectionist', 'explorer', 'dedication'))`

---

### Reads

| Table            | Columns Read                                                                 | Purpose                                             |
|------------------|------------------------------------------------------------------------------|-----------------------------------------------------|
| `user_profiles`  | `user_id`, `display_name`, `avatar_url`, `email`                             | Buddy search, display buddy info, avatar rendering  |
| `courses`        | `id`, `user_id`, `title`, `platform`, `status`, `target_completion_date`, `completed_at` | Achievement context (completion, platform count)     |
| `study_sessions` | `id`, `user_id`, `started_at`, `ended_at`, `duration_minutes`               | Leaderboard calculation, session-based achievements  |
| `daily_stats`    | `user_id`, `date`, `streak_count`, `total_minutes`                           | Streak-based achievements, leaderboard data          |

---

## 3. Routes

| Route                    | Page Component               | Auth Required | Description                                     |
|--------------------------|------------------------------|:-------------:|-------------------------------------------------|
| `/social`                | `SocialHubPage`              | Yes           | Main social page with tab navigation            |
| `/social/buddies`        | `BuddyListPage`             | Yes           | Full buddy list and request management          |
| `/social/achievements`   | `AchievementGalleryPage`     | Yes           | Full achievement gallery (earned + locked)       |
| `/social/leaderboard`    | `LeaderboardPage`            | Yes           | Weekly study hours leaderboard among buddies    |

**Middleware Behavior**:
- All `/social/*` routes require authentication.
- If `onboarding_completed === false`, redirect to `/onboarding` (handled by global middleware from B1).

---

## 4. Files to Create

```
src/blocks/b7-social/
  components/
    social-hub.tsx                # Main social page with tabs (Buddies, Achievements, Leaderboard)
    buddy-list.tsx                # List of current accepted buddies
    buddy-card.tsx                # Buddy card (avatar, name, streak, hours this week, last active)
    buddy-request-list.tsx        # Pending requests section (incoming + outgoing)
    buddy-request-card.tsx        # Single request card with Accept/Decline or Cancel actions
    buddy-search.tsx              # Search for buddies by email or display name
    buddy-search-result-card.tsx  # Search result card with Send Request button
    buddy-activity-view.tsx       # View a buddy's public activity summary
    buddy-privacy-note.tsx        # Privacy explanation component
    buddy-remove-dialog.tsx       # Confirmation dialog for removing a buddy
    achievement-gallery.tsx       # Grid of all 15 achievements (earned + locked)
    achievement-card.tsx          # Earned achievement card (icon, name, description, date, share)
    achievement-locked-card.tsx   # Locked achievement card (grayed, requirements, progress)
    achievement-share-dialog.tsx  # Share achievement dialog (copy link, social share)
    achievement-toast.tsx         # Toast notification when achievement is newly earned
    achievement-progress-bar.tsx  # Progress bar for partially-completed achievements
    leaderboard-table.tsx         # Weekly leaderboard table (rank, name, hours, sessions, streak)
    leaderboard-row.tsx           # Single leaderboard row with rank badge styling
    leaderboard-header.tsx        # Leaderboard header with week date range display
    leaderboard-empty.tsx         # Empty state when user has no buddies for leaderboard
    empty-buddies.tsx             # Empty state for no buddies (with CTA to search)
    empty-achievements.tsx        # Empty state when no achievements earned yet
  hooks/
    use-buddies.ts                # Fetch accepted buddy list + pending requests
    use-buddy-search.ts           # Search users by email or name (debounced)
    use-buddy-activity.ts         # Fetch a specific buddy's public activity
    use-achievements.ts           # Fetch earned + all available achievements for current user
    use-achievement-check.ts      # Trigger achievement check after relevant actions
    use-leaderboard.ts            # Fetch weekly leaderboard data among accepted buddies
  actions/
    buddy-actions.ts              # Server actions: sendRequest, acceptRequest, declineRequest, removeBuddy, searchUsers
    achievement-actions.ts        # Server actions: getAchievements, checkAchievements, shareAchievement
    leaderboard-actions.ts        # Server actions: getWeeklyLeaderboard
  lib/
    buddy-validation.ts           # Zod schemas for buddy actions
    achievement-definitions.ts    # All 15 achievement types with metadata (name, description, icon, rules)
    achievement-checker.ts        # Core logic: check if user has earned new achievements
    achievement-icons.ts          # Icon mapping for each achievement type
    leaderboard-calculator.ts     # Calculate weekly leaderboard from study_sessions data
    buddy-privacy.ts              # Privacy rules: what buddies can and cannot see
```

---

## 5. Achievement Definitions

All 15 achievement types are defined in `achievement-definitions.ts`. Each definition includes:

```typescript
interface AchievementDefinition {
  type: string;              // Unique identifier
  name: string;              // Display name
  description: string;       // User-facing description
  icon: string;              // Emoji or icon identifier
  category: 'session' | 'streak' | 'completion' | 'social' | 'special';
  checkTrigger: 'session_logged' | 'daily_stats_updated' | 'course_status_changed' | 'buddy_count_changed';
  repeatable: boolean;       // Can be earned multiple times (only course_complete)
  progressTrackable: boolean; // Shows progress toward earning
  maxProgress?: number;      // Total steps needed (for progress bar)
}
```

| Type               | Name               | Description                                      | Icon | Category   | Trigger              | Repeatable | Progress |
|--------------------|--------------------|--------------------------------------------------|------|------------|----------------------|------------|----------|
| `first_session`    | First Steps        | Complete your first study session                 | `trophy` | session    | `session_logged`     | No         | No       |
| `streak_7`         | Week Warrior       | Maintain a 7-day study streak                     | `flame`  | streak     | `daily_stats_updated`| No         | Yes (7)  |
| `streak_30`        | Monthly Master     | Maintain a 30-day study streak                    | `calendar`| streak    | `daily_stats_updated`| No         | Yes (30) |
| `streak_100`       | Unstoppable        | Maintain a 100-day study streak                   | `zap`   | streak     | `daily_stats_updated`| No         | Yes (100)|
| `course_complete`  | Graduate           | Complete a course                                 | `graduation-cap`| completion | `course_status_changed`| Yes  | No       |
| `night_owl`        | Night Owl          | Study after 10 PM (5 sessions)                    | `moon`  | session    | `session_logged`     | No         | Yes (5)  |
| `early_bird`       | Early Bird         | Study before 7 AM (5 sessions)                    | `sunrise`| session   | `session_logged`     | No         | Yes (5)  |
| `marathon`         | Marathon Runner    | Study for 3+ hours in a single session            | `timer` | session    | `session_logged`     | No         | No       |
| `consistency_king` | Consistency King   | Study every day for 2 weeks with <10% variance    | `crown` | streak     | `daily_stats_updated`| No         | Yes (14) |
| `speed_learner`    | Speed Learner      | Complete a course ahead of target date             | `rocket`| completion | `course_status_changed`| No    | No       |
| `social_butterfly` | Social Butterfly   | Have 5+ accepted study buddies                    | `users` | social     | `buddy_count_changed`| No         | Yes (5)  |
| `comeback_kid`     | Comeback Kid       | Resume a paused course and complete it             | `rotate-ccw`| completion | `course_status_changed`| No  | No       |
| `perfectionist`    | Perfectionist      | Complete all modules of a course (100%)            | `check-circle`| completion | `course_status_changed`| No | No       |
| `explorer`         | Explorer           | Have courses on 3+ different platforms             | `compass`| completion | `course_status_changed`| No  | Yes (3)  |
| `dedication`       | Dedication         | Log 100+ total study hours                        | `heart` | session    | `session_logged`     | No         | Yes (100)|

---

## 6. Achievement Checking Logic

Achievement checks are triggered at specific moments, not on a cron schedule. The checking function runs as a server action invoked after relevant database writes.

### Trigger Points

| Trigger                     | Achievements Checked                                                              |
|-----------------------------|-----------------------------------------------------------------------------------|
| After study session logged  | `first_session`, `night_owl`, `early_bird`, `marathon`, `dedication`              |
| After daily_stats updated   | `streak_7`, `streak_30`, `streak_100`, `consistency_king`                         |
| After course status changes | `course_complete`, `speed_learner`, `comeback_kid`, `perfectionist`, `explorer`   |
| After buddy count changes   | `social_butterfly`                                                                |

### Checking Algorithm (pseudo-code)

```
function checkAchievements(userId, trigger):
  1. Fetch already-earned achievements for this user
  2. Get list of achievement definitions matching this trigger
  3. Filter out already-earned (except repeatable ones like course_complete)
  4. For each candidate achievement:
     a. Query the relevant data (sessions, streaks, courses, buddies)
     b. Evaluate the achievement rule
     c. If earned:
        - INSERT into achievements table
        - INSERT into notifications table (type: 'achievement_earned')
        - Return newly earned achievements for toast display
  5. Return list of newly earned achievements (may be empty)
```

### Rule Evaluation Examples

```typescript
// first_session: count of study_sessions for user >= 1
// streak_7: current streak_count in daily_stats >= 7
// night_owl: count of sessions where started_at hour >= 22, total >= 5
// marathon: any session where duration_minutes >= 180
// consistency_king: 14 consecutive days in daily_stats where
//   stddev(total_minutes) / avg(total_minutes) < 0.10
// speed_learner: course.completed_at < course.target_completion_date
// comeback_kid: course.status === 'completed' AND course had a prior 'paused' status
// explorer: count of DISTINCT platform values across user's courses >= 3
// dedication: sum of duration_minutes across all sessions >= 6000 (100 hours)
// social_butterfly: count of accepted buddy relationships >= 5
```

---

## 7. Buddy System Design

### Relationship States

```
                    ┌──────────┐
       sendRequest  │          │  acceptRequest
  ──────────────────► pending  ├───────────────────► accepted
                    │          │
                    └─────┬────┘
                          │
                          │ declineRequest
                          ▼
                    ┌──────────┐
                    │ declined │
                    └──────────┘

  From "accepted":
                    ┌──────────┐
       removeBuddy  │          │
  ──────────────────► removed  │
                    │          │
                    └──────────┘
```

### Request Rules

- A user can only have ONE active relationship (pending or accepted) with another user at a time.
- If a relationship is `declined`, the requester can send a new request after 7 days.
- If a relationship is `removed`, either party can send a new request immediately.
- A user cannot send a request to themselves.
- A user cannot send a request to someone who has already sent them a pending request (must accept/decline the existing one first).

### Privacy Model

Buddies **CAN** see:
- Display name
- Avatar
- Current streak count
- Number of active courses (count only)
- Total study hours this week
- Number of sessions this week
- Last active date (date only, not time)

Buddies **CANNOT** see:
- Specific course names, URLs, or platforms
- Session notes or descriptions
- AI analysis content or risk scores
- Detailed daily breakdown or time-of-day data
- Email address (unless previously known)

### Leaderboard

- Scope: Current user + all accepted buddies
- Metric: Total study hours in the current week (Monday 00:00 UTC to Sunday 23:59 UTC)
- Resets every Monday at 00:00 UTC
- Sorted descending by hours
- Displays: rank, display name, avatar, hours studied, session count, current streak
- Rank badges: gold (1st), silver (2nd), bronze (3rd), plain (4th+)

---

## 8. UI Mockups

### 8.1 Social Hub (Default: Buddies Tab)

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Dashboard|  Social                                                       |
|  Courses  |  ============================================================|
|  Sessions |                                                               |
|  AI Coach |  [*Buddies*]    [ Achievements ]    [ Leaderboard ]           |
|  Social   |  ==========     ---------------     ---------------           |
|  Charts   |                                                               |
|  Settings |  Study Buddies (3)                       [ Find Buddies ]     |
|           |  ------------------------------------------------------------|
|           |                                                               |
|           |  +-------------------------------------------------------+   |
|           |  | [Av] Sarah K.         Streak: 15 days    6.5h / week  |   |
|           |  |                       3 active courses   Last: Today  |   |
|           |  |                                          [ View ]     |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  +-------------------------------------------------------+   |
|           |  | [Av] Mike R.          Streak: 8 days     4.2h / week  |   |
|           |  |                       2 active courses   Last: Today  |   |
|           |  |                                          [ View ]     |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  +-------------------------------------------------------+   |
|           |  | [Av] Lisa T.          Streak: 22 days    9.1h / week  |   |
|           |  |                       4 active courses   Last: Yester |   |
|           |  |                                          [ View ]     |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  Pending Requests (1 incoming)                                |
|           |  ------------------------------------------------------------|
|           |                                                               |
|           |  +-------------------------------------------------------+   |
|           |  | [Av] John D. wants to be your study buddy              |   |
|           |  |      Sent 2 hours ago                                  |   |
|           |  |                        [ Accept ]    [ Decline ]       |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
+===========================================================================+
```

### 8.2 Buddy Search Dialog

```
+-----------------------------------------------------------+
|  Find Study Buddies                              [ X ]     |
|-----------------------------------------------------------|
|                                                            |
|  Search by name or email:                                  |
|  +---------------------------------------------------+    |
|  | sarah@example.com                                  |    |
|  +---------------------------------------------------+    |
|                                                            |
|  Results (2 found)                                         |
|                                                            |
|  +---------------------------------------------------+    |
|  | [Av] Sarah Johnson                                 |    |
|  |      sarah.j@example.com                           |    |
|  |                              [ Send Request ]      |    |
|  +---------------------------------------------------+    |
|                                                            |
|  +---------------------------------------------------+    |
|  | [Av] Sarah Kim            Already buddies          |    |
|  |      sarah.k@example.com                           |    |
|  |                              [ Connected ]         |    |
|  +---------------------------------------------------+    |
|                                                            |
|  Can't find who you're looking for?                        |
|  They must have an account to be added as a buddy.         |
|                                                            |
+-----------------------------------------------------------+
```

### 8.3 Buddy Activity View

```
+-----------------------------------------------------------+
|  [ < Back to Buddies ]                                     |
|-----------------------------------------------------------|
|                                                            |
|  +---------------------------------------------------+    |
|  |  [Avatar]                                          |    |
|  |  Sarah K.                                          |    |
|  |  Buddy since Feb 1, 2026                           |    |
|  +---------------------------------------------------+    |
|                                                            |
|  This Week's Stats                                         |
|  +------------------+------------------+--------------+    |
|  |  Study Hours     |  Sessions        |  Streak      |    |
|  |  6.5h            |  9               |  15 days     |    |
|  +------------------+------------------+--------------+    |
|                                                            |
|  Active Courses: 3                                         |
|  Last Active: Today                                        |
|                                                            |
|  +---------------------------------------------------+    |
|  | Privacy Notice                                     |    |
|  | Specific course names, session notes, and AI       |    |
|  | analyses are private and not visible to buddies.   |    |
|  +---------------------------------------------------+    |
|                                                            |
|  Shared Achievements (4)                                   |
|  +--------+  +--------+  +--------+  +--------+           |
|  | trophy |  | flame  |  | grad   |  | moon   |           |
|  | First  |  | Week   |  | Grad   |  | Night  |           |
|  | Steps  |  | Warrior|  | uate   |  | Owl    |           |
|  +--------+  +--------+  +--------+  +--------+           |
|                                                            |
|                              [ Remove Buddy ]              |
|                                                            |
+-----------------------------------------------------------+
```

### 8.4 Achievement Gallery

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Dashboard|  Social                                                       |
|  Courses  |  ============================================================|
|  Sessions |                                                               |
|  AI Coach |  [ Buddies ]    [*Achievements*]    [ Leaderboard ]           |
|  Social   |  ----------     ================     ---------------           |
|  Charts   |                                                               |
|  Settings |  Achievements                               7 / 15 earned    |
|           |  ------------------------------------------------------------|
|           |                                                               |
|           |  Earned                                                       |
|           |  +-------------------+  +-------------------+                 |
|           |  | [trophy]          |  | [flame]           |                 |
|           |  | First Steps       |  | Week Warrior      |                 |
|           |  | Complete your     |  | 7-day study       |                 |
|           |  | first session     |  | streak            |                 |
|           |  |                   |  |                   |                 |
|           |  | Earned: Feb 1     |  | Earned: Feb 8     |                 |
|           |  | [ Share ]         |  | [ Share ]         |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
|           |  +-------------------+  +-------------------+                 |
|           |  | [graduation-cap]  |  | [moon]            |                 |
|           |  | Graduate          |  | Night Owl         |                 |
|           |  | Complete a course |  | Study after 10 PM |                 |
|           |  |                   |  | (5 sessions)      |                 |
|           |  | Earned: Feb 12    |  | Earned: Feb 14    |                 |
|           |  | [ Share ]         |  | [ Share ]         |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
|           |  +-------------------+  +-------------------+                 |
|           |  | [sunrise]         |  | [heart]           |                 |
|           |  | Early Bird        |  | Dedication        |                 |
|           |  | Study before      |  | Log 100+ total    |                 |
|           |  | 7 AM (5 sessions) |  | study hours       |                 |
|           |  | Earned: Feb 15    |  | Earned: Feb 18    |                 |
|           |  | [ Share ]         |  | [ Share ]         |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
|           |  +-------------------+                                        |
|           |  | [users]           |                                        |
|           |  | Social Butterfly  |                                        |
|           |  | Have 5+ study     |                                        |
|           |  | buddies           |                                        |
|           |  | Earned: Feb 19    |                                        |
|           |  | [ Share ]         |                                        |
|           |  +-------------------+                                        |
|           |                                                               |
|           |  ------------------------------------------------------------|
|           |  Locked                                                       |
|           |                                                               |
|           |  +-------------------+  +-------------------+                 |
|           |  | [calendar] (dim)  |  | [zap] (dim)       |                 |
|           |  | Monthly Master    |  | Unstoppable       |                 |
|           |  | 30-day study      |  | 100-day study     |                 |
|           |  | streak            |  | streak            |                 |
|           |  |                   |  |                   |                 |
|           |  | Progress: 18/30   |  | Progress: 18/100  |                 |
|           |  | [==========>   ]  |  | [==>            ] |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
|           |  +-------------------+  +-------------------+                 |
|           |  | [timer] (dim)     |  | [crown] (dim)     |                 |
|           |  | Marathon Runner   |  | Consistency King   |                 |
|           |  | Study 3+ hours    |  | 14 days with <10% |                 |
|           |  | in one session    |  | duration variance  |                 |
|           |  |                   |  |                   |                 |
|           |  | Not yet earned    |  | Progress: 6/14    |                 |
|           |  |                   |  | [=====>         ] |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
|           |  +-------------------+  +-------------------+                 |
|           |  | [rocket] (dim)    |  | [rotate-ccw] (dim)|                 |
|           |  | Speed Learner     |  | Comeback Kid      |                 |
|           |  | Complete a course |  | Resume a paused   |                 |
|           |  | ahead of target   |  | course & complete |                 |
|           |  |                   |  |                   |                 |
|           |  | Not yet earned    |  | Not yet earned    |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
|           |  +-------------------+  +-------------------+                 |
|           |  | [check-circle]dim |  | [compass] (dim)   |                 |
|           |  | Perfectionist     |  | Explorer          |                 |
|           |  | Complete all      |  | Courses on 3+     |                 |
|           |  | modules (100%)    |  | platforms          |                 |
|           |  |                   |  |                   |                 |
|           |  | Not yet earned    |  | Progress: 2/3     |                 |
|           |  |                   |  | [==========>   ]  |                 |
|           |  +-------------------+  +-------------------+                 |
|           |                                                               |
+===========================================================================+
```

### 8.5 Achievement Share Dialog

```
+-----------------------------------------------------------+
|  Share Achievement                               [ X ]     |
|-----------------------------------------------------------|
|                                                            |
|  +---------------------------------------------------+    |
|  |                                                    |    |
|  |   [trophy]  First Steps                            |    |
|  |                                                    |    |
|  |   "Complete your first study session"              |    |
|  |   Earned on February 1, 2026                       |    |
|  |                                                    |    |
|  |   -- Course Accountability Tracker --              |    |
|  |                                                    |    |
|  +---------------------------------------------------+    |
|                                                            |
|  Share to:                                                 |
|  [ Copy Link ]   [ Twitter/X ]   [ LinkedIn ]             |
|                                                            |
|  Or share with your buddies:                               |
|  [x] Make visible on your buddy profile                    |
|                                                            |
|                                    [ Done ]                |
|                                                            |
+-----------------------------------------------------------+
```

### 8.6 Achievement Toast

```
+-----------------------------------------------------------+
|  [trophy]  Achievement Unlocked!                    [ X ]  |
|                                                            |
|  First Steps                                               |
|  Complete your first study session                         |
|                                                            |
|  [ View Achievements ]                                     |
+-----------------------------------------------------------+
```

### 8.7 Weekly Leaderboard

```
+===========================================================================+
|  LOGO   Course Accountability Tracker          [Avatar] John Doe   [v]    |
+===========================================================================+
|           |                                                               |
|  Dashboard|  Social                                                       |
|  Courses  |  ============================================================|
|  Sessions |                                                               |
|  AI Coach |  [ Buddies ]    [ Achievements ]    [*Leaderboard*]           |
|  Social   |  ----------     ---------------     =================         |
|  Charts   |                                                               |
|  Settings |  Weekly Leaderboard                                           |
|           |  Week of Feb 16 - Feb 22, 2026                               |
|           |  ------------------------------------------------------------|
|           |                                                               |
|           |  +-------------------------------------------------------+   |
|           |  | Rank | Name           | Hours  | Sessions | Streak    |   |
|           |  |------+----------------+--------+----------+-----------|   |
|           |  | [G]1 | Lisa T.        | 9.1h   |    14    | 22 days   |   |
|           |  |------+----------------+--------+----------+-----------|   |
|           |  | [S]2 | You            | 8.5h   |    12    | 12 days   |   |
|           |  |------+----------------+--------+----------+-----------|   |
|           |  | [B]3 | Sarah K.       | 6.5h   |     9    | 15 days   |   |
|           |  |------+----------------+--------+----------+-----------|   |
|           |  |    4 | Mike R.        | 4.2h   |     6    |  8 days   |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  [G] = Gold   [S] = Silver   [B] = Bronze                    |
|           |                                                               |
|           |  Your Stats This Week                                        |
|           |  +-------------------------------------------------------+   |
|           |  |  Total Hours: 8.5h          Sessions: 12              |   |
|           |  |  Avg Session: 42.5 min      Best Day: Tuesday (2.1h)  |   |
|           |  |  Rank Change: +1 from last week                       |   |
|           |  +-------------------------------------------------------+   |
|           |                                                               |
|           |  Leaderboard resets every Monday at midnight (UTC).           |
|           |                                                               |
+===========================================================================+
```

### 8.8 Empty States

```
Empty Buddies:
+-------------------------------------------------------+
|                                                        |
|  [users-icon]                                          |
|                                                        |
|  No Study Buddies Yet                                  |
|                                                        |
|  Connect with friends to stay accountable              |
|  and motivate each other.                              |
|                                                        |
|  [ Find Buddies ]                                      |
|                                                        |
+-------------------------------------------------------+

Empty Leaderboard:
+-------------------------------------------------------+
|                                                        |
|  [bar-chart-icon]                                      |
|                                                        |
|  No Leaderboard Data                                   |
|                                                        |
|  Add study buddies to see how you rank                 |
|  against each other each week.                         |
|                                                        |
|  [ Find Buddies ]                                      |
|                                                        |
+-------------------------------------------------------+
```

### 8.9 Remove Buddy Confirmation

```
+-----------------------------------------------------------+
|  Remove Buddy                                    [ X ]     |
|-----------------------------------------------------------|
|                                                            |
|  Are you sure you want to remove Sarah K.                  |
|  as a study buddy?                                         |
|                                                            |
|  - They will no longer see your activity                   |
|  - You will no longer see their activity                   |
|  - They will be removed from your leaderboard              |
|  - Either of you can send a new request later              |
|                                                            |
|                       [ Cancel ]    [ Remove ]             |
|                                                            |
+-----------------------------------------------------------+
```

---

## 9. Component Tree

```
SocialHubPage
├── TabNavigation
│   ├── Tab: "Buddies" (default active)
│   ├── Tab: "Achievements"
│   └── Tab: "Leaderboard"
└── TabContent
    ├── [Buddies Tab]
    │   ├── BuddyList
    │   │   ├── SectionHeader ("Study Buddies (N)" + "Find Buddies" button)
    │   │   ├── BuddyCard (x N accepted buddies)
    │   │   │   ├── Avatar
    │   │   │   ├── DisplayName
    │   │   │   ├── StreakBadge
    │   │   │   ├── WeeklyHours
    │   │   │   ├── ActiveCourseCount
    │   │   │   ├── LastActiveDate
    │   │   │   └── ViewButton (links to BuddyActivityView)
    │   │   └── EmptyBuddies (when N === 0)
    │   ├── BuddyRequestList
    │   │   ├── SectionHeader ("Pending Requests (N)")
    │   │   └── BuddyRequestCard (x N pending requests)
    │   │       ├── Avatar + Name
    │   │       ├── RequestTimestamp
    │   │       ├── AcceptButton
    │   │       └── DeclineButton
    │   └── BuddySearch (dialog/modal)
    │       ├── SearchInput (email or name, debounced 300ms)
    │       ├── BuddySearchResultCard (x N results)
    │       │   ├── Avatar + Name
    │       │   ├── StatusIndicator (send request / already buddies / pending)
    │       │   └── SendRequestButton
    │       └── NoResultsMessage
    ├── [Achievements Tab]
    │   └── AchievementGallery
    │       ├── SectionHeader ("Achievements" + "N/15 earned")
    │       ├── EarnedSection
    │       │   └── AchievementCard (x N earned)
    │       │       ├── AchievementIcon (colored)
    │       │       ├── AchievementName
    │       │       ├── AchievementDescription
    │       │       ├── EarnedDate
    │       │       └── ShareButton -> AchievementShareDialog
    │       ├── LockedSection
    │       │   └── AchievementLockedCard (x N locked)
    │       │       ├── AchievementIcon (dimmed)
    │       │       ├── AchievementName
    │       │       ├── AchievementRequirements
    │       │       └── AchievementProgressBar (if progressTrackable)
    │       └── EmptyAchievements (when 0 earned)
    └── [Leaderboard Tab]
        ├── LeaderboardHeader
        │   ├── Title ("Weekly Leaderboard")
        │   └── WeekDateRange ("Week of Feb 16 - Feb 22, 2026")
        ├── LeaderboardTable
        │   └── LeaderboardRow (x N buddies + self)
        │       ├── RankBadge (gold/silver/bronze/plain)
        │       ├── Avatar + DisplayName
        │       ├── HoursStudied
        │       ├── SessionCount
        │       └── StreakCount
        ├── PersonalWeekSummary (your stats highlight)
        └── LeaderboardEmpty (when no buddies)

BuddyActivityView (separate page: /social/buddies/[id])
├── BackButton
├── BuddyHeader
│   ├── Avatar (large)
│   ├── DisplayName
│   └── BuddySinceDate
├── WeeklyStatsGrid
│   ├── StudyHoursStat
│   ├── SessionCountStat
│   └── StreakStat
├── ActiveCourseCount
├── LastActiveDate
├── BuddyPrivacyNote
├── SharedAchievements (mini achievement icons)
└── BuddyRemoveDialog
    ├── WarningText
    ├── ConsequencesList
    ├── CancelButton
    └── RemoveButton (destructive variant)
```

---

## 10. Hooks

### `use-buddies.ts`

```typescript
// Returns:
{
  buddies: Buddy[];                 // Accepted buddies with profile info
  incomingRequests: BuddyRequest[]; // Pending requests where user is receiver
  outgoingRequests: BuddyRequest[]; // Pending requests where user is requester
  buddyCount: number;              // Count of accepted buddies
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// React Query key: ['buddies', userId]
// Stale time: 2 minutes
// Refetches on window focus
```

### `use-buddy-search.ts`

```typescript
// Input: searchQuery (string, debounced 300ms)
// Returns:
{
  results: UserSearchResult[];     // Matching users with relationship status
  isSearching: boolean;
  error: Error | null;
}

// React Query key: ['buddy-search', searchQuery]
// Enabled: searchQuery.length >= 2
// Stale time: 30 seconds
```

### `use-buddy-activity.ts`

```typescript
// Input: buddyUserId (string)
// Returns:
{
  buddy: BuddyActivity | null;    // Public activity data for the buddy
  isLoading: boolean;
  error: Error | null;
}

// React Query key: ['buddy-activity', buddyUserId]
// Stale time: 5 minutes

// BuddyActivity shape:
{
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  buddySince: string;              // ISO date
  currentStreak: number;
  activeCourseCount: number;
  hoursThisWeek: number;
  sessionsThisWeek: number;
  lastActiveDate: string;          // ISO date (date only, not time)
  sharedAchievements: Achievement[];
}
```

### `use-achievements.ts`

```typescript
// Returns:
{
  earned: Achievement[];            // Achievements the user has earned
  locked: LockedAchievement[];     // Achievements not yet earned with progress
  earnedCount: number;
  totalCount: number;              // Always 15
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// LockedAchievement shape:
{
  type: string;
  name: string;
  description: string;
  icon: string;
  progressTrackable: boolean;
  currentProgress: number;         // e.g., 18 for streak_30
  maxProgress: number;             // e.g., 30 for streak_30
}

// React Query key: ['achievements', userId]
// Stale time: 5 minutes
```

### `use-achievement-check.ts`

```typescript
// Input: trigger ('session_logged' | 'daily_stats_updated' | 'course_status_changed' | 'buddy_count_changed')
// Returns:
{
  check: () => Promise<NewlyEarnedAchievement[]>;
  isChecking: boolean;
}

// Calls achievement-actions.ts server action
// Returns list of newly earned achievements (for toast display)
// Automatically invalidates ['achievements'] query on new earnings
```

### `use-leaderboard.ts`

```typescript
// Returns:
{
  entries: LeaderboardEntry[];     // Sorted by hours descending
  currentUserRank: number;
  weekStart: string;               // ISO date (Monday)
  weekEnd: string;                 // ISO date (Sunday)
  isLoading: boolean;
  error: Error | null;
}

// LeaderboardEntry shape:
{
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  hoursStudied: number;
  sessionCount: number;
  currentStreak: number;
  isCurrentUser: boolean;
}

// React Query key: ['leaderboard', weekStartDate]
// Stale time: 5 minutes
// Refetches on window focus
```

---

## 11. Server Actions

### `buddy-actions.ts`

| Action            | Input                             | Output                         | Description                                           |
|-------------------|-----------------------------------|--------------------------------|-------------------------------------------------------|
| `getBuddies`      | -                                | `{ buddies, incomingRequests, outgoingRequests }` | Get all buddy relationships for current user |
| `searchUsers`     | `{ query: string }`              | `UserSearchResult[]`           | Search users by email or display name (excludes self) |
| `sendBuddyRequest`| `{ receiverId: string }`         | `BuddyRelationship`           | Send a buddy request                                  |
| `acceptRequest`   | `{ requestId: string }`          | `BuddyRelationship`           | Accept a pending buddy request                        |
| `declineRequest`  | `{ requestId: string }`          | `BuddyRelationship`           | Decline a pending buddy request                       |
| `removeBuddy`     | `{ relationshipId: string }`     | `BuddyRelationship`           | Remove an accepted buddy                              |
| `getBuddyActivity`| `{ buddyUserId: string }`        | `BuddyActivity`               | Get public activity data for a specific buddy         |

### `achievement-actions.ts`

| Action                | Input                                        | Output                     | Description                                        |
|-----------------------|----------------------------------------------|----------------------------|----------------------------------------------------|
| `getAchievements`     | -                                            | `{ earned, locked }`       | Get all achievements with progress for current user |
| `checkAchievements`   | `{ trigger: AchievementTrigger }`            | `NewlyEarnedAchievement[]` | Check and award any newly earned achievements       |
| `shareAchievement`    | `{ achievementId: string, shared: boolean }` | `Achievement`              | Toggle shared status of an achievement              |

### `leaderboard-actions.ts`

| Action                  | Input | Output               | Description                                   |
|-------------------------|-------|----------------------|-----------------------------------------------|
| `getWeeklyLeaderboard`  | -     | `LeaderboardData`    | Get leaderboard entries for the current week   |

---

## 12. Validation Schemas (Zod)

```typescript
// buddy-validation.ts

import { z } from 'zod';

export const sendBuddyRequestSchema = z.object({
  receiverId: z.string().uuid('Invalid user ID'),
});

export const acceptRequestSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
});

export const declineRequestSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
});

export const removeBuddySchema = z.object({
  relationshipId: z.string().uuid('Invalid relationship ID'),
});

export const buddySearchSchema = z.object({
  query: z.string().min(2, 'Search query must be at least 2 characters').max(100),
});

export const shareAchievementSchema = z.object({
  achievementId: z.string().uuid('Invalid achievement ID'),
  shared: z.boolean(),
});

export const checkAchievementsSchema = z.object({
  trigger: z.enum([
    'session_logged',
    'daily_stats_updated',
    'course_status_changed',
    'buddy_count_changed',
  ]),
});
```

---

## 13. State Management

| Concern                 | Strategy                          | Details                                                                    |
|-------------------------|-----------------------------------|----------------------------------------------------------------------------|
| Buddy list              | React Query                       | Key: `['buddies', userId]`, stale: 2min, refetch on focus                  |
| Buddy search results    | React Query (enabled conditionally)| Key: `['buddy-search', query]`, enabled: query.length >= 2, stale: 30s   |
| Buddy activity          | React Query                       | Key: `['buddy-activity', buddyId]`, stale: 5min                           |
| Achievements            | React Query                       | Key: `['achievements', userId]`, stale: 5min                              |
| Leaderboard             | React Query                       | Key: `['leaderboard', weekStart]`, stale: 5min                            |
| Buddy request actions   | Optimistic updates                | Immediately update UI, roll back on error                                  |
| Search input            | Local state + debounce (300ms)    | Prevents excessive API calls during typing                                 |
| Active tab              | URL-driven (route segments)       | `/social/buddies`, `/social/achievements`, `/social/leaderboard`           |
| Achievement toasts      | Sonner (via shadcn/ui)            | Triggered by `use-achievement-check` after relevant actions                |
| Dialog state            | Local state (`useState`)          | Search dialog, share dialog, remove confirmation                           |

---

## 14. shadcn/ui Components Used

- `Button`, `Input`, `Label`
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`
- `Badge` (streak badges, rank badges, achievement status)
- `Progress` (achievement progress bars)
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- `Tooltip`, `TooltipTrigger`, `TooltipContent` (privacy info, achievement details)
- `Separator`
- `Skeleton` (loading states for buddy cards, achievement cards)
- `ScrollArea` (search results list)
- `DropdownMenu` (buddy card actions)

---

## 15. Error Handling

| Scenario                          | Handling                                                                |
|-----------------------------------|-------------------------------------------------------------------------|
| Buddy list fetch fails            | Show error state with retry button, keep any cached data visible        |
| Buddy search fails                | Show inline error in search dialog, allow retry                         |
| Send request fails                | Toast error with reason (e.g., "Already have a pending request")        |
| Send request to self              | Client-side validation prevents, server-side CHECK constraint backup    |
| Accept/decline request fails      | Toast error, revert optimistic update                                   |
| Remove buddy fails                | Toast error, keep dialog open, revert optimistic update                 |
| Achievement check fails           | Silent fail (non-critical), log to console, retry on next trigger       |
| Achievement share fails           | Toast error, revert toggle state                                        |
| Leaderboard fetch fails           | Show error state with retry button                                      |
| No buddies for leaderboard        | Show empty state with CTA to find buddies                               |
| Duplicate buddy request           | Server returns 409, toast "Request already sent"                        |
| Network error (any action)        | Toast "Network error, please try again" with retry suggestion           |

---

## 16. Testing Plan

### Unit Tests

| Test                                                     | File                              |
|----------------------------------------------------------|-----------------------------------|
| Buddy validation schemas accept valid data               | `buddy-validation.test.ts`        |
| Buddy validation rejects invalid UUIDs                   | `buddy-validation.test.ts`        |
| Buddy search schema rejects queries < 2 chars            | `buddy-validation.test.ts`        |
| Achievement definitions all have required fields          | `achievement-definitions.test.ts` |
| Achievement checker correctly evaluates each rule         | `achievement-checker.test.ts`     |
| Achievement checker skips already-earned achievements     | `achievement-checker.test.ts`     |
| Achievement checker allows repeat for course_complete     | `achievement-checker.test.ts`     |
| Consistency king variance calculation is correct          | `achievement-checker.test.ts`     |
| Leaderboard calculator sorts by hours descending          | `leaderboard-calculator.test.ts`  |
| Leaderboard calculator assigns correct rank badges        | `leaderboard-calculator.test.ts`  |
| Leaderboard calculator uses correct week boundaries       | `leaderboard-calculator.test.ts`  |
| Privacy rules exclude private fields from buddy activity  | `buddy-privacy.test.ts`          |

### Integration Tests

| Test                                                          | File                          |
|---------------------------------------------------------------|-------------------------------|
| Buddy request flow: send, accept, view activity               | `buddy-flow.test.tsx`         |
| Buddy request flow: send, decline                             | `buddy-flow.test.tsx`         |
| Buddy request flow: accept, then remove                       | `buddy-flow.test.tsx`         |
| Cannot send duplicate buddy request                           | `buddy-flow.test.tsx`         |
| Search returns results and shows correct status               | `buddy-search.test.tsx`       |
| Achievement gallery shows earned and locked correctly         | `achievement-gallery.test.tsx`|
| Achievement toast appears on new earning                      | `achievement-toast.test.tsx`  |
| Achievement share toggles visibility                          | `achievement-share.test.tsx`  |
| Leaderboard renders with correct rankings                     | `leaderboard.test.tsx`        |
| Leaderboard shows empty state when no buddies                 | `leaderboard.test.tsx`        |
| Optimistic update on accept request reverts on error          | `buddy-optimistic.test.tsx`   |

### E2E Tests

| Test                                                          | File                    |
|---------------------------------------------------------------|-------------------------|
| User searches for buddy, sends request, buddy accepts         | `social.e2e.ts`         |
| User earns first_session achievement and sees toast           | `social.e2e.ts`         |
| User views leaderboard among buddies                          | `social.e2e.ts`         |
| User removes a buddy and they disappear from leaderboard      | `social.e2e.ts`         |

---

## 17. "Do Not Touch" Boundaries

| Boundary                                  | Reason                                                                                      |
|-------------------------------------------|---------------------------------------------------------------------------------------------|
| Notification delivery                     | This block only INSERTS rows into the `notifications` table. It does NOT send emails, push notifications, or webhook messages. Notification delivery is handled by a separate block/service. |
| Study sessions (CRUD)                     | Owned by Block B3. This block READS `study_sessions` for leaderboard and achievements but never creates, updates, or deletes sessions. |
| Courses (CRUD)                            | Owned by Block B2. This block READS `courses` for achievement context but never modifies course data. |
| Daily stats (CRUD)                        | Owned by the stats block. This block READS `daily_stats` for streak achievements but never modifies stats. |
| AI analysis / GPT calls                   | Owned by Block B4. This block does not call OpenAI APIs or process AI-generated content.     |
| Charts and visualizations                 | Owned by Block B8. This block does NOT render charts, graphs, or data visualizations.        |
| User profile management                   | Owned by Block B1. This block READS `user_profiles` for buddy display info but never modifies profile data. |
| Authentication                            | Handled by foundation layer. This block uses `auth.uid()` but does not manage login/signup.  |

---

## 18. Cross-Block Communication

This block communicates with other blocks **exclusively through the database**:

- **This block READS from other blocks' tables**:
  - `user_profiles` for buddy display name, avatar, email (search)
  - `courses` for achievement evaluation (completion status, platform, target dates)
  - `study_sessions` for leaderboard hours, session-based achievement checks
  - `daily_stats` for streak counts, consistency calculations

- **Other blocks TRIGGER achievement checks via this block's server actions**:
  - After B3 logs a study session -> calls `checkAchievements({ trigger: 'session_logged' })`
  - After daily stats cron updates -> calls `checkAchievements({ trigger: 'daily_stats_updated' })`
  - After B2 changes course status -> calls `checkAchievements({ trigger: 'course_status_changed' })`
  - These triggers are invoked by the calling block's own server actions; no code is imported across blocks.

- **This block WRITES to**:
  - `study_buddies` (own table)
  - `achievements` (own table)
  - `notifications` table (inserts only, for achievement earned notifications)

- **This block does NOT import code from other blocks.** No shared components, hooks, or utilities cross block boundaries.

---

## 19. Performance Considerations

| Concern                          | Strategy                                                                        |
|----------------------------------|---------------------------------------------------------------------------------|
| Buddy list fetch                 | React Query with 2min stale time; limit to 100 buddies max per user             |
| Buddy search                     | Debounced 300ms input; server-side `ILIKE` with limit 20 results                |
| Achievement checking             | Runs only on specific triggers, not on every page load; queries are indexed      |
| Achievement progress queries     | Batched into single query per trigger type to minimize DB round-trips            |
| Leaderboard calculation          | Aggregates `study_sessions` with date range filter using indexed `started_at`    |
| Leaderboard caching              | React Query with 5min stale time; data doesn't change rapidly                   |
| Optimistic updates               | Buddy accept/decline/remove update UI instantly without waiting for server       |
| Achievement gallery render       | Fixed set of 15 achievements; no pagination needed                              |
| Buddy card data                  | Fetched in single JOIN query (buddy relationship + user profile + weekly stats)  |
