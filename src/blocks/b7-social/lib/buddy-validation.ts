import { z } from 'zod';

export const sendBuddyRequestSchema = z.object({
  recipientId: z.string().uuid('Invalid user ID'),
});

export const respondToRequestSchema = z.object({
  relationshipId: z.string().uuid('Invalid relationship ID'),
});

export const removeBuddySchema = z.object({
  relationshipId: z.string().uuid('Invalid relationship ID'),
});

export const buddySearchSchema = z.object({
  query: z.string().min(2, 'Search requires at least 2 characters').max(100).trim(),
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

export type SendBuddyRequestInput = z.infer<typeof sendBuddyRequestSchema>;
export type RespondToRequestInput = z.infer<typeof respondToRequestSchema>;
export type RemoveBuddyInput = z.infer<typeof removeBuddySchema>;
export type BuddySearchInput = z.infer<typeof buddySearchSchema>;
export type ShareAchievementInput = z.infer<typeof shareAchievementSchema>;
export type CheckAchievementsInput = z.infer<typeof checkAchievementsSchema>;

export type AchievementTrigger = CheckAchievementsInput['trigger'];
