import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------
export const displayNameSchema = z.string().min(2).max(50).trim();

// ---------------------------------------------------------------------------
// Profile edit form
// ---------------------------------------------------------------------------
export const profileSchema = z.object({
  display_name: displayNameSchema,
  timezone: z.string().min(1),
  theme: z.enum(['light', 'dark', 'system']),
  motivation_style: z.enum(['gentle', 'balanced', 'drill_sergeant']),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
  daily_study_goal_mins: z.number().int().min(10).max(480),
  weekly_study_goal_mins: z.number().int().min(30).max(3360),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Onboarding step schemas
// ---------------------------------------------------------------------------
export const onboardingStep1Schema = z.object({
  display_name: displayNameSchema,
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
});

export const onboardingStep2Schema = z.object({
  learning_goals: z.array(z.string().min(1).max(200)).min(1).max(10),
});

export const onboardingStep3Schema = z.object({
  preferred_days: z
    .array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']))
    .min(1),
  preferred_time_start: z.string().regex(/^\d{2}:\d{2}$/),
  preferred_time_end: z.string().regex(/^\d{2}:\d{2}$/),
  daily_study_goal_mins: z.number().int().min(10).max(480),
  weekly_study_goal_mins: z.number().int().min(30).max(3360),
  timezone: z.string().min(1),
});

export const onboardingStep4Schema = z.object({
  motivation_style: z.enum(['gentle', 'balanced', 'drill_sergeant']),
});

export const onboardingStepSchemas = [
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
] as const;

export type OnboardingData = z.infer<typeof onboardingStep1Schema> &
  z.infer<typeof onboardingStep2Schema> &
  z.infer<typeof onboardingStep3Schema> &
  z.infer<typeof onboardingStep4Schema>;

// ---------------------------------------------------------------------------
// Notification preferences
// ---------------------------------------------------------------------------
export const notificationPrefsSchema = z.object({
  notify_email: z.boolean(),
  notify_push: z.boolean(),
  notify_slack: z.boolean(),
  notify_discord: z.boolean(),
  notify_daily_reminder: z.boolean(),
  notify_streak_warning: z.boolean(),
  notify_weekly_report: z.boolean(),
  notify_achievement: z.boolean(),
  notify_risk_alert: z.boolean(),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

// ---------------------------------------------------------------------------
// Webhook URLs
// ---------------------------------------------------------------------------
export const webhookUrlSchema = z.object({
  slack_webhook_url: z
    .string()
    .url()
    .startsWith('https://hooks.slack.com/')
    .nullable()
    .or(z.literal('')),
  discord_webhook_url: z
    .string()
    .url()
    .startsWith('https://discord.com/api/webhooks/')
    .nullable()
    .or(z.literal('')),
});

// ---------------------------------------------------------------------------
// Account management
// ---------------------------------------------------------------------------
export const changeEmailSchema = z.object({
  newEmail: z.string().email(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
