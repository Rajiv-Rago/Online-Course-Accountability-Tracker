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
