-- Migration: Add preferred AI model to user profiles
-- Allows users to choose their preferred AI provider and model.
-- Validated in application code (not DB constraint) so adding new models
-- doesn't require a migration.
-- NOT NULL with DEFAULT ensures existing rows get the default value.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS preferred_ai_model TEXT NOT NULL DEFAULT 'openai:gpt-4o';
