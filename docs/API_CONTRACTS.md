# API Contracts

> Complete request/response specifications for every API route and server action in the Course Accountability Tracker.

**Stack**: Next.js 14+ (App Router) + TypeScript + Supabase + OpenAI GPT-4
**Base URL**: `https://<domain>/api`
**Auth**: All routes (except `/api/auth/callback` and cron routes) require a valid Supabase session cookie.
**Cron Auth**: Cron routes authenticate via `Authorization: Bearer <CRON_SECRET>` header.

---

## Table of Contents

1. [Shared Types](#shared-types)
2. [Error Response Shape](#error-response-shape)
3. [Auth Routes](#auth-routes)
4. [Course Routes](#course-routes)
5. [Study Session Routes](#study-session-routes)
6. [Daily Stats Routes](#daily-stats-routes)
7. [AI Analysis Routes](#ai-analysis-routes)
8. [Cron Routes](#cron-routes)
9. [Notification Routes](#notification-routes)
10. [Reminder Routes](#reminder-routes)
11. [Social Routes](#social-routes)
12. [User Profile Routes](#user-profile-routes)
13. [Integration Routes](#integration-routes)
14. [Server Actions - B1 User Profile](#server-actions---b1-user-profile)
15. [Server Actions - B2 Course Management](#server-actions---b2-course-management)
16. [Server Actions - B3 Progress Tracking](#server-actions---b3-progress-tracking)
17. [Server Actions - B4 AI Analysis](#server-actions---b4-ai-analysis)
18. [Server Actions - B5 Dashboard](#server-actions---b5-dashboard)
19. [Server Actions - B6 Notifications](#server-actions---b6-notifications)
20. [Server Actions - B7 Social](#server-actions---b7-social)
21. [Server Actions - B8 Visualizations](#server-actions---b8-visualizations)
22. [Cron Job Schedule](#cron-job-schedule)
23. [Rate Limiting](#rate-limiting)

---

## Shared Types

All types use Zod-style schema notation. These shared types are referenced throughout the document.

```ts
// ──────────────────────────────────────
// Enums
// ──────────────────────────────────────

const CourseStatus = z.enum([
  'active',
  'paused',
  'completed',
  'dropped',
]);

const CoursePriority = z.enum(['high', 'medium', 'low']);

const SessionType = z.enum(['manual', 'timer']);

const NotificationType = z.enum([
  'reminder',
  'streak_at_risk',
  'streak_milestone',
  'buddy_request',
  'buddy_activity',
  'achievement_unlocked',
  'weekly_report',
  'ai_insight',
]);

const ReminderFrequency = z.enum([
  'daily',
  'weekdays',
  'weekends',
  'custom',
]);

const BuddyStatus = z.enum([
  'pending',
  'accepted',
  'declined',
]);

const RiskLevel = z.enum(['low', 'medium', 'high', 'critical']);

const ExportFormat = z.enum(['json', 'csv']);

const SortDirection = z.enum(['asc', 'desc']);

const ChartGroupBy = z.enum(['day', 'week', 'month']);

// ──────────────────────────────────────
// Shared Shapes
// ──────────────────────────────────────

const Timestamps = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const PaginationParams = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const PaginationMeta = z.object({
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  has_more: z.boolean(),
});

const DateRange = z.object({
  from: z.string().datetime(),   // ISO 8601 date or datetime
  to: z.string().datetime(),
});

// ──────────────────────────────────────
// Core Domain Models
// ──────────────────────────────────────

const UserProfile = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string().max(100),
  avatar_url: z.string().url().nullable(),
  timezone: z.string().default('UTC'),
  weekly_study_goal_hours: z.number().min(0).default(10),
  daily_study_goal_minutes: z.number().min(0).default(60),
  onboarding_completed: z.boolean().default(false),
  notification_preferences: NotificationPreferences,
  slack_webhook_url: z.string().url().nullable(),
  discord_webhook_url: z.string().url().nullable(),
  is_public_profile: z.boolean().default(false),
  ...Timestamps.shape,
});

const NotificationPreferences = z.object({
  email_enabled: z.boolean().default(true),
  push_enabled: z.boolean().default(true),
  streak_reminders: z.boolean().default(true),
  buddy_notifications: z.boolean().default(true),
  weekly_report: z.boolean().default(true),
  ai_insights: z.boolean().default(true),
  slack_enabled: z.boolean().default(false),
  discord_enabled: z.boolean().default(false),
  quiet_hours_start: z.string().nullable(),  // "22:00"
  quiet_hours_end: z.string().nullable(),    // "08:00"
});

const Course = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  platform: z.string().max(100).nullable(),         // e.g., "Udemy", "Coursera"
  url: z.string().url().nullable(),
  estimated_hours: z.number().min(0).nullable(),
  completed_hours: z.number().min(0).default(0),
  status: CourseStatus.default('active'),
  priority: CoursePriority.default('medium'),
  target_completion_date: z.string().datetime().nullable(),
  sort_order: z.number().int().default(0),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  tags: z.array(z.string()).default([]),
  is_archived: z.boolean().default(false),
  ...Timestamps.shape,
});

const CourseWithStats = Course.extend({
  stats: z.object({
    total_sessions: z.number().int(),
    total_minutes: z.number(),
    avg_session_minutes: z.number(),
    sessions_this_week: z.number().int(),
    minutes_this_week: z.number(),
    last_session_at: z.string().datetime().nullable(),
    completion_percentage: z.number().min(0).max(100),
    current_streak_days: z.number().int(),
    risk_level: RiskLevel,
  }),
});

const StudySession = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  session_type: SessionType,
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable(),
  duration_minutes: z.number().min(0),
  notes: z.string().max(5000).nullable(),
  mood_rating: z.number().int().min(1).max(5).nullable(),
  productivity_rating: z.number().int().min(1).max(5).nullable(),
  is_active: z.boolean().default(false),    // true while timer is running
  ...Timestamps.shape,
});

const DailyStat = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  date: z.string(),                          // "YYYY-MM-DD"
  total_minutes: z.number().min(0),
  session_count: z.number().int().min(0),
  courses_studied: z.array(z.string().uuid()),
  goal_met: z.boolean(),
  ...Timestamps.shape,
});

const StreakInfo = z.object({
  current_streak: z.number().int().min(0),
  longest_streak: z.number().int().min(0),
  streak_start_date: z.string().nullable(),   // "YYYY-MM-DD"
  last_study_date: z.string().nullable(),     // "YYYY-MM-DD"
  is_at_risk: z.boolean(),                    // no session today yet
  streak_history: z.array(z.object({
    start_date: z.string(),
    end_date: z.string(),
    length: z.number().int(),
  })),
});

const AiAnalysis = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid(),
  analysis_date: z.string(),                  // "YYYY-MM-DD"
  risk_level: RiskLevel,
  risk_score: z.number().min(0).max(100),
  momentum_score: z.number().min(-100).max(100),
  summary: z.string(),
  recommendations: z.array(z.string()),
  patterns: z.object({
    best_study_time: z.string().nullable(),
    avg_session_length: z.number(),
    consistency_score: z.number().min(0).max(100),
    trend: z.enum(['improving', 'stable', 'declining']),
  }),
  predicted_completion_date: z.string().nullable(),
  intervention_message: z.string().nullable(),
  raw_prompt: z.string().nullable(),          // stored for debugging
  model_version: z.string(),
  ...Timestamps.shape,
});

const WeeklyReport = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  week_start: z.string(),                     // "YYYY-MM-DD" (Monday)
  week_end: z.string(),                       // "YYYY-MM-DD" (Sunday)
  total_minutes: z.number(),
  total_sessions: z.number().int(),
  courses_summary: z.array(z.object({
    course_id: z.string().uuid(),
    course_title: z.string(),
    minutes: z.number(),
    sessions: z.number().int(),
    risk_level: RiskLevel,
    risk_delta: z.number(),                   // change from previous week
  })),
  goal_progress: z.object({
    weekly_goal_minutes: z.number(),
    achieved_minutes: z.number(),
    percentage: z.number(),
  }),
  streak_info: z.object({
    current: z.number().int(),
    change: z.number().int(),                 // +/- from last week
  }),
  ai_summary: z.string(),
  highlights: z.array(z.string()),
  suggestions: z.array(z.string()),
  ...Timestamps.shape,
});

const Notification = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: NotificationType,
  title: z.string().max(200),
  body: z.string().max(2000),
  action_url: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  is_read: z.boolean().default(false),
  read_at: z.string().datetime().nullable(),
  ...Timestamps.shape,
});

const ReminderSchedule = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  course_id: z.string().uuid().nullable(),    // null = general reminder
  title: z.string().max(200),
  frequency: ReminderFrequency,
  time_of_day: z.string(),                    // "HH:mm"
  days_of_week: z.array(z.number().int().min(0).max(6)).nullable(), // 0=Sun, used with 'custom'
  is_active: z.boolean().default(true),
  last_sent_at: z.string().datetime().nullable(),
  next_send_at: z.string().datetime().nullable(),
  ...Timestamps.shape,
});

const StudyBuddy = z.object({
  id: z.string().uuid(),
  requester_id: z.string().uuid(),
  recipient_id: z.string().uuid(),
  status: BuddyStatus,
  requester_profile: z.object({
    id: z.string().uuid(),
    display_name: z.string(),
    avatar_url: z.string().url().nullable(),
  }),
  recipient_profile: z.object({
    id: z.string().uuid(),
    display_name: z.string(),
    avatar_url: z.string().url().nullable(),
  }),
  ...Timestamps.shape,
});

const Achievement = z.object({
  id: z.string().uuid(),
  key: z.string(),                            // e.g., "streak_7", "hours_100"
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  category: z.string(),
  requirement_value: z.number(),
  earned_at: z.string().datetime().nullable(),  // null if not yet earned
  progress: z.number().min(0).max(100),         // current progress toward earning
});

const LeaderboardEntry = z.object({
  rank: z.number().int(),
  user_id: z.string().uuid(),
  display_name: z.string(),
  avatar_url: z.string().url().nullable(),
  weekly_minutes: z.number(),
  session_count: z.number().int(),
  streak: z.number().int(),
  is_current_user: z.boolean(),
});

const BuddyActivity = z.object({
  buddy_id: z.string().uuid(),
  display_name: z.string(),
  recent_sessions: z.array(z.object({
    course_title: z.string(),
    duration_minutes: z.number(),
    date: z.string(),
  })),
  current_streak: z.number().int(),
  weekly_minutes: z.number(),
  active_courses: z.array(z.object({
    title: z.string(),
    status: CourseStatus,
  })),
  recent_achievements: z.array(z.object({
    title: z.string(),
    icon: z.string(),
    earned_at: z.string().datetime(),
  })),
});

// ──────────────────────────────────────
// Visualization Types
// ──────────────────────────────────────

const HeatmapDay = z.object({
  date: z.string(),             // "YYYY-MM-DD"
  total_minutes: z.number(),
  session_count: z.number().int(),
  goal_met: z.boolean(),
  level: z.number().int().min(0).max(4),  // 0=none, 1=light, 2=medium, 3=high, 4=intense
});

const TimelinePoint = z.object({
  date: z.string(),
  cumulative_hours: z.number(),
  daily_minutes: z.number(),
  completion_percentage: z.number(),
  risk_level: RiskLevel,
});

const ChartData = z.object({
  labels: z.array(z.string()),
  datasets: z.array(z.object({
    course_id: z.string().uuid(),
    course_title: z.string(),
    color: z.string(),
    data: z.array(z.number()),     // minutes per period
  })),
  totals: z.array(z.number()),     // total per period
});

const ForecastData = z.object({
  course_id: z.string().uuid(),
  course_title: z.string(),
  estimated_hours: z.number().nullable(),
  completed_hours: z.number(),
  current_pace_hours_per_week: z.number(),
  predicted_completion_date: z.string().nullable(),
  target_completion_date: z.string().nullable(),
  on_track: z.boolean(),
  confidence: z.number().min(0).max(1),
  forecast_points: z.array(z.object({
    date: z.string(),
    projected_hours: z.number(),
    lower_bound: z.number(),
    upper_bound: z.number(),
  })),
});

const RiskTrendData = z.object({
  course_id: z.string().uuid(),
  points: z.array(z.object({
    date: z.string(),
    risk_score: z.number().min(0).max(100),
    risk_level: RiskLevel,
    momentum_score: z.number(),
  })),
});

const DistributionData = z.object({
  by_course: z.array(z.object({
    course_id: z.string().uuid(),
    course_title: z.string(),
    color: z.string(),
    total_minutes: z.number(),
    percentage: z.number(),
  })),
  by_time_of_day: z.object({
    morning: z.number(),      // 6am-12pm minutes
    afternoon: z.number(),    // 12pm-6pm minutes
    evening: z.number(),      // 6pm-10pm minutes
    night: z.number(),        // 10pm-6am minutes
  }),
  by_day_of_week: z.array(z.number()),  // index 0=Sun, values=minutes
});

// ──────────────────────────────────────
// Dashboard Types
// ──────────────────────────────────────

const DashboardData = z.object({
  streak: StreakInfo,
  today: z.object({
    total_minutes: z.number(),
    goal_minutes: z.number(),
    sessions: z.number().int(),
    goal_met: z.boolean(),
  }),
  this_week: z.object({
    total_minutes: z.number(),
    goal_minutes: z.number(),
    sessions: z.number().int(),
    percentage: z.number(),
  }),
  active_courses: z.array(CourseWithStats),
  recent_sessions: z.array(StudySession.extend({
    course_title: z.string(),
    course_color: z.string().nullable(),
  })),
  active_timer: StudySession.nullable(),
  unread_notifications: z.number().int(),
  upcoming_reminders: z.array(ReminderSchedule),
  risk_alerts: z.array(z.object({
    course_id: z.string().uuid(),
    course_title: z.string(),
    risk_level: RiskLevel,
    message: z.string(),
  })),
});

const TodaysPlan = z.object({
  suggested_courses: z.array(z.object({
    course_id: z.string().uuid(),
    course_title: z.string(),
    suggested_minutes: z.number(),
    reason: z.string(),
    priority: CoursePriority,
  })),
  total_suggested_minutes: z.number(),
  ai_tip: z.string().nullable(),
});
```

---

## Error Response Shape

All API routes return errors in a consistent format.

```ts
const ApiError = z.object({
  error: z.object({
    code: z.string(),                // machine-readable, e.g. "VALIDATION_ERROR"
    message: z.string(),             // human-readable description
    details: z.record(z.unknown()).optional(),  // field-level errors or context
  }),
});
```

### Standard Error Codes

| HTTP Status | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or params failed validation |
| 401 | `UNAUTHORIZED` | Missing or invalid session |
| 403 | `FORBIDDEN` | Authenticated but not allowed |
| 404 | `NOT_FOUND` | Resource does not exist or not owned by user |
| 409 | `CONFLICT` | Duplicate or state conflict (e.g., buddy already exists) |
| 422 | `UNPROCESSABLE_ENTITY` | Semantically invalid (e.g., invalid status transition) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

**Example error response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {
      "title": "String must contain at least 1 character(s)",
      "estimated_hours": "Number must be greater than or equal to 0"
    }
  }
}
```

---

## Auth Routes

### POST /api/auth/callback

Supabase auth callback handler. Called by Supabase after OAuth or magic link flow.

- **Authentication**: None (public endpoint)
- **Rate Limit**: None (handled by Supabase)

**Request Body:**

```ts
const AuthCallbackRequest = z.object({
  code: z.string(),   // Authorization code from Supabase
});
```

**Success Response: `303 Redirect`**

Redirects to `/dashboard` on success or `/auth/error` on failure. Sets Supabase session cookies.

No JSON body returned.

**Error Response: `303 Redirect`**

Redirects to `/auth/error?error=<message>`.

---

### POST /api/auth/signout

Sign out the current user and clear session cookies.

- **Authentication**: Required
- **Rate Limit**: None

**Request Body:** None

**Success Response: `200 OK`**

```json
{
  "success": true
}
```

**Error Response: `401 Unauthorized`**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Not authenticated"
  }
}
```

---

## Course Routes

### GET /api/courses

List the authenticated user's courses.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:**

```ts
const ListCoursesParams = z.object({
  status: CourseStatus.optional(),                          // filter by status
  priority: CoursePriority.optional(),                      // filter by priority
  sort: z.enum(['sort_order', 'title', 'created_at', 'updated_at', 'priority']).default('sort_order'),
  direction: SortDirection.default('asc'),
  include_archived: z.boolean().default(false),
  search: z.string().max(200).optional(),                   // search title/description
});
```

**Success Response: `200 OK`**

```ts
const ListCoursesResponse = z.object({
  data: z.array(CourseWithStats),
  meta: z.object({
    total: z.number().int(),
  }),
});
```

**Example:**

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "...",
      "title": "Advanced TypeScript",
      "description": "Complete TypeScript course covering generics, decorators, etc.",
      "platform": "Udemy",
      "url": "https://udemy.com/course/...",
      "estimated_hours": 40,
      "completed_hours": 12.5,
      "status": "active",
      "priority": "high",
      "target_completion_date": "2026-04-01T00:00:00Z",
      "sort_order": 0,
      "color": "#3B82F6",
      "tags": ["typescript", "programming"],
      "is_archived": false,
      "created_at": "2026-01-15T10:00:00Z",
      "updated_at": "2026-02-18T15:30:00Z",
      "stats": {
        "total_sessions": 25,
        "total_minutes": 750,
        "avg_session_minutes": 30,
        "sessions_this_week": 3,
        "minutes_this_week": 90,
        "last_session_at": "2026-02-18T15:30:00Z",
        "completion_percentage": 31.25,
        "current_streak_days": 5,
        "risk_level": "low"
      }
    }
  ],
  "meta": {
    "total": 1
  }
}
```

---

### POST /api/courses

Create a new course.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Request Body:**

```ts
const CourseCreateInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  platform: z.string().max(100).optional(),
  url: z.string().url().optional(),
  estimated_hours: z.number().min(0).optional(),
  priority: CoursePriority.default('medium'),
  target_completion_date: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
});
```

**Success Response: `201 Created`**

```ts
const CreateCourseResponse = z.object({
  data: Course,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Not authenticated |

---

### GET /api/courses/[id]

Get a single course with statistics.

- **Authentication**: Required (must own the course)
- **Rate Limit**: 60 req/min

**Path Parameters:**

```ts
const CourseIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```ts
const GetCourseResponse = z.object({
  data: CourseWithStats,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course does not exist or not owned by user |

---

### PATCH /api/courses/[id]

Update course fields. Only provided fields are updated.

- **Authentication**: Required (must own the course)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const CourseIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:**

```ts
const CourseUpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  platform: z.string().max(100).nullable().optional(),
  url: z.string().url().nullable().optional(),
  estimated_hours: z.number().min(0).nullable().optional(),
  priority: CoursePriority.optional(),
  target_completion_date: z.string().datetime().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: "At least one field must be provided",
});
```

**Success Response: `200 OK`**

```ts
const UpdateCourseResponse = z.object({
  data: Course,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body or empty update |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course not found |

---

### DELETE /api/courses/[id]

Soft delete (archive) a course. Sets `is_archived = true`.

- **Authentication**: Required (must own the course)
- **Rate Limit**: 10 req/min

**Path Parameters:**

```ts
const CourseIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Course archived"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course not found |

---

### PATCH /api/courses/[id]/status

Transition a course's status. Enforces valid state transitions.

- **Authentication**: Required (must own the course)
- **Rate Limit**: 30 req/min

**Valid Transitions:**

```
active   -> paused, completed, dropped
paused   -> active, dropped
completed -> active  (re-open)
dropped  -> active   (resume)
```

**Path Parameters:**

```ts
const CourseIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:**

```ts
const StatusTransitionInput = z.object({
  status: CourseStatus,
});
```

**Success Response: `200 OK`**

```ts
const StatusTransitionResponse = z.object({
  data: Course,
  previous_status: CourseStatus,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course not found |
| 422 | `UNPROCESSABLE_ENTITY` | Invalid status transition (e.g., `paused` -> `completed`) |

**Example error:**

```json
{
  "error": {
    "code": "UNPROCESSABLE_ENTITY",
    "message": "Cannot transition from 'paused' to 'completed'. Course must be 'active' to mark as completed.",
    "details": {
      "current_status": "paused",
      "requested_status": "completed",
      "allowed_transitions": ["active", "dropped"]
    }
  }
}
```

---

### PATCH /api/courses/reorder

Bulk update `sort_order` for multiple courses.

- **Authentication**: Required (must own all courses)
- **Rate Limit**: 30 req/min

**Request Body:**

```ts
const ReorderCoursesInput = z.object({
  orders: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })).min(1).max(50),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "updated": 5
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | One or more courses not found or not owned by user |

---

## Study Session Routes

### GET /api/sessions

List study sessions with filtering.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:**

```ts
const ListSessionsParams = z.object({
  course_id: z.string().uuid().optional(),      // filter by course
  from: z.string().datetime().optional(),        // sessions started after
  to: z.string().datetime().optional(),          // sessions started before
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sort: z.enum(['started_at', 'duration_minutes']).default('started_at'),
  direction: SortDirection.default('desc'),
});
```

**Success Response: `200 OK`**

```ts
const ListSessionsResponse = z.object({
  data: z.array(StudySession.extend({
    course_title: z.string(),
    course_color: z.string().nullable(),
  })),
  meta: PaginationMeta,
});
```

---

### POST /api/sessions

Log a manually-entered study session.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Request Body:**

```ts
const SessionCreateInput = z.object({
  course_id: z.string().uuid(),
  started_at: z.string().datetime(),
  duration_minutes: z.number().min(1).max(1440),  // max 24 hours
  notes: z.string().max(5000).optional(),
  mood_rating: z.number().int().min(1).max(5).optional(),
  productivity_rating: z.number().int().min(1).max(5).optional(),
});
```

**Success Response: `201 Created`**

```ts
const CreateSessionResponse = z.object({
  data: StudySession,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course not found |
| 409 | `CONFLICT` | Overlapping session or active timer already running for same course |

---

### PATCH /api/sessions/[id]

Update a study session (edit notes, duration, ratings).

- **Authentication**: Required (must own the session)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const SessionIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:**

```ts
const SessionUpdateInput = z.object({
  duration_minutes: z.number().min(1).max(1440).optional(),
  notes: z.string().max(5000).nullable().optional(),
  mood_rating: z.number().int().min(1).max(5).nullable().optional(),
  productivity_rating: z.number().int().min(1).max(5).nullable().optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: "At least one field must be provided",
});
```

**Success Response: `200 OK`**

```ts
const UpdateSessionResponse = z.object({
  data: StudySession,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body or empty update |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Session not found |

---

### DELETE /api/sessions/[id]

Delete a study session permanently.

- **Authentication**: Required (must own the session)
- **Rate Limit**: 10 req/min

**Path Parameters:**

```ts
const SessionIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Session deleted"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Session not found |

---

### POST /api/sessions/timer/start

Start a live timer session. Creates a session row with `is_active = true` and `ended_at = null`.

- **Authentication**: Required
- **Rate Limit**: 10 req/min

**Request Body:**

```ts
const StartTimerInput = z.object({
  course_id: z.string().uuid(),
});
```

**Success Response: `201 Created`**

```ts
const StartTimerResponse = z.object({
  data: StudySession,  // is_active=true, ended_at=null, duration_minutes=0
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course not found |
| 409 | `CONFLICT` | User already has an active timer session (only one allowed at a time) |

**Conflict example:**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "An active timer session already exists",
    "details": {
      "active_session_id": "550e8400-e29b-41d4-a716-446655440000",
      "course_id": "...",
      "started_at": "2026-02-19T10:00:00Z"
    }
  }
}
```

---

### PATCH /api/sessions/timer/[id]/stop

Stop an active timer and finalize the session. Calculates `duration_minutes` from `started_at` to now.

- **Authentication**: Required (must own the session)
- **Rate Limit**: 10 req/min

**Path Parameters:**

```ts
const TimerSessionIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:**

```ts
const StopTimerInput = z.object({
  notes: z.string().max(5000).optional(),
  mood_rating: z.number().int().min(1).max(5).optional(),
  productivity_rating: z.number().int().min(1).max(5).optional(),
});
```

**Success Response: `200 OK`**

```ts
const StopTimerResponse = z.object({
  data: StudySession,  // is_active=false, ended_at set, duration_minutes calculated
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Session not found |
| 422 | `UNPROCESSABLE_ENTITY` | Session is not active (already stopped) |

---

## Daily Stats Routes

### GET /api/stats/daily

Get daily aggregate statistics for the authenticated user.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:**

```ts
const DailyStatsParams = z.object({
  from: z.string().optional(),     // "YYYY-MM-DD", defaults to 30 days ago
  to: z.string().optional(),       // "YYYY-MM-DD", defaults to today
});
```

**Success Response: `200 OK`**

```ts
const DailyStatsResponse = z.object({
  data: z.array(DailyStat),
  meta: z.object({
    from: z.string(),
    to: z.string(),
    total_days: z.number().int(),
    study_days: z.number().int(),
    total_minutes: z.number(),
  }),
});
```

---

### GET /api/stats/streak

Get current and historical streak information.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const StreakResponse = z.object({
  data: StreakInfo,
});
```

**Example:**

```json
{
  "data": {
    "current_streak": 12,
    "longest_streak": 45,
    "streak_start_date": "2026-02-07",
    "last_study_date": "2026-02-19",
    "is_at_risk": false,
    "streak_history": [
      {
        "start_date": "2025-12-01",
        "end_date": "2026-01-14",
        "length": 45
      },
      {
        "start_date": "2026-02-07",
        "end_date": "2026-02-19",
        "length": 12
      }
    ]
  }
}
```

---

### GET /api/stats/summary

Get aggregate statistics for different time ranges.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const SummaryResponse = z.object({
  data: z.object({
    today: z.object({
      total_minutes: z.number(),
      session_count: z.number().int(),
      goal_minutes: z.number(),
      goal_met: z.boolean(),
    }),
    this_week: z.object({
      total_minutes: z.number(),
      session_count: z.number().int(),
      goal_minutes: z.number(),
      percentage: z.number(),
      daily_avg_minutes: z.number(),
    }),
    this_month: z.object({
      total_minutes: z.number(),
      session_count: z.number().int(),
      study_days: z.number().int(),
      daily_avg_minutes: z.number(),
    }),
    all_time: z.object({
      total_minutes: z.number(),
      total_sessions: z.number().int(),
      total_study_days: z.number().int(),
      total_courses: z.number().int(),
      completed_courses: z.number().int(),
      avg_session_minutes: z.number(),
      member_since: z.string().datetime(),
    }),
  }),
});
```

---

## AI Analysis Routes

### GET /api/analysis/latest

Get the most recent AI analysis for each of the user's active courses.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Query Parameters:**

```ts
const LatestAnalysisParams = z.object({
  course_id: z.string().uuid().optional(),  // filter to single course
});
```

**Success Response: `200 OK`**

```ts
const LatestAnalysisResponse = z.object({
  data: z.array(AiAnalysis),
});
```

---

### GET /api/analysis/[courseId]

Get analysis history for a specific course.

- **Authentication**: Required (must own the course)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const CourseIdParam = z.object({
  courseId: z.string().uuid(),
});
```

**Query Parameters:**

```ts
const AnalysisHistoryParams = z.object({
  limit: z.number().int().min(1).max(90).default(30),
  from: z.string().optional(),   // "YYYY-MM-DD"
  to: z.string().optional(),     // "YYYY-MM-DD"
});
```

**Success Response: `200 OK`**

```ts
const AnalysisHistoryResponse = z.object({
  data: z.array(AiAnalysis),
  meta: z.object({
    course_id: z.string().uuid(),
    total: z.number().int(),
  }),
});
```

---

### POST /api/analysis/trigger

Manually trigger AI analysis for the authenticated user. Intended for testing and admin use.

- **Authentication**: Required
- **Rate Limit**: 5 req/hour

**Request Body:**

```ts
const TriggerAnalysisInput = z.object({
  course_id: z.string().uuid().optional(),  // specific course, or omit for all active courses
});
```

**Success Response: `202 Accepted`**

```json
{
  "success": true,
  "message": "Analysis triggered",
  "courses_queued": 3
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 429 | `RATE_LIMITED` | Too many analysis triggers |

---

### GET /api/analysis/weekly-report

Get the latest weekly report for the authenticated user.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const WeeklyReportResponse = z.object({
  data: WeeklyReport.nullable(),  // null if no reports exist yet
});
```

---

### GET /api/analysis/weekly-report/[id]

Get a specific weekly report by ID.

- **Authentication**: Required (must own the report)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const ReportIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```ts
const SpecificReportResponse = z.object({
  data: WeeklyReport,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Report not found |

---

## Cron Routes

All cron routes are secured with the `CRON_SECRET` environment variable. They reject requests without a valid `Authorization: Bearer <CRON_SECRET>` header.

### POST /api/cron/daily-analysis

Run the daily AI analysis pipeline for all eligible users.

- **Authentication**: CRON_SECRET (Bearer token)
- **Schedule**: Every day at 2:00 AM UTC
- **Rate Limit**: None (protected by secret)

**Request Headers:**

```
Authorization: Bearer <CRON_SECRET>
```

**Request Body:** None

**Success Response: `200 OK`**

```ts
const CronDailyAnalysisResponse = z.object({
  success: z.boolean(),
  processed_users: z.number().int(),
  analyses_created: z.number().int(),
  errors: z.array(z.object({
    user_id: z.string().uuid(),
    course_id: z.string().uuid().optional(),
    error: z.string(),
  })),
  duration_ms: z.number(),
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid CRON_SECRET |

---

### POST /api/cron/weekly-report

Generate weekly reports for all eligible users.

- **Authentication**: CRON_SECRET (Bearer token)
- **Schedule**: Every Monday at 3:00 AM UTC
- **Rate Limit**: None

**Request Headers:**

```
Authorization: Bearer <CRON_SECRET>
```

**Request Body:** None

**Success Response: `200 OK`**

```ts
const CronWeeklyReportResponse = z.object({
  success: z.boolean(),
  reports_generated: z.number().int(),
  notifications_sent: z.number().int(),
  errors: z.array(z.object({
    user_id: z.string().uuid(),
    error: z.string(),
  })),
  duration_ms: z.number(),
});
```

---

### POST /api/cron/send-reminders

Process and send due reminders. Checks all active reminder schedules where `next_send_at <= now()`.

- **Authentication**: CRON_SECRET (Bearer token)
- **Schedule**: Every 15 minutes
- **Rate Limit**: None

**Request Headers:**

```
Authorization: Bearer <CRON_SECRET>
```

**Request Body:** None

**Success Response: `200 OK`**

```ts
const CronSendRemindersResponse = z.object({
  success: z.boolean(),
  reminders_processed: z.number().int(),
  notifications_created: z.number().int(),
  slack_sent: z.number().int(),
  discord_sent: z.number().int(),
  errors: z.array(z.object({
    reminder_id: z.string().uuid(),
    error: z.string(),
  })),
  duration_ms: z.number(),
});
```

---

### POST /api/cron/daily-stats

Aggregate daily statistics for all users. Rolls up session data into `daily_stats` rows.

- **Authentication**: CRON_SECRET (Bearer token)
- **Schedule**: Every day at 11:59 PM UTC
- **Rate Limit**: None

**Request Headers:**

```
Authorization: Bearer <CRON_SECRET>
```

**Request Body:** None

**Success Response: `200 OK`**

```ts
const CronDailyStatsResponse = z.object({
  success: z.boolean(),
  users_processed: z.number().int(),
  stats_upserted: z.number().int(),
  streaks_updated: z.number().int(),
  duration_ms: z.number(),
});
```

---

## Notification Routes

### GET /api/notifications

List notifications for the authenticated user.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:**

```ts
const ListNotificationsParams = z.object({
  unread: z.boolean().optional(),                 // true=only unread, false=only read, omit=all
  type: NotificationType.optional(),              // filter by type
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});
```

**Success Response: `200 OK`**

```ts
const ListNotificationsResponse = z.object({
  data: z.array(Notification),
  meta: PaginationMeta,
});
```

---

### PATCH /api/notifications/[id]/read

Mark a single notification as read.

- **Authentication**: Required (must own the notification)
- **Rate Limit**: 60 req/min

**Path Parameters:**

```ts
const NotificationIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:** None

**Success Response: `200 OK`**

```ts
const MarkReadResponse = z.object({
  data: Notification,  // with is_read=true, read_at set
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Notification not found |

---

### PATCH /api/notifications/read-all

Mark all unread notifications as read for the authenticated user.

- **Authentication**: Required
- **Rate Limit**: 10 req/min

**Request Body:** None

**Success Response: `200 OK`**

```json
{
  "success": true,
  "updated": 12
}
```

---

### DELETE /api/notifications/[id]

Delete a single notification.

- **Authentication**: Required (must own the notification)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const NotificationIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Notification deleted"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Notification not found |

---

### GET /api/notifications/unread-count

Get the count of unread notifications. Lightweight endpoint for badge rendering.

- **Authentication**: Required
- **Rate Limit**: 120 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const UnreadCountResponse = z.object({
  count: z.number().int().min(0),
});
```

---

## Reminder Routes

### GET /api/reminders

List the authenticated user's reminder schedules.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const ListRemindersResponse = z.object({
  data: z.array(ReminderSchedule.extend({
    course_title: z.string().nullable(),  // resolved from course_id
  })),
});
```

---

### POST /api/reminders

Create a new reminder schedule.

- **Authentication**: Required
- **Rate Limit**: 10 req/min

**Request Body:**

```ts
const ReminderCreateInput = z.object({
  course_id: z.string().uuid().optional(),          // null = general study reminder
  title: z.string().min(1).max(200),
  frequency: ReminderFrequency,
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/),   // "HH:mm" in user's timezone
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),  // required when frequency='custom'
  is_active: z.boolean().default(true),
}).refine(
  (data) => data.frequency !== 'custom' || (data.days_of_week && data.days_of_week.length > 0),
  { message: "days_of_week is required when frequency is 'custom'" }
);
```

**Success Response: `201 Created`**

```ts
const CreateReminderResponse = z.object({
  data: ReminderSchedule,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body or missing days_of_week for custom |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Course not found (if course_id provided) |

---

### PATCH /api/reminders/[id]

Update an existing reminder schedule.

- **Authentication**: Required (must own the reminder)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const ReminderIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:**

```ts
const ReminderUpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  frequency: ReminderFrequency.optional(),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  is_active: z.boolean().optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: "At least one field must be provided",
});
```

**Success Response: `200 OK`**

```ts
const UpdateReminderResponse = z.object({
  data: ReminderSchedule,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Reminder not found |

---

### DELETE /api/reminders/[id]

Delete a reminder schedule.

- **Authentication**: Required (must own the reminder)
- **Rate Limit**: 10 req/min

**Path Parameters:**

```ts
const ReminderIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Reminder deleted"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Reminder not found |

---

## Social Routes

### GET /api/buddies

List the authenticated user's study buddies.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:**

```ts
const ListBuddiesParams = z.object({
  status: BuddyStatus.optional(),   // filter by relationship status
});
```

**Success Response: `200 OK`**

```ts
const ListBuddiesResponse = z.object({
  data: z.array(StudyBuddy),
  meta: z.object({
    total: z.number().int(),
    pending_received: z.number().int(),   // incoming requests awaiting response
  }),
});
```

---

### POST /api/buddies/request

Send a buddy request to another user.

- **Authentication**: Required
- **Rate Limit**: 10 req/min

**Request Body:**

```ts
const BuddyRequestInput = z.object({
  recipient_id: z.string().uuid(),
});
```

**Success Response: `201 Created`**

```ts
const BuddyRequestResponse = z.object({
  data: StudyBuddy,  // status='pending'
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Recipient user not found |
| 409 | `CONFLICT` | Buddy relationship already exists (pending or accepted) |
| 422 | `UNPROCESSABLE_ENTITY` | Cannot send request to yourself |

---

### PATCH /api/buddies/[id]/respond

Accept or decline a buddy request.

- **Authentication**: Required (must be the recipient of the request)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const BuddyIdParam = z.object({
  id: z.string().uuid(),
});
```

**Request Body:**

```ts
const BuddyRespondInput = z.object({
  accept: z.boolean(),
});
```

**Success Response: `200 OK`**

```ts
const BuddyRespondResponse = z.object({
  data: StudyBuddy,  // status='accepted' or status='declined'
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Authenticated user is not the recipient of this request |
| 404 | `NOT_FOUND` | Buddy request not found |
| 422 | `UNPROCESSABLE_ENTITY` | Request is not in 'pending' status |

---

### DELETE /api/buddies/[id]

Remove a buddy relationship.

- **Authentication**: Required (must be either requester or recipient)
- **Rate Limit**: 10 req/min

**Path Parameters:**

```ts
const BuddyIdParam = z.object({
  id: z.string().uuid(),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Buddy removed"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Buddy relationship not found |

---

### GET /api/buddies/[id]/activity

Get a buddy's public activity feed. Only works for accepted buddies.

- **Authentication**: Required (must be an accepted buddy)
- **Rate Limit**: 30 req/min

**Path Parameters:**

```ts
const BuddyIdParam = z.object({
  id: z.string().uuid(),   // the buddy relationship ID
});
```

**Success Response: `200 OK`**

```ts
const BuddyActivityResponse = z.object({
  data: BuddyActivity,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Not an accepted buddy |
| 404 | `NOT_FOUND` | Buddy relationship not found |

---

### GET /api/achievements

List the authenticated user's earned achievements.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const AchievementsResponse = z.object({
  data: z.array(Achievement.omit({ progress: true })),  // only earned achievements
  meta: z.object({
    total_earned: z.number().int(),
    total_available: z.number().int(),
  }),
});
```

---

### GET /api/achievements/available

List all possible achievements with the user's progress toward each.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const AvailableAchievementsResponse = z.object({
  data: z.array(Achievement),   // includes earned_at (null if not earned) and progress
  meta: z.object({
    total_earned: z.number().int(),
    total_available: z.number().int(),
  }),
});
```

**Example item:**

```json
{
  "id": "...",
  "key": "streak_30",
  "title": "Month Warrior",
  "description": "Maintain a 30-day study streak",
  "icon": "flame",
  "category": "streaks",
  "requirement_value": 30,
  "earned_at": null,
  "progress": 40.0
}
```

---

### GET /api/leaderboard

Weekly study hours leaderboard among the authenticated user's accepted buddies.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const LeaderboardResponse = z.object({
  data: z.array(LeaderboardEntry),
  meta: z.object({
    week_start: z.string(),   // "YYYY-MM-DD" (Monday)
    week_end: z.string(),     // "YYYY-MM-DD" (Sunday)
    total_participants: z.number().int(),
  }),
});
```

**Example:**

```json
{
  "data": [
    {
      "rank": 1,
      "user_id": "...",
      "display_name": "Alice",
      "avatar_url": "https://...",
      "weekly_minutes": 420,
      "session_count": 14,
      "streak": 22,
      "is_current_user": false
    },
    {
      "rank": 2,
      "user_id": "...",
      "display_name": "You",
      "avatar_url": null,
      "weekly_minutes": 360,
      "session_count": 12,
      "streak": 12,
      "is_current_user": true
    }
  ],
  "meta": {
    "week_start": "2026-02-16",
    "week_end": "2026-02-22",
    "total_participants": 5
  }
}
```

---

## User Profile Routes

### GET /api/profile

Get the authenticated user's profile.

- **Authentication**: Required
- **Rate Limit**: 60 req/min

**Query Parameters:** None

**Success Response: `200 OK`**

```ts
const GetProfileResponse = z.object({
  data: UserProfile,
});
```

---

### PATCH /api/profile

Update profile fields. Only provided fields are updated.

- **Authentication**: Required
- **Rate Limit**: 30 req/min

**Request Body:**

```ts
const ProfileUpdateInput = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  weekly_study_goal_hours: z.number().min(0).max(168).optional(),
  daily_study_goal_minutes: z.number().min(0).max(1440).optional(),
  is_public_profile: z.boolean().optional(),
  notification_preferences: NotificationPreferences.partial().optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: "At least one field must be provided",
});
```

**Success Response: `200 OK`**

```ts
const UpdateProfileResponse = z.object({
  data: UserProfile,
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body or empty update |
| 401 | `UNAUTHORIZED` | Not authenticated |

---

### POST /api/profile/onboarding

Complete onboarding. Batch-sets profile fields and marks `onboarding_completed = true`.

- **Authentication**: Required
- **Rate Limit**: 5 req/min

**Request Body:**

```ts
const OnboardingInput = z.object({
  display_name: z.string().min(1).max(100),
  timezone: z.string(),
  weekly_study_goal_hours: z.number().min(0).max(168),
  daily_study_goal_minutes: z.number().min(0).max(1440),
  initial_courses: z.array(z.object({
    title: z.string().min(1).max(200),
    platform: z.string().max(100).optional(),
    url: z.string().url().optional(),
    estimated_hours: z.number().min(0).optional(),
    priority: CoursePriority.default('medium'),
  })).max(10).default([]),
  notification_preferences: NotificationPreferences.partial().optional(),
});
```

**Success Response: `200 OK`**

```ts
const OnboardingResponse = z.object({
  data: z.object({
    profile: UserProfile,               // with onboarding_completed=true
    courses_created: z.array(Course),
  }),
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 409 | `CONFLICT` | Onboarding already completed |

---

### DELETE /api/profile

Delete the user's account. Triggers a cascade delete of all associated data.

- **Authentication**: Required
- **Rate Limit**: 1 req/min

**Request Body:**

```ts
const DeleteAccountInput = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),   // safety confirmation
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Account and all associated data have been deleted"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or incorrect confirmation string |
| 401 | `UNAUTHORIZED` | Not authenticated |

---

### POST /api/profile/export

Request a data export of all user data.

- **Authentication**: Required
- **Rate Limit**: 2 req/hour

**Request Body:**

```ts
const DataExportInput = z.object({
  format: ExportFormat,   // 'json' or 'csv'
});
```

**Success Response: `200 OK`**

Returns a file download.

**Response Headers:**

```
Content-Type: application/json  (for format='json')
Content-Type: text/csv          (for format='csv')
Content-Disposition: attachment; filename="course-tracker-export-2026-02-19.json"
```

**JSON export shape:**

```ts
const DataExport = z.object({
  exported_at: z.string().datetime(),
  user: UserProfile,
  courses: z.array(Course),
  sessions: z.array(StudySession),
  daily_stats: z.array(DailyStat),
  analyses: z.array(AiAnalysis),
  weekly_reports: z.array(WeeklyReport),
  reminders: z.array(ReminderSchedule),
  achievements: z.array(Achievement),
  notifications: z.array(Notification),
});
```

**CSV export:** A ZIP file containing separate CSV files for each entity type.

```
Content-Type: application/zip
Content-Disposition: attachment; filename="course-tracker-export-2026-02-19.zip"
```

---

## Integration Routes

### POST /api/integrations/slack/test

Test a Slack webhook URL by sending a test message.

- **Authentication**: Required
- **Rate Limit**: 5 req/min

**Request Body:**

```ts
const SlackTestInput = z.object({
  webhook_url: z.string().url().startsWith('https://hooks.slack.com/'),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Test message sent to Slack"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid URL or not a Slack webhook URL |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 422 | `UNPROCESSABLE_ENTITY` | Webhook URL returned an error (invalid/expired) |

---

### POST /api/integrations/discord/test

Test a Discord webhook URL by sending a test message.

- **Authentication**: Required
- **Rate Limit**: 5 req/min

**Request Body:**

```ts
const DiscordTestInput = z.object({
  webhook_url: z.string().url().startsWith('https://discord.com/api/webhooks/'),
});
```

**Success Response: `200 OK`**

```json
{
  "success": true,
  "message": "Test message sent to Discord"
}
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid URL or not a Discord webhook URL |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 422 | `UNPROCESSABLE_ENTITY` | Webhook URL returned an error (invalid/expired) |

---

### PATCH /api/integrations/webhooks

Update the user's stored webhook URLs.

- **Authentication**: Required
- **Rate Limit**: 10 req/min

**Request Body:**

```ts
const UpdateWebhooksInput = z.object({
  slack_webhook_url: z.string().url().startsWith('https://hooks.slack.com/').nullable().optional(),
  discord_webhook_url: z.string().url().startsWith('https://discord.com/api/webhooks/').nullable().optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: "At least one webhook URL must be provided",
});
```

**Success Response: `200 OK`**

```ts
const UpdateWebhooksResponse = z.object({
  data: z.object({
    slack_webhook_url: z.string().url().nullable(),
    discord_webhook_url: z.string().url().nullable(),
  }),
});
```

**Error Responses:**

| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body or invalid URL format |
| 401 | `UNAUTHORIZED` | Not authenticated |

---

## Server Actions - B1 User Profile

Location: `src/app/(app)/profile/actions.ts`

All server actions use `'use server'` directive and authenticate via `createServerClient()` from Supabase. They throw typed errors on failure.

```ts
// ──────────────────────────────────────
// updateProfile
// ──────────────────────────────────────
// Updates the authenticated user's profile fields.
// Revalidates: /profile, /dashboard

async function updateProfile(
  data: ProfileUpdateInput
): Promise<UserProfile>

// Input schema: same as PATCH /api/profile request body
const ProfileUpdateInput = z.object({
  display_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  weekly_study_goal_hours: z.number().min(0).max(168).optional(),
  daily_study_goal_minutes: z.number().min(0).max(1440).optional(),
  is_public_profile: z.boolean().optional(),
  notification_preferences: NotificationPreferences.partial().optional(),
});

// Throws:
// - ZodError if validation fails (caught by error boundary)
// - AuthError if not authenticated
// - DatabaseError if update fails

// ──────────────────────────────────────
// completeOnboarding
// ──────────────────────────────────────
// Batch-sets profile data and initial courses. Sets onboarding_completed=true.
// Revalidates: /, /dashboard, /courses

async function completeOnboarding(
  data: OnboardingInput
): Promise<UserProfile>

// Input schema: same as POST /api/profile/onboarding request body
const OnboardingInput = z.object({
  display_name: z.string().min(1).max(100),
  timezone: z.string(),
  weekly_study_goal_hours: z.number().min(0).max(168),
  daily_study_goal_minutes: z.number().min(0).max(1440),
  initial_courses: z.array(z.object({
    title: z.string().min(1).max(200),
    platform: z.string().max(100).optional(),
    url: z.string().url().optional(),
    estimated_hours: z.number().min(0).optional(),
    priority: CoursePriority.default('medium'),
  })).max(10).default([]),
  notification_preferences: NotificationPreferences.partial().optional(),
});

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - ConflictError if onboarding already completed

// ──────────────────────────────────────
// updateNotificationPreferences
// ──────────────────────────────────────
// Partial update of notification preferences only.
// Revalidates: /profile

async function updateNotificationPreferences(
  data: NotifPrefsInput
): Promise<void>

const NotifPrefsInput = NotificationPreferences.partial().refine(
  obj => Object.keys(obj).length > 0,
  { message: "At least one preference must be provided" }
);

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated

// ──────────────────────────────────────
// exportData
// ──────────────────────────────────────
// Exports all user data in the specified format.
// No revalidation needed.

async function exportData(
  format: 'json' | 'csv'
): Promise<Blob>

// Returns: Blob containing JSON data or ZIP of CSV files
// Throws:
// - AuthError if not authenticated
// - Error if export generation fails
```

---

## Server Actions - B2 Course Management

Location: `src/app/(app)/courses/actions.ts`

```ts
// ──────────────────────────────────────
// createCourse
// ──────────────────────────────────────
// Creates a new course for the authenticated user.
// Revalidates: /courses, /dashboard

async function createCourse(
  data: CourseCreateInput
): Promise<Course>

const CourseCreateInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  platform: z.string().max(100).optional(),
  url: z.string().url().optional(),
  estimated_hours: z.number().min(0).optional(),
  priority: CoursePriority.default('medium'),
  target_completion_date: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated

// ──────────────────────────────────────
// updateCourse
// ──────────────────────────────────────
// Updates fields of an existing course.
// Revalidates: /courses, /courses/[id], /dashboard

async function updateCourse(
  id: string,
  data: CourseUpdateInput
): Promise<Course>

const CourseUpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  platform: z.string().max(100).nullable().optional(),
  url: z.string().url().nullable().optional(),
  estimated_hours: z.number().min(0).nullable().optional(),
  priority: CoursePriority.optional(),
  target_completion_date: z.string().datetime().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - NotFoundError if course not found or not owned by user

// ──────────────────────────────────────
// transitionStatus
// ──────────────────────────────────────
// Transitions a course to a new status with validation.
// Revalidates: /courses, /courses/[id], /dashboard

async function transitionStatus(
  id: string,
  newStatus: CourseStatus
): Promise<Course>

// Valid transitions:
// active   -> paused, completed, dropped
// paused   -> active, dropped
// completed -> active
// dropped  -> active

// Throws:
// - AuthError if not authenticated
// - NotFoundError if course not found
// - InvalidTransitionError if status transition is not allowed
//   (includes current_status, requested_status, allowed_transitions)

// ──────────────────────────────────────
// reorderCourses
// ──────────────────────────────────────
// Bulk updates sort_order for drag-and-drop reordering.
// Revalidates: /courses

async function reorderCourses(
  orders: Array<{ id: string; sort_order: number }>
): Promise<void>

// Input validation:
// - orders must have at least 1 item and at most 50
// - each id must be a valid UUID
// - each sort_order must be a non-negative integer

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - NotFoundError if any course not found or not owned by user

// ──────────────────────────────────────
// deleteCourse
// ──────────────────────────────────────
// Soft-deletes (archives) a course.
// Revalidates: /courses, /dashboard

async function deleteCourse(
  id: string
): Promise<void>

// Throws:
// - AuthError if not authenticated
// - NotFoundError if course not found
```

---

## Server Actions - B3 Progress Tracking

Location: `src/app/(app)/sessions/actions.ts`

```ts
// ──────────────────────────────────────
// logSession
// ──────────────────────────────────────
// Manually logs a completed study session.
// Revalidates: /sessions, /dashboard, /courses/[courseId], /stats

async function logSession(
  data: SessionCreateInput
): Promise<StudySession>

const SessionCreateInput = z.object({
  course_id: z.string().uuid(),
  started_at: z.string().datetime(),
  duration_minutes: z.number().min(1).max(1440),
  notes: z.string().max(5000).optional(),
  mood_rating: z.number().int().min(1).max(5).optional(),
  productivity_rating: z.number().int().min(1).max(5).optional(),
});

// Side effects:
// - Updates course.completed_hours
// - Updates or creates daily_stats row for the session date
// - Checks and awards applicable achievements

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - NotFoundError if course not found
// - ConflictError if overlapping session exists

// ──────────────────────────────────────
// updateSession
// ──────────────────────────────────────
// Edits an existing session's duration, notes, or ratings.
// Revalidates: /sessions, /dashboard, /stats

async function updateSession(
  id: string,
  data: SessionUpdateInput
): Promise<StudySession>

const SessionUpdateInput = z.object({
  duration_minutes: z.number().min(1).max(1440).optional(),
  notes: z.string().max(5000).nullable().optional(),
  mood_rating: z.number().int().min(1).max(5).nullable().optional(),
  productivity_rating: z.number().int().min(1).max(5).nullable().optional(),
});

// Side effects:
// - If duration_minutes changes, recalculates course.completed_hours and daily_stats

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - NotFoundError if session not found

// ──────────────────────────────────────
// deleteSession
// ──────────────────────────────────────
// Permanently deletes a study session.
// Revalidates: /sessions, /dashboard, /courses/[courseId], /stats

async function deleteSession(
  id: string
): Promise<void>

// Side effects:
// - Recalculates course.completed_hours
// - Recalculates daily_stats for the session's date

// Throws:
// - AuthError if not authenticated
// - NotFoundError if session not found

// ──────────────────────────────────────
// startTimer
// ──────────────────────────────────────
// Starts a live timer. Creates a session row with is_active=true.
// Only one active timer is allowed at a time per user.
// Revalidates: /dashboard

async function startTimer(
  courseId: string
): Promise<StudySession>

// Returns: StudySession with is_active=true, ended_at=null, duration_minutes=0

// Throws:
// - AuthError if not authenticated
// - NotFoundError if course not found
// - ConflictError if user already has an active timer

// ──────────────────────────────────────
// stopTimer
// ──────────────────────────────────────
// Stops the active timer and finalizes the session.
// Calculates duration from started_at to now.
// Revalidates: /sessions, /dashboard, /courses/[courseId], /stats

async function stopTimer(
  sessionId: string
): Promise<StudySession>

// Returns: StudySession with is_active=false, ended_at set, duration_minutes calculated

// Side effects:
// - Same as logSession: updates course hours, daily stats, checks achievements

// Throws:
// - AuthError if not authenticated
// - NotFoundError if session not found
// - InvalidStateError if session is not active

// ──────────────────────────────────────
// getStreakInfo
// ──────────────────────────────────────
// Retrieves current and historical streak information.
// No revalidation needed (read-only).

async function getStreakInfo(): Promise<StreakInfo>

// Returns: StreakInfo object

// Throws:
// - AuthError if not authenticated
```

---

## Server Actions - B4 AI Analysis

Location: `src/app/(app)/analysis/actions.ts`

```ts
// ──────────────────────────────────────
// getLatestAnalysis
// ──────────────────────────────────────
// Retrieves the most recent AI analysis for the user's courses.
// No revalidation needed (read-only).

async function getLatestAnalysis(
  courseId?: string
): Promise<AiAnalysis[]>

// If courseId is provided, returns array with single analysis for that course.
// If omitted, returns latest analysis for each active course.

// Throws:
// - AuthError if not authenticated
// - NotFoundError if courseId provided but course not found

// ──────────────────────────────────────
// getWeeklyReport
// ──────────────────────────────────────
// Retrieves a weekly report. If weekStart is provided, returns that week's report.
// Otherwise returns the most recent report.

async function getWeeklyReport(
  weekStart?: string    // "YYYY-MM-DD" (must be a Monday)
): Promise<WeeklyReport>

// Throws:
// - AuthError if not authenticated
// - NotFoundError if no report exists for the specified week
// - ValidationError if weekStart is not a Monday

// ──────────────────────────────────────
// triggerAnalysis
// ──────────────────────────────────────
// Manually triggers AI analysis for the current user's active courses.
// Revalidates: /analysis, /dashboard

async function triggerAnalysis(): Promise<void>

// Rate limited to 5 per hour per user.
// Enqueues analysis jobs; results appear asynchronously.

// Throws:
// - AuthError if not authenticated
// - RateLimitError if too many triggers
```

---

## Server Actions - B5 Dashboard

Location: `src/app/(app)/dashboard/actions.ts`

```ts
// ──────────────────────────────────────
// getDashboardData
// ──────────────────────────────────────
// Aggregates all data needed for the main dashboard view.
// This is a composite read that combines multiple queries.

async function getDashboardData(): Promise<DashboardData>

// DashboardData shape (see Shared Types section):
// {
//   streak: StreakInfo,
//   today: { total_minutes, goal_minutes, sessions, goal_met },
//   this_week: { total_minutes, goal_minutes, sessions, percentage },
//   active_courses: CourseWithStats[],
//   recent_sessions: (StudySession & { course_title, course_color })[],
//   active_timer: StudySession | null,
//   unread_notifications: number,
//   upcoming_reminders: ReminderSchedule[],
//   risk_alerts: { course_id, course_title, risk_level, message }[],
// }

// Throws:
// - AuthError if not authenticated

// ──────────────────────────────────────
// getTodaysPlan
// ──────────────────────────────────────
// Generates an AI-assisted study plan for today based on recent patterns,
// course priorities, and risk levels.

async function getTodaysPlan(): Promise<TodaysPlan>

// TodaysPlan shape (see Shared Types section):
// {
//   suggested_courses: [{ course_id, course_title, suggested_minutes, reason, priority }],
//   total_suggested_minutes: number,
//   ai_tip: string | null,
// }

// Throws:
// - AuthError if not authenticated
```

---

## Server Actions - B6 Notifications

Location: `src/app/(app)/notifications/actions.ts`

```ts
// ──────────────────────────────────────
// getNotifications
// ──────────────────────────────────────
// Retrieves paginated notifications with optional filters.

async function getNotifications(
  filters: NotifFilters
): Promise<PaginatedNotifications>

const NotifFilters = z.object({
  unread: z.boolean().optional(),
  type: NotificationType.optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const PaginatedNotifications = z.object({
  data: z.array(Notification),
  meta: PaginationMeta,
});

// Throws:
// - AuthError if not authenticated

// ──────────────────────────────────────
// markAsRead
// ──────────────────────────────────────
// Marks a single notification as read.
// Revalidates: /notifications

async function markAsRead(
  id: string
): Promise<void>

// Throws:
// - AuthError if not authenticated
// - NotFoundError if notification not found

// ──────────────────────────────────────
// markAllAsRead
// ──────────────────────────────────────
// Marks all unread notifications as read for the current user.
// Revalidates: /notifications

async function markAllAsRead(): Promise<void>

// Throws:
// - AuthError if not authenticated

// ──────────────────────────────────────
// createReminder
// ──────────────────────────────────────
// Creates a new reminder schedule.
// Revalidates: /reminders, /dashboard

async function createReminder(
  data: ReminderInput
): Promise<ReminderSchedule>

const ReminderInput = z.object({
  course_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  frequency: ReminderFrequency,
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => data.frequency !== 'custom' || (data.days_of_week && data.days_of_week.length > 0),
  { message: "days_of_week is required when frequency is 'custom'" }
);

// Side effects:
// - Calculates and sets next_send_at based on frequency and time_of_day

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - NotFoundError if course_id provided but not found

// ──────────────────────────────────────
// updateReminder
// ──────────────────────────────────────
// Updates an existing reminder schedule.
// Revalidates: /reminders

async function updateReminder(
  id: string,
  data: ReminderUpdateInput
): Promise<ReminderSchedule>

const ReminderUpdateInput = z.object({
  title: z.string().min(1).max(200).optional(),
  frequency: ReminderFrequency.optional(),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  is_active: z.boolean().optional(),
});

// Side effects:
// - Recalculates next_send_at if frequency, time_of_day, or days_of_week changes

// Throws:
// - ZodError if validation fails
// - AuthError if not authenticated
// - NotFoundError if reminder not found

// ──────────────────────────────────────
// deleteReminder
// ──────────────────────────────────────
// Deletes a reminder schedule.
// Revalidates: /reminders, /dashboard

async function deleteReminder(
  id: string
): Promise<void>

// Throws:
// - AuthError if not authenticated
// - NotFoundError if reminder not found
```

---

## Server Actions - B7 Social

Location: `src/app/(app)/social/actions.ts`

```ts
// ──────────────────────────────────────
// sendBuddyRequest
// ──────────────────────────────────────
// Sends a buddy request to another user.
// Revalidates: /buddies

async function sendBuddyRequest(
  recipientId: string
): Promise<StudyBuddy>

// Side effects:
// - Creates a notification for the recipient

// Throws:
// - AuthError if not authenticated
// - NotFoundError if recipient user not found
// - ConflictError if buddy relationship already exists
// - ValidationError if recipientId is the current user's ID

// ──────────────────────────────────────
// respondToRequest
// ──────────────────────────────────────
// Accepts or declines an incoming buddy request.
// Revalidates: /buddies

async function respondToRequest(
  id: string,
  accept: boolean
): Promise<StudyBuddy>

// Side effects:
// - If accepted, creates a notification for the requester
// - If accepted, both users appear on each other's leaderboard

// Throws:
// - AuthError if not authenticated
// - ForbiddenError if current user is not the recipient
// - NotFoundError if buddy request not found
// - InvalidStateError if request is not in 'pending' status

// ──────────────────────────────────────
// removeBuddy
// ──────────────────────────────────────
// Removes a buddy relationship (either party can remove).
// Revalidates: /buddies, /leaderboard

async function removeBuddy(
  id: string
): Promise<void>

// Throws:
// - AuthError if not authenticated
// - NotFoundError if buddy relationship not found

// ──────────────────────────────────────
// getBuddyActivity
// ──────────────────────────────────────
// Gets a buddy's public activity (recent sessions, streak, achievements).

async function getBuddyActivity(
  buddyId: string
): Promise<BuddyActivity>

// Throws:
// - AuthError if not authenticated
// - ForbiddenError if not an accepted buddy
// - NotFoundError if buddy relationship not found

// ──────────────────────────────────────
// getAchievements
// ──────────────────────────────────────
// Gets all achievements with earned status for the current user.

async function getAchievements(): Promise<Achievement[]>

// Returns: Full list of achievements with earned_at and progress fields.

// Throws:
// - AuthError if not authenticated

// ──────────────────────────────────────
// getLeaderboard
// ──────────────────────────────────────
// Gets the weekly study leaderboard among the user's accepted buddies.

async function getLeaderboard(): Promise<LeaderboardEntry[]>

// Returns: Sorted array with rank, includes the current user.
// Only includes users with accepted buddy status.

// Throws:
// - AuthError if not authenticated
```

---

## Server Actions - B8 Visualizations

Location: `src/app/(app)/visualizations/actions.ts`

All B8 actions are read-only and do not trigger revalidation.

```ts
// ──────────────────────────────────────
// getHeatmapData
// ──────────────────────────────────────
// Returns daily study data for the heatmap calendar visualization.

async function getHeatmapData(
  year?: number    // defaults to current year
): Promise<HeatmapDay[]>

// Returns: Array of 365/366 entries (one per day), including days with no study.
// Days with no study have total_minutes=0, session_count=0, goal_met=false, level=0.

// HeatmapDay:
// {
//   date: "YYYY-MM-DD",
//   total_minutes: number,
//   session_count: number,
//   goal_met: boolean,
//   level: 0 | 1 | 2 | 3 | 4,   // intensity level for color mapping
// }

// Level calculation:
// 0 = 0 minutes
// 1 = 1-29 minutes
// 2 = 30-59 minutes
// 3 = 60-119 minutes
// 4 = 120+ minutes

// Throws:
// - AuthError if not authenticated

// ──────────────────────────────────────
// getProgressTimeline
// ──────────────────────────────────────
// Returns cumulative progress data for a specific course over time.

async function getProgressTimeline(
  courseId: string,
  range: DateRange
): Promise<TimelinePoint[]>

const DateRange = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

// TimelinePoint:
// {
//   date: "YYYY-MM-DD",
//   cumulative_hours: number,
//   daily_minutes: number,
//   completion_percentage: number,
//   risk_level: RiskLevel,
// }

// Throws:
// - AuthError if not authenticated
// - NotFoundError if course not found

// ──────────────────────────────────────
// getStudyHoursChart
// ──────────────────────────────────────
// Returns study hours data grouped by time period for bar/line charts.

async function getStudyHoursChart(
  range: DateRange,
  groupBy: 'day' | 'week' | 'month'
): Promise<ChartData>

// ChartData:
// {
//   labels: string[],             // period labels, e.g. ["Feb 10", "Feb 11", ...]
//   datasets: [{
//     course_id: string,
//     course_title: string,
//     color: string,
//     data: number[],             // minutes per period
//   }],
//   totals: number[],             // total minutes per period (all courses combined)
// }

// Throws:
// - AuthError if not authenticated

// ──────────────────────────────────────
// getCompletionForecast
// ──────────────────────────────────────
// Returns completion forecast data based on current study pace.

async function getCompletionForecast(
  courseId: string
): Promise<ForecastData>

// ForecastData:
// {
//   course_id: string,
//   course_title: string,
//   estimated_hours: number | null,
//   completed_hours: number,
//   current_pace_hours_per_week: number,
//   predicted_completion_date: string | null,   // "YYYY-MM-DD"
//   target_completion_date: string | null,
//   on_track: boolean,
//   confidence: number,                         // 0.0 to 1.0
//   forecast_points: [{
//     date: string,
//     projected_hours: number,
//     lower_bound: number,
//     upper_bound: number,
//   }],
// }

// Returns null predicted_completion_date if estimated_hours is not set.
// Confidence decreases the further out the projection extends.

// Throws:
// - AuthError if not authenticated
// - NotFoundError if course not found

// ──────────────────────────────────────
// getRiskTrend
// ──────────────────────────────────────
// Returns historical risk score trend for a course.

async function getRiskTrend(
  courseId: string
): Promise<RiskTrendData>

// RiskTrendData:
// {
//   course_id: string,
//   points: [{
//     date: "YYYY-MM-DD",
//     risk_score: number,           // 0-100
//     risk_level: RiskLevel,
//     momentum_score: number,       // -100 to 100
//   }],
// }

// Throws:
// - AuthError if not authenticated
// - NotFoundError if course not found

// ──────────────────────────────────────
// getSessionDistribution
// ──────────────────────────────────────
// Returns distribution of study sessions by course, time of day, and day of week.

async function getSessionDistribution(): Promise<DistributionData>

// DistributionData:
// {
//   by_course: [{
//     course_id: string,
//     course_title: string,
//     color: string,
//     total_minutes: number,
//     percentage: number,
//   }],
//   by_time_of_day: {
//     morning: number,       // 6am-12pm total minutes
//     afternoon: number,     // 12pm-6pm total minutes
//     evening: number,       // 6pm-10pm total minutes
//     night: number,         // 10pm-6am total minutes
//   },
//   by_day_of_week: number[],  // [Sun, Mon, Tue, Wed, Thu, Fri, Sat] minutes
// }

// Throws:
// - AuthError if not authenticated
```

---

## Cron Job Schedule

| Job | Route | Schedule | Description |
|---|---|---|---|
| Daily Analysis | `POST /api/cron/daily-analysis` | Every day at 2:00 AM UTC | Runs GPT-4 analysis on all active courses for all users with recent activity |
| Weekly Report | `POST /api/cron/weekly-report` | Every Monday at 3:00 AM UTC | Generates weekly summary reports with AI insights |
| Send Reminders | `POST /api/cron/send-reminders` | Every 15 minutes | Processes due reminder schedules, creates notifications, sends Slack/Discord webhooks |
| Daily Stats | `POST /api/cron/daily-stats` | Every day at 11:59 PM UTC | Aggregates session data into daily_stats rows, updates streak counters |

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-analysis",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 3 * * 1"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/daily-stats",
      "schedule": "59 23 * * *"
    }
  ]
}
```

### Environment Variable

```
CRON_SECRET=<random-string-at-least-32-chars>
```

All cron handlers must verify:

```ts
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}
```

---

## Rate Limiting

Rate limits are enforced per authenticated user using a sliding window approach. Limits are implemented via Vercel Edge Middleware or in-route checks with an Upstash Redis counter.

| Route Pattern | Limit | Window |
|---|---|---|
| `GET /api/*` (reads) | 60 req | 1 minute |
| `POST/PATCH /api/*` (writes) | 30 req | 1 minute |
| `DELETE /api/*` | 10 req | 1 minute |
| `POST /api/analysis/trigger` | 5 req | 1 hour |
| `POST /api/profile/onboarding` | 5 req | 1 minute |
| `POST /api/profile/export` | 2 req | 1 hour |
| `DELETE /api/profile` | 1 req | 1 minute |
| `POST /api/integrations/*/test` | 5 req | 1 minute |
| `GET /api/notifications/unread-count` | 120 req | 1 minute |
| Cron routes | No limit | N/A (protected by secret) |

### Rate Limit Response

When a rate limit is exceeded, the API responds with:

**Status: `429 Too Many Requests`**

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "limit": 30,
      "window_seconds": 60,
      "retry_after_seconds": 23
    }
  }
}
```

**Response Headers:**

```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1740000000
Retry-After: 23
```
