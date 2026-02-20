import { describe, it, expect } from 'vitest';
import {
  profileSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  completeOnboardingSchema,
  notificationPrefsSchema,
  webhookUrlSchema,
  changeEmailSchema,
  changePasswordSchema,
} from './profile-validation';

// ---------------------------------------------------------------------------
// Helpers — reusable valid data objects
// ---------------------------------------------------------------------------

const validProfile = {
  display_name: 'Alice',
  timezone: 'America/New_York',
  theme: 'dark' as const,
  motivation_style: 'balanced' as const,
  experience_level: 'intermediate' as const,
  daily_study_goal_mins: 60,
  weekly_study_goal_mins: 300,
};

const validStep1 = {
  display_name: 'Alice',
  experience_level: 'beginner' as const,
};

const validStep2 = {
  learning_goals: ['Learn React', 'Master TypeScript'],
};

const validStep3 = {
  preferred_days: ['mon', 'wed', 'fri'] as const,
  preferred_time_start: '09:00',
  preferred_time_end: '11:00',
  daily_study_goal_mins: 60,
  weekly_study_goal_mins: 300,
  timezone: 'America/New_York',
};

const validStep4 = {
  motivation_style: 'gentle' as const,
};

const validNotificationPrefs = {
  notify_email: true,
  notify_push: false,
  notify_slack: false,
  notify_discord: false,
  notify_daily_reminder: true,
  notify_streak_warning: true,
  notify_weekly_report: true,
  notify_achievement: true,
  notify_risk_alert: false,
};

// ---------------------------------------------------------------------------
// profileSchema
// ---------------------------------------------------------------------------

describe('profileSchema', () => {
  it('accepts a valid profile', () => {
    const result = profileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('rejects display_name shorter than 2 characters', () => {
    const result = profileSchema.safeParse({ ...validProfile, display_name: 'A' });
    expect(result.success).toBe(false);
  });

  it('rejects display_name longer than 50 characters', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      display_name: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid theme value', () => {
    const result = profileSchema.safeParse({ ...validProfile, theme: 'blue' });
    expect(result.success).toBe(false);
  });

  it('rejects daily_study_goal_mins below 10', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      daily_study_goal_mins: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects daily_study_goal_mins above 480', () => {
    const result = profileSchema.safeParse({
      ...validProfile,
      daily_study_goal_mins: 500,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onboardingStep1Schema
// ---------------------------------------------------------------------------

describe('onboardingStep1Schema', () => {
  it('accepts valid step 1 data', () => {
    const result = onboardingStep1Schema.safeParse(validStep1);
    expect(result.success).toBe(true);
  });

  it('rejects when display_name is missing', () => {
    const result = onboardingStep1Schema.safeParse({
      experience_level: 'beginner',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onboardingStep2Schema
// ---------------------------------------------------------------------------

describe('onboardingStep2Schema', () => {
  it('accepts valid learning goals', () => {
    const result = onboardingStep2Schema.safeParse(validStep2);
    expect(result.success).toBe(true);
  });

  it('rejects an empty learning_goals array', () => {
    const result = onboardingStep2Schema.safeParse({ learning_goals: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 10 learning goals', () => {
    const result = onboardingStep2Schema.safeParse({
      learning_goals: Array.from({ length: 11 }, (_, i) => `Goal ${i + 1}`),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onboardingStep3Schema
// ---------------------------------------------------------------------------

describe('onboardingStep3Schema', () => {
  it('accepts valid step 3 data', () => {
    const result = onboardingStep3Schema.safeParse(validStep3);
    expect(result.success).toBe(true);
  });

  it('rejects an empty preferred_days array', () => {
    const result = onboardingStep3Schema.safeParse({
      ...validStep3,
      preferred_days: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid time format', () => {
    const result = onboardingStep3Schema.safeParse({
      ...validStep3,
      preferred_time_start: '9:00AM',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// onboardingStep4Schema
// ---------------------------------------------------------------------------

describe('onboardingStep4Schema', () => {
  it('accepts a valid motivation style', () => {
    const result = onboardingStep4Schema.safeParse(validStep4);
    expect(result.success).toBe(true);
  });

  it('rejects an invalid motivation style', () => {
    const result = onboardingStep4Schema.safeParse({
      motivation_style: 'aggressive',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// completeOnboardingSchema
// ---------------------------------------------------------------------------

describe('completeOnboardingSchema', () => {
  it('accepts complete onboarding data from all 4 steps', () => {
    const complete = {
      ...validStep1,
      ...validStep2,
      ...validStep3,
      ...validStep4,
    };
    const result = completeOnboardingSchema.safeParse(complete);
    expect(result.success).toBe(true);
  });

  it('rejects when any step field is missing', () => {
    // Missing learning_goals from step 2
    const incomplete = {
      ...validStep1,
      ...validStep3,
      ...validStep4,
    };
    const result = completeOnboardingSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notificationPrefsSchema
// ---------------------------------------------------------------------------

describe('notificationPrefsSchema', () => {
  it('accepts valid boolean notification preferences', () => {
    const result = notificationPrefsSchema.safeParse(validNotificationPrefs);
    expect(result.success).toBe(true);
  });

  it('rejects a non-boolean value for a notification field', () => {
    const result = notificationPrefsSchema.safeParse({
      ...validNotificationPrefs,
      notify_email: 'yes',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// webhookUrlSchema
// ---------------------------------------------------------------------------

describe('webhookUrlSchema', () => {
  it('accepts a valid Slack webhook URL', () => {
    const result = webhookUrlSchema.safeParse({
      slack_webhook_url: 'https://hooks.slack.com/services/T00/B00/xxxx',
      discord_webhook_url: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a Slack URL with an invalid domain', () => {
    const result = webhookUrlSchema.safeParse({
      slack_webhook_url: 'https://evil.com/hooks',
      discord_webhook_url: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts an empty string for slack_webhook_url', () => {
    const result = webhookUrlSchema.safeParse({
      slack_webhook_url: '',
      discord_webhook_url: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null for slack_webhook_url', () => {
    const result = webhookUrlSchema.safeParse({
      slack_webhook_url: null,
      discord_webhook_url: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid Discord webhook URL', () => {
    const result = webhookUrlSchema.safeParse({
      slack_webhook_url: '',
      discord_webhook_url: 'https://discord.com/api/webhooks/123456/abcdef',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a Discord URL with an invalid domain', () => {
    const result = webhookUrlSchema.safeParse({
      slack_webhook_url: '',
      discord_webhook_url: 'https://evil.com/api/webhooks/123',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// changeEmailSchema
// ---------------------------------------------------------------------------

describe('changeEmailSchema', () => {
  it('accepts a valid email address', () => {
    const result = changeEmailSchema.safeParse({ newEmail: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email address', () => {
    const result = changeEmailSchema.safeParse({ newEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// changePasswordSchema
// ---------------------------------------------------------------------------

describe('changePasswordSchema', () => {
  it('accepts valid matching passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'newpass456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when confirmPassword does not match newPassword', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
      confirmPassword: 'different789',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects a newPassword shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });
});
