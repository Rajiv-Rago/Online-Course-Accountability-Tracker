-- =============================================================================
-- 00002_b1_user_profile.sql
-- Block B1 — User Profile schema alignment
-- Renames columns, adds new columns, updates constraints and trigger
-- to match the B1_USER_PROFILE spec.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop old constraints
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_motivation_style_check;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_preferred_study_time_check;

-- ---------------------------------------------------------------------------
-- 2. Drop old columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS preferred_study_days,
  DROP COLUMN IF EXISTS preferred_study_time,
  DROP COLUMN IF EXISTS streak_freeze_count;

-- ---------------------------------------------------------------------------
-- 3. Rename columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  RENAME COLUMN full_name TO display_name;

ALTER TABLE public.user_profiles
  RENAME COLUMN daily_study_goal_minutes TO daily_study_goal_mins;

-- ---------------------------------------------------------------------------
-- 4. Alter renamed columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN display_name SET DEFAULT '';

-- ---------------------------------------------------------------------------
-- 5. Add new CHECK constraint for motivation_style
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_motivation_style_check
    CHECK (motivation_style IN ('gentle', 'balanced', 'drill_sergeant'));

-- Update any existing rows that have old motivation_style values
UPDATE public.user_profiles
  SET motivation_style = 'balanced'
  WHERE motivation_style NOT IN ('gentle', 'balanced', 'drill_sergeant');

-- ---------------------------------------------------------------------------
-- 6. Add new columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS learning_goals        text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_days        text[]    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_time_start  time               DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS preferred_time_end    time               DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS weekly_study_goal_mins integer  NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS onboarding_step       integer  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notify_email          boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_push           boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_slack          boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_discord        boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_daily_reminder boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_streak_warning boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_report  boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_achievement    boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_risk_alert     boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS slack_webhook_url     text,
  ADD COLUMN IF NOT EXISTS discord_webhook_url   text;

-- ---------------------------------------------------------------------------
-- 7. Add indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at
  ON public.user_profiles (created_at);

-- ---------------------------------------------------------------------------
-- 8. Update handle_new_user() trigger to populate display_name from metadata
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
