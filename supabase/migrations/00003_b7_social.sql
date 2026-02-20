-- =============================================================================
-- 00003_b7_social.sql
-- Block B7: Social Features — Add shared column to achievements
-- =============================================================================

-- Add shared column for achievement visibility to buddies
ALTER TABLE public.achievements
  ADD COLUMN shared BOOLEAN NOT NULL DEFAULT false;

-- Index for querying shared achievements by user
CREATE INDEX idx_achievements_shared ON public.achievements (user_id, shared)
  WHERE shared = true;
