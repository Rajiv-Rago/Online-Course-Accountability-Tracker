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
