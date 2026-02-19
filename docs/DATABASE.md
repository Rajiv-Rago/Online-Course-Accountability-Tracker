# Course Accountability Tracker -- Database Schema

> **Stack:** Supabase (PostgreSQL 15+)
> **Last updated:** 2026-02-19

---

## Table of Contents

1. [Overview](#overview)
2. [Entity-Relationship Summary](#entity-relationship-summary)
3. [Foundation Migration](#foundation-migration)
   - [Extensions & Helpers](#extensions--helpers)
   - [Table Definitions (all 10 tables)](#table-definitions)
   - [Indexes](#indexes)
   - [Triggers](#triggers)
   - [Row Level Security Policies](#row-level-security-policies)
4. [Seed Data](#seed-data)
5. [Migration Strategy & Rollback](#migration-strategy--rollback)

---

## Overview

| # | Table | Description |
|---|-------|-------------|
| 1 | `user_profiles` | Extended profile linked to Supabase Auth |
| 2 | `courses` | Courses a user is tracking |
| 3 | `study_sessions` | Individual study session logs |
| 4 | `daily_stats` | Aggregated per-day statistics |
| 5 | `ai_analyses` | GPT-4 generated risk scores and insights |
| 6 | `weekly_reports` | Weekly rollup reports with AI narrative |
| 7 | `notifications` | In-app and multi-channel notifications |
| 8 | `reminder_schedules` | Recurring reminder configurations |
| 9 | `study_buddies` | Social accountability pairings |
| 10 | `achievements` | Gamification badges and milestones |

---

## Entity-Relationship Summary

```
auth.users (Supabase Auth)
    |
    | 1:1
    v
user_profiles
    |
    |--- 1:N ---> courses
    |                |
    |                |--- 1:N ---> study_sessions
    |                |--- 0:N <--- ai_analyses (optional FK)
    |                |--- 0:N <--- achievements (optional FK)
    |                |--- 0:N <--- reminder_schedules (optional FK)
    |
    |--- 1:N ---> study_sessions
    |--- 1:N ---> daily_stats (UNIQUE user_id + date)
    |--- 1:N ---> ai_analyses
    |--- 1:N ---> weekly_reports (UNIQUE user_id + week_start)
    |--- 1:N ---> notifications
    |--- 1:N ---> reminder_schedules
    |--- M:N ---> study_buddies (self-referencing via requester/recipient)
    |--- 1:N ---> achievements (UNIQUE user_id + achievement_type + course_id)
```

---

## Foundation Migration

**File:** `supabase/migrations/00001_foundation.sql`

This single migration creates ALL tables, indexes, triggers, and RLS policies for the initial schema.

### Extensions & Helpers

```sql
-- =============================================================================
-- 00001_foundation.sql
-- Course Accountability Tracker -- Foundation Migration
-- Creates all 10 tables, indexes, triggers, and RLS policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
-- pgcrypto is enabled by default in Supabase for gen_random_uuid().
-- moddatetime is used for automatic updated_at triggers.
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. Helper function: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Table Definitions

#### 1. user_profiles

```sql
-- ---------------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------------

-- 2.1 user_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id                      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT        NOT NULL,
  full_name               TEXT,
  avatar_url              TEXT,
  timezone                TEXT        DEFAULT 'UTC',
  theme                   TEXT        DEFAULT 'system'
                                      CHECK (theme IN ('light', 'dark', 'system')),
  motivation_style        TEXT        DEFAULT 'balanced'
                                      CHECK (motivation_style IN (
                                        'gentle', 'tough_love', 'data_driven', 'balanced'
                                      )),
  preferred_study_days    JSONB       DEFAULT '["mon","tue","wed","thu","fri"]'::jsonb,
  preferred_study_time    TEXT        DEFAULT 'evening'
                                      CHECK (preferred_study_time IN (
                                        'morning', 'afternoon', 'evening', 'night'
                                      )),
  daily_study_goal_minutes INTEGER    DEFAULT 60,
  experience_level        TEXT        DEFAULT 'intermediate'
                                      CHECK (experience_level IN (
                                        'beginner', 'intermediate', 'advanced'
                                      )),
  onboarding_completed    BOOLEAN     DEFAULT false,
  streak_freeze_count     INTEGER     DEFAULT 3,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  public.user_profiles IS 'Extended user profile linked 1:1 with Supabase auth.users.';
COMMENT ON COLUMN public.user_profiles.motivation_style IS 'Controls the tone of AI-generated messages.';
COMMENT ON COLUMN public.user_profiles.preferred_study_days IS 'JSON array of short day names, e.g. ["mon","wed","fri"].';
COMMENT ON COLUMN public.user_profiles.streak_freeze_count IS 'Remaining streak-freeze tokens the user can spend.';
```

#### 2. courses

```sql
-- 2.2 courses
-- ---------------------------------------------------------------------------
CREATE TABLE public.courses (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title                   TEXT        NOT NULL,
  platform                TEXT        CHECK (platform IN (
                                        'udemy', 'coursera', 'youtube',
                                        'skillshare', 'pluralsight', 'custom'
                                      )),
  url                     TEXT,
  total_modules           INTEGER,
  completed_modules       INTEGER     DEFAULT 0,
  total_hours             NUMERIC(6,2),
  completed_hours         NUMERIC(6,2) DEFAULT 0,
  target_completion_date  DATE,
  priority                INTEGER     DEFAULT 2
                                      CHECK (priority BETWEEN 1 AND 4),
  status                  TEXT        DEFAULT 'not_started'
                                      CHECK (status IN (
                                        'not_started', 'in_progress', 'paused',
                                        'completed', 'abandoned'
                                      )),
  notes                   TEXT,
  sort_order              INTEGER     DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  public.courses IS 'Courses a user is tracking for accountability.';
COMMENT ON COLUMN public.courses.priority IS '1 = highest, 4 = lowest.';
COMMENT ON COLUMN public.courses.sort_order IS 'Manual drag-and-drop ordering within the dashboard.';
```

#### 3. study_sessions

```sql
-- 2.3 study_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.study_sessions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id         UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ NOT NULL,
  ended_at          TIMESTAMPTZ,
  duration_minutes  INTEGER     NOT NULL,
  modules_completed INTEGER     DEFAULT 0,
  session_type      TEXT        DEFAULT 'manual'
                                CHECK (session_type IN ('manual', 'timer', 'module')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  public.study_sessions IS 'Individual study session logs.';
COMMENT ON COLUMN public.study_sessions.session_type IS 'How the session was recorded: manual entry, timer, or module completion.';
```

#### 4. daily_stats

```sql
-- 2.4 daily_stats
-- ---------------------------------------------------------------------------
CREATE TABLE public.daily_stats (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  date              DATE        NOT NULL,
  total_minutes     INTEGER     DEFAULT 0,
  session_count     INTEGER     DEFAULT 0,
  modules_completed INTEGER     DEFAULT 0,
  courses_studied   JSONB       DEFAULT '[]'::jsonb,
  streak_day        BOOLEAN     DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT daily_stats_user_date_unique UNIQUE (user_id, date)
);

COMMENT ON TABLE  public.daily_stats IS 'Aggregated statistics per user per day.';
COMMENT ON COLUMN public.daily_stats.courses_studied IS 'JSON array of course UUID strings studied that day.';
COMMENT ON COLUMN public.daily_stats.streak_day IS 'True when the user met their daily study goal.';
```

#### 5. ai_analyses

```sql
-- 2.5 ai_analyses
-- ---------------------------------------------------------------------------
CREATE TABLE public.ai_analyses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id       UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
  analysis_type   TEXT        NOT NULL
                              CHECK (analysis_type IN ('daily', 'weekly', 'risk_alert')),
  risk_score      INTEGER     CHECK (risk_score BETWEEN 0 AND 100),
  risk_level      TEXT        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  insights        JSONB       NOT NULL,
  interventions   JSONB       NOT NULL,
  patterns        JSONB,
  raw_prompt      TEXT,
  raw_response    TEXT,
  tokens_used     INTEGER,
  model           TEXT        DEFAULT 'gpt-4',
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  public.ai_analyses IS 'AI-generated risk analyses, insights, and interventions.';
COMMENT ON COLUMN public.ai_analyses.insights IS 'JSON array of objects: {type, title, description, confidence}.';
COMMENT ON COLUMN public.ai_analyses.interventions IS 'JSON array of objects: {type, message, priority, action_url}.';
COMMENT ON COLUMN public.ai_analyses.patterns IS 'Detected patterns: {optimal_time, avg_session_length, consistency_score, ...}.';
```

#### 6. weekly_reports

```sql
-- 2.6 weekly_reports
-- ---------------------------------------------------------------------------
CREATE TABLE public.weekly_reports (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  week_start          DATE        NOT NULL,
  week_end            DATE        NOT NULL,
  total_minutes       INTEGER     DEFAULT 0,
  total_sessions      INTEGER     DEFAULT 0,
  total_modules       INTEGER     DEFAULT 0,
  courses_summary     JSONB,
  ai_summary          TEXT,
  highlights          JSONB,
  recommendations     JSONB,
  streak_length       INTEGER     DEFAULT 0,
  compared_to_previous JSONB,
  created_at          TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT weekly_reports_user_week_unique UNIQUE (user_id, week_start)
);

COMMENT ON TABLE  public.weekly_reports IS 'Weekly rollup reports with AI-generated narrative.';
COMMENT ON COLUMN public.weekly_reports.courses_summary IS 'Per-course breakdown: [{course_id, title, minutes, modules, ...}].';
COMMENT ON COLUMN public.weekly_reports.highlights IS 'JSON array of highlight strings.';
COMMENT ON COLUMN public.weekly_reports.recommendations IS 'JSON array of recommendation objects.';
COMMENT ON COLUMN public.weekly_reports.compared_to_previous IS '{minutes_diff, sessions_diff, trend: "up"|"down"|"stable"}.';
```

#### 7. notifications

```sql
-- 2.7 notifications
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL
                              CHECK (type IN (
                                'reminder', 'risk_alert', 'achievement',
                                'buddy_update', 'weekly_report', 'streak_warning'
                              )),
  title           TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  action_url      TEXT,
  read            BOOLEAN     DEFAULT false,
  channels_sent   JSONB       DEFAULT '[]'::jsonb,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  public.notifications IS 'Multi-channel notification log.';
COMMENT ON COLUMN public.notifications.channels_sent IS 'Array of channel strings: "in_app", "email", "push", "slack", "discord".';
```

#### 8. reminder_schedules

```sql
-- 2.8 reminder_schedules
-- ---------------------------------------------------------------------------
CREATE TABLE public.reminder_schedules (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  course_id       UUID        REFERENCES public.courses(id) ON DELETE CASCADE,
  days_of_week    JSONB       NOT NULL,
  time            TIME        NOT NULL,
  timezone        TEXT        NOT NULL,
  enabled         BOOLEAN     DEFAULT true,
  channels        JSONB       DEFAULT '["in_app"]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE  public.reminder_schedules IS 'Recurring study reminder configurations.';
COMMENT ON COLUMN public.reminder_schedules.days_of_week IS 'JSON array of day strings, e.g. ["mon","wed","fri"].';
COMMENT ON COLUMN public.reminder_schedules.channels IS 'Array of delivery channels: "in_app", "email", "push", "slack", "discord".';
```

#### 9. study_buddies

```sql
-- 2.9 study_buddies
-- ---------------------------------------------------------------------------
CREATE TABLE public.study_buddies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id    UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  recipient_id    UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status          TEXT        DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT study_buddies_pair_unique UNIQUE (requester_id, recipient_id),
  CONSTRAINT study_buddies_no_self CHECK (requester_id <> recipient_id)
);

COMMENT ON TABLE  public.study_buddies IS 'Social accountability pairings between users.';
```

#### 10. achievements

```sql
-- 2.10 achievements
-- ---------------------------------------------------------------------------
CREATE TABLE public.achievements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  achievement_type  TEXT        NOT NULL
                                CHECK (achievement_type IN (
                                  'first_session', 'streak_7', 'streak_30', 'streak_100',
                                  'course_complete', 'night_owl', 'early_bird', 'marathon',
                                  'consistency_king', 'speed_learner', 'social_butterfly',
                                  'comeback_kid', 'perfectionist', 'explorer', 'dedication'
                                )),
  course_id         UUID        REFERENCES public.courses(id) ON DELETE SET NULL,
  metadata          JSONB,
  earned_at         TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT achievements_user_type_course_unique UNIQUE (user_id, achievement_type, course_id)
);

COMMENT ON TABLE  public.achievements IS 'Gamification badges and milestones.';
COMMENT ON COLUMN public.achievements.metadata IS 'Extra context, e.g. {streak_length: 30, course_title: "..."}.';
```

### Indexes

```sql
-- ===========================================================================
-- 3. INDEXES
-- ===========================================================================

-- user_profiles
CREATE INDEX idx_user_profiles_email          ON public.user_profiles (email);

-- courses
CREATE INDEX idx_courses_user_id              ON public.courses (user_id);
CREATE INDEX idx_courses_user_status          ON public.courses (user_id, status);
CREATE INDEX idx_courses_user_priority        ON public.courses (user_id, priority);
CREATE INDEX idx_courses_user_sort_order      ON public.courses (user_id, sort_order);
CREATE INDEX idx_courses_target_date          ON public.courses (target_completion_date)
  WHERE target_completion_date IS NOT NULL;

-- study_sessions
CREATE INDEX idx_sessions_user_id             ON public.study_sessions (user_id);
CREATE INDEX idx_sessions_course_id           ON public.study_sessions (course_id);
CREATE INDEX idx_sessions_user_started_at     ON public.study_sessions (user_id, started_at DESC);
CREATE INDEX idx_sessions_user_course         ON public.study_sessions (user_id, course_id);
CREATE INDEX idx_sessions_started_at          ON public.study_sessions (started_at DESC);

-- daily_stats  (unique index on (user_id, date) already exists from the constraint)
CREATE INDEX idx_daily_stats_user_date        ON public.daily_stats (user_id, date DESC);
CREATE INDEX idx_daily_stats_date             ON public.daily_stats (date DESC);
CREATE INDEX idx_daily_stats_streak           ON public.daily_stats (user_id, date DESC)
  WHERE streak_day = true;

-- ai_analyses
CREATE INDEX idx_ai_analyses_user_id          ON public.ai_analyses (user_id);
CREATE INDEX idx_ai_analyses_user_type        ON public.ai_analyses (user_id, analysis_type);
CREATE INDEX idx_ai_analyses_user_created     ON public.ai_analyses (user_id, created_at DESC);
CREATE INDEX idx_ai_analyses_course_id        ON public.ai_analyses (course_id)
  WHERE course_id IS NOT NULL;

-- weekly_reports  (unique index on (user_id, week_start) already exists from the constraint)
CREATE INDEX idx_weekly_reports_user_created   ON public.weekly_reports (user_id, created_at DESC);

-- notifications
CREATE INDEX idx_notifications_user_id        ON public.notifications (user_id);
CREATE INDEX idx_notifications_user_read      ON public.notifications (user_id, read);
CREATE INDEX idx_notifications_user_unread    ON public.notifications (user_id, created_at DESC)
  WHERE read = false;
CREATE INDEX idx_notifications_user_type      ON public.notifications (user_id, type);
CREATE INDEX idx_notifications_created        ON public.notifications (created_at DESC);

-- reminder_schedules
CREATE INDEX idx_reminders_user_id            ON public.reminder_schedules (user_id);
CREATE INDEX idx_reminders_user_enabled       ON public.reminder_schedules (user_id)
  WHERE enabled = true;
CREATE INDEX idx_reminders_course_id          ON public.reminder_schedules (course_id)
  WHERE course_id IS NOT NULL;

-- study_buddies
CREATE INDEX idx_buddies_requester            ON public.study_buddies (requester_id);
CREATE INDEX idx_buddies_recipient            ON public.study_buddies (recipient_id);
CREATE INDEX idx_buddies_status               ON public.study_buddies (status);
CREATE INDEX idx_buddies_accepted             ON public.study_buddies (requester_id, recipient_id)
  WHERE status = 'accepted';

-- achievements
CREATE INDEX idx_achievements_user_id         ON public.achievements (user_id);
CREATE INDEX idx_achievements_user_type       ON public.achievements (user_id, achievement_type);
CREATE INDEX idx_achievements_earned          ON public.achievements (earned_at DESC);
```

### Triggers

```sql
-- ===========================================================================
-- 4. TRIGGERS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 4.1 Auto-update updated_at on every table that has the column
-- ---------------------------------------------------------------------------
CREATE TRIGGER set_updated_at_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_courses
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_daily_stats
  BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_reminder_schedules
  BEFORE UPDATE ON public.reminder_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_study_buddies
  BEFORE UPDATE ON public.study_buddies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------------
-- 4.2 Daily stats aggregation trigger
--     When a study_session is inserted, upsert the matching daily_stats row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_study_session_aggregate()
RETURNS TRIGGER AS $$
DECLARE
  session_date DATE;
  course_uuid  TEXT;
BEGIN
  -- Derive the date from the session's started_at in UTC
  session_date := (NEW.started_at AT TIME ZONE 'UTC')::date;
  course_uuid  := NEW.course_id::text;

  INSERT INTO public.daily_stats (user_id, date, total_minutes, session_count, modules_completed, courses_studied, streak_day)
  VALUES (
    NEW.user_id,
    session_date,
    NEW.duration_minutes,
    1,
    NEW.modules_completed,
    jsonb_build_array(course_uuid),
    false  -- streak_day is evaluated separately
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_minutes     = daily_stats.total_minutes     + EXCLUDED.total_minutes,
    session_count     = daily_stats.session_count     + EXCLUDED.session_count,
    modules_completed = daily_stats.modules_completed + EXCLUDED.modules_completed,
    courses_studied   = (
      -- Merge course UUID into the existing array (deduplicated)
      SELECT jsonb_agg(DISTINCT val)
      FROM (
        SELECT val FROM jsonb_array_elements(daily_stats.courses_studied) AS val
        UNION
        SELECT val FROM jsonb_array_elements(EXCLUDED.courses_studied) AS val
      ) sub
    ),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_study_session_aggregate
  AFTER INSERT ON public.study_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_study_session_aggregate();

-- ---------------------------------------------------------------------------
-- 4.3 Auto-create user_profile on auth.users signup
--     (optional convenience -- can also be handled in application code)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Row Level Security Policies

```sql
-- ===========================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===========================================================================
-- Enable RLS on every table.

ALTER TABLE public.user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_buddies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements       ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5.1 user_profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE
  USING (id = auth.uid());

-- Service role bypass for cron / server-side operations
CREATE POLICY "Service role full access to user_profiles"
  ON public.user_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.2 courses
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own courses"
  ON public.courses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own courses"
  ON public.courses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own courses"
  ON public.courses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own courses"
  ON public.courses FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to courses"
  ON public.courses FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.3 study_sessions
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own sessions"
  ON public.study_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON public.study_sessions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON public.study_sessions FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to study_sessions"
  ON public.study_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.4 daily_stats
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own daily stats"
  ON public.daily_stats FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own daily stats"
  ON public.daily_stats FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own daily stats"
  ON public.daily_stats FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own daily stats"
  ON public.daily_stats FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to daily_stats"
  ON public.daily_stats FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.5 ai_analyses
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own analyses"
  ON public.ai_analyses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own analyses"
  ON public.ai_analyses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own analyses"
  ON public.ai_analyses FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to ai_analyses"
  ON public.ai_analyses FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.6 weekly_reports
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own weekly reports"
  ON public.weekly_reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own weekly reports"
  ON public.weekly_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own weekly reports"
  ON public.weekly_reports FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own weekly reports"
  ON public.weekly_reports FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to weekly_reports"
  ON public.weekly_reports FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.7 notifications
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to notifications"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.8 reminder_schedules
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own reminders"
  ON public.reminder_schedules FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own reminders"
  ON public.reminder_schedules FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reminders"
  ON public.reminder_schedules FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reminders"
  ON public.reminder_schedules FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to reminder_schedules"
  ON public.reminder_schedules FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.9 study_buddies (special: both requester and recipient need access)
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view buddy relationships they are part of"
  ON public.study_buddies FOR SELECT
  USING (
    requester_id = auth.uid()
    OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can request a buddy"
  ON public.study_buddies FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can update buddy relationships they are part of"
  ON public.study_buddies FOR UPDATE
  USING (
    requester_id = auth.uid()
    OR recipient_id = auth.uid()
  )
  WITH CHECK (
    requester_id = auth.uid()
    OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can delete buddy relationships they requested"
  ON public.study_buddies FOR DELETE
  USING (
    requester_id = auth.uid()
    OR recipient_id = auth.uid()
  );

CREATE POLICY "Service role full access to study_buddies"
  ON public.study_buddies FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5.10 achievements
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own achievements"
  ON public.achievements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own achievements"
  ON public.achievements FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own achievements"
  ON public.achievements FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to achievements"
  ON public.achievements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

## Seed Data

**File:** `supabase/seed.sql`

> **Important:** This seed data is for **local development only**. It uses a hard-coded
> UUID for the test user. In production Supabase, the user would be created through
> `auth.users` via the Supabase Auth API. For local seeding, we insert directly.

```sql
-- ===========================================================================
-- SEED DATA -- Development Only
-- ===========================================================================
-- This script assumes you are running it via `supabase db reset` which
-- will apply all migrations first and then run this seed file.
--
-- The test user UUID is deterministic so that all FK references work.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Test user
-- ---------------------------------------------------------------------------
-- Insert into auth.users (Supabase local dev supports this)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '00000000-0000-0000-0000-000000000000',
  'testuser@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Alex Developer"}',
  'authenticated',
  'authenticated'
);

-- The on_auth_user_created trigger will auto-create the profile,
-- but we update it with full onboarding data:
UPDATE public.user_profiles SET
  full_name              = 'Alex Developer',
  avatar_url             = 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
  timezone               = 'America/New_York',
  theme                  = 'dark',
  motivation_style       = 'data_driven',
  preferred_study_days   = '["mon","tue","wed","thu","fri","sat"]'::jsonb,
  preferred_study_time   = 'evening',
  daily_study_goal_minutes = 45,
  experience_level       = 'intermediate',
  onboarding_completed   = true,
  streak_freeze_count    = 2
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- ---------------------------------------------------------------------------
-- 4 Courses in various statuses
-- ---------------------------------------------------------------------------
INSERT INTO public.courses (id, user_id, title, platform, url, total_modules, completed_modules, total_hours, completed_hours, target_completion_date, priority, status, notes, sort_order) VALUES
(
  '11111111-1111-1111-1111-111111111111',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'React - The Complete Guide 2026',
  'udemy',
  'https://www.udemy.com/course/react-the-complete-guide/',
  48, 32, 60.50, 40.00,
  '2026-03-15', 1, 'in_progress',
  'Focus on hooks and server components sections.',
  0
),
(
  '22222222-2222-2222-2222-222222222222',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Machine Learning Specialization',
  'coursera',
  'https://www.coursera.org/specializations/machine-learning',
  33, 0, 80.00, 0,
  '2026-06-01', 2, 'not_started',
  'Waiting to finish React course first.',
  1
),
(
  '33333333-3333-3333-3333-333333333333',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'CS50x: Introduction to Computer Science',
  'youtube',
  'https://www.youtube.com/playlist?list=PLhQjrBD2T381WAHyx1pq-sBfykqMBI7V4',
  11, 11, 24.00, 24.00,
  '2026-01-30', 3, 'completed',
  'Finished! Great foundational course.',
  2
),
(
  '44444444-4444-4444-4444-444444444444',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AWS Solutions Architect Associate',
  'pluralsight',
  'https://www.pluralsight.com/paths/aws-certified-solutions-architect',
  20, 5, 45.00, 11.25,
  '2026-05-01', 2, 'paused',
  'Paused while focusing on React. Will resume in March.',
  3
);

-- ---------------------------------------------------------------------------
-- 20+ Study sessions over the last 30 days
-- ---------------------------------------------------------------------------
INSERT INTO public.study_sessions (user_id, course_id, started_at, ended_at, duration_minutes, modules_completed, session_type, notes) VALUES
-- Week 1 (approx 30 days ago)
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '30 days' + time '18:00', now() - interval '30 days' + time '18:45', 45, 1, 'timer', 'Hooks deep dive'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '29 days' + time '19:00', now() - interval '29 days' + time '19:30', 30, 1, 'timer', NULL),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '28 days' + time '18:30', now() - interval '28 days' + time '19:30', 60, 2, 'timer', 'useReducer + useContext'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444',
  now() - interval '27 days' + time '20:00', now() - interval '27 days' + time '20:30', 30, 1, 'manual', 'IAM policies'),

-- Week 2
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '25 days' + time '18:00', now() - interval '25 days' + time '19:00', 60, 2, 'timer', 'React Router v7'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '24 days' + time '19:00', now() - interval '24 days' + time '19:45', 45, 1, 'timer', NULL),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '22 days' + time '17:30', now() - interval '22 days' + time '18:30', 60, 2, 'timer', 'State management patterns'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444',
  now() - interval '21 days' + time '20:00', now() - interval '21 days' + time '21:00', 60, 1, 'manual', 'VPC and networking'),

-- Week 3
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '18 days' + time '18:00', now() - interval '18 days' + time '18:50', 50, 1, 'timer', 'Server components intro'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '17 days' + time '19:00', now() - interval '17 days' + time '19:45', 45, 1, 'timer', 'Server actions'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '16 days' + time '18:00', now() - interval '16 days' + time '19:00', 60, 2, 'timer', NULL),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '15 days' + time '18:30', now() - interval '15 days' + time '19:00', 30, 1, 'module', 'Quick review session'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444',
  now() - interval '14 days' + time '20:00', now() - interval '14 days' + time '20:40', 40, 1, 'manual', 'S3 and storage'),

-- Week 4
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '11 days' + time '18:00', now() - interval '11 days' + time '19:00', 60, 2, 'timer', 'Next.js App Router'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '10 days' + time '19:00', now() - interval '10 days' + time '19:45', 45, 1, 'timer', 'Data fetching patterns'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '9 days' + time '18:00', now() - interval '9 days' + time '18:45', 45, 1, 'timer', NULL),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '8 days' + time '18:30', now() - interval '8 days' + time '19:30', 60, 2, 'timer', 'Testing with Vitest'),

-- Recent days
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '5 days' + time '18:00', now() - interval '5 days' + time '19:00', 60, 2, 'timer', 'Performance optimization'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '4 days' + time '19:00', now() - interval '4 days' + time '19:30', 30, 1, 'timer', 'Memoization and useMemo'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '3 days' + time '18:00', now() - interval '3 days' + time '18:45', 45, 1, 'timer', NULL),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111',
  now() - interval '2 days' + time '18:30', now() - interval '2 days' + time '19:30', 60, 2, 'timer', 'Deployment and CI/CD'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '44444444-4444-4444-4444-444444444444',
  now() - interval '1 day' + time '20:00', now() - interval '1 day' + time '20:30', 30, 1, 'manual', 'EC2 and auto-scaling');

-- ---------------------------------------------------------------------------
-- Daily stats for the last 30 days
-- (The trigger above auto-populates these on session insert, but we add
--  explicit entries to ensure completeness and streak_day flags.)
-- ---------------------------------------------------------------------------
-- Note: The trigger will have already created rows for days with sessions.
-- We now update the streak_day flags where the user met the 45-min goal.
UPDATE public.daily_stats
SET streak_day = (total_minutes >= 45)
WHERE user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Also insert a few days with zero activity (no sessions, so the trigger
-- did not create rows) to make the data realistic.
INSERT INTO public.daily_stats (user_id, date, total_minutes, session_count, modules_completed, courses_studied, streak_day) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '26 days')::date, 0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '23 days')::date, 0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '20 days')::date, 0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '19 days')::date, 0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '13 days')::date, 0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '12 days')::date, 0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '7 days')::date,  0, 0, 0, '[]'::jsonb, false),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', (current_date - interval '6 days')::date,  0, 0, 0, '[]'::jsonb, false)
ON CONFLICT (user_id, date) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2 AI Analyses
-- ---------------------------------------------------------------------------
INSERT INTO public.ai_analyses (user_id, course_id, analysis_type, risk_score, risk_level, insights, interventions, patterns, model) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '11111111-1111-1111-1111-111111111111',
  'daily',
  25,
  'low',
  '[
    {"type": "positive", "title": "Strong consistency", "description": "You have studied 5 out of the last 7 days. This is above average for your goals.", "confidence": 0.92},
    {"type": "suggestion", "title": "Optimal session length", "description": "Your 45-60 minute sessions show the best knowledge retention. Keep this up.", "confidence": 0.85}
  ]'::jsonb,
  '[
    {"type": "encouragement", "message": "You are 67% through React -- The Complete Guide. At this pace, you will finish 5 days ahead of schedule!", "priority": "low", "action_url": "/courses/11111111-1111-1111-1111-111111111111"}
  ]'::jsonb,
  '{"optimal_time": "18:00-19:00", "avg_session_length": 48, "consistency_score": 0.82, "preferred_day": "tuesday"}'::jsonb,
  'gpt-4'
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '44444444-4444-4444-4444-444444444444',
  'risk_alert',
  72,
  'high',
  '[
    {"type": "warning", "title": "Course at risk of stalling", "description": "AWS Solutions Architect has had only 4 sessions in 30 days. At this rate, you will miss your May 1st deadline.", "confidence": 0.88},
    {"type": "suggestion", "title": "Consider reprioritizing", "description": "You could alternate React and AWS days to maintain progress on both courses.", "confidence": 0.75}
  ]'::jsonb,
  '[
    {"type": "action", "message": "Schedule at least 2 AWS sessions this week to get back on track.", "priority": "high", "action_url": "/courses/44444444-4444-4444-4444-444444444444"},
    {"type": "reminder", "message": "Set a recurring reminder for AWS on Saturdays.", "priority": "medium", "action_url": "/reminders/new?course=44444444-4444-4444-4444-444444444444"}
  ]'::jsonb,
  '{"optimal_time": "20:00-21:00", "avg_session_length": 40, "consistency_score": 0.28, "preferred_day": "sunday"}'::jsonb,
  'gpt-4'
);

-- ---------------------------------------------------------------------------
-- 1 Weekly Report
-- ---------------------------------------------------------------------------
INSERT INTO public.weekly_reports (user_id, week_start, week_end, total_minutes, total_sessions, total_modules, courses_summary, ai_summary, highlights, recommendations, streak_length, compared_to_previous) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (current_date - interval '7 days')::date,
  (current_date - interval '1 day')::date,
  285,
  6,
  8,
  '[
    {"course_id": "11111111-1111-1111-1111-111111111111", "title": "React - The Complete Guide 2026", "minutes": 255, "sessions": 5, "modules": 7},
    {"course_id": "44444444-4444-4444-4444-444444444444", "title": "AWS Solutions Architect Associate", "minutes": 30, "sessions": 1, "modules": 1}
  ]'::jsonb,
  'Great week, Alex! You put in nearly 5 hours of focused study time across 6 sessions. Your React course is progressing well -- you completed 7 modules and are now 67% through the course. The AWS course got a single 30-minute session; consider dedicating more time to it next week to stay on track for your May deadline. Your consistency score is 82%, which is excellent. Keep riding this momentum!',
  '["Completed 7 React modules in one week", "Maintained a 5-day study streak", "Studied for 285 total minutes"]'::jsonb,
  '[
    {"type": "schedule", "message": "Add 2 dedicated AWS sessions to your weekly plan."},
    {"type": "goal", "message": "You are close to the streak_7 achievement -- just 2 more days!"},
    {"type": "technique", "message": "Try the Pomodoro technique for AWS sessions to maintain focus on less engaging material."}
  ]'::jsonb,
  5,
  '{"minutes_diff": 45, "sessions_diff": 1, "trend": "up"}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 5 Notifications
-- ---------------------------------------------------------------------------
INSERT INTO public.notifications (user_id, type, title, message, action_url, read, channels_sent, metadata) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'reminder',
  'Time to study!',
  'Your scheduled study time for React - The Complete Guide is starting now.',
  '/courses/11111111-1111-1111-1111-111111111111',
  true,
  '["in_app"]'::jsonb,
  '{"course_id": "11111111-1111-1111-1111-111111111111"}'::jsonb
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'risk_alert',
  'AWS course falling behind',
  'Your AWS Solutions Architect course has a high risk score of 72. You may miss your May 1st deadline at the current pace.',
  '/courses/44444444-4444-4444-4444-444444444444',
  false,
  '["in_app", "email"]'::jsonb,
  '{"risk_score": 72, "course_id": "44444444-4444-4444-4444-444444444444"}'::jsonb
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'achievement',
  'Achievement Unlocked: First Session!',
  'Congratulations! You completed your very first study session. The journey of a thousand modules begins with a single play button.',
  '/achievements',
  true,
  '["in_app"]'::jsonb,
  '{"achievement_type": "first_session"}'::jsonb
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'weekly_report',
  'Your weekly report is ready',
  'You studied 285 minutes across 6 sessions last week. Tap to see your full report with AI insights.',
  '/reports/weekly',
  false,
  '["in_app", "email"]'::jsonb,
  NULL
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'streak_warning',
  'Streak at risk!',
  'You have not studied today and your 5-day streak is at risk. You have 2 streak freezes remaining.',
  '/dashboard',
  false,
  '["in_app", "push"]'::jsonb,
  '{"current_streak": 5, "freezes_remaining": 2}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 3 Achievements
-- ---------------------------------------------------------------------------
INSERT INTO public.achievements (user_id, achievement_type, course_id, metadata) VALUES
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'first_session',
  NULL,
  '{"earned_reason": "Completed first-ever study session."}'::jsonb
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'course_complete',
  '33333333-3333-3333-3333-333333333333',
  '{"course_title": "CS50x: Introduction to Computer Science", "completed_in_days": 42}'::jsonb
),
(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'night_owl',
  NULL,
  '{"earned_reason": "Completed 5 sessions after 8 PM.", "session_count": 5}'::jsonb
);
```

---

## Migration Strategy & Rollback

### Strategy

| Principle | Detail |
|-----------|--------|
| **Foundation first** | The `00001_foundation.sql` migration creates all 10 tables, all indexes, all triggers, and all RLS policies in one atomic transaction. |
| **Naming convention** | Migrations follow Supabase conventions: `supabase/migrations/<timestamp>_<description>.sql`. The foundation file above uses the simplified name `00001_foundation.sql` for clarity; in practice, use the Supabase CLI to generate the timestamp prefix (`supabase migration new foundation`). |
| **Idempotent helpers** | `CREATE OR REPLACE FUNCTION` and `CREATE EXTENSION IF NOT EXISTS` ensure the migration can be safely re-run in edge cases. |
| **Future migrations** | Each subsequent schema change gets its own migration file (e.g., `20260301120000_add_course_tags.sql`). Never modify existing migration files once they have been applied. |
| **Environments** | Use `supabase db reset` for local development (applies all migrations + seed). Use `supabase db push` for remote staging/production. |

### File Structure

```
supabase/
  config.toml
  migrations/
    00001_foundation.sql        <-- Everything in this document
    (future migrations here)
  seed.sql                      <-- Seed data section above
```

### Rollback: 00001_foundation.sql

If you need to completely roll back the foundation migration, run the following.
**WARNING:** This is destructive and will delete all data.

```sql
-- ===========================================================================
-- ROLLBACK: 00001_foundation.sql
-- Drops all tables, functions, and triggers created by the foundation migration.
-- Run this only in development. Never run this in production without a backup.
-- ===========================================================================

-- Drop triggers first (they depend on the functions and tables)
DROP TRIGGER IF EXISTS trg_study_session_aggregate  ON public.study_sessions;
DROP TRIGGER IF EXISTS set_updated_at_study_buddies ON public.study_buddies;
DROP TRIGGER IF EXISTS set_updated_at_reminder_schedules ON public.reminder_schedules;
DROP TRIGGER IF EXISTS set_updated_at_daily_stats   ON public.daily_stats;
DROP TRIGGER IF EXISTS set_updated_at_courses       ON public.courses;
DROP TRIGGER IF EXISTS set_updated_at_user_profiles ON public.user_profiles;
DROP TRIGGER IF EXISTS on_auth_user_created         ON auth.users;

-- Drop tables (CASCADE drops dependent policies and indexes)
DROP TABLE IF EXISTS public.achievements       CASCADE;
DROP TABLE IF EXISTS public.study_buddies      CASCADE;
DROP TABLE IF EXISTS public.reminder_schedules CASCADE;
DROP TABLE IF EXISTS public.notifications      CASCADE;
DROP TABLE IF EXISTS public.weekly_reports     CASCADE;
DROP TABLE IF EXISTS public.ai_analyses        CASCADE;
DROP TABLE IF EXISTS public.daily_stats        CASCADE;
DROP TABLE IF EXISTS public.study_sessions     CASCADE;
DROP TABLE IF EXISTS public.courses            CASCADE;
DROP TABLE IF EXISTS public.user_profiles      CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_study_session_aggregate();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();
```

### Creating a New Migration

```bash
# Generate a new timestamped migration file
supabase migration new add_course_tags

# This creates: supabase/migrations/<timestamp>_add_course_tags.sql
# Edit the file, then apply locally:
supabase db reset

# Push to remote (staging/production):
supabase db push
```

---

## Quick Reference: Column Types & Constraints

| Table | PK | Notable Constraints | Unique Constraints |
|-------|----|--------------------|-------------------|
| `user_profiles` | `id` (FK to auth.users) | CHECK on theme, motivation_style, preferred_study_time, experience_level | -- |
| `courses` | `id` (auto UUID) | CHECK on platform, status, priority 1-4 | -- |
| `study_sessions` | `id` (auto UUID) | CHECK on session_type | -- |
| `daily_stats` | `id` (auto UUID) | -- | `(user_id, date)` |
| `ai_analyses` | `id` (auto UUID) | CHECK on analysis_type, risk_score 0-100, risk_level | -- |
| `weekly_reports` | `id` (auto UUID) | -- | `(user_id, week_start)` |
| `notifications` | `id` (auto UUID) | CHECK on type | -- |
| `reminder_schedules` | `id` (auto UUID) | -- | -- |
| `study_buddies` | `id` (auto UUID) | CHECK on status; CHECK requester <> recipient | `(requester_id, recipient_id)` |
| `achievements` | `id` (auto UUID) | CHECK on achievement_type | `(user_id, achievement_type, course_id)` |

---

## JSONB Column Schemas

For reference, the expected shapes of all JSONB columns:

### user_profiles.preferred_study_days
```json
["mon", "tue", "wed", "thu", "fri"]
```

### daily_stats.courses_studied
```json
["uuid-string-1", "uuid-string-2"]
```

### ai_analyses.insights
```json
[
  {
    "type": "positive | warning | suggestion | neutral",
    "title": "Short title",
    "description": "Detailed description of the insight.",
    "confidence": 0.85
  }
]
```

### ai_analyses.interventions
```json
[
  {
    "type": "encouragement | action | reminder | escalation",
    "message": "Human-readable intervention message.",
    "priority": "low | medium | high",
    "action_url": "/courses/uuid"
  }
]
```

### ai_analyses.patterns
```json
{
  "optimal_time": "18:00-19:00",
  "avg_session_length": 48,
  "consistency_score": 0.82,
  "preferred_day": "tuesday"
}
```

### weekly_reports.courses_summary
```json
[
  {
    "course_id": "uuid",
    "title": "Course Title",
    "minutes": 255,
    "sessions": 5,
    "modules": 7
  }
]
```

### weekly_reports.highlights
```json
["Completed 7 modules", "Maintained a 5-day streak"]
```

### weekly_reports.recommendations
```json
[
  {
    "type": "schedule | goal | technique | social",
    "message": "Recommendation text."
  }
]
```

### weekly_reports.compared_to_previous
```json
{
  "minutes_diff": 45,
  "sessions_diff": 1,
  "trend": "up | down | stable"
}
```

### notifications.channels_sent
```json
["in_app", "email", "push", "slack", "discord"]
```

### notifications.metadata
```json
{
  "course_id": "uuid",
  "risk_score": 72
}
```

### reminder_schedules.days_of_week
```json
["mon", "wed", "fri"]
```

### reminder_schedules.channels
```json
["in_app", "email"]
```

### achievements.metadata
```json
{
  "earned_reason": "Description of how the achievement was earned.",
  "course_title": "Optional course name",
  "session_count": 5
}
```
